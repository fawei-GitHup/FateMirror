'use client';

import { useEffect, useRef, useState } from 'react';
import Script from 'next/script';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Loader2 } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import type { BillingCycle } from '@/lib/billing/paypal';
import { getPayPalSdkUrl } from '@/lib/billing/paypal-sdk';
import { cn } from '@/lib/utils';

declare global {
  interface Window {
    paypal?: {
      Buttons: (options: {
        style?: Record<string, string | number | boolean>;
        createOrder: () => Promise<string>;
        onApprove: (data: { orderID?: string }) => Promise<void>;
        onCancel?: () => void;
        onError?: (error: unknown) => void;
      }) => {
        render: (container: HTMLElement) => Promise<void>;
        isEligible?: () => boolean;
      };
    };
  }
}

interface PayPalButtonMountProps {
  cycle: BillingCycle;
  label: string;
  priceLabel: string;
  isAuthenticated: boolean;
  sdkReady: boolean;
  onError: (message: string) => void;
  onBusy: (busy: boolean) => void;
}

function PayPalButtonMount({
  cycle,
  label,
  priceLabel,
  isAuthenticated,
  sdkReady,
  onError,
  onBusy,
}: PayPalButtonMountProps) {
  const router = useRouter();
  const t = useTranslations('billing');
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!sdkReady || !container || !window.paypal || !isAuthenticated) {
      return;
    }

    container.innerHTML = '';

    const buttons = window.paypal.Buttons({
      style: {
        layout: 'vertical',
        label: 'paypal',
        shape: 'pill',
        height: 46,
        tagline: false,
      },
      async createOrder() {
        onBusy(true);
        onError('');

        const res = await fetch('/api/billing/paypal/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ plan: 'pro', cycle }),
        });

        const payload = (await res.json()) as { orderId?: string; error?: string; loginUrl?: string };

        if (res.status === 401 && payload.loginUrl) {
          router.push(payload.loginUrl);
          throw new Error('Please sign in before using PayPal checkout.');
        }

        if (!res.ok || !payload.orderId) {
          throw new Error(payload.error || 'Failed to create the PayPal order.');
        }

        return payload.orderId;
      },
      async onApprove(data) {
        const orderId = data.orderID;
        if (!orderId) {
          throw new Error('PayPal approval returned without an order ID.');
        }

        const res = await fetch('/api/billing/paypal/capture', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId }),
        });

        const payload = (await res.json()) as { error?: string };
        if (!res.ok) {
          throw new Error(payload.error || 'Failed to capture the PayPal payment.');
        }

        router.push('/settings?billing=success');
        router.refresh();
      },
      onCancel() {
        onBusy(false);
        onError(t('canceled', { label }));
      },
      onError(error) {
        onBusy(false);
        onError(error instanceof Error ? error.message : t('startFailed', { label }));
      },
    });

    if (buttons.isEligible && !buttons.isEligible()) {
      onError(t('notAvailable', { label }));
      return;
    }

    buttons.render(container).catch((error) => {
      onError(error instanceof Error ? error.message : t('renderFailed', { label }));
    }).finally(() => {
      onBusy(false);
    });
  }, [cycle, isAuthenticated, label, onBusy, onError, router, sdkReady, t]);

  return (
    <div className="space-y-2 rounded-2xl border border-border/60 bg-background/80 p-4">
      <div>
        <p className="text-sm font-semibold text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">{priceLabel}</p>
      </div>
      <div ref={containerRef} className="min-h-12" />
    </div>
  );
}

interface PayPalCheckoutPanelProps {
  isAuthenticated: boolean;
  className?: string;
  purchaseLocked?: boolean;
  purchaseLockedUntil?: string | null;
}

function DisabledPayPalCard({
  cycle,
  purchaseLockedUntil,
}: {
  cycle: BillingCycle;
  purchaseLockedUntil?: string | null;
}) {
  const t = useTranslations('billing');
  const label = cycle === 'monthly' ? t('monthlyLabel') : t('yearlyLabel');
  const priceLabel = cycle === 'monthly' ? t('monthlyPrice') : t('yearlyPrice');

  return (
    <div className="space-y-2 rounded-2xl border border-border/60 bg-muted/45 p-4 opacity-60 grayscale">
      <div>
        <p className="text-sm font-semibold text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">{priceLabel}</p>
      </div>
      <div className="flex min-h-12 items-center rounded-xl border border-dashed border-border/70 bg-background/70 px-4 text-xs text-muted-foreground">
        {purchaseLockedUntil
          ? t('activeUntil', { date: new Date(purchaseLockedUntil).toLocaleDateString() })
          : t('activeNoDate')}
      </div>
    </div>
  );
}

export function PayPalCheckoutPanel({
  isAuthenticated,
  className,
  purchaseLocked = false,
  purchaseLockedUntil = null,
}: PayPalCheckoutPanelProps) {
  const t = useTranslations('billing');
  const [sdkReady, setSdkReady] = useState(() => typeof window !== 'undefined' && Boolean(window.paypal));
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  return (
    <div className={cn('space-y-3', className)}>
      <Script
        src={getPayPalSdkUrl()}
        strategy="afterInteractive"
        onLoad={() => setSdkReady(true)}
      />

      {!isAuthenticated ? (
        <div className="rounded-2xl border border-border/60 bg-muted/35 p-4 text-sm text-muted-foreground">
          <p>{t('signinFirst')}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link href="/auth/login" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
              {t('login')}
            </Link>
            <Link href="/auth/signup" className={buttonVariants({ size: 'sm' })}>
              {t('createAccount')}
            </Link>
          </div>
        </div>
      ) : purchaseLocked ? (
        <div className="grid gap-3 md:grid-cols-2">
          <DisabledPayPalCard cycle="monthly" purchaseLockedUntil={purchaseLockedUntil} />
          <DisabledPayPalCard cycle="yearly" purchaseLockedUntil={purchaseLockedUntil} />
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          <PayPalButtonMount
            cycle="monthly"
            label={t('monthlyLabel')}
            priceLabel={t('monthlyPrice')}
            isAuthenticated={isAuthenticated}
            sdkReady={sdkReady}
            onError={setError}
            onBusy={setBusy}
          />
          <PayPalButtonMount
            cycle="yearly"
            label={t('yearlyLabel')}
            priceLabel={t('yearlyPrice')}
            isAuthenticated={isAuthenticated}
            sdkReady={sdkReady}
            onError={setError}
            onBusy={setBusy}
          />
        </div>
      )}

      {busy ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          {t('busy')}
        </div>
      ) : null}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
