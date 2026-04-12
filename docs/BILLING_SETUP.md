# Creem Billing Setup
Authority: setup reference
Use this file for billing provider setup steps only.
If setup details conflict with `docs/STATUS.md` or runtime routes, prefer current status and code.

This project now uses Creem as the billing provider.

## Required environment variables

Add these to `.env.local`:

```env
CREEM_API_KEY=creem_your-key
CREEM_WEBHOOK_SECRET=creem_whsec_your-key
CREEM_BASE_URL=https://test-api.creem.io
CREEM_PRO_MONTHLY_PRODUCT_ID=prod_your-monthly-id
CREEM_PRO_YEARLY_PRODUCT_ID=prod_your-yearly-id
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Routes in the app

- Checkout: `/api/billing/checkout`
- Customer portal: `/api/billing/portal`
- Billing status: `/api/billing/status`
- Webhook: `/api/creem/webhook`

## What the webhook updates

The webhook upserts the `subscriptions` row by `user_id` and writes:

- `billing_provider = 'creem'`
- `creem_customer_id`
- `creem_subscription_id`
- `plan`
- `status`
- `current_period_start`
- `current_period_end`

## Required external steps

1. Create monthly and yearly products in Creem.
2. Copy their product IDs into `.env.local`.
3. Register the webhook endpoint in Creem.
4. Point the webhook secret in Creem and `.env.local` to the same value.
5. Trigger one real or test checkout to confirm webhook delivery.

## Local verification

After configuration:

1. Open `/settings`.
2. Confirm the billing section reports `Config: ready`.
3. Start a checkout.
4. After payment, verify the webhook updated `subscriptions`.
