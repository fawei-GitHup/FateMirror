import {
  getProviderDefaults,
  sanitizeUserAIConfig,
  type UserAIConfig,
  type UserAIConfigInput,
  type UserAIProvider,
} from './user-config.ts';

export const USER_AI_CONFIG_STORAGE_KEY = 'fatemirror.user-ai-config';

export function createDefaultUserAIConfig(
  provider: UserAIProvider = 'deepseek'
): UserAIConfig {
  const defaults = getProviderDefaults(provider);
  return {
    provider,
    apiKey: '',
    model: defaults.model,
    baseUrl: defaults.baseUrl,
  };
}

export function loadUserAIConfig(): UserAIConfig | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const raw = window.localStorage.getItem(USER_AI_CONFIG_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    return sanitizeUserAIConfig(JSON.parse(raw) as UserAIConfigInput);
  } catch {
    return null;
  }
}

export function saveUserAIConfig(input: UserAIConfigInput): UserAIConfig | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const sanitized = sanitizeUserAIConfig(input);
  if (!sanitized) {
    return null;
  }

  window.localStorage.setItem(
    USER_AI_CONFIG_STORAGE_KEY,
    JSON.stringify(sanitized)
  );
  return sanitized;
}

export function clearUserAIConfig() {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(USER_AI_CONFIG_STORAGE_KEY);
}
