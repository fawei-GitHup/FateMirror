CREATE TABLE ai_usage_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  journal_id UUID REFERENCES journals(id) ON DELETE SET NULL,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  feature TEXT NOT NULL,
  plan TEXT NOT NULL CHECK (plan IN ('free', 'pro')),
  input_tokens INT NOT NULL DEFAULT 0,
  output_tokens INT NOT NULL DEFAULT 0,
  cached_input_tokens INT NOT NULL DEFAULT 0,
  request_count INT NOT NULL DEFAULT 1,
  estimated_cost_usd NUMERIC(12, 6) NOT NULL DEFAULT 0,
  platform_cost_usd NUMERIC(12, 6) NOT NULL DEFAULT 0,
  used_user_key BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_usage_events_user_date
  ON ai_usage_events (user_id, created_at DESC);

CREATE INDEX idx_ai_usage_events_user_feature_date
  ON ai_usage_events (user_id, feature, created_at DESC);

ALTER TABLE ai_usage_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only access own ai usage" ON ai_usage_events
  FOR ALL USING (auth.uid() = user_id);
