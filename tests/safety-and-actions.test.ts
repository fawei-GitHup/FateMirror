import test from 'node:test';
import assert from 'node:assert/strict';
import { detectCrisisLanguage, getCrisisSupportMessage } from '../src/lib/safety/crisis-detection.ts';
import { buildMicroActions } from '../src/lib/actions/micro-actions.ts';

test('crisis detection catches direct self-harm language', () => {
  assert.equal(detectCrisisLanguage('I want to kill myself tonight.'), true);
  assert.equal(detectCrisisLanguage('我真的不想活了。'), true);
  assert.equal(detectCrisisLanguage('I feel low, but I am safe.'), false);
  assert.match(getCrisisSupportMessage(), /988/);
});

test('micro actions reflect thinking level, behavior pattern, and active loop', () => {
  const actions = buildMicroActions(
    {
      id: 'profile-1',
      user_id: 'user-1',
      display_name: 'Test',
      level: 3,
      level_name: 'Mirror',
      life_context: null,
      personality: null,
      core_values: [],
      thinking_level_overall: 'L2',
      thinking_levels_by_theme: {},
      thinking_distortions: [],
      behavior_primary: 'please',
      behavior_secondary: null,
      behavior_scores: {},
      mindset_scores: {},
      cognition_version: 2,
      cognition_updated_at: null,
      created_at: '2026-04-06T00:00:00.000Z',
      updated_at: '2026-04-06T00:00:00.000Z',
    },
    [
      {
        id: 'loop-1',
        user_id: 'user-1',
        name: 'Conflict appeasement',
        cue: 'Someone sounds disappointed',
        craving: 'Relief',
        response: 'Say yes immediately',
        reward: 'Short-term peace',
        hidden_cost: 'Resentment',
        behavior_type: 'please',
        thinking_type: null,
        trigger_count: 4,
        first_seen: '2026-03-01T00:00:00.000Z',
        last_seen: '2026-04-01T00:00:00.000Z',
        status: 'active',
        pattern_id: null,
        journal_ids: [],
        user_quotes: [],
        breaking_since: null,
        created_at: '2026-03-01T00:00:00.000Z',
      },
    ]
  );

  assert.equal(actions.length, 3);
  assert.match(actions[0].title, /Map/i);
  assert.match(actions[1].title, /No/i);
  assert.match(actions[2].title, /Interrupt/i);
});
