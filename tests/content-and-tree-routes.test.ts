import test from 'node:test';
import assert from 'node:assert/strict';

import { buildJournalUpdatePayload } from '../src/lib/journal/update-payload.ts';
import { parseTagInput } from '../src/lib/editor/tag-input.ts';
import {
  buildChapterDetail,
  buildChapterSummaries,
} from '../src/lib/chapters/serializers.ts';
import {
  buildLifeNodeCreatePayload,
  buildLifeNodePatchPayload,
} from '../src/lib/tree/node-mutations.ts';
import { attachJournalPreviewsToLayout } from '../src/lib/tree/node-journal-map.ts';
import { buildPatternAlert } from '../src/lib/pattern/pattern-alert.ts';

test('buildJournalUpdatePayload trims content and recomputes metadata', () => {
  const payload = buildJournalUpdatePayload({
    title: '  Revised title  ',
    content: '  First line\nSecond line  ',
  });

  assert.equal(payload.title, 'Revised title');
  assert.equal(payload.content, 'First line\nSecond line');
  assert.equal(payload.word_count, 4);
  assert.equal(payload.language, 'en');
});

test('buildJournalUpdatePayload normalizes editable tag arrays', () => {
  const payload = buildJournalUpdatePayload({
    emotions: ['  shame ', 'shame', ' relief '],
    themes: ['career', '', 'career', 'family'],
    decisions: ['leave', ' leave '],
  });

  assert.deepEqual(payload.emotions, ['shame', 'relief']);
  assert.deepEqual(payload.themes, ['career', 'family']);
  assert.deepEqual(payload.decisions, ['leave']);
});

test('parseTagInput splits comma and newline separated values', () => {
  assert.deepEqual(
    parseTagInput('work, family\nclarity, work'),
    ['work', 'family', 'clarity']
  );
});

test('buildPatternAlert summarizes the most relevant matched patterns', () => {
  const alert = buildPatternAlert(
    {
      loop_count: 2,
      pattern_ids: ['pattern-2', 'pattern-1'],
    } as never,
    [
      {
        id: 'pattern-1',
        name: 'Approval loop',
        description: 'You trade honesty for harmony.',
        trigger_count: 4,
        status: 'active',
        user_quotes: ['If I say what I want, they will leave.'],
      },
      {
        id: 'pattern-2',
        name: 'Overwork spiral',
        description: 'Rest feels unsafe when pressure rises.',
        trigger_count: 8,
        status: 'breaking',
        user_quotes: ['I can rest after I earn it.'],
      },
    ] as never
  );

  assert.equal(alert?.headline, 'This entry reactivated 2 known loops.');
  assert.equal(alert?.patterns[0].id, 'pattern-2');
  assert.equal(alert?.quotes[0], 'I can rest after I earn it.');
});

test('buildChapterSummaries attaches journal and node counts with journal previews', () => {
  const chapters = [
    {
      id: 'chapter-1',
      number: 1,
      title: 'Restart',
      subtitle: null,
      date_start: '2026-01-01',
      date_end: '2026-01-31',
      themes: ['work'],
      ai_narrative: 'A reset month',
      status: 'open',
      created_at: '2026-02-01',
      user_id: 'user-1',
    },
  ];
  const journals = [
    { id: 'j-1', title: 'Entry A', created_at: '2026-01-03', user_id: 'user-1' },
    { id: 'j-2', title: 'Entry B', created_at: '2026-01-10', user_id: 'user-1' },
    { id: 'j-3', title: 'Entry C', created_at: '2026-02-10', user_id: 'user-1' },
  ];
  const nodes = [
    { id: 'n-1', chapter_id: 'chapter-1' },
    { id: 'n-2', chapter_id: 'chapter-1' },
  ];

  const summaries = buildChapterSummaries(chapters as never, journals as never, nodes as never);

  assert.equal(summaries.length, 1);
  assert.equal(summaries[0].journal_count, 2);
  assert.equal(summaries[0].life_node_count, 2);
  assert.equal(summaries[0].journals.length, 2);
  assert.equal(summaries[0].journals[0].id, 'j-1');
});

test('buildChapterDetail returns chapter stats and complete journal list', () => {
  const chapter = {
    id: 'chapter-1',
    number: 1,
    title: 'Restart',
    subtitle: null,
    date_start: '2026-01-01',
    date_end: '2026-01-31',
    themes: ['work'],
    ai_narrative: 'A reset month',
    status: 'open',
    created_at: '2026-02-01',
    user_id: 'user-1',
  };
  const journals = [
    { id: 'j-1', title: 'Entry A', created_at: '2026-01-03', user_id: 'user-1' },
    { id: 'j-2', title: 'Entry B', created_at: '2026-01-10', user_id: 'user-1' },
  ];
  const nodes = [{ id: 'n-1', chapter_id: 'chapter-1' }];

  const detail = buildChapterDetail(chapter as never, journals as never, nodes as never);

  assert.equal(detail.journal_count, 2);
  assert.equal(detail.life_node_count, 1);
  assert.equal(detail.journals[1].title, 'Entry B');
});

test('buildLifeNodeCreatePayload normalizes arrays and root parent handling', () => {
  const payload = buildLifeNodeCreatePayload('user-1', {
    title: 'New branch',
    type: 'choice',
    date: '2026-04-06',
    themes: ['work', 'work', 'focus'],
    emotions: ['hopeful', 'hopeful'],
    status: 'active',
  });

  assert.equal(payload.user_id, 'user-1');
  assert.equal(payload.parent_id, null);
  assert.deepEqual(payload.themes, ['work', 'focus']);
  assert.deepEqual(payload.emotions, ['hopeful']);
  assert.deepEqual(payload.journal_ids, []);
});

test('buildLifeNodePatchPayload only includes provided mutable fields', () => {
  const payload = buildLifeNodePatchPayload({
    title: 'Updated title',
    journal_ids: ['j-1', 'j-1', 'j-2'],
    status: 'resolved',
  });

  assert.deepEqual(payload, {
    title: 'Updated title',
    journal_ids: ['j-1', 'j-2'],
    status: 'resolved',
  });
});

test('attachJournalPreviewsToLayout maps journal previews onto matching layout nodes', () => {
  const layout = {
    nodes: [
      {
        id: 'node-1',
        title: 'Node 1',
        type: 'choice',
        status: 'active',
        themes: [],
        emotions: [],
        date: '2026-04-06',
        aiSummary: null,
        x: 0,
        y: 0,
        depth: 0,
        parentId: null,
        journalIds: ['j-1', 'j-2'],
      },
    ],
    links: [],
    patternLinks: [],
    width: 800,
    height: 600,
  };

  const enriched = attachJournalPreviewsToLayout(layout as never, [
    { id: 'j-1', title: 'First', created_at: '2026-04-01' },
    { id: 'j-2', title: 'Second', created_at: '2026-04-02' },
  ] as never);

  assert.equal(enriched.nodes[0].journals?.length, 2);
  assert.equal(enriched.nodes[0].journals?.[0].title, 'First');
});
