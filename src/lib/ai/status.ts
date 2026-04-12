import { getEntitlements } from '../billing/entitlements.ts';

export type AIProviderKind = 'anthropic' | 'openai-compatible' | 'none';

export interface AIProviderStatus {
  available: boolean;
  primaryProvider: AIProviderKind;
  primaryModel: string | null;
  freeModel: string | null;
  fallbackProvider: AIProviderKind | null;
  fallbackModel: string | null;
  openAIBaseUrl: string | null;
  usesCustomOpenAIBaseUrl: boolean;
  freeGuidedSessionsPerDay: number | null;
  missingEnvVars: string[];
}

function getOpenAIBaseUrl(env: NodeJS.ProcessEnv): string {
  return (env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '');
}

function getPrimaryModel(env: NodeJS.ProcessEnv): string {
  return env.AI_PRIMARY_MODEL || 'claude-sonnet-4-6';
}

function getFallbackModel(env: NodeJS.ProcessEnv): string {
  return env.OPENAI_MODEL || 'gpt-4.1-mini';
}

function getFreeModel(env: NodeJS.ProcessEnv): string {
  return env.AI_FREE_MODEL || 'deepseek-chat';
}

export function getAIProviderStatus(env: NodeJS.ProcessEnv = process.env): AIProviderStatus {
  const hasAnthropic = Boolean(env.ANTHROPIC_API_KEY);
  const hasOpenAI = Boolean(env.OPENAI_API_KEY);
  const hasDeepSeek = Boolean(env.DEEPSEEK_API_KEY);
  const entitlements = getEntitlements('free');
  const openAIBaseUrl = hasOpenAI ? getOpenAIBaseUrl(env) : null;

  return {
    available: hasAnthropic || hasOpenAI || hasDeepSeek,
    primaryProvider: hasAnthropic
      ? 'anthropic'
      : hasOpenAI || hasDeepSeek
        ? 'openai-compatible'
        : 'none',
    // Reuse model name functions from client.ts — single source of truth
    primaryModel: hasAnthropic
      ? getPrimaryModel(env)
      : hasOpenAI
        ? getFallbackModel(env)
        : hasDeepSeek
          ? getFreeModel(env)
          : null,
    freeModel: hasDeepSeek ? getFreeModel(env) : null,
    fallbackProvider: hasAnthropic && hasOpenAI ? 'openai-compatible' : null,
    fallbackModel: hasAnthropic && hasOpenAI ? getFallbackModel(env) : null,
    openAIBaseUrl,
    usesCustomOpenAIBaseUrl: openAIBaseUrl !== null && openAIBaseUrl !== 'https://api.openai.com/v1',
    freeGuidedSessionsPerDay: entitlements.chatSessionsPerDay,
    missingEnvVars: hasAnthropic || hasOpenAI || hasDeepSeek
      ? []
      : ['ANTHROPIC_API_KEY', 'OPENAI_API_KEY', 'DEEPSEEK_API_KEY'],
  };
}
