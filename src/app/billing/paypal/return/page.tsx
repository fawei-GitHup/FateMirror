'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function PayPalReturnPage() {
  const t = useTranslations('billingPages');
  const searchParams = useSearchParams();
  const orderId = useMemo(
    () => searchParams.get('token') || searchParams.get('orderId') || '',
    [searchParams]
  );
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function capture() {
      if (!orderId) {
        setStatus('error');
        setError(t('missingOrderId'));
        return;
      }

      try {
        const res = await fetch('/api/billing/paypal/capture', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId }),
        });

        const payload = (await res.json()) as { error?: string };
        if (!res.ok) {
          throw new Error(payload.error || t('finishFailed'));
        }

        if (!cancelled) {
          setStatus('success');
        }
      } catch (err) {
        if (!cancelled) {
          setStatus('error');
          setError(err instanceof Error ? err.message : t('finishFailed'));
        }
      }
    }

    void capture();

    return () => {
      cancelled = true;
    };
  }, [orderId, t]);

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <CardTitle>{t('checkoutTitle')}</CardTitle>
          <CardDescription>{t('checkoutDescription')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {status === 'loading' ? (
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              {t('verifying')}
            </div>
          ) : null}

          {status === 'success' ? (
            <div className="space-y-3 text-center">
              <p className="text-sm text-green-700">{t('paymentCaptured')}</p>
              <Link href="/settings">
                <Button className="w-full">{t('goToSettings')}</Button>
              </Link>
            </div>
          ) : null}

          {status === 'error' ? (
            <div className="space-y-3 text-center">
              <p className="text-sm text-destructive">{error}</p>
              <div className="grid gap-2 sm:grid-cols-2">
                <Link href="/pricing">
                  <Button variant="outline" className="w-full">
                    {t('backToPricing')}
                  </Button>
                </Link>
                <Link href="/settings">
                  <Button className="w-full">{t('openSettings')}</Button>
                </Link>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </main>
  );
}
