CREATE TABLE IF NOT EXISTS public.oauth_connection_states (
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

DROP POLICY IF EXISTS "own oauth states select" ON public.oauth_connection_states;
DROP POLICY IF EXISTS "own oauth states insert" ON public.oauth_connection_states;
DROP POLICY IF EXISTS "own oauth states delete" ON public.oauth_connection_states;

CREATE POLICY "own oauth states select" ON public.oauth_connection_states
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own oauth states insert" ON public.oauth_connection_states
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own oauth states delete" ON public.oauth_connection_states
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.save_connected_account_from_oauth(
  _state_hash text,
  _user_id uuid,
  _account_type text,
  _email_address text,
  _access_token_ciphertext text,
  _refresh_token_ciphertext text,
  _token_iv text,
  _scope text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _state public.oauth_connection_states%ROWTYPE;
BEGIN
  IF _account_type NOT IN ('gmail', 'google_calendar') THEN
    RAISE EXCEPTION 'Invalid account type' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO _state
  FROM public.oauth_connection_states
  WHERE state_hash = _state_hash
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'OAuth state not found' USING ERRCODE = '28000';
  END IF;

  IF _state.consumed_at IS NOT NULL THEN
    RAISE EXCEPTION 'OAuth state already used' USING ERRCODE = '28000';
  END IF;

  IF _state.expires_at < now() THEN
    RAISE EXCEPTION 'OAuth state expired' USING ERRCODE = '28000';
  END IF;

  IF _state.user_id <> _user_id OR _state.account_type <> _account_type THEN
    RAISE EXCEPTION 'OAuth state mismatch' USING ERRCODE = '28000';
  END IF;

  INSERT INTO public.connected_accounts (
    user_id,
    account_type,
    email_address,
    access_token_ciphertext,
    refresh_token_ciphertext,
    token_iv,
    scope,
    connected_at,
    last_synced,
    is_active
  ) VALUES (
    _user_id,
    _account_type,
    _email_address,
    _access_token_ciphertext,
    _refresh_token_ciphertext,
    _token_iv,
    _scope,
    now(),
    now(),
    true
  )
  ON CONFLICT (user_id, account_type) DO UPDATE SET
    email_address = EXCLUDED.email_address,
    access_token_ciphertext = EXCLUDED.access_token_ciphertext,
    refresh_token_ciphertext = COALESCE(EXCLUDED.refresh_token_ciphertext, public.connected_accounts.refresh_token_ciphertext),
    token_iv = EXCLUDED.token_iv,
    scope = EXCLUDED.scope,
    connected_at = now(),
    last_synced = now(),
    is_active = true,
    updated_at = now();

  UPDATE public.oauth_connection_states
  SET consumed_at = now()
  WHERE state_hash = _state_hash;
END;
$$;

REVOKE ALL ON FUNCTION public.save_connected_account_from_oauth(text, uuid, text, text, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_connected_account_from_oauth(text, uuid, text, text, text, text, text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.save_connected_account_from_oauth(text, uuid, text, text, text, text, text, text) TO service_role;