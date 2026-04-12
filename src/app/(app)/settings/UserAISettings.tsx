'use client';

import { startTransition, useEffect, useState, type ChangeEvent } from 'react';
import { useTranslations } from 'next-intl';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  clearUserAIConfig,
  createDefaultUserAIConfig,
  loadUserAIConfig,
  saveUserAIConfig,
} from '@/lib/ai/browser-config';
import {
  getProviderDefaults,
  type UserAIConfig,
  type UserAIProvider,
} from '@/lib/ai/user-config.ts';

const PROVIDERS: UserAIProvider[] = [
  'openai',
  'gemini',
  'claude',
  'kimi',
  'deepseek',
  'openrouter',
];

export function UserAISettings() {
  const t = useTranslations('settings');
  const [form, setForm] = useState<UserAIConfig>(createDefaultUserAIConfig());
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const stored = loadUserAIConfig();
    if (stored) {
      startTransition(() => {
        setForm(stored);
        setSaved(true);
      });
    }
  }, []);

  const handleProviderChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const provider = event.target.value as UserAIProvider;
    const defaults = getProviderDefaults(provider);

    setForm({
      provider,
      apiKey: form.apiKey,
      model:
        form.model === getProviderDefaults(form.provider).model
          ? defaults.model
          : form.model,
      baseUrl:
        form.baseUrl === getProviderDefaults(form.provider).baseUrl
          ? defaults.baseUrl
          : form.baseUrl,
    });
    setSaved(false);
  };

  const handleSave = () => {
    const next = saveUserAIConfig(form);
    if (next) {
      setForm(next);
      setSaved(true);
    }
  };

  const handleClear = () => {
    clearUserAIConfig();
    setForm(createDefaultUserAIConfig());
    setSaved(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={saved ? 'secondary' : 'outline'}>
          {saved ? t('customAiSaved') : t('customAiNotSaved')}
        </Badge>
        <Badge variant="outline">{t(`customProvider.${form.provider}`)}</Badge>
      </div>

      <p className="text-sm text-muted-foreground">{t('customAiLocalOnly')}</p>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-2 text-sm">
          <span className="font-medium text-foreground">{t('customAiProvider')}</span>
          <select
            value={form.provider}
            onChange={handleProviderChange}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
          >
            {PROVIDERS.map((provider) => (
              <option key={provider} value={provider}>
                {t(`customProvider.${provider}`)}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-2 text-sm">
          <span className="font-medium text-foreground">{t('customAiModel')}</span>
          <Input
            value={form.model}
            onChange={(event) => {
              setForm((current) => ({ ...current, model: event.target.value }));
              setSaved(false);
            }}
          />
        </label>
      </div>

      <label className="space-y-2 text-sm">
        <span className="font-medium text-foreground">{t('customAiApiKey')}</span>
        <Input
          type="password"
          value={form.apiKey}
          placeholder={t('customAiApiKeyPlaceholder')}
          onChange={(event) => {
            setForm((current) => ({ ...current, apiKey: event.target.value }));
            setSaved(false);
          }}
        />
      </label>

      <label className="space-y-2 text-sm">
        <span className="font-medium text-foreground">{t('customAiBaseUrl')}</span>
        <Input
          value={form.baseUrl || ''}
          onChange={(event) => {
            setForm((current) => ({ ...current, baseUrl: event.target.value }));
            setSaved(false);
          }}
        />
      </label>

      <p className="text-xs text-muted-foreground">{t('customAiHint')}</p>

      <div className="flex flex-wrap gap-2">
        <Button onClick={handleSave} disabled={!form.apiKey.trim()}>
          {t('customAiSave')}
        </Button>
        <Button variant="ghost" onClick={handleClear}>
          {t('customAiClear')}
        </Button>
      </div>
    </div>
  );
}
