ALTER TABLE public.connected_accounts
  ADD COLUMN IF NOT EXISTS refresh_token_iv text;

DROP TABLE IF EXISTS public.oauth_pending_tokens;