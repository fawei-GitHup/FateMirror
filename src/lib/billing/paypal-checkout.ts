import {
  getPayPalAccessToken,
  getPayPalBaseUrl,
  mapPayPalVerificationToSubscription,
} from './paypal-verification.ts';
import type { BillingCycle } from './paypal.ts';

type BillingPlan = 'pro';

interface CreatePayPalOrderInput {
  userId: string;
  plan: BillingPlan;
  cycle: BillingCycle;
  returnUrl: string;
  cancelUrl: string;
}

interface PayPalLink {
  href?: string;
  rel?: string;
}

interface PayPalOrderResponse {
  id?: string;
  status?: string;
  links?: PayPalLink[];
  payer?: {
    email_address?: string;
    payer_id?: string;
  };
  purchase_units?: Array<{
    custom_id?: string;
    payments?: {
      captures?: Array<{
        id?: string;
        status?: string;
        amount?: {
          value?: string;
          currency_code?: string;
        };
        create_time?: string;
        update_time?: string;
      }>;
    };
  }>;
}

function getRequiredAppUrl() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) {
    throw new Error('Missing NEXT_PUBLIC_APP_URL for PayPal checkout.');
  }

  return appUrl;
}

function getPlanPrice(plan: BillingPlan, cycle: BillingCycle) {
  if (plan === 'pro' && cycle === 'yearly') {
    return process.env.PAYPAL_PRO_YEARLY_PRICE || '79.00';
  }

  if (plan === 'pro') {
    return process.env.PAYPAL_PRO_MONTHLY_PRICE || '9.90';
  }

  return '9.90';
}

function getCurrency() {
  return process.env.PAYPAL_CURRENCY || 'USD';
}

function getApproveLink(order: PayPalOrderResponse) {
  return order.links?.find((link) => link.rel === 'approve')?.href ?? null;
}

export async function createPayPalOrder(input: CreatePayPalOrderInput) {
  const token = await getPayPalAccessToken();
  const response = await fetch(`${getPayPalBaseUrl()}/v2/checkout/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      Prefer: 'return=representation',
    },
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [
        {
          custom_id: `${input.userId}:${input.cycle}`,
          amount: {
            currency_code: getCurrency(),
            value: getPlanPrice(input.plan, input.cycle),
          },
          description:
            input.cycle === 'yearly' ? 'FateMirror Pro Annual' : 'FateMirror Pro Monthly',
        },
      ],
      payment_source: {
        paypal: {
          experience_context: {
            return_url: input.returnUrl,
            cancel_url: input.cancelUrl,
            user_action: 'PAY_NOW',
          },
        },
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`PayPal create order failed: ${response.status} ${errorText}`);
  }

  const order = (await response.json()) as PayPalOrderResponse;
  if (!order.id) {
    throw new Error('PayPal order creation succeeded without returning an order ID.');
  }

  return {
    id: order.id,
    approveUrl: getApproveLink(order),
  };
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function parseCustomId(customId: string | null | undefined) {
  const [userId = '', cycle = 'monthly'] = (customId ?? '').split(':');
  return {
    userId: UUID_RE.test(userId) ? userId : '',
    cycle: cycle === 'yearly' ? 'yearly' : 'monthly',
  } as { userId: string; cycle: BillingCycle };
}

function addBillingPeriod(startAt: string, cycle: BillingCycle) {
  const date = new Date(startAt);
  if (cycle === 'yearly') {
    date.setUTCFullYear(date.getUTCFullYear() + 1);
  } else {
    date.setUTCMonth(date.getUTCMonth() + 1);
  }
  return date.toISOString();
}

type PayPalCaptureRecord = NonNullable<
  NonNullable<NonNullable<PayPalOrderResponse['purchase_units']>[number]['payments']>['captures']
>[number];

function isCompletedCapture(captureRecord: PayPalCaptureRecord | undefined) {
  return captureRecord?.status === 'COMPLETED';
}

export async function capturePayPalOrder(orderId: string, expectedUserId: string, expectedEmail: string) {
  const token = await getPayPalAccessToken();
  const response = await fetch(`${getPayPalBaseUrl()}/v2/checkout/orders/${orderId}/capture`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      Prefer: 'return=representation',
    },
    body: '{}',
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`PayPal capture failed: ${response.status} ${errorText}`);
  }

  const capture = (await response.json()) as PayPalOrderResponse;
  const customId = capture.purchase_units?.[0]?.custom_id;
  const checkoutMeta = parseCustomId(customId);
  if (checkoutMeta.userId && checkoutMeta.userId !== expectedUserId) {
    throw new Error('This PayPal order belongs to a different user.');
  }

  const captureRecord = capture.purchase_units?.[0]?.payments?.captures?.[0];
  const captureId = captureRecord?.id;
  const payerEmail = capture.payer?.email_address || expectedEmail;

  if (!captureId) {
    throw new Error('PayPal capture response did not include a capture ID.');
  }
  if (!isCompletedCapture(captureRecord)) {
    throw new Error('PayPal capture did not complete successfully.');
  }

  // Verify captured amount matches expected price to prevent tampered orders
  const capturedAmount = captureRecord?.amount?.value;
  const expectedPrice = getPlanPrice('pro', checkoutMeta.cycle);
  if (capturedAmount && capturedAmount !== expectedPrice) {
    throw new Error(
      `PayPal captured amount $${capturedAmount} does not match expected $${expectedPrice}.`
    );
  }

  const transactionTime =
    captureRecord?.update_time ||
    captureRecord?.create_time ||
    new Date().toISOString();

  return {
    orderId,
    cycle: checkoutMeta.cycle,
    payerEmail,
    payerId: capture.payer?.payer_id ?? null,
    captureId,
    subscription: {
      ...mapPayPalVerificationToSubscription({
        userId: expectedUserId,
        payerEmail,
        transactionId: captureId,
        transactionTime,
      }),
      paypal_order_id: orderId,
      current_period_end: addBillingPeriod(transactionTime, checkoutMeta.cycle),
    },
  };
}

export function getPayPalReturnUrl(orderId?: string) {
  const appUrl = getRequiredAppUrl();
  const url = new URL('/billing/paypal/return', appUrl);
  if (orderId) {
    url.searchParams.set('orderId', orderId);
  }
  return url.toString();
}

export function getPayPalCancelUrl() {
  const appUrl = getRequiredAppUrl();
  return new URL('/billing/paypal/cancel', appUrl).toString();
}
