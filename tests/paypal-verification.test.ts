import test from 'node:test';
import assert from 'node:assert/strict';

import {
  findCompletedPayPalTransaction,
  mapPayPalVerificationToSubscription,
  stripPayPalColumnsForLegacySchema,
} from '../src/lib/billing/paypal-verification.ts';
import { capturePayPalOrder } from '../src/lib/billing/paypal-checkout.ts';

test('findCompletedPayPalTransaction requires a successful positive transaction for the same payer email', () => {
  const transaction = findCompletedPayPalTransaction(
    [
      {
        transaction_info: {
          transaction_id: 'NEGATIVE123',
          transaction_status: 'S',
          transaction_amount: { value: '-19.00', currency_code: 'USD' },
        },
        payer_info: { email_address: 'owner@example.com' },
      },
      {
        transaction_info: {
          transaction_id: 'SUCCESS123',
          transaction_status: 'S',
          transaction_amount: { value: '19.00', currency_code: 'USD' },
        },
        payer_info: { email_address: 'owner@example.com' },
      },
    ],
    'owner@example.com'
  );

  assert.equal(transaction?.transaction_info.transaction_id, 'SUCCESS123');
});

test('mapPayPalVerificationToSubscription creates a pro subscription payload', () => {
  const payload = mapPayPalVerificationToSubscription({
    userId: 'user-1',
    payerEmail: 'owner@example.com',
    transactionId: 'SUCCESS123',
    transactionTime: '2026-04-06T08:00:00Z',
  });

  assert.equal(payload.user_id, 'user-1');
  assert.equal(payload.billing_provider, 'paypal');
  assert.equal(payload.plan, 'pro');
  assert.equal(payload.status, 'active');
  assert.equal(payload.paypal_transaction_id, 'SUCCESS123');
  assert.equal(payload.paypal_payer_email, 'owner@example.com');
  assert.equal(payload.current_period_start, '2026-04-06T08:00:00Z');
});

test('stripPayPalColumnsForLegacySchema removes PayPal-specific fields for outdated schema caches', () => {
  const payload = stripPayPalColumnsForLegacySchema({
    user_id: 'user-1',
    billing_provider: 'paypal',
    plan: 'pro',
    status: 'active',
    current_period_start: '2026-04-06T08:00:00Z',
    current_period_end: '2026-05-06T08:00:00Z',
    paypal_order_id: 'ORDER-123',
    paypal_transaction_id: 'CAPTURE-123',
    paypal_payer_email: 'buyer@example.com',
    paypal_verified_at: '2026-04-06T08:01:00Z',
  });

  assert.equal('paypal_order_id' in payload, false);
  assert.equal('paypal_transaction_id' in payload, false);
  assert.equal('paypal_payer_email' in payload, false);
  assert.equal('paypal_verified_at' in payload, false);
  assert.equal(payload.billing_provider, 'paypal');
  assert.equal(payload.plan, 'pro');
});

test('capturePayPalOrder succeeds from capture payload without reporting API permissions', async () => {
  process.env.PAYPAL_CLIENT_ID = 'sandbox-client-id';
  process.env.PAYPAL_CLIENT_SECRET = 'sandbox-client-secret';
  process.env.PAYPAL_BASE_URL = 'https://api-m.sandbox.paypal.com';

  const originalFetch = globalThis.fetch;
  const calls: string[] = [];

  globalThis.fetch = (async (input: string | URL | Request) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    calls.push(url);

    if (url.endsWith('/v1/oauth2/token')) {
      return new Response(JSON.stringify({ access_token: 'token-123' }), { status: 200 });
    }

    if (url.includes('/v2/checkout/orders/ORDER-123/capture')) {
      return new Response(
        JSON.stringify({
          id: 'ORDER-123',
          payer: {
            email_address: 'buyer@example.com',
            payer_id: 'PAYER-123',
          },
          purchase_units: [
            {
              custom_id: 'user-123:monthly',
              payments: {
                captures: [
                  {
                    id: 'CAPTURE-123',
                    status: 'COMPLETED',
                    amount: {
                      value: '9.90',
                      currency_code: 'USD',
                    },
                    create_time: '2026-04-06T10:00:00Z',
                    update_time: '2026-04-06T10:00:10Z',
                  },
                ],
              },
            },
          ],
        }),
        { status: 200 }
      );
    }

    return new Response('unexpected', { status: 500 });
  }) as typeof fetch;

  try {
    const result = await capturePayPalOrder('ORDER-123', 'user-123', 'buyer@example.com');

    assert.equal(result.captureId, 'CAPTURE-123');
    assert.equal(result.subscription.paypal_transaction_id, 'CAPTURE-123');
    assert.equal(result.subscription.paypal_payer_email, 'buyer@example.com');
    assert.equal(result.subscription.current_period_start, '2026-04-06T10:00:10Z');
    assert.ok(calls.some((url) => url.includes('/v2/checkout/orders/ORDER-123/capture')));
    assert.equal(calls.some((url) => url.includes('/v1/reporting/transactions')), false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
