CREATE TABLE public.oauth_connection_states (
  state_hash text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_type text NOT NULL CHECK (account_type IN ('gmail','google_calendar')),
  redirect_url text NOT NULL,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.oauth_connection_states TO authenticated;
GRANT ALL ON public.oauth_connection_states TO service_role;

ALTER TABLE public.oauth_connection_states ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own oauth states select" ON public.oauth_connection_states
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own oauth states insert" ON public.oauth_connection_states
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own oauth states update" ON public.oauth_connection_states
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own oauth states delete" ON public.oauth_connection_states
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.oauth_pending_tokens (
  state_hash text PRIMARY KEY,
  email_address text,
  access_token_ciphertext text NOT NULL,
  refresh_token_ciphertext text,
  token_iv text NOT NULL,
  scope text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT INSERT ON public.oauth_pending_tokens TO anon;
GRANT SELECT, DELETE ON public.oauth_pending_tokens TO authenticated;
GRANT ALL ON public.oauth_pending_tokens TO service_role;

ALTER TABLE public.oauth_pending_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "callbacks can create pending oauth tokens" ON public.oauth_pending_tokens
  FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "users can read own pending oauth tokens" ON public.oauth_pending_tokens
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1
      FROM public.oauth_connection_states s
      WHERE s.state_hash = oauth_pending_tokens.state_hash
        AND s.user_id = auth.uid()
        AND s.consumed_at IS NULL
        AND s.expires_at > now()
    )
  );
CREATE POLICY "users can delete own pending oauth tokens" ON public.oauth_pending_tokens
  FOR DELETE TO authenticated USING (
    EXISTS (
      SELECT 1
      FROM public.oauth_connection_states s
      WHERE s.state_hash = oauth_pending_tokens.state_hash
        AND s.user_id = auth.uid()
    )
  );