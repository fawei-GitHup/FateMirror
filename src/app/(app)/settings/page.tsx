import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getLocale, getTranslations } from 'next-intl/server';
import { getEntitlements, resolvePlan } from '@/lib/billing/entitlements';
import { getAIProviderStatus } from '@/lib/ai/status';
import { getPayPalConfigStatus } from '@/lib/billing/paypal-verification';
import { isPayPalPurchaseLocked } from '@/lib/billing/subscription-state';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, CreditCard, Globe, Bot } from 'lucide-react';
import type { Subscription } from '@/types';
import { BillingActions } from './BillingActions';
import { DataControls } from './DataControls';
import { LanguageSelector } from './LanguageSelector';
import { UserAISettings } from './UserAISettings';
import { formatLocalizedDate } from '@/lib/i18n/format-date';
import { AIAccessStatus } from './AIAccessStatus';

interface SettingsPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function SettingsPage({ searchParams }: SettingsPageProps) {
  const locale = await getLocale();
  const t = await getTranslations('settings');
  const tStatus = await getTranslations('statuses');
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const params = searchParams ? await searchParams : {};

  const [{ data: subscriptionData }, { count: journalCount }] = await Promise.all([
    supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user!.id)
      .maybeSingle(),
    supabase
      .from('journals')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user!.id),
  ]);

  const subscription = subscriptionData as Subscription | null;
  const plan = resolvePlan(subscription);
  const entitlements = getEntitlements(plan);
  const status = subscription?.status ?? 'active';
  const billingSuccess = params.billing === 'success';
  const billingLocked = params.billing === 'locked';
  const payPalConfig = getPayPalConfigStatus();
  const purchaseLocked = isPayPalPurchaseLocked(subscription);
  const aiStatus = getAIProviderStatus();

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('title')}</h1>
        <p className="text-muted-foreground text-sm">{t('subtitle')}</p>
      </div>

      {billingSuccess && (
        <Card className="border-green-500/30 bg-green-500/5">
          <CardContent className="pt-6 text-sm text-green-700">
            {t('billingSuccess')}
          </CardContent>
        </Card>
      )}

      {billingLocked && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="pt-6 text-sm text-amber-700">
            {t('billingLocked')}
          </CardContent>
        </Card>
      )}

      {/* Privacy */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="h-4 w-4" />
            {t('privacyTitle')}
          </CardTitle>
          <CardDescription>{t('privacyDescription')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>{t('privacy1')}</p>
          <p>{t('privacy2')}</p>
          <p>{t('privacy3')}</p>
          <DataControls />
        </CardContent>
      </Card>

      {/* Subscription */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CreditCard className="h-4 w-4" />
            {t('subscriptionTitle')}
          </CardTitle>
          <CardDescription>{t('subscriptionDescription')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Badge variant="outline">{t('planBadge', { plan: plan.toUpperCase() })}</Badge>
            <Badge variant="secondary">
              {tStatus(status as 'active' | 'canceled' | 'expired' | 'past_due' | 'trialing')}
            </Badge>
          </div>
          <p>{t('provider', { provider: subscription?.billing_provider || 'paypal' })}</p>
          <p>{t('paypalVerification', { status: payPalConfig.ready ? t('paypalReady') : t('paypalMissing') })}</p>
          <p>{t('journalEntries', { count: journalCount ?? 0 })}</p>
          {entitlements.chatSessionsPerDay !== null ? (
            <p>{t('dailyChat', { count: entitlements.chatSessionsPerDay })}</p>
          ) : null}
          {entitlements.guidedSessionsPerMonth !== null ? (
            <p>{t('guidedSessionsMonthly', { count: entitlements.guidedSessionsPerMonth })}</p>
          ) : null}
          <p>{entitlements.treeNodeLimit == null ? t('treeNodesUnlimited') : t('treeNodes', { count: entitlements.treeNodeLimit })}</p>
          <p>{entitlements.chaptersEnabled ? t('chaptersEnabled') : t('chaptersProOnly')}</p>
          {subscription?.current_period_end && (
            <p>
              {t('periodEnds', { date: formatLocalizedDate(subscription.current_period_end, locale) })}
            </p>
          )}
          <BillingActions
            plan={plan}
            purchaseLocked={purchaseLocked}
            purchaseLockedUntil={subscription?.current_period_end ?? null}
          />
          {!subscription && <p>{t('noSubscription')}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Bot className="h-4 w-4" />
            {t('aiTitle')}
          </CardTitle>
          <CardDescription>{t('aiDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          <AIAccessStatus aiStatus={aiStatus} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Bot className="h-4 w-4" />
            {t('customAiTitle')}
          </CardTitle>
          <CardDescription>{t('customAiDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          <UserAISettings />
        </CardContent>
      </Card>

      {/* Language */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Globe className="h-4 w-4" />
            {t('languageTitle')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {t('languageDescription')}
            </p>
            <LanguageSelector />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
