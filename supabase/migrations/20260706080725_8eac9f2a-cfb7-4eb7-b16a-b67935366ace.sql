-- 1. Add a "skipped connections" marker to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS connections_skipped_at timestamptz;

-- 2. connected_accounts
CREATE TABLE public.connected_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_type text NOT NULL CHECK (account_type IN ('gmail','google_calendar')),
  email_address text,
  access_token_ciphertext text,
  refresh_token_ciphertext text,
  token_iv text,
  scope text,
  connected_at timestamptz NOT NULL DEFAULT now(),
  last_synced timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, account_type)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.connected_accounts TO authenticated;
GRANT ALL ON public.connected_accounts TO service_role;

ALTER TABLE public.connected_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own connected_accounts select" ON public.connected_accounts
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own connected_accounts insert" ON public.connected_accounts
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own connected_accounts update" ON public.connected_accounts
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own connected_accounts delete" ON public.connected_accounts
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 3. notification_preferences
CREATE TABLE public.notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  summarize_emails_daily boolean NOT NULL DEFAULT true,
  urgent_email_alerts boolean NOT NULL DEFAULT true,
  draft_replies boolean NOT NULL DEFAULT true,
  key_contact_alerts boolean NOT NULL DEFAULT true,
  morning_schedule_briefing boolean NOT NULL DEFAULT true,
  conflict_warnings boolean NOT NULL DEFAULT true,
  event_reminders boolean NOT NULL DEFAULT true,
  ai_event_suggestions boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notification_preferences TO authenticated;
GRANT ALL ON public.notification_preferences TO service_role;

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own notif prefs select" ON public.notification_preferences
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own notif prefs insert" ON public.notification_preferences
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own notif prefs update" ON public.notification_preferences
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own notif prefs delete" ON public.notification_preferences
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 4. updated_at triggers
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER connected_accounts_set_updated_at
  BEFORE UPDATE ON public.connected_accounts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER notification_preferences_set_updated_at
  BEFORE UPDATE ON public.notification_preferences
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
