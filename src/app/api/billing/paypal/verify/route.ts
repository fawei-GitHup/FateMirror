import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import {
  fetchPayPalTransactionsById,
  findCompletedPayPalTransaction,
  getPayPalConfigStatus,
  mapPayPalVerificationToSubscription,
} from '@/lib/billing/paypal-verification';
import type { Subscription } from '@/types';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const config = getPayPalConfigStatus();
    if (!config.ready) {
      return NextResponse.json(
        { error: 'PayPal verification is not configured yet.' },
        { status: 503 }
      );
    }

    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!user.email) {
      return NextResponse.json(
        { error: 'Your account needs an email address before PayPal verification can run.' },
        { status: 400 }
      );
    }

    const body = (await req.json()) as { transactionId?: string };
    const transactionId = body.transactionId?.trim();

    if (!transactionId) {
      return NextResponse.json({ error: 'Transaction ID is required.' }, { status: 400 });
    }

    const admin = await createServiceRoleClient();
    const { data: existingClaim } = await admin
      .from('subscriptions')
      .select('user_id')
      .eq('paypal_transaction_id', transactionId)
      .maybeSingle();

    if (existingClaim && existingClaim.user_id !== user.id) {
      return NextResponse.json(
        { error: 'That PayPal transaction is already linked to another account.' },
        { status: 409 }
      );
    }

    const transactions = await fetchPayPalTransactionsById(transactionId);
    const verifiedTransaction = findCompletedPayPalTransaction(transactions, user.email);

    if (!verifiedTransaction) {
      return NextResponse.json(
        {
          error:
            'No completed PayPal payment matched your account email. Use the same email as your FateMirror account and paste the transaction ID from the PayPal receipt.',
        },
        { status: 404 }
      );
    }

    const transactionTime =
      verifiedTransaction.transaction_info.transaction_updated_date ||
      verifiedTransaction.transaction_info.transaction_initiation_date ||
      new Date().toISOString();

    const payload = mapPayPalVerificationToSubscription({
      userId: user.id,
      payerEmail: user.email,
      transactionId:
        verifiedTransaction.transaction_info.transaction_id || transactionId,
      transactionTime,
    });

    const { data: upserted, error } = await admin
      .from('subscriptions')
      .upsert(payload, { onConflict: 'user_id' })
      .select('*')
      .maybeSingle();

    if (error) {
      throw error;
    }

    return NextResponse.json({
      ok: true,
      subscription: (upserted as Subscription | null) ?? null,
    });
  } catch (error) {
    console.error('PayPal verification error:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Failed to verify PayPal payment.',
      },
      { status: 500 }
    );
  }
}
