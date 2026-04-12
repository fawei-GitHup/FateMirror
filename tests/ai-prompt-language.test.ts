import test from 'node:test';
import assert from 'node:assert/strict';
import { TAG_EXTRACT_PROMPT } from '../src/lib/ai/prompts/tag-extract.ts';
import { GUIDED_SESSION_PROMPT } from '../src/lib/ai/prompts/guided-session.ts';

test('tag extraction prompt requires user-visible fields to follow input language', () => {
  assert.match(TAG_EXTRACT_PROMPT, /Match the user's language for all user-visible fields/);
  assert.match(TAG_EXTRACT_PROMPT, /thinking_patterns must use thinking:L1-L4/);
});

test('guided session prompt keeps visible extract fields in user language and internal tags as codes', () => {
  assert.match(GUIDED_SESSION_PROMPT, /Language rules for journal_extract/);
  assert.match(GUIDED_SESSION_PROMPT, /behavior_patterns must use behavior:\* codes/);
});
