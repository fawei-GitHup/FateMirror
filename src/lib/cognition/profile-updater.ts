/**
 * Cognition Profile Updater — incrementally updates user's cognition profile
 * after each journal entry.
 *
 * Updates: thinking level, behavior scores, top distortions, cognition version.
 * Uses sliding window of recent 20 journals for stability.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { ThinkingLevel } from '@/types';
import type { ThinkingAnalysis } from '@/types/cognition';
import { deriveLevelState, LEVEL_NAMES } from '@/lib/cognition/level-system';
import { capLevelForPlan, resolvePlan } from '@/lib/billing/entitlements';
import type { Subscription } from '@/types';

const SLIDING_WINDOW = 20;

// Numeric mapping for weighted level computation
const LEVEL_MAP: Record<ThinkingLevel, number> = { L1: 1, L2: 2, L3: 3, L4: 4 };
const REVERSE_LEVEL: Record<number, ThinkingLevel> = { 1: 'L1', 2: 'L2', 3: 'L3', 4: 'L4' };

/**
 * Update the user's cognition profile after a journal is processed.
 */
export async function updateCognitionProfile(
  supabase: SupabaseClient,
  userId: string,
  journalThemes: string[],
  thinkingAnalysis: ThinkingAnalysis | null
): Promise<void> {
  // Fetch current profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (!profile) return;

  // Fetch recent journals for sliding window computation
  const { data: recentJournals } = await supabase
    .from('journals')
    .select('thinking_patterns, behavior_patterns')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(SLIDING_WINDOW);

  const journals = recentJournals || [];

  // 1. Compute overall thinking level (weighted: recent entries count more)
  const thinkingLevels: ThinkingLevel[] = journals
    .flatMap((j: { thinking_patterns?: string[] | null }) =>
      (j.thinking_patterns ?? [])
        .filter((t: string) => t.startsWith('thinking:'))
        .map((t: string) => t.replace('thinking:', '') as ThinkingLevel)
    )
    .filter((l: string) => l in LEVEL_MAP);

  let overallLevel: ThinkingLevel = profile.thinking_level_overall || 'L1';
  if (thinkingLevels.length > 0) {
    // Weighted average: most recent gets highest weight
    let weightedSum = 0;
    let weightTotal = 0;
    thinkingLevels.forEach((level, i) => {
      const weight = thinkingLevels.length - i; // newer = higher weight
      weightedSum += LEVEL_MAP[level] * weight;
      weightTotal += weight;
    });
    const avg = weightedSum / weightTotal;
    const clamped = Math.min(4, Math.max(1, Math.round(avg)));
    overallLevel = REVERSE_LEVEL[clamped] ?? 'L1';
  }

  // 2. Update per-theme thinking levels
  const thinkingByTheme = { ...(profile.thinking_levels_by_theme || {}) };
  if (thinkingAnalysis) {
    for (const theme of journalThemes) {
      thinkingByTheme[theme] = thinkingAnalysis.level;
    }
  }

  // 3. Compute behavior scores from sliding window
  const behaviorCounts: Record<string, number> = {};
  let totalBehaviorTags = 0;

  for (const j of journals) {
    const behaviors = (j as { behavior_patterns?: string[] | null }).behavior_patterns ?? [];
    for (const b of behaviors) {
      const type = b.replace('behavior:', '');
      behaviorCounts[type] = (behaviorCounts[type] || 0) + 1;
      totalBehaviorTags++;
    }
  }

  const behaviorScores: Record<string, number> = {};
  for (const [type, count] of Object.entries(behaviorCounts)) {
    behaviorScores[type] = totalBehaviorTags > 0 ? count / totalBehaviorTags : 0;
  }

  // Sort by score to find primary/secondary
  const sorted = Object.entries(behaviorScores).sort(([, a], [, b]) => b - a);
  const behaviorPrimary = sorted[0]?.[0] || null;
  const behaviorSecondary = sorted[1]?.[0] || null;

  // 4. Top cognitive distortions
  const distortionCounts: Record<string, number> = {};
  for (const j of journals) {
    const patterns = (j as { thinking_patterns?: string[] | null }).thinking_patterns ?? [];
    for (const t of patterns) {
      if (t.startsWith('distortion:')) {
        const d = t.replace('distortion:', '');
        distortionCounts[d] = (distortionCounts[d] || 0) + 1;
      }
    }
  }
  const topDistortions = Object.entries(distortionCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([d]) => d);

  // 5. Write updated profile
  // Use Promise.allSettled to prevent one failed query from breaking the whole update
  const settled = await Promise.allSettled([
    supabase
      .from('journals')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId),
    supabase
      .from('patterns')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId),
    supabase
      .from('habit_loops')
      .select('status, breaking_since')
      .eq('user_id', userId),
    supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle(),
  ]);

  const journalCount = settled[0].status === 'fulfilled' ? settled[0].value.count : 0;
  const patternCount = settled[1].status === 'fulfilled' ? settled[1].value.count : 0;
  const loopData = settled[2].status === 'fulfilled' ? settled[2].value.data : null;
  const subscriptionData = settled[3].status === 'fulfilled' ? settled[3].value.data : null;

  const loops = loopData ?? [];
  const rawLevelState = deriveLevelState({
    journalCount: journalCount ?? 0,
    cognitionVersion: (profile.cognition_version || 0) + 1,
    patternCount: patternCount ?? 0,
    breakingLoops: loops
      .map((loop: { breaking_since?: string | null }) => loop.breaking_since)
      .filter((value: string | null | undefined): value is string => Boolean(value)),
    brokenLoopCount: loops.filter((loop: { status: string }) => loop.status === 'broken').length,
  });
  const plan = resolvePlan((subscriptionData as Subscription | null) ?? null);
  const cappedLevel = capLevelForPlan(
    rawLevelState.level,
    plan
  ) as keyof typeof LEVEL_NAMES;
  const levelState = {
    level: cappedLevel,
    levelName: LEVEL_NAMES[cappedLevel],
  };

  await supabase
    .from('profiles')
    .update({
      level: levelState.level,
      level_name: levelState.levelName,
      thinking_level_overall: overallLevel,
      thinking_levels_by_theme: thinkingByTheme,
      thinking_distortions: topDistortions,
      behavior_primary: behaviorPrimary,
      behavior_secondary: behaviorSecondary,
      behavior_scores: behaviorScores,
      cognition_version: (profile.cognition_version || 0) + 1,
      cognition_updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);
}
