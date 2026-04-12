import test from 'node:test';
import assert from 'node:assert/strict';
import { getAIProviderStatus } from '../src/lib/ai/status.ts';

test('ai status prefers anthropic and exposes openai-compatible fallback', () => {
  const status = getAIProviderStatus({
    ANTHROPIC_API_KEY: 'test-anthropic',
    AI_PRIMARY_MODEL: 'claude-test',
    OPENAI_API_KEY: 'test-openai',
    OPENAI_MODEL: 'gpt-test',
    OPENAI_BASE_URL: 'https://openrouter.example/v1',
  } as unknown as NodeJS.ProcessEnv);

  assert.equal(status.available, true);
  assert.equal(status.primaryProvider, 'anthropic');
  assert.equal(status.primaryModel, 'claude-test');
  assert.equal(status.fallbackProvider, 'openai-compatible');
  assert.equal(status.fallbackModel, 'gpt-test');
  assert.equal(status.usesCustomOpenAIBaseUrl, true);
  assert.deepEqual(status.missingEnvVars, []);
});

test('ai status reports missing configuration when no provider is available', () => {
  const status = getAIProviderStatus({} as unknown as NodeJS.ProcessEnv);

  assert.equal(status.available, false);
  assert.equal(status.primaryProvider, 'none');
  assert.equal(status.primaryModel, null);
  assert.equal(status.fallbackProvider, null);
  assert.equal(status.fallbackModel, null);
  assert.deepEqual(status.missingEnvVars, ['ANTHROPIC_API_KEY', 'OPENAI_API_KEY', 'DEEPSEEK_API_KEY']);
});

test('ai status treats deepseek-only setup as available openai-compatible access', () => {
  const status = getAIProviderStatus({
    DEEPSEEK_API_KEY: 'test-deepseek',
    AI_FREE_MODEL: 'deepseek-chat',
  } as unknown as NodeJS.ProcessEnv);

  assert.equal(status.available, true);
  assert.equal(status.primaryProvider, 'openai-compatible');
  assert.equal(status.primaryModel, 'deepseek-chat');
});
