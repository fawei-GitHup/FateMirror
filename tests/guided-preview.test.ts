import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildGuidedJournalPayload,
  buildGuidedTranscript,
} from '../src/lib/journal/guided-preview.ts';

test('buildGuidedTranscript keeps only user messages in order', () => {
  const transcript = buildGuidedTranscript([
    { role: 'assistant', content: 'hello' },
    { role: 'user', content: ' first thought ' },
    { role: 'assistant', content: 'go on' },
    { role: 'user', content: 'second thought' },
  ]);

  assert.equal(transcript, 'first thought\n\nsecond thought');
});

test('buildGuidedJournalPayload normalizes extracted arrays', () => {
  const payload = buildGuidedJournalPayload(
    {
      title: 'Test title',
      emotions: ['anxiety'],
      themes: ['work'],
      decisions: ['rest'],
      insights: ['"I am tired"'],
      thinking_patterns: ['thinking:L2'],
      behavior_patterns: ['behavior:avoid'],
      ai_summary: 'summary',
    },
    'transcript body'
  );

  assert.deepEqual(payload, {
    title: 'Test title',
    content: 'transcript body',
    mode: 'guided',
    emotions: ['anxiety'],
    themes: ['work'],
    decisions: ['rest'],
    insights: ['"I am tired"'],
    thinking_patterns: ['thinking:L2'],
    behavior_patterns: ['behavior:avoid'],
    ai_summary: 'summary',
  });
});
