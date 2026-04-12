DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'subscriptions' AND column_name = 'stripe_customer_id'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'subscriptions' AND column_name = 'creem_customer_id'
  ) THEN
    ALTER TABLE subscriptions RENAME COLUMN stripe_customer_id TO creem_customer_id;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'subscriptions' AND column_name = 'stripe_subscription_id'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'subscriptions' AND column_name = 'creem_subscription_id'
  ) THEN
    ALTER TABLE subscriptions RENAME COLUMN stripe_subscription_id TO creem_subscription_id;
  END IF;
END $$;

ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS billing_provider TEXT DEFAULT 'creem',
  ADD COLUMN IF NOT EXISTS creem_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS creem_subscription_id TEXT;

ALTER TABLE subscriptions
  DROP CONSTRAINT IF EXISTS subscriptions_billing_provider_check;

ALTER TABLE subscriptions
  ADD CONSTRAINT subscriptions_billing_provider_check
  CHECK (billing_provider IN ('creem'));

UPDATE subscriptions
SET billing_provider = 'creem'
WHERE billing_provider IS NULL;

CREATE INDEX IF NOT EXISTS idx_subscriptions_creem_customer_id
  ON subscriptions (creem_customer_id);

CREATE INDEX IF NOT EXISTS idx_subscriptions_creem_subscription_id
  ON subscriptions (creem_subscription_id);
