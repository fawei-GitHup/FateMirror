import type { Journal, Pattern } from '@/types';

interface PatternAlertPattern {
  id: string;
  name: string;
  description: string | null;
  status: Pattern['status'];
  trigger_count: number;
}

export interface PatternAlertSummary {
  headline: string;
  patterns: PatternAlertPattern[];
  quotes: string[];
}

export function buildPatternAlert(
  journal: Pick<Journal, 'loop_count' | 'pattern_ids'>,
  patterns: Array<Pick<Pattern, 'id' | 'name' | 'description' | 'status' | 'trigger_count' | 'user_quotes'>>
) {
  if (!journal.loop_count || patterns.length === 0) {
    return null;
  }

  const matchedPatterns = patterns
    .filter((pattern) => journal.pattern_ids.includes(pattern.id))
    .sort((left, right) => right.trigger_count - left.trigger_count);

  if (matchedPatterns.length === 0) {
    return null;
  }

  const quotes = [...new Set(
    matchedPatterns
      .flatMap((pattern) => pattern.user_quotes)
      .map((quote) => quote.trim())
      .filter(Boolean)
  )].slice(0, 3);

  return {
    headline: `This entry reactivated ${journal.loop_count} known loop${journal.loop_count === 1 ? '' : 's'}.`,
    patterns: matchedPatterns.map((pattern) => ({
      id: pattern.id,
      name: pattern.name,
      description: pattern.description,
      status: pattern.status,
      trigger_count: pattern.trigger_count,
    })),
    quotes,
  } satisfies PatternAlertSummary;
}
