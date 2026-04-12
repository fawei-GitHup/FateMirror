import type { Subscription } from '@/types';

export function isPayPalPurchaseLocked(
  subscription: Subscription | null | undefined,
  now: Date = new Date(),
) {
  if (!subscription || subscription.plan !== 'pro') {
    return false;
  }

  if (subscription.status === 'past_due') {
    return false;
  }

  if (!subscription.current_period_end) {
    return subscription.status === 'active' || subscription.status === 'trialing';
  }

  const periodEnd = new Date(subscription.current_period_end);
  if (Number.isNaN(periodEnd.getTime())) {
    return subscription.status === 'active' || subscription.status === 'trialing';
  }

  return periodEnd.getTime() > now.getTime();
}
