/**
 * Pattern Detection Engine
 *
 * Detects recurring life patterns by matching journal themes
 * using PostgreSQL array overlap queries.
 *
 * Core logic:
 * - Theme overlap >= 60% with historical journals
 * - Time span > 30 days (avoids false positives from same-week entries)
 * - >= 2 matching journals = loop detected
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Journal, Pattern } from '@/types';

export interface PatternMatch {
  patternId: string;
  matchedJournals: Journal[];
  similarity: number;
  userQuotes: string[];
  loopCount: number;
}

const OVERLAP_THRESHOLD = 0.6;
const MIN_DAY_SPAN = 30;
const MIN_MATCHES_FOR_PATTERN = 2;

/**
 * Compute array intersection.
 */
function intersect(a: string[], b: string[]): string[] {
  const setB = new Set(b);
  return a.filter((x) => setB.has(x));
}

/**
 * Days between two date strings.
 */
function daysBetween(dateA: string, dateB: string): number {
  const a = new Date(dateA).getTime();
  const b = new Date(dateB).getTime();
  return Math.abs(a - b) / (1000 * 60 * 60 * 24);
}

/**
 * Detect patterns for a newly saved journal.
 */
export async function detectPatterns(
  supabase: SupabaseClient,
  currentJournal: Journal,
  userId: string
): Promise<PatternMatch[]> {
  const currentThemes = currentJournal.themes;
  if (currentThemes.length === 0) return [];

  // Query historical journals with overlapping themes
  const { data: candidates } = await supabase
    .from('journals')
    .select('*')
    .eq('user_id', userId)
    .neq('id', currentJournal.id)
    .overlaps('themes', currentThemes)
    .order('created_at', { ascending: false })
    .limit(20);

  if (!candidates || candidates.length === 0) return [];

  // Filter by overlap threshold + time span
  const strongMatches = (candidates as Journal[]).filter((j) => {
    const overlap = intersect(j.themes, currentThemes);
    const overlapRatio = overlap.length / currentThemes.length;
    const days = daysBetween(j.created_at, currentJournal.created_at);
    return overlapRatio >= OVERLAP_THRESHOLD && days > MIN_DAY_SPAN;
  });

  if (strongMatches.length < MIN_MATCHES_FOR_PATTERN) return [];

  // Find or create pattern record
  const pattern = await findOrCreatePattern(
    supabase,
    userId,
    currentThemes,
    currentJournal,
    strongMatches
  );

  // Collect user's own past quotes
  const userQuotes = strongMatches
    .flatMap((j) => j.insights)
    .filter(Boolean)
    .slice(0, 10);

  // Compute average similarity
  const avgSimilarity =
    strongMatches.reduce((sum, j) => {
      const overlap = intersect(j.themes, currentThemes);
      return sum + overlap.length / currentThemes.length;
    }, 0) / strongMatches.length;

  return [
    {
      patternId: pattern.id,
      matchedJournals: strongMatches,
      similarity: avgSimilarity,
      userQuotes,
      loopCount: pattern.trigger_count,
    },
  ];
}

/**
 * Find existing pattern or create a new one.
 */
async function findOrCreatePattern(
  supabase: SupabaseClient,
  userId: string,
  themes: string[],
  currentJournal: Journal,
  matchedJournals: Journal[]
): Promise<Pattern> {
  // Look for existing pattern with similar themes
  const { data: existingPatterns } = await supabase
    .from('patterns')
    .select('*')
    .eq('user_id', userId)
    .overlaps('themes', themes);

  if (existingPatterns && existingPatterns.length > 0) {
    // Find best matching existing pattern
    const best = (existingPatterns as Pattern[]).reduce((best, p) => {
      const overlap = intersect(p.themes, themes).length;
      const bestOverlap = intersect(best.themes, themes).length;
      return overlap > bestOverlap ? p : best;
    });

    // Update existing pattern
    const allJournalIds = [
      ...new Set([...best.journal_ids, currentJournal.id]),
    ];
    const allQuotes = [
      ...new Set([...best.user_quotes, ...currentJournal.insights]),
    ].slice(0, 20);

    const { data } = await supabase
      .from('patterns')
      .update({
        trigger_count: best.trigger_count + 1,
        last_seen: currentJournal.created_at,
        journal_ids: allJournalIds,
        user_quotes: allQuotes,
      })
      .eq('id', best.id)
      .select()
      .single();

    return (data as Pattern) || best;
  }

  // Create new pattern
  const name = themes.slice(0, 3).join(' + ');
  const allJournalIds = [
    currentJournal.id,
    ...matchedJournals.map((j) => j.id),
  ];
  const allQuotes = [
    ...currentJournal.insights,
    ...matchedJournals.flatMap((j) => j.insights),
  ]
    .filter(Boolean)
    .slice(0, 20);

  const { data } = await supabase
    .from('patterns')
    .insert({
      user_id: userId,
      name,
      themes,
      trigger_count: matchedJournals.length + 1,
      first_seen: matchedJournals[matchedJournals.length - 1].created_at,
      last_seen: currentJournal.created_at,
      status: 'active',
      journal_ids: allJournalIds,
      user_quotes: allQuotes,
    })
    .select()
    .single();

  return data as Pattern;
}
