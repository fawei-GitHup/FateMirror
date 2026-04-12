/**
 * Journal Processing Pipeline
 *
 * Orchestrates the full post-save flow:
 * 1. AI tag extraction (if not already tagged)
 * 2. Pattern detection (theme overlap matching)
 * 3. Thinking analysis (L1-L4 diagnosis)
 * 4. Behavior detection (6 archetypes)
 * 5. Habit loop creation (if behavior >= 3 occurrences)
 * 6. Cognition profile update (sliding window)
 *
 * Designed to run asynchronously after journal save.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Journal } from '@/types';
import type { HabitLoop, Profile, Subscription } from '@/types';
import { detectPatterns } from '@/lib/pattern/detector';
import { analyzeThinking } from '@/lib/cognition/thinking-analyzer';
import { detectBehavior } from '@/lib/cognition/behavior-detector';
import { maybeCreateHabitLoop } from '@/lib/cognition/habit-loop-builder';
import { updateCognitionProfile } from '@/lib/cognition/profile-updater';
import { maybeGenerateNode } from '@/lib/tree/node-generator';
import { maybeGenerateChapters } from '@/lib/chapters/chapter-generator';
import { syncActionTasks } from '@/lib/actions/task-sync';
import { getEntitlements, resolvePlan } from '@/lib/billing/entitlements';
import { getModelForPlan, type AIUsageContext } from '@/lib/ai/client';
import type { PlanType } from '@/types/database.ts';

export interface PipelineResult {
  journalId: string;
  patternsFound: number;
  loopCount: number;
  thinkingLevel: string | null;
  behaviorsDetected: string[];
  habitLoopCreated: boolean;
  treeNodeCreated: boolean;
  chaptersCreated: number;
  actionTasksSynced: number;
  errors: string[];
}

/** Format error preserving message and type while keeping it serializable */
function formatPipelineError(stage: string, err: unknown): string {
  if (err instanceof Error) {
    console.error(`[Pipeline] ${stage}:`, err);
    return `${stage}: ${err.message}`;
  }
  console.error(`[Pipeline] ${stage}:`, err);
  return `${stage}: ${String(err)}`;
}

/**
 * Run the full processing pipeline for a journal entry.
 */
export async function processJournal(
  supabase: SupabaseClient,
  journal: Journal,
  userId: string,
  planOverride?: PlanType
): Promise<PipelineResult> {
  // Resolve user plan to route AI calls to the correct model
  let plan: PlanType = planOverride ?? 'free';
  if (!planOverride) {
    const { data: subscriptionForPlan } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    plan = resolvePlan((subscriptionForPlan as Subscription | null) ?? null);
  }
  const pipelineModel = getModelForPlan(plan, 'pipeline');
  const buildUsageContext = (feature: string): AIUsageContext => ({
    supabase,
    userId,
    feature,
    plan,
    journalId: journal.id,
    usedUserKey: false,
  });

  const errors: string[] = [];
  const result: PipelineResult = {
    journalId: journal.id,
    patternsFound: 0,
    loopCount: 0,
    thinkingLevel: null,
    behaviorsDetected: [],
    habitLoopCreated: false,
    treeNodeCreated: false,
    chaptersCreated: 0,
    actionTasksSynced: 0,
    errors: [],
  };

  // Step 1: Pattern detection (uses existing tags)
  try {
    const patterns = await detectPatterns(supabase, journal, userId);
    result.patternsFound = patterns.length;

    if (patterns.length > 0) {
      const totalLoopCount = patterns.reduce((sum, p) => sum + p.loopCount, 0);
      result.loopCount = totalLoopCount;

      // Update journal with pattern info
      await supabase
        .from('journals')
        .update({
          pattern_ids: patterns.map((p) => p.patternId),
          loop_count: totalLoopCount,
        })
        .eq('id', journal.id);
    }
  } catch (err) {
    errors.push(formatPipelineError('Pattern detection', err));
  }

  // Step 2 & 3: Thinking analysis + Behavior detection (parallel)
  const [thinkingResult, behaviorResult] = await Promise.allSettled([
    analyzeThinking(journal.content, pipelineModel, buildUsageContext('thinking_analysis')),
    detectBehavior(journal.content, pipelineModel, buildUsageContext('behavior_detection')),
  ]);

  const thinking =
    thinkingResult.status === 'fulfilled' ? thinkingResult.value : null;
  const behavior =
    behaviorResult.status === 'fulfilled' ? behaviorResult.value : null;

  if (thinkingResult.status === 'rejected') {
    errors.push(`Thinking analysis failed: ${thinkingResult.reason}`);
  }
  if (behaviorResult.status === 'rejected') {
    errors.push(`Behavior detection failed: ${behaviorResult.reason}`);
  }

  result.thinkingLevel = thinking?.level || null;
  result.behaviorsDetected = behavior?.patterns.map((p) => p.type) || [];

  // Step 4: Update journal with cognition data (if new info found)
  const cognitionUpdates: Record<string, unknown> = {};

  if (thinking) {
    // Merge thinking tags into existing thinking_patterns
    const existingThinking = journal.thinking_patterns || [];
    const newThinkingTags = [
      `thinking:${thinking.level}`,
      ...thinking.distortions.map((d) => `distortion:${d}`),
    ];
    const mergedThinking = [
      ...new Set([...existingThinking, ...newThinkingTags]),
    ];
    cognitionUpdates.thinking_patterns = mergedThinking;

    if (thinking.upgradeHint) {
      cognitionUpdates.ai_cognition_note = thinking.upgradeHint;
    }
  }

  if (behavior && behavior.patterns.length > 0) {
    // Merge behavior tags
    const existingBehavior = journal.behavior_patterns || [];
    const newBehaviorTags = behavior.patterns.map((p) => `behavior:${p.type}`);
    const mergedBehavior = [
      ...new Set([...existingBehavior, ...newBehaviorTags]),
    ];
    cognitionUpdates.behavior_patterns = mergedBehavior;
  }

  if (Object.keys(cognitionUpdates).length > 0) {
    try {
      await supabase
        .from('journals')
        .update(cognitionUpdates)
        .eq('id', journal.id);
    } catch (err) {
      errors.push(formatPipelineError('Journal cognition update', err));
    }
  }

  // Step 5: Habit loop creation (for each detected behavior with sufficient history)
  if (behavior && behavior.patterns.length > 0) {
    for (const pattern of behavior.patterns) {
      if (pattern.confidence >= 0.6) {
        try {
          const loop = await maybeCreateHabitLoop(
            supabase,
            userId,
            pattern.type,
            journal,
            pipelineModel,
            buildUsageContext('habit_loop_extract')
          );
          if (loop) {
            result.habitLoopCreated = true;
          }
        } catch (err) {
          errors.push(formatPipelineError(`Habit loop [${pattern.type}]`, err));
        }
      }
    }
  }

  // Step 6: Update cognition profile
  try {
    await updateCognitionProfile(
      supabase,
      userId,
      journal.themes,
      thinking
    );
  } catch (err) {
    errors.push(formatPipelineError('Profile update', err));
  }

  // Step 7: Tree node generation
  try {
    const node = await maybeGenerateNode(
      supabase,
      journal,
      userId,
      pipelineModel,
      buildUsageContext('tree_node_generation')
    );
    if (node) {
      result.treeNodeCreated = true;
    }
  } catch (err) {
    errors.push(formatPipelineError('Tree node generation', err));
  }

  // Step 8: Chapter generation (reuses `plan` resolved at pipeline start)
  try {
    if (getEntitlements(plan).chaptersEnabled) {
      const chapters = await maybeGenerateChapters(supabase, userId);
      result.chaptersCreated = chapters.length;
    }
  } catch (err) {
    errors.push(formatPipelineError('Chapter generation', err));
  }

  // Step 9: Action task sync
  try {
    const [{ data: profileData }, { data: loopsData }] = await Promise.all([
      supabase.from('profiles').select('*').eq('user_id', userId).single(),
      supabase.from('habit_loops').select('*').eq('user_id', userId),
    ]);
    const synced = await syncActionTasks(
      supabase,
      userId,
      (profileData as Profile | null) ?? null,
      (loopsData as HabitLoop[] | null) ?? []
    );
    result.actionTasksSynced = synced.length;
  } catch (err) {
    errors.push(formatPipelineError('Action task sync', err));
  }

  result.errors = errors;
  return result;
}
