import type { AIProviderStatus } from './status.ts';
import type { UserAIConfig } from './user-config.ts';

interface SettingsAIState {
  ready: boolean;
  showSetupHint: boolean;
  statusLabelKey: 'aiReady' | 'aiUnavailable' | 'customAiSaved';
  primaryProviderLabelKey: 'aiProviderAnthropic' | 'aiProviderOpenAICompatible' | 'aiProviderNone';
  primaryModel: string;
  usingBrowserKey: boolean;
}

function getProviderLabelKey(status: AIProviderStatus): SettingsAIState['primaryProviderLabelKey'] {
  if (status.primaryProvider === 'anthropic') {
    return 'aiProviderAnthropic';
  }
  if (status.primaryProvider === 'openai-compatible') {
    return 'aiProviderOpenAICompatible';
  }
  return 'aiProviderNone';
}

export function deriveSettingsAIState(
  serverStatus: AIProviderStatus,
  browserConfig: UserAIConfig | null
): SettingsAIState {
  if (browserConfig) {
    return {
      ready: true,
      showSetupHint: false,
      statusLabelKey: 'customAiSaved',
      primaryProviderLabelKey:
        browserConfig.provider === 'claude'
          ? 'aiProviderAnthropic'
          : 'aiProviderOpenAICompatible',
      primaryModel: browserConfig.model,
      usingBrowserKey: true,
    };
  }

  return {
    ready: serverStatus.available,
    showSetupHint: !serverStatus.available,
    statusLabelKey: serverStatus.available ? 'aiReady' : 'aiUnavailable',
    primaryProviderLabelKey: getProviderLabelKey(serverStatus),
    primaryModel: serverStatus.primaryModel || 'aiNotConfigured',
    usingBrowserKey: false,
  };
}
