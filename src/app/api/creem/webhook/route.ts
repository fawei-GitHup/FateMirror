import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import {
  inferPlanFromProductId,
  mapCreemStatusToSubscriptionStatus,
  verifyCreemWebhookSignature,
  type CreemWebhookEvent,
} from '@/lib/billing/creem';

export const runtime = 'nodejs';

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

function asString(value: unknown) {
  return typeof value === 'string' ? value : null;
}

function getNestedString(record: Record<string, unknown> | null, keys: string[]) {
  let current: unknown = record;
  for (const key of keys) {
    const currentRecord = asRecord(current);
    if (!currentRecord || !(key in currentRecord)) {
      return null;
    }
    current = currentRecord[key];
  }
  return asString(current);
}

function getUserId(event: CreemWebhookEvent) {
  const object = asRecord(event.object);
  return (
    getNestedString(object, ['metadata', 'userId']) ||
    getNestedString(asRecord(object?.subscription), ['metadata', 'userId']) ||
    getNestedString(asRecord(object?.order), ['metadata', 'userId'])
  );
}

function getProductId(event: CreemWebhookEvent) {
  const object = asRecord(event.object);
  return (
    asString(object?.product) ||
    getNestedString(object, ['product', 'id']) ||
    getNestedString(asRecord(object?.order), ['product']) ||
    getNestedString(asRecord(object?.order), ['product', 'id'])
  );
}

function getCustomerId(event: CreemWebhookEvent) {
  const object = asRecord(event.object);
  return (
    asString(object?.customer) ||
    getNestedString(object, ['customer', 'id']) ||
    getNestedString(asRecord(object?.order), ['customer']) ||
    getNestedString(asRecord(object?.order), ['customer', 'id'])
  );
}

function getSubscriptionId(event: CreemWebhookEvent) {
  const object = asRecord(event.object);
  return (
    asString(object?.subscription) ||
    getNestedString(object, ['subscription', 'id']) ||
    asString(object?.id)
  );
}

function getStatus(event: CreemWebhookEvent) {
  const object = asRecord(event.object);
  const directStatus = asString(object?.status);
  const orderStatus = getNestedString(asRecord(object?.order), ['status']);

  switch (event.eventType) {
    case 'subscription.canceled':
      return 'canceled';
    case 'subscription.trialing':
      return 'trialing';
    case 'subscription.paused':
    case 'subscription.expired':
      return 'paused';
    case 'subscription.paid':
    case 'subscription.active':
    case 'checkout.completed':
      return directStatus || orderStatus || 'active';
    default:
      return directStatus || orderStatus || 'active';
  }
}

function getTimestamp(event: CreemWebhookEvent, field: 'current_period_start' | 'current_period_end') {
  const object = asRecord(event.object);
  return (
    getNestedString(object, [field]) ||
    getNestedString(asRecord(object?.subscription), [field]) ||
    null
  );
}

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('creem-signature');

    if (!signature || !verifyCreemWebhookSignature(rawBody, signature)) {
      return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 });
    }

    const event = JSON.parse(rawBody) as CreemWebhookEvent;
    const userId = getUserId(event);

    if (!userId) {
      return NextResponse.json({ received: true, ignored: true });
    }

    const supabase = await createServiceRoleClient();
    const productId = getProductId(event);
    const customerId = getCustomerId(event);
    const subscriptionId = getSubscriptionId(event);
    const status = mapCreemStatusToSubscriptionStatus(getStatus(event));
    const plan = inferPlanFromProductId(productId);

    await supabase.from('subscriptions').upsert(
      {
        user_id: userId,
        billing_provider: 'creem',
        creem_customer_id: customerId,
        creem_subscription_id: subscriptionId,
        plan,
        status,
        current_period_start: getTimestamp(event, 'current_period_start'),
        current_period_end: getTimestamp(event, 'current_period_end'),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Creem webhook error:', error);
    return NextResponse.json({ error: 'Webhook handling failed' }, { status: 500 });
  }
}
