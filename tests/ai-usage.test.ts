import test from 'node:test';
import assert from 'node:assert/strict';
import {
  estimateAIUsageCostUsd,
  getDailyAIUsageDecision,
  getDailyAIUsageSummary,
  recordAIUsageEvent,
  summarizeAIUsageEvents,
  type AIUsageEventLike,
} from '../src/lib/ai/usage.ts';
import { getEntitlements } from '../src/lib/billing/entitlements.ts';

test('deepseek chat cost uses the configured low-cost pricing table', () => {
  const cost = estimateAIUsageCostUsd({
    provider: 'deepseek',
    model: 'deepseek-chat',
    inputTokens: 2_000,
    outputTokens: 500,
    cachedInputTokens: 0,
    usedUserKey: false,
  });

  assert.equal(cost.estimatedCostUsd, 0.00077);
  assert.equal(cost.platformCostUsd, 0.00077);
});

test('user-provided key keeps estimated cost but zeroes platform spend', () => {
  const cost = estimateAIUsageCostUsd({
    provider: 'deepseek',
    model: 'deepseek-chat',
    inputTokens: 2_000,
    outputTokens: 500,
    cachedInputTokens: 0,
    usedUserKey: true,
  });

  assert.equal(cost.estimatedCostUsd, 0.00077);
  assert.equal(cost.platformCostUsd, 0);
});

test('usage summary aggregates request count, tokens, and platform spend', () => {
  const events: AIUsageEventLike[] = [
    {
      request_count: 1,
      input_tokens: 2_000,
      output_tokens: 500,
      cached_input_tokens: 0,
      estimated_cost_usd: 0.00077,
      platform_cost_usd: 0.00077,
      used_user_key: false,
    },
    {
      request_count: 1,
      input_tokens: 1_500,
      output_tokens: 250,
      cached_input_tokens: 500,
      estimated_cost_usd: 0.00035,
      platform_cost_usd: 0,
      used_user_key: true,
    },
  ];

  assert.deepEqual(summarizeAIUsageEvents(events), {
    requestCount: 2,
    inputTokens: 3_500,
    outputTokens: 750,
    cachedInputTokens: 500,
    estimatedCostUsd: 0.00112,
    platformCostUsd: 0.00077,
  });
});

test('free plan daily AI decision blocks requests once any hard limit is exceeded', () => {
  const free = getEntitlements('free');

  const allowed = getDailyAIUsageDecision(
    {
      requestCount: free.aiRequestsPerDay! - 1,
      inputTokens: free.aiTokensPerDay! - 100,
      outputTokens: 0,
      cachedInputTokens: 0,
      estimatedCostUsd: 0.001,
      platformCostUsd: free.aiCostUsdPerDay! - 0.001,
    },
    free,
    false
  );

  const blocked = getDailyAIUsageDecision(
    {
      requestCount: free.aiRequestsPerDay!,
      inputTokens: 0,
      outputTokens: 0,
      cachedInputTokens: 0,
      estimatedCostUsd: 0,
      platformCostUsd: 0,
    },
    free,
    false
  );

  const bypassed = getDailyAIUsageDecision(
    {
      requestCount: free.aiRequestsPerDay!,
      inputTokens: free.aiTokensPerDay!,
      outputTokens: 0,
      cachedInputTokens: 0,
      estimatedCostUsd: free.aiCostUsdPerDay!,
      platformCostUsd: free.aiCostUsdPerDay!,
    },
    free,
    true
  );

  assert.equal(allowed.allowed, true);
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.reason, 'daily_request_limit');
  assert.equal(bypassed.allowed, true);
});

test('daily usage summary fails open when usage table is unavailable', async () => {
  const supabase = {
    from() {
      return {
        select() {
          return {
            eq() {
              return {
                gte: async () => ({
                  data: null,
                  error: {
                    code: 'PGRST205',
                    message: "Could not find the table 'public.ai_usage_events' in the schema cache",
                  },
                }),
              };
            },
          };
        },
      };
    },
  };

  const summary = await getDailyAIUsageSummary(supabase as never, 'user-1', '2026-04-08T00:00:00.000Z');

  assert.deepEqual(summary, {
    requestCount: 0,
    inputTokens: 0,
    outputTokens: 0,
    cachedInputTokens: 0,
    estimatedCostUsd: 0,
    platformCostUsd: 0,
  });
});

test('recording usage no-ops when usage table is unavailable', async () => {
  let insertCalled = false;
  const supabase = {
    from() {
      return {
        insert: async () => {
          insertCalled = true;
          return {
            error: {
              code: 'PGRST205',
              message: "Could not find the table 'public.ai_usage_events' in the schema cache",
            },
          };
        },
      };
    },
  };

  await recordAIUsageEvent(supabase as never, {
    userId: 'user-1',
    feature: 'chat',
    plan: 'free',
    provider: 'deepseek',
    model: 'deepseek-chat',
    inputTokens: 1000,
    outputTokens: 200,
    usedUserKey: false,
  });

  assert.equal(insertCalled, true);
});
