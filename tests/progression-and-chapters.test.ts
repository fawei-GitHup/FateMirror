import test from 'node:test';
import assert from 'node:assert/strict';
import {
  deriveLevelState,
  LEVEL_NAMES,
} from '../src/lib/cognition/level-system.ts';
import {
  buildChapterDraft,
  pickUnchapteredJournalBatch,
} from '../src/lib/chapters/chapter-generator.ts';

test('level progression follows journal, pattern, and loop milestones', () => {
  assert.deepEqual(
    deriveLevelState({
      journalCount: 0,
      cognitionVersion: 0,
      patternCount: 0,
      breakingLoops: [],
      brokenLoopCount: 0,
    }),
    { level: 0, levelName: LEVEL_NAMES[0] },
  );

  assert.deepEqual(
    deriveLevelState({
      journalCount: 1,
      cognitionVersion: 0,
      patternCount: 0,
      breakingLoops: [],
      brokenLoopCount: 0,
    }),
    { level: 1, levelName: LEVEL_NAMES[1] },
  );

  assert.deepEqual(
    deriveLevelState({
      journalCount: 7,
      cognitionVersion: 1,
      patternCount: 0,
      breakingLoops: [],
      brokenLoopCount: 0,
    }),
    { level: 2, levelName: LEVEL_NAMES[2] },
  );

  assert.deepEqual(
    deriveLevelState({
      journalCount: 9,
      cognitionVersion: 3,
      patternCount: 1,
      breakingLoops: [],
      brokenLoopCount: 0,
    }),
    { level: 3, levelName: LEVEL_NAMES[3] },
  );

  assert.deepEqual(
    deriveLevelState({
      journalCount: 14,
      cognitionVersion: 5,
      patternCount: 2,
      breakingLoops: ['2026-03-25T00:00:00.000Z'],
      brokenLoopCount: 0,
      now: '2026-04-06T00:00:00.000Z',
    }),
    { level: 4, levelName: LEVEL_NAMES[4] },
  );

  assert.deepEqual(
    deriveLevelState({
      journalCount: 32,
      cognitionVersion: 9,
      patternCount: 2,
      breakingLoops: ['2026-02-20T00:00:00.000Z'],
      brokenLoopCount: 1,
      now: '2026-04-06T00:00:00.000Z',
    }),
    { level: 5, levelName: LEVEL_NAMES[5] },
  );

  assert.deepEqual(
    deriveLevelState({
      journalCount: 90,
      cognitionVersion: 18,
      patternCount: 4,
      breakingLoops: ['2026-01-01T00:00:00.000Z', '2026-01-15T00:00:00.000Z'],
      brokenLoopCount: 3,
      now: '2026-04-06T00:00:00.000Z',
    }),
    { level: 6, levelName: LEVEL_NAMES[6] },
  );
});

test('chapter generation waits for 15 uncovered journals and summarizes top themes', () => {
  const journals = Array.from({ length: 16 }, (_, index) => ({
    id: `journal-${index + 1}`,
    created_at: `2026-01-${String(index + 1).padStart(2, '0')}T00:00:00.000Z`,
    themes: index < 10 ? ['money', 'relationship'] : ['career', 'money'],
    emotions: index < 8 ? ['anxiety'] : ['clarity'],
    title: null,
  }));

  const batch = pickUnchapteredJournalBatch(journals, null);
  assert.equal(batch?.length, 15);
  assert.equal(batch?.[0].id, 'journal-1');
  assert.equal(batch?.at(-1)?.id, 'journal-15');

  const draft = buildChapterDraft(batch!, 1);
  assert.equal(draft.number, 1);
  assert.equal(draft.date_start, '2026-01-01');
  assert.equal(draft.date_end, '2026-01-15');
  assert.deepEqual(draft.themes.slice(0, 2), ['money', 'relationship']);
  assert.match(draft.title, /Money/i);
  assert.match(draft.ai_narrative, /money/i);
});

test('chapter generation skips journals already covered by the latest chapter', () => {
  const journals = Array.from({ length: 20 }, (_, index) => ({
    id: `journal-${index + 1}`,
    created_at: `2026-02-${String(index + 1).padStart(2, '0')}T00:00:00.000Z`,
    themes: ['identity'],
    emotions: ['focus'],
    title: null,
  }));

  const batch = pickUnchapteredJournalBatch(journals, '2026-02-10');
  assert.equal(batch, null);
});
