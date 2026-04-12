import test from 'node:test';
import assert from 'node:assert/strict';
import { deriveSettingsAIState } from '../src/lib/ai/settings-status.ts';
import type { AIProviderStatus } from '../src/lib/ai/status.ts';
import type { UserAIConfig } from '../src/lib/ai/user-config.ts';

const unavailableStatus: AIProviderStatus = {
  available: false,
  primaryProvider: 'none',
  primaryModel: null,
  freeModel: null,
  fallbackProvider: null,
  fallbackModel: null,
  openAIBaseUrl: null,
  usesCustomOpenAIBaseUrl: false,
  freeGuidedSessionsPerDay: 3,
  missingEnvVars: ['ANTHROPIC_API_KEY', 'OPENAI_API_KEY', 'DEEPSEEK_API_KEY'],
};

const browserConfig: UserAIConfig = {
  provider: 'deepseek',
  apiKey: 'sk-test',
  model: 'deepseek-chat',
  baseUrl: 'https://api.deepseek.com/v1',
};

test('settings ai state treats browser-local key as ready even when server ai is unavailable', () => {
  const state = deriveSettingsAIState(unavailableStatus, browserConfig);

  assert.equal(state.ready, true);
  assert.equal(state.showSetupHint, false);
  assert.equal(state.primaryProviderLabelKey, 'aiProviderOpenAICompatible');
  assert.equal(state.primaryModel, 'deepseek-chat');
  assert.equal(state.statusLabelKey, 'customAiSaved');
});

test('settings ai state keeps server-managed unavailable copy when no browser key exists', () => {
  const state = deriveSettingsAIState(unavailableStatus, null);

  assert.equal(state.ready, false);
  assert.equal(state.showSetupHint, true);
  assert.equal(state.primaryProviderLabelKey, 'aiProviderNone');
  assert.equal(state.primaryModel, 'aiNotConfigured');
  assert.equal(state.statusLabelKey, 'aiUnavailable');
});
