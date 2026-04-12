import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { capturePayPalOrder } from '@/lib/billing/paypal-checkout';
import { stripPayPalColumnsForLegacySchema } from '@/lib/billing/paypal-verification';
import type { Subscription } from '@/types';

export const runtime = 'nodejs';

function isLegacyPayPalColumnError(error: unknown) {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const message =
    'message' in error && typeof error.message === 'string' ? error.message.toLowerCase() : '';

  return message.includes('paypal_') && message.includes('column');
}

export async function POST(req: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { orderId } = (await req.json()) as { orderId?: string };
    if (!orderId) {
      return NextResponse.json({ error: 'Order ID is required.' }, { status: 400 });
    }

    const admin = await createServiceRoleClient();
    const { data: existing } = await admin
      .from('subscriptions')
      .select('*')
      .eq('paypal_order_id', orderId)
      .maybeSingle();

    if (existing?.user_id && existing.user_id !== user.id) {
      return NextResponse.json(
        { error: 'That PayPal order is already linked to another account.' },
        { status: 409 }
      );
    }

    if (existing?.user_id === user.id && existing.plan === 'pro') {
      return NextResponse.json({ ok: true, subscription: existing as Subscription });
    }

    const captured = await capturePayPalOrder(orderId, user.id, user.email);
    let { data: subscription, error } = await admin
      .from('subscriptions')
      .upsert(captured.subscription, { onConflict: 'user_id' })
      .select('*')
      .maybeSingle();

    if (error && isLegacyPayPalColumnError(error)) {
      const fallbackPayload = stripPayPalColumnsForLegacySchema(captured.subscription);
      const fallbackResult = await admin
        .from('subscriptions')
        .upsert(fallbackPayload, { onConflict: 'user_id' })
        .select('*')
        .maybeSingle();

      subscription = fallbackResult.data;
      error = fallbackResult.error;
    }

    if (error) {
      throw error;
    }

    return NextResponse.json({
      ok: true,
      subscription: (subscription as Subscription | null) ?? null,
    });
  } catch (error) {
    console.error('PayPal capture error:', error);
    // Only expose safe, user-facing messages; never leak internal details
    const message = error instanceof Error ? error.message : '';
    const safeMessages = [
      'Order ID is required.',
      'That PayPal order is already linked to another account.',
      'This PayPal order belongs to a different user.',
      'PayPal capture did not complete successfully.',
    ];
    const userMessage = safeMessages.find((m) => message.includes(m))
      ?? 'Failed to capture PayPal order. Please try again.';
    return NextResponse.json({ error: userMessage }, { status: 500 });
  }
}
