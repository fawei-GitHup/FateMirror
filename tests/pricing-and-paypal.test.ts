import test from 'node:test';
import assert from 'node:assert/strict';

import { PAYPAL_PAYMENT_URL, getPayPalCheckoutPath, getUpgradeHref } from '../src/lib/billing/paypal.ts';
import { getPayPalSdkUrl } from '../src/lib/billing/paypal-sdk.ts';
import { isPayPalPurchaseLocked } from '../src/lib/billing/subscription-state.ts';
import { getPricingPlans } from '../src/lib/pricing/plans.ts';

test('paypal checkout paths support PRD monthly and yearly pro billing cycles', () => {
  assert.equal(PAYPAL_PAYMENT_URL, 'https://www.paypal.com/ncp/payment/JEPQJ5KGAZ4JL');
  assert.equal(getPayPalCheckoutPath('pro', 'monthly'), '/api/billing/paypal/checkout?plan=pro&cycle=monthly');
  assert.equal(getPayPalCheckoutPath('pro', 'yearly'), '/api/billing/paypal/checkout?plan=pro&cycle=yearly');
  assert.equal(getUpgradeHref('free'), '/auth/signup');
  assert.equal(getUpgradeHref('pro'), '/api/billing/paypal/checkout?plan=pro&cycle=monthly');
});

test('paypal sdk url exposes the official buttons script with public client id', () => {
  const sdkUrl = getPayPalSdkUrl('test-client-id', 'USD');

  assert.match(sdkUrl, /paypal\.com\/sdk\/js/);
  assert.match(sdkUrl, /client-id=test-client-id/);
  assert.match(sdkUrl, /components=buttons/);
  assert.match(sdkUrl, /currency=USD/);
});

test('pricing plans match the PRD free and pro tiers', () => {
  const pricingPlans = getPricingPlans((key) => ({
    freeName: 'Free',
    freeEyebrow: 'Start reflecting',
    freePriceLabel: '$0',
    freeDescription: 'Build the habit, capture your patterns, and see whether FateMirror fits your process.',
    freeFeature1: '5 guided chat sessions per day',
    freeFeature2: 'Freewrite and guided journaling',
    freeFeature3: 'Pattern detection and cognitive profile',
    freeFeature4: 'Up to 10 Destiny Tree nodes',
    freeCta: 'Start free',
    proName: 'Pro',
    proEyebrow: 'Launch offer for the first 500 members',
    proPriceLabel: '$9.9/mo',
    proDescription: 'Unlock the full reflection loop for $9.9/month or $79/year with a high guided-session allowance instead of an uncapped plan. Early supporters can claim the $6.9/month launch offer.',
    proFeature1: '300 guided chat sessions per month',
    proFeature2: 'Full Destiny Tree growth',
    proFeature3: 'Pattern interruption and loop warnings',
    proFeature4: 'Life Chapters and progression tracking',
    proFeature5: 'Full level progression system and BYOK-ready roadmap',
    proFeature6: 'Data export, early feature access, and future add-on packs',
    proCta: 'Upgrade with PayPal',
  }[key] ?? key));

  assert.equal(pricingPlans.length, 2);

  const freePlan = pricingPlans.find((plan) => plan.slug === 'free');
  const proPlan = pricingPlans.find((plan) => plan.slug === 'pro');

  assert.ok(freePlan);
  assert.ok(proPlan);

  assert.equal(freePlan?.ctaHref, '/auth/signup');
  assert.equal(proPlan?.ctaHref, '/api/billing/paypal/checkout?plan=pro&cycle=monthly');
  assert.equal(proPlan?.featured, true);
  assert.match(proPlan?.priceLabel ?? '', /\$9\.9/);
  assert.match(proPlan?.description ?? '', /\$79\/year/i);
  assert.match(proPlan?.description ?? '', /high guided-session allowance/i);
  assert.match(proPlan?.eyebrow ?? '', /first 500/i);
});

test('active pro subscriptions stay purchase-locked until the current period ends', () => {
  const activePro = {
    plan: 'pro',
    status: 'active',
    current_period_end: '2026-05-06T10:56:28+00:00',
  };
  const expiredPro = {
    plan: 'pro',
    status: 'active',
    current_period_end: '2026-04-01T10:56:28+00:00',
  };
  const activeWithoutEnd = {
    plan: 'pro',
    status: 'active',
    current_period_end: null,
  };
  const freePlan = {
    plan: 'free',
    status: 'active',
    current_period_end: null,
  };

  assert.equal(
    isPayPalPurchaseLocked(activePro as never, new Date('2026-04-06T11:00:00+00:00')),
    true,
  );
  assert.equal(
    isPayPalPurchaseLocked(expiredPro as never, new Date('2026-04-06T11:00:00+00:00')),
    false,
  );
  assert.equal(
    isPayPalPurchaseLocked(activeWithoutEnd as never, new Date('2026-04-06T11:00:00+00:00')),
    true,
  );
  assert.equal(
    isPayPalPurchaseLocked(freePlan as never, new Date('2026-04-06T11:00:00+00:00')),
    false,
  );
});
