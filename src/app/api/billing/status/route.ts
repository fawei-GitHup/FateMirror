import { getAuthContext } from '@/lib/api/auth';
import { serverError, unauthorized } from '@/lib/api/errors';
import { getEntitlements, resolvePlan } from '@/lib/billing/entitlements';
import { getPayPalConfigStatus } from '@/lib/billing/paypal-verification';
import { NextResponse } from 'next/server';
import type { Subscription } from '@/types';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const auth = await getAuthContext();
    if ('error' in auth) return unauthorized();
    const { supabase, user } = auth;

    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) return serverError(error, 'billing/status');

    const subscription = (data as Subscription | null) ?? null;
    const plan = resolvePlan(subscription);

    return NextResponse.json({
      provider: 'paypal',
      config: getPayPalConfigStatus(),
      subscription,
      plan,
      entitlements: getEntitlements(plan),
    });
  } catch (error) {
    return serverError(error, 'billing/status');
  }
}
