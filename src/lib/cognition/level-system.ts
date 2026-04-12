export const LEVEL_NAMES = {
  0: 'Sleeper',
  1: 'Seedling',
  2: 'Observer',
  3: 'Mirror',
  4: 'Breaker',
  5: 'Rooted',
  6: 'Mirror Master',
} as const;

export interface LevelStateInput {
  journalCount: number;
  cognitionVersion: number;
  patternCount: number;
  breakingLoops: string[];
  brokenLoopCount: number;
  now?: string;
}

export interface LevelState {
  level: keyof typeof LEVEL_NAMES;
  levelName: (typeof LEVEL_NAMES)[keyof typeof LEVEL_NAMES];
}

function hasLoopForDays(
  loopStartDates: string[],
  now: string,
  minimumDays: number
): boolean {
  const nowValue = new Date(now).getTime();

  return loopStartDates.some((date) => {
    const start = new Date(date).getTime();
    if (Number.isNaN(start)) {
      return false;
    }

    const ageInDays = (nowValue - start) / (1000 * 60 * 60 * 24);
    return ageInDays >= minimumDays;
  });
}

export function deriveLevelState(input: LevelStateInput): LevelState {
  const now = input.now ?? new Date().toISOString();
  let level: keyof typeof LEVEL_NAMES = 0;

  if (input.journalCount >= 1) {
    level = 1;
  }

  if (input.journalCount >= 7 && input.cognitionVersion >= 1) {
    level = 2;
  }

  if (input.patternCount >= 1) {
    level = 3;
  }

  if (
    input.patternCount >= 1 &&
    hasLoopForDays(input.breakingLoops, now, 7)
  ) {
    level = 4;
  }

  if (
    input.brokenLoopCount >= 1 &&
    hasLoopForDays(input.breakingLoops, now, 30)
  ) {
    level = 5;
  }

  if (input.brokenLoopCount >= 3) {
    level = 6;
  }

  return {
    level,
    levelName: LEVEL_NAMES[level],
  };
}
