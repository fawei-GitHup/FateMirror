'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { PayPalCheckoutPanel } from '@/components/billing/PayPalCheckoutPanel';
import { Button } from '@/components/ui/button';

interface BillingActionsProps {
  plan: 'free' | 'pro';
  purchaseLocked?: boolean;
  purchaseLockedUntil?: string | null;
}

export function BillingActions({ plan, purchaseLocked = false, purchaseLockedUntil = null }: BillingActionsProps) {
  const t = useTranslations('billing');

  return (
    <div className="space-y-3">
      {plan === 'pro' ? (
        <p className="text-sm text-muted-foreground">
          {t('onPro')}
        </p>
      ) : null}
      <PayPalCheckoutPanel
        isAuthenticated
        purchaseLocked={purchaseLocked}
        purchaseLockedUntil={purchaseLockedUntil}
      />
      <div className="grid gap-2 sm:grid-cols-1">
        <Link href="/pricing" className="w-full">
          <Button variant="outline" className="w-full">
            {t('viewPricing')}
          </Button>
        </Link>
      </div>
    </div>
  );
}
