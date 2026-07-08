DROP POLICY IF EXISTS "callbacks can create pending oauth tokens" ON public.oauth_pending_tokens;

CREATE POLICY "callbacks can create pending oauth tokens" ON public.oauth_pending_tokens
  FOR INSERT TO anon WITH CHECK (state_hash IS NOT NULL AND length(state_hash) >= 32 AND length(access_token_ciphertext) > 0 AND length(token_iv) > 0 AND length(scope) > 0);