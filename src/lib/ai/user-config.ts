import { getModelForPlan } from './client.ts';
import type { PlanType } from '../../types/database.ts';

export type UserAIProvider =
  | 'openai'
  | 'gemini'
  | 'claude'
  | 'kimi'
  | 'deepseek'
  | 'openrouter';

export interface UserAIConfigInput {
  provider?: string | null;
  apiKey?: string | null;
  model?: string | null;
  baseUrl?: string | null;
}

export interface UserAIConfig {
  provider: UserAIProvider;
  apiKey: string;
  model: string;
  baseUrl?: string;
}

export interface AIRequestConfig {
  source: 'managed' | 'user';
  provider: UserAIProvider | null;
  model: string;
  apiKey?: string;
  baseUrl?: string;
}

const PROVIDER_DEFAULTS: Record<
  UserAIProvider,
  { model: string; baseUrl: string }
> = {
  openai: {
    model: 'gpt-4.1-mini',
    baseUrl: 'https://api.openai.com/v1',
  },
  gemini: {
    model: 'gemini-2.5-flash',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
  },
  claude: {
    model: 'claude-sonnet-4-5',
    baseUrl: 'https://api.anthropic.com/v1',
  },
  kimi: {
    model: 'moonshot-v1-8k',
    baseUrl: 'https://api.moonshot.cn/v1',
  },
  deepseek: {
    model: 'deepseek-chat',
    baseUrl: 'https://api.deepseek.com/v1',
  },
  openrouter: {
    model: 'openai/gpt-4.1-mini',
    baseUrl: 'https://openrouter.ai/api/v1',
  },
};

function isUserAIProvider(value: string): value is UserAIProvider {
  return value in PROVIDER_DEFAULTS;
}

function trimOrEmpty(value: string | null | undefined): string {
  return (value || '').trim();
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, '');
}

export function getProviderDefaults(provider: UserAIProvider) {
  return PROVIDER_DEFAULTS[provider];
}

export function sanitizeUserAIConfig(
  input: UserAIConfigInput | null | undefined
): UserAIConfig | null {
  if (!input) {
    return null;
  }

  const providerValue = trimOrEmpty(input.provider);
  if (!providerValue || !isUserAIProvider(providerValue)) {
    return null;
  }

  const defaults = getProviderDefaults(providerValue);
  const apiKey = trimOrEmpty(input.apiKey);

  if (!apiKey) {
    return null;
  }

  const model = trimOrEmpty(input.model) || defaults.model;
  const baseUrlValue = trimOrEmpty(input.baseUrl);
  const baseUrl = normalizeBaseUrl(baseUrlValue || defaults.baseUrl);

  return {
    provider: providerValue,
    apiKey,
    model,
    baseUrl,
  };
}

export function buildAIRequestConfig(
  plan: PlanType,
  input: UserAIConfigInput | null | undefined,
  task: 'chat' | 'pipeline' | 'deep' = 'chat'
): AIRequestConfig {
  const userConfig = sanitizeUserAIConfig(input);

  if (userConfig) {
    return {
      source: 'user',
      provider: userConfig.provider,
      model: userConfig.model,
      apiKey: userConfig.apiKey,
      baseUrl: userConfig.baseUrl,
    };
  }

  return {
    source: 'managed',
    provider: null,
    model: getModelForPlan(plan, task),
  };
}

export function canServeAIRequest(
  serverAvailable: boolean,
  config: AIRequestConfig
): boolean {
  return serverAvailable || config.source === 'user';
}
