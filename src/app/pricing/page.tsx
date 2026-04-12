import Link from 'next/link';
import { Check, Sparkles, ArrowLeft } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { resolvePlan } from '@/lib/billing/entitlements';
import { isPayPalPurchaseLocked } from '@/lib/billing/subscription-state';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { PayPalCheckoutPanel } from '@/components/billing/PayPalCheckoutPanel';
import { getPricingPlans } from '@/lib/pricing/plans';
import type { Subscription } from '@/types';

function FaqItem({ question, answer }: { question: string; answer: string }) {
  return (
    <div className="card-glow rounded-2xl bg-card/60 p-5 backdrop-blur">
      <h3 className="text-sm font-semibold text-foreground">{question}</h3>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{answer}</p>
    </div>
  );
}

export default async function PricingPage() {
  const t = await getTranslations('pricing');
  const tPlans = await getTranslations('plans');
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isAuthenticated = Boolean(user);
  const { data: subscriptionData } = user
    ? await supabase.from('subscriptions').select('*').eq('user_id', user.id).maybeSingle()
    : { data: null };
  const subscription = subscriptionData as Subscription | null;
  const plan = resolvePlan(subscription);
  const purchaseLocked = isPayPalPurchaseLocked(subscription);
  const pricingPlans = getPricingPlans((key) => tPlans(key));

  return (
    <div className="min-h-screen">
      {/* Nav */}
      <nav className="sticky top-0 z-50 mx-auto flex w-full max-w-6xl items-center justify-between border-b border-border/30 bg-background/80 px-6 py-5 backdrop-blur-xl">
        <Link href="/" className="flex items-center gap-2 text-xl font-bold tracking-tight">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <span className="text-gradient">Fate</span>
          <span className="text-foreground/70">Mirror</span>
        </Link>
        <div className="flex items-center gap-3">
          <Link href="/auth/login">
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
              {t('navLogin')}
            </Button>
          </Link>
          <Link href="/auth/signup">
            <Button size="sm" className="btn-gradient border-0 text-white">{t('navGetStarted')}</Button>
          </Link>
        </div>
      </nav>

      <main className="mx-auto flex w-full max-w-6xl flex-col gap-14 px-6 pb-16 pt-12">
        {/* Hero section */}
        <section className="card-glow grid gap-8 rounded-3xl bg-card/60 p-8 backdrop-blur md:grid-cols-[1.3fr_0.7fr] md:p-12">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary">
              <Sparkles className="size-4" />
              {t('badge')}
            </div>
            <div className="space-y-4">
              <h1 className="max-w-3xl text-4xl font-bold leading-tight tracking-tight md:text-6xl">
                <span className="text-gradient">{t('headline')}</span>
              </h1>
              <p className="max-w-2xl text-base leading-7 text-muted-foreground md:text-lg">
                {t('description')}
              </p>
            </div>
            <div className="space-y-3">
              <PayPalCheckoutPanel
                isAuthenticated={isAuthenticated}
                purchaseLocked={purchaseLocked}
                purchaseLockedUntil={subscription?.current_period_end ?? null}
              />
              {purchaseLocked ? (
                <p className="text-sm text-muted-foreground">
                  {t('lockedMessage', { plan: plan.toUpperCase() })}
                </p>
              ) : null}
              {!isAuthenticated ? (
                <Link href="/auth/signup">
                  <Button variant="outline" size="lg" className="border-border/50 hover:border-primary/30">
                    {t('startFree')}
                  </Button>
                </Link>
              ) : null}
            </div>
          </div>

          <div className="rounded-2xl border border-border/50 bg-secondary/40 p-6">
            <p className="text-sm font-medium text-foreground">{t('proChangesTitle')}</p>
            <div className="mt-5 space-y-4">
              {[
                t('proChange1'),
                t('proChange2'),
                t('proChange3'),
              ].map((item) => (
                <div key={item} className="flex gap-3 text-sm leading-6 text-muted-foreground">
                  <div className="mt-1 rounded-full bg-primary/15 p-1 text-primary">
                    <Check className="size-3.5" />
                  </div>
                  <p>{item}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Plans */}
        <section className="grid gap-6 lg:grid-cols-3">
          {pricingPlans.map((plan) => (
            <Card
              key={plan.slug}
              className={`card-glow bg-card/60 backdrop-blur ${
                plan.featured
                  ? 'border-primary/30 shadow-[0_0_40px_rgba(139,92,246,0.12)]'
                  : 'border-border/30'
              }`}
            >
              <CardHeader className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                      {plan.eyebrow}
                    </p>
                    <CardTitle className="mt-2 text-2xl">{plan.name}</CardTitle>
                  </div>
                  {plan.featured ? (
                    <span className="btn-gradient rounded-full px-3 py-1 text-xs font-semibold text-white">
                      {t('recommended')}
                    </span>
                  ) : null}
                </div>
                <div>
                  <div className="text-4xl font-bold tracking-tight text-foreground">
                    {plan.priceLabel}
                  </div>
                  <CardDescription className="mt-3 text-sm leading-6">
                    {plan.description}
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex gap-3 text-sm leading-6 text-muted-foreground">
                      <Check className="mt-1 size-4 text-primary" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                {plan.slug === 'pro' ? (
                  <div className="w-full rounded-xl border border-primary/15 bg-primary/5 p-4 text-sm text-muted-foreground">
                    {t('paypalPanelHint')}
                  </div>
                ) : (
                  <Link href={plan.ctaHref} className="w-full">
                    <Button
                      variant="outline"
                      size="lg"
                      className="w-full border-border/50 hover:border-primary/30 hover:bg-card"
                    >
                      {plan.ctaLabel}
                    </Button>
                  </Link>
                )}
              </CardFooter>
            </Card>
          ))}
        </section>

        {/* FAQ */}
        <section className="grid gap-4 md:grid-cols-3">
          <FaqItem question={t('faq1Question')} answer={t('faq1Answer')} />
          <FaqItem question={t('faq2Question')} answer={t('faq2Answer')} />
          <FaqItem question={t('faq3Question')} answer={t('faq3Answer')} />
        </section>

        {/* Back to home */}
        <div className="text-center">
          <Link href="/" className="group inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary">
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
            Back to home
          </Link>
        </div>
      </main>
    </div>
  );
}
