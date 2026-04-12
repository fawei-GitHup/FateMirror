'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function LocaleToggle() {
  const locale = useLocale();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  async function toggleLocale() {
    if (isLoading) return;
    const nextLocale = locale === 'zh' ? 'en' : 'zh';
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
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="gap-1.5 text-muted-foreground"
      onClick={toggleLocale}
      disabled={isLoading}
      title={locale === 'zh' ? 'Switch to English' : '切换到中文'}
    >
      <Globe className="h-4 w-4" />
      <span className="text-xs">{locale === 'zh' ? '中文' : 'EN'}</span>
    </Button>
  );
}
