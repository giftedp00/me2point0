import { createFileRoute } from "@tanstack/react-router";
import { setCookie } from "@tanstack/react-start/server";

export const Route = createFileRoute("/api/public/oauth/google/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const code = url.searchParams.get("code");
        const stateRaw = url.searchParams.get("state");
        const errParam = url.searchParams.get("error");
        const origin = url.origin;

        const back = (path: string) => Response.redirect(`${origin}${path}`, 302);

        if (errParam) return back(`/settings?oauth_error=${encodeURIComponent(errParam)}`);
        if (!code || !stateRaw) return back(`/settings?oauth_error=missing_code`);

        const { verifyState, hashState } = await import("@/lib/oauth-state.server");
        let state;
        try {
          state = verifyState(stateRaw);
        } catch (e) {
          return back(`/settings?oauth_error=${encodeURIComponent((e as Error).message)}`);
        }

        const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID!;
        const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET!;
        const redirectUri = `${origin}/api/public/oauth/google/callback`;

        // Exchange code for tokens.
        const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
          method: "POST",
          headers: { "content-type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            code,
            client_id: clientId,
            client_secret: clientSecret,
            redirect_uri: redirectUri,
            grant_type: "authorization_code",
          }),
        });
        if (!tokenRes.ok) {
          const body = await tokenRes.text();
          console.error("Google token exchange failed", tokenRes.status, body);
          return back(`/settings?oauth_error=token_exchange_failed`);
        }
        const tokens = (await tokenRes.json()) as {
          access_token: string;
          refresh_token?: string;
          expires_in: number;
          scope: string;
          token_type: string;
          id_token?: string;
        };

        // Fetch email.
        const uiRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
          headers: { Authorization: `Bearer ${tokens.access_token}` },
        });
        const userinfo = uiRes.ok ? ((await uiRes.json()) as { email?: string }) : { email: undefined };

        const { encryptToken } = await import("@/lib/token-crypto.server");
        const accessEnc = encryptToken(tokens.access_token);
        const refreshEnc = tokens.refresh_token ? encryptToken(tokens.refresh_token) : null;
        const handoff = encryptToken(
          JSON.stringify({
            state_hash: hashState(stateRaw),
            user_id: state.uid,
            account_type: state.type,
            email_address: userinfo.email ?? null,
            access_token_ciphertext: accessEnc.ciphertext,
            refresh_token_ciphertext: refreshEnc?.ciphertext ?? null,
            token_iv: accessEnc.iv,
            refresh_token_iv: refreshEnc?.iv ?? null,
            scope: tokens.scope,
          }),
        );

        setCookie(
          "me2_google_oauth_result",
          Buffer.from(JSON.stringify(handoff), "utf8").toString("base64url"),
          {
            path: "/",
            httpOnly: true,
            secure: origin.startsWith("https://"),
            sameSite: "lax",
            maxAge: 10 * 60,
          },
        );

        return back(`/settings?oauth_finish=1`);
      },
    },
  },
});
