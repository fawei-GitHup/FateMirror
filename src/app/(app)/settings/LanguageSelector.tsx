'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';

export function LanguageSelector() {
  const locale = useLocale();
  const t = useTranslations('language');
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  async function updateLocale(nextLocale: 'en' | 'zh') {
    if (nextLocale === locale || isLoading) {
      return;
    }

    setIsLoading(true);
    try {
      await fetch('/api/preferences/locale', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locale: nextLocale }),
      });
      router.refresh();
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex gap-2">
      <Button
        type="button"
        size="sm"
        variant={locale === 'en' ? 'default' : 'outline'}
        disabled={isLoading}
        onClick={() => updateLocale('en')}
      >
        {t('english')}
      </Button>
      <Button
        type="button"
        size="sm"
        variant={locale === 'zh' ? 'default' : 'outline'}
        disabled={isLoading}
        onClick={() => updateLocale('zh')}
      >
        {t('chinese')}
      </Button>
    </div>
  );
}
