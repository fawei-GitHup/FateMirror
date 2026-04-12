import type { SupabaseClient } from '@supabase/supabase-js';
import type { Entitlements } from '@/lib/billing/entitlements';

const PRICING_BY_PREFIX = [
  {
    match: (provider: string | null | undefined, model: string) =>
      provider === 'deepseek' || model.startsWith('deepseek'),
    inputMissUsdPerMillion: 0.28,
    inputHitUsdPerMillion: 0.028,
    outputUsdPerMillion: 0.42,
  },
  {
    match: (_provider: string | null | undefined, model: string) => model.includes('haiku'),
    inputMissUsdPerMillion: 1,
    inputHitUsdPerMillion: 0.1,
    outputUsdPerMillion: 5,
  },
  {
    match: (_provider: string | null | undefined, model: string) => model.includes('opus'),
    inputMissUsdPerMillion: 5,
    inputHitUsdPerMillion: 0.5,
    outputUsdPerMillion: 25,
  },
  {
    match: (_provider: string | null | undefined, model: string) => model.includes('sonnet'),
    inputMissUsdPerMillion: 3,
    inputHitUsdPerMillion: 0.3,
    outputUsdPerMillion: 15,
  },
];

function roundUsd(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

function getPricing(provider: string | null | undefined, model: string) {
  return PRICING_BY_PREFIX.find((entry) => entry.match(provider, model)) ?? null;
}

function isAIUsageTableUnavailable(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const maybeError = error as { code?: string; message?: string };
  return (
    maybeError.code === 'PGRST205' ||
    typeof maybeError.message === 'string' &&
      maybeError.message.includes("public.ai_usage_events")
  );
}

export interface AIUsageEventLike {
  request_count: number;
  input_tokens: number;
  output_tokens: number;
  cached_input_tokens: number;
  estimated_cost_usd: number;
  platform_cost_usd: number;
  used_user_key: boolean;
}

export interface AIUsageSummary {
  requestCount: number;
  inputTokens: number;
  outputTokens: number;
  cachedInputTokens: number;
  estimatedCostUsd: number;
  platformCostUsd: number;
}

export interface AIUsageCostInput {
  provider?: string | null;
  model: string;
  inputTokens: number;
  outputTokens: number;
  cachedInputTokens?: number;
  usedUserKey: boolean;
}

export interface AIUsageEventInput extends AIUsageCostInput {
  userId: string;
  feature: string;
  plan: 'free' | 'pro';
  journalId?: string | null;
  requestCount?: number;
  metadata?: Record<string, unknown>;
}

export function estimateAIUsageCostUsd(input: AIUsageCostInput): {
  estimatedCostUsd: number;
  platformCostUsd: number;
} {
  const pricing = getPricing(input.provider, input.model);
  if (!pricing) {
    return {
      estimatedCostUsd: 0,
      platformCostUsd: 0,
    };
  }

  const cachedInputTokens = input.cachedInputTokens ?? 0;
  const uncachedInputTokens = Math.max(0, input.inputTokens - cachedInputTokens);
  const estimatedCostUsd =
    uncachedInputTokens * (pricing.inputMissUsdPerMillion / 1_000_000) +
    cachedInputTokens * (pricing.inputHitUsdPerMillion / 1_000_000) +
    input.outputTokens * (pricing.outputUsdPerMillion / 1_000_000);

  return {
    estimatedCostUsd: roundUsd(estimatedCostUsd),
    platformCostUsd: input.usedUserKey ? 0 : roundUsd(estimatedCostUsd),
  };
}

export function summarizeAIUsageEvents(events: AIUsageEventLike[]): AIUsageSummary {
  return events.reduce<AIUsageSummary>(
    (summary, event) => ({
      requestCount: summary.requestCount + (event.request_count ?? 0),
      inputTokens: summary.inputTokens + (event.input_tokens ?? 0),
      outputTokens: summary.outputTokens + (event.output_tokens ?? 0),
      cachedInputTokens: summary.cachedInputTokens + (event.cached_input_tokens ?? 0),
      estimatedCostUsd: roundUsd(summary.estimatedCostUsd + (event.estimated_cost_usd ?? 0)),
      platformCostUsd: roundUsd(summary.platformCostUsd + (event.platform_cost_usd ?? 0)),
    }),
    {
      requestCount: 0,
      inputTokens: 0,
      outputTokens: 0,
      cachedInputTokens: 0,
      estimatedCostUsd: 0,
      platformCostUsd: 0,
    }
  );
}

export function getDailyAIUsageDecision(
  usage: AIUsageSummary,
  entitlements: Entitlements,
  bypassPlatformLimits: boolean
): { allowed: boolean; reason: 'daily_request_limit' | 'daily_token_limit' | 'daily_cost_limit' | null } {
  if (bypassPlatformLimits) {
    return { allowed: true, reason: null };
  }

  if (
    entitlements.aiRequestsPerDay !== null &&
    usage.requestCount >= entitlements.aiRequestsPerDay
  ) {
    return { allowed: false, reason: 'daily_request_limit' };
  }

  if (
    entitlements.aiTokensPerDay !== null &&
    usage.inputTokens + usage.outputTokens >= entitlements.aiTokensPerDay
  ) {
    return { allowed: false, reason: 'daily_token_limit' };
  }

  if (
    entitlements.aiCostUsdPerDay !== null &&
    usage.platformCostUsd >= entitlements.aiCostUsdPerDay
  ) {
    return { allowed: false, reason: 'daily_cost_limit' };
  }

  return { allowed: true, reason: null };
}

export async function getDailyAIUsageSummary(
  supabase: SupabaseClient,
  userId: string,
  sinceIso: string
): Promise<AIUsageSummary> {
  const { data, error } = await supabase
    .from('ai_usage_events')
    .select(
      'request_count,input_tokens,output_tokens,cached_input_tokens,estimated_cost_usd,platform_cost_usd,used_user_key'
    )
    .eq('user_id', userId)
    .gte('created_at', sinceIso);

  if (error) {
    if (isAIUsageTableUnavailable(error)) {
      return summarizeAIUsageEvents([]);
    }
    throw error;
  }

  return summarizeAIUsageEvents((data as AIUsageEventLike[] | null) ?? []);
}

export async function recordAIUsageEvent(
  supabase: SupabaseClient,
  event: AIUsageEventInput
): Promise<void> {
  const requestCount = event.requestCount ?? 1;
  const cachedInputTokens = event.cachedInputTokens ?? 0;
  const costs = estimateAIUsageCostUsd({
    provider: event.provider,
    model: event.model,
    inputTokens: event.inputTokens,
    outputTokens: event.outputTokens,
    cachedInputTokens,
    usedUserKey: event.usedUserKey,
  });

  const { error } = await supabase.from('ai_usage_events').insert({
    user_id: event.userId,
    journal_id: event.journalId ?? null,
    provider: event.provider ?? 'managed',
    model: event.model,
    feature: event.feature,
    plan: event.plan,
    input_tokens: event.inputTokens,
    output_tokens: event.outputTokens,
    cached_input_tokens: cachedInputTokens,
    request_count: requestCount,
    estimated_cost_usd: costs.estimatedCostUsd,
    platform_cost_usd: costs.platformCostUsd,
    used_user_key: event.usedUserKey,
    metadata: event.metadata ?? {},
  });

  if (error) {
    if (isAIUsageTableUnavailable(error)) {
      return;
    }
    throw error;
  }
}
