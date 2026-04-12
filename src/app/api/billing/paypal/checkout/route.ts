import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createPayPalOrder, getPayPalCancelUrl, getPayPalReturnUrl } from '@/lib/billing/paypal-checkout';
import type { BillingCycle } from '@/lib/billing/paypal';
import { isPayPalPurchaseLocked } from '@/lib/billing/subscription-state';
import type { Subscription } from '@/types';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized', loginUrl: '/auth/login?next=/pricing' },
        { status: 401 }
      );
    }

    const body = (await req.json()) as { plan?: string; cycle?: string };
    const plan = body.plan;
    const cycle = body.cycle;

    if (plan !== 'pro' || (cycle !== 'monthly' && cycle !== 'yearly')) {
      return NextResponse.json({ error: 'Unsupported billing plan.' }, { status: 400 });
    }

    const { data: subscriptionData } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    const subscription = subscriptionData as Subscription | null;
    if (isPayPalPurchaseLocked(subscription)) {
      return NextResponse.json(
        {
          error: 'Your Pro access is still active. New checkout is only available after the current period expires.',
          code: 'PURCHASE_LOCKED',
          currentPeriodEnd: subscription?.current_period_end ?? null,
        },
        { status: 409 }
      );
    }

    const order = await createPayPalOrder({
      userId: user.id,
      plan,
      cycle: cycle as BillingCycle,
      returnUrl: getPayPalReturnUrl(),
      cancelUrl: getPayPalCancelUrl(),
    });

    return NextResponse.json({ orderId: order.id });
  } catch (error) {
    console.error('PayPal checkout error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create PayPal order.' },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.redirect(new URL('/auth/login', req.url));
    }

    const { searchParams } = new URL(req.url);
    const plan = searchParams.get('plan');
    const cycle = searchParams.get('cycle');

    if (plan !== 'pro' || (cycle !== 'monthly' && cycle !== 'yearly')) {
      return NextResponse.json({ error: 'Unsupported billing plan.' }, { status: 400 });
    }

    const { data: subscriptionData } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    const subscription = subscriptionData as Subscription | null;
    if (isPayPalPurchaseLocked(subscription)) {
      return NextResponse.redirect(new URL('/settings?billing=locked', req.url));
    }

    const order = await createPayPalOrder({
      userId: user.id,
      plan,
      cycle: cycle as BillingCycle,
      returnUrl: getPayPalReturnUrl(),
      cancelUrl: getPayPalCancelUrl(),
    });

    if (!order.approveUrl) {
      throw new Error('PayPal did not return an approval URL.');
    }

    return NextResponse.redirect(order.approveUrl);
  } catch (error) {
    console.error('PayPal checkout error:', error);
    return NextResponse.redirect(new URL('/pricing?billing=error', req.url));
  }
}
