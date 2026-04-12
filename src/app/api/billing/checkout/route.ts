import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createCreemCheckout, getCreemProductId, type BillingCycle } from '@/lib/billing/creem';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { cycle } = (await req.json()) as { cycle?: BillingCycle };
    const billingCycle = cycle === 'yearly' ? 'yearly' : 'monthly';
    const productId = getCreemProductId(billingCycle);
    const origin = new URL(req.url).origin;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || origin;

    const checkout = await createCreemCheckout({
      productId,
      customerEmail: user.email || undefined,
      requestId: `${user.id}:${billingCycle}:${Date.now()}`,
      successUrl: `${appUrl}/settings?billing=success&cycle=${billingCycle}`,
      metadata: {
        userId: user.id,
        cycle: billingCycle,
      },
    });

    return NextResponse.json({ url: checkout.checkout_url });
  } catch (error) {
    console.error('Creem checkout error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create checkout' },
      { status: 500 }
    );
  }
}
