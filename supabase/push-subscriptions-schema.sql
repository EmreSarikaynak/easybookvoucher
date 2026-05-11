-- Push notification subscriptions table
-- Stores user push subscription details for sending notifications

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  subscription JSONB NOT NULL, -- PushSubscription object
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Ensure one subscription per user
  UNIQUE(user_id)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS push_subscriptions_user_id_idx ON push_subscriptions(user_id);

-- RLS Policies
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can only see and manage their own subscriptions
CREATE POLICY "push_subscriptions_select" ON push_subscriptions
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "push_subscriptions_insert" ON push_subscriptions
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "push_subscriptions_update" ON push_subscriptions
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "push_subscriptions_delete" ON push_subscriptions
  FOR DELETE USING (user_id = auth.uid());

-- Admins can see all subscriptions (for sending notifications)
CREATE POLICY "push_subscriptions_admin_all" ON push_subscriptions
  FOR ALL USING (auth_user_role() IN ('super_admin', 'admin'));

-- Function to send push notification (placeholder)
-- This will be implemented as a Supabase Edge Function
COMMENT ON TABLE push_subscriptions IS 'Stores push notification subscriptions for web push notifications';
