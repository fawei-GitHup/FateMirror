import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createCreemCustomerPortal } from '@/lib/billing/creem';
import type { Subscription } from '@/types';

export const runtime = 'nodejs';

export async function POST() {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    const subscription = data as Subscription | null;
    const customerId = subscription?.creem_customer_id;

    if (!customerId) {
      return NextResponse.json(
        { error: 'No Creem customer record found for this user.' },
        { status: 400 }
      );
    }

    const portal = await createCreemCustomerPortal({ customerId });
    return NextResponse.json({ url: portal.customer_portal_link });
  } catch (error) {
    console.error('Creem portal error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create billing portal session' },
      { status: 500 }
    );
  }
}
