/**
 * Habit Loop Builder — auto-generates habit loops when a behavior pattern
 * appears >= 3 times across journals.
 *
 * Loop model: Cue → Craving → Response → Reward (+ Hidden Cost)
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { generateJson, getLightModel, type AIUsageContext } from '@/lib/ai/client';
import type { Journal, HabitLoop } from '@/types';
import type { Locale } from '@/i18n/config';

const MIN_TRIGGERS_FOR_LOOP = 3;

/**
 * Check if a habit loop should be created/updated for a behavior type.
 */
export async function maybeCreateHabitLoop(
  supabase: SupabaseClient,
  userId: string,
  behaviorType: string,
  currentJournal: Journal,
  model?: string,
  usage?: AIUsageContext,
  locale: Locale = 'en'
): Promise<HabitLoop | null> {
  // Query journals with this behavior pattern
  const { data: matchingJournals } = await supabase
    .from('journals')
    .select('*')
    .eq('user_id', userId)
    .contains('behavior_patterns', [`behavior:${behaviorType}`])
    .order('created_at', { ascending: false })
    .limit(10);

  const journals = (matchingJournals as Journal[]) || [];

  if (journals.length < MIN_TRIGGERS_FOR_LOOP) return null;

  // Check if loop already exists for this behavior type
  const { data: existingLoop } = await supabase
    .from('habit_loops')
    .select('*')
    .eq('user_id', userId)
    .eq('behavior_type', behaviorType)
    .single();

  if (existingLoop) {
    // Update trigger count and last seen, return the updated record
    const typed = existingLoop as HabitLoop;
    const allJournalIds = [
      ...new Set([...typed.journal_ids, currentJournal.id]),
    ];
    const newTriggerCount = typed.trigger_count + 1;

    const { data: updated } = await supabase
      .from('habit_loops')
      .update({
        trigger_count: newTriggerCount,
        last_seen: currentJournal.created_at,
        journal_ids: allJournalIds,
      })
      .eq('id', typed.id)
      .select()
      .single();

    return (updated as HabitLoop) ?? typed;
  }

  // Extract habit loop via AI from the matching journals
  const loop = await aiExtractHabitLoop(journals, behaviorType, model, usage, locale);
  if (!loop) return null;

  const journalIds = journals.map((j) => j.id);
  const userQuotes = journals
    .flatMap((j) => j.insights)
    .filter(Boolean)
    .slice(0, 10);

  const { data: newLoop } = await supabase
    .from('habit_loops')
    .insert({
      user_id: userId,
      name: loop.name,
      cue: loop.cue,
      craving: loop.craving,
      response: loop.response,
      reward: loop.reward,
      hidden_cost: loop.hidden_cost,
      behavior_type: behaviorType,
      trigger_count: journals.length,
      first_seen: journals[journals.length - 1].created_at,
      last_seen: currentJournal.created_at,
      status: 'active',
      journal_ids: journalIds,
      user_quotes: userQuotes,
    })
    .select()
    .single();

  return newLoop as HabitLoop;
}

interface AILoopOutput {
  name: string;
  cue: string;
  craving: string;
  response: string;
  reward: string;
  hidden_cost: string;
}

async function aiExtractHabitLoop(
  journals: Journal[],
  behaviorType: string,
  model?: string,
  usage?: AIUsageContext,
  locale: Locale = 'en'
): Promise<AILoopOutput | null> {
  try {
    const summaries = journals
      .slice(0, 5)
      .map(
        (j, i) =>
          `Entry ${i + 1} (${j.created_at.split('T')[0]}): ${j.ai_summary || j.content.slice(0, 200)}`
      )
      .join('\n');

    const langInstruction = locale === 'zh'
      ? '\n\nIMPORTANT: All output values MUST be in Chinese (简体中文).'
      : '';

    const prompt = `Based on these ${journals.length} journal entries that share the behavior pattern "${behaviorType}",
extract the recurring habit loop:

Journals:
${summaries}

Output ONLY valid JSON:
{
  "name": "short name for this loop (3-5 words)",
  "cue": "What triggers this behavior? Be specific.",
  "craving": "What emotional need is the user trying to meet?",
  "response": "What does the user actually do? Their default action.",
  "reward": "What short-term relief do they get?",
  "hidden_cost": "What is the long-term damage they don't see in the moment?"
}${langInstruction}`;

    const parsed = await generateJson<AILoopOutput>({
      model: model || getLightModel(),
      maxTokens: 300,
      usage,
      messages: [{ role: 'user', content: prompt }],
    });

    return parsed;
  } catch (error) {
    console.error('Habit loop extraction error:', error);
    return null;
  }
}
