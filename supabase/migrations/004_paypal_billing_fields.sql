ALTER TABLE subscriptions
  DROP CONSTRAINT IF EXISTS subscriptions_billing_provider_check;

ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS paypal_order_id TEXT,
  ADD COLUMN IF NOT EXISTS paypal_transaction_id TEXT,
  ADD COLUMN IF NOT EXISTS paypal_payer_email TEXT,
  ADD COLUMN IF NOT EXISTS paypal_verified_at TIMESTAMPTZ;

ALTER TABLE subscriptions
  ADD CONSTRAINT subscriptions_billing_provider_check
  CHECK (billing_provider IN ('creem', 'paypal'));

CREATE UNIQUE INDEX IF NOT EXISTS idx_subscriptions_paypal_transaction_id
  ON subscriptions (paypal_transaction_id)
  WHERE paypal_transaction_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_subscriptions_paypal_order_id
  ON subscriptions (paypal_order_id)
  WHERE paypal_order_id IS NOT NULL;
