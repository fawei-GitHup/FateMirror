CREATE TABLE IF NOT EXISTS action_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  reason TEXT,
  prompt TEXT NOT NULL,
  source TEXT DEFAULT 'system'
    CHECK (source IN ('system')),
  status TEXT DEFAULT 'active'
    CHECK (status IN ('active', 'completed', 'dismissed')),
  habit_loop_id UUID REFERENCES habit_loops(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

ALTER TABLE action_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can only access own action tasks" ON action_tasks;
CREATE POLICY "Users can only access own action tasks" ON action_tasks
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_action_tasks_user_status
  ON action_tasks (user_id, status, created_at DESC);
