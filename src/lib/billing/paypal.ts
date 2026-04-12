export const PAYPAL_PAYMENT_URL =
  process.env.NEXT_PUBLIC_PAYPAL_PAYMENT_URL ||
  process.env.PAYPAL_PAYMENT_URL ||
  'https://www.paypal.com/ncp/payment/JEPQJ5KGAZ4JL';

export type BillingCycle = 'monthly' | 'yearly';

export function getPayPalCheckoutPath(plan: 'pro', cycle: BillingCycle = 'monthly') {
  return `/api/billing/paypal/checkout?plan=${plan}&cycle=${cycle}`;
}

export function getUpgradeHref(plan: 'free' | 'pro') {
  if (plan === 'free') {
    return '/auth/signup';
  }

  return getPayPalCheckoutPath(plan, 'monthly');
}
