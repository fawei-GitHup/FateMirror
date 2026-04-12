import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildAIRequestConfig,
  canServeAIRequest,
  getProviderDefaults,
  sanitizeUserAIConfig,
} from '../src/lib/ai/user-config.ts';

test('free plan defaults to managed deepseek when no user config is provided', () => {
  const config = buildAIRequestConfig('free', null);

  assert.equal(config.source, 'managed');
  assert.equal(config.model, 'deepseek-chat');
  assert.equal(config.provider, null);
});

test('user config overrides managed provider selection', () => {
  const config = buildAIRequestConfig('free', {
    provider: 'claude',
    apiKey: 'sk-ant-test',
    model: '',
  });

  assert.equal(config.source, 'user');
  assert.equal(config.provider, 'claude');
  assert.equal(config.model, 'claude-sonnet-4-5');
});

test('provider defaults expose expected endpoints and models', () => {
  const kimi = getProviderDefaults('kimi');
  const openRouter = getProviderDefaults('openrouter');
  const gemini = getProviderDefaults('gemini');

  assert.equal(kimi.baseUrl, 'https://api.moonshot.cn/v1');
  assert.equal(openRouter.baseUrl, 'https://openrouter.ai/api/v1');
  assert.equal(gemini.model, 'gemini-2.5-flash');
});

test('sanitize user config trims values and rejects incomplete payloads', () => {
  const sanitized = sanitizeUserAIConfig({
    provider: 'openai',
    apiKey: '  sk-test  ',
    model: '  gpt-4.1-mini  ',
    baseUrl: '  https://api.openai.com/v1/  ',
  });

  assert.deepEqual(sanitized, {
    provider: 'openai',
    apiKey: 'sk-test',
    model: 'gpt-4.1-mini',
    baseUrl: 'https://api.openai.com/v1',
  });

  assert.equal(
    sanitizeUserAIConfig({
      provider: 'openai',
      apiKey: '',
      model: '',
    }),
    null
  );
});

test('user supplied config makes ai request serviceable even without server keys', () => {
  const config = buildAIRequestConfig('free', {
    provider: 'deepseek',
    apiKey: 'sk-deepseek-test',
    model: '',
  });

  assert.equal(canServeAIRequest(false, config), true);
  assert.equal(
    canServeAIRequest(false, buildAIRequestConfig('free', null)),
    false
  );
});
