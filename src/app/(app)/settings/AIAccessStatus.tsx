'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Badge } from '@/components/ui/badge';
import { loadUserAIConfig } from '@/lib/ai/browser-config';
import { deriveSettingsAIState } from '@/lib/ai/settings-status';
import type { AIProviderStatus } from '@/lib/ai/status';
import type { UserAIConfig } from '@/lib/ai/user-config';

interface AIAccessStatusProps {
  aiStatus: AIProviderStatus;
}

export function AIAccessStatus({ aiStatus }: AIAccessStatusProps) {
  const t = useTranslations('settings');
  const [browserConfig] = useState<UserAIConfig | null>(() => loadUserAIConfig());

  const state = deriveSettingsAIState(aiStatus, browserConfig);

  return (
    <div className="space-y-2 text-sm text-muted-foreground">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={state.ready ? 'secondary' : 'outline'}>
          {t(state.statusLabelKey)}
        </Badge>
        <Badge variant="outline">
          {t('aiFreeGuidedLimit', {
            count: aiStatus.freeGuidedSessionsPerDay ?? 0,
          })}
        </Badge>
      </div>
      <p>
        {t('aiPrimaryProvider', {
          provider: t(state.primaryProviderLabelKey),
          model: state.primaryModel === 'aiNotConfigured'
            ? t('aiNotConfigured')
            : state.primaryModel,
        })}
      </p>
      {aiStatus.fallbackProvider && !state.usingBrowserKey ? (
        <p>
          {t('aiFallbackProvider', {
            provider: t('aiProviderOpenAICompatible'),
            model: aiStatus.fallbackModel ?? t('aiNotConfigured'),
          })}
        </p>
      ) : null}
      <p>
        {state.usingBrowserKey
          ? t('aiUsingBrowserKey')
          : aiStatus.usesCustomOpenAIBaseUrl
            ? t('aiCustomEndpoint', { baseUrl: aiStatus.openAIBaseUrl ?? '' })
            : t('aiManagedKeys')}
      </p>
      <p>{t('aiNoBrowserKey')}</p>
      {state.showSetupHint ? (
        <p>{t('aiSetupHint', { vars: aiStatus.missingEnvVars.join(' / ') })}</p>
      ) : null}
    </div>
  );
}
