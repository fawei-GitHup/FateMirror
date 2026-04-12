-- ============================================
-- FateMirror v3.1 - Initial Database Schema
-- 命镜 - 认知诊断增强版
-- ============================================

-- ============================================
-- 用户画像 + 认知画像 (Cognition Profile)
-- ============================================
CREATE TABLE profiles (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  display_name    TEXT,
  level           INT DEFAULT 0,
  level_name      TEXT DEFAULT 'Sleeper',
  life_context    TEXT,
  personality     TEXT,
  core_values     TEXT[] DEFAULT '{}',

  -- Cognition Profile
  thinking_level_overall  TEXT DEFAULT 'L1'
    CHECK (thinking_level_overall IN ('L1', 'L2', 'L3', 'L4')),
  thinking_levels_by_theme JSONB DEFAULT '{}',
  thinking_distortions    TEXT[] DEFAULT '{}',
  behavior_primary        TEXT,
  behavior_secondary      TEXT,
  behavior_scores         JSONB DEFAULT '{}',
  mindset_scores          JSONB DEFAULT '{}',
  cognition_version       INT DEFAULT 0,
  cognition_updated_at    TIMESTAMPTZ,

  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 日记 (Journals) - 六维标签
-- ============================================
CREATE TABLE journals (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title           TEXT,
  content         TEXT NOT NULL,
  mode            TEXT CHECK (mode IN ('guided', 'freewrite')),

  -- AI extracted six-dimension tags
  emotions        TEXT[] DEFAULT '{}',
  themes          TEXT[] DEFAULT '{}',
  decisions       TEXT[] DEFAULT '{}',
  insights        TEXT[] DEFAULT '{}',
  thinking_patterns TEXT[] DEFAULT '{}',
  behavior_patterns TEXT[] DEFAULT '{}',
  ai_summary      TEXT,
  ai_cognition_note TEXT,

  -- Pattern detection
  pattern_ids     UUID[] DEFAULT '{}',
  habit_loop_ids  UUID[] DEFAULT '{}',
  loop_count      INT DEFAULT 0,

  -- Metadata
  word_count      INT DEFAULT 0,
  language        TEXT DEFAULT 'en',
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_journals_themes ON journals USING GIN (themes);
CREATE INDEX idx_journals_emotions ON journals USING GIN (emotions);
CREATE INDEX idx_journals_thinking ON journals USING GIN (thinking_patterns);
CREATE INDEX idx_journals_behavior ON journals USING GIN (behavior_patterns);
CREATE INDEX idx_journals_user_date ON journals (user_id, created_at DESC);

-- ============================================
-- 循环模式 (Patterns)
-- ============================================
CREATE TABLE patterns (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  description     TEXT,
  themes          TEXT[] NOT NULL,
  thinking_root   TEXT,
  behavior_root   TEXT,
  trigger_count   INT DEFAULT 1,
  first_seen      TIMESTAMPTZ DEFAULT now(),
  last_seen       TIMESTAMPTZ DEFAULT now(),
  status          TEXT DEFAULT 'active'
                  CHECK (status IN ('active', 'breaking', 'resolved')),
  journal_ids     UUID[] DEFAULT '{}',
  user_quotes     TEXT[] DEFAULT '{}',
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 习惯回路 (Habit Loops)
-- ============================================
CREATE TABLE habit_loops (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  cue             TEXT NOT NULL,
  craving         TEXT NOT NULL,
  response        TEXT NOT NULL,
  reward          TEXT NOT NULL,
  hidden_cost     TEXT,
  behavior_type   TEXT NOT NULL,
  thinking_type   TEXT,
  trigger_count   INT DEFAULT 3,
  first_seen      TIMESTAMPTZ NOT NULL,
  last_seen       TIMESTAMPTZ NOT NULL,
  status          TEXT DEFAULT 'active'
                  CHECK (status IN ('active', 'observed', 'breaking', 'broken')),
  pattern_id      UUID REFERENCES patterns(id),
  journal_ids     UUID[] DEFAULT '{}',
  user_quotes     TEXT[] DEFAULT '{}',
  breaking_since  TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 命运树节点 (Life Nodes)
-- ============================================
CREATE TABLE life_nodes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  date            DATE NOT NULL,
  type            TEXT NOT NULL
                  CHECK (type IN ('milestone', 'choice', 'insight', 'crisis')),
  themes          TEXT[] DEFAULT '{}',
  emotions        TEXT[] DEFAULT '{}',
  parent_id       UUID REFERENCES life_nodes(id),
  ai_summary      TEXT,
  user_reflection TEXT,
  status          TEXT DEFAULT 'active'
                  CHECK (status IN ('active', 'resolved', 'recurring')),
  is_auto         BOOLEAN DEFAULT true,
  chapter_id      UUID,
  journal_ids     UUID[] DEFAULT '{}',
  position_x      FLOAT DEFAULT 0,
  position_y      FLOAT DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 人生章节 (Chapters)
-- ============================================
CREATE TABLE chapters (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  number          INT NOT NULL,
  title           TEXT NOT NULL,
  subtitle        TEXT,
  date_start      DATE,
  date_end        DATE,
  themes          TEXT[] DEFAULT '{}',
  ai_narrative    TEXT,
  status          TEXT DEFAULT 'open'
                  CHECK (status IN ('open', 'closed')),
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- AI 对话历史 (Conversations)
-- ============================================
CREATE TABLE conversations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  journal_id      UUID REFERENCES journals(id),
  role            TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content         TEXT NOT NULL,
  tokens_used     INT DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 订阅状态 (Subscriptions)
-- ============================================
CREATE TABLE subscriptions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  billing_provider TEXT DEFAULT 'creem'
                  CHECK (billing_provider IN ('creem', 'paypal')),
  creem_customer_id    TEXT,
  creem_subscription_id TEXT,
  paypal_order_id       TEXT,
  paypal_transaction_id TEXT,
  paypal_payer_email    TEXT,
  paypal_verified_at    TIMESTAMPTZ,
  plan            TEXT DEFAULT 'free'
                  CHECK (plan IN ('free', 'pro')),
  status          TEXT DEFAULT 'active'
                  CHECK (status IN ('active', 'canceled', 'past_due', 'trialing')),
  current_period_start  TIMESTAMPTZ,
  current_period_end    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- Row Level Security (RLS)
-- ============================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE journals ENABLE ROW LEVEL SECURITY;
ALTER TABLE patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE habit_loops ENABLE ROW LEVEL SECURITY;
ALTER TABLE life_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only access own data" ON profiles
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can only access own data" ON journals
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can only access own data" ON patterns
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can only access own data" ON habit_loops
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can only access own data" ON life_nodes
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can only access own data" ON chapters
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can only access own data" ON conversations
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can only access own data" ON subscriptions
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX idx_subscriptions_creem_customer_id
  ON subscriptions (creem_customer_id);

CREATE INDEX idx_subscriptions_creem_subscription_id
  ON subscriptions (creem_subscription_id);

CREATE UNIQUE INDEX idx_subscriptions_paypal_transaction_id
  ON subscriptions (paypal_transaction_id)
  WHERE paypal_transaction_id IS NOT NULL;

CREATE UNIQUE INDEX idx_subscriptions_paypal_order_id
  ON subscriptions (paypal_order_id)
  WHERE paypal_order_id IS NOT NULL;

-- ============================================
-- Auto-create profile on user signup
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
