import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type AccountType = "gmail" | "google_calendar";

const DEFAULT_PREFS = {
  summarize_emails_daily: true,
  urgent_email_alerts: true,
  draft_replies: true,
  key_contact_alerts: true,
  morning_schedule_briefing: true,
  conflict_warnings: true,
  event_reminders: true,
  ai_event_suggestions: true,
};

export const getConnectedAccounts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("connected_accounts")
      .select("id, account_type, email_address, connected_at, last_synced, is_active")
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getNotificationPrefs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("notification_preferences")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (data) return data;
    // Auto-create defaults on first read.
    const { data: inserted, error: insErr } = await supabase
      .from("notification_preferences")
      .insert({ user_id: userId, ...DEFAULT_PREFS })
      .select("*")
      .single();
    if (insErr) throw new Error(insErr.message);
    return inserted;
  });

const PrefKey = z.enum([
  "summarize_emails_daily",
  "urgent_email_alerts",
  "draft_replies",
  "key_contact_alerts",
  "morning_schedule_briefing",
  "conflict_warnings",
  "event_reminders",
  "ai_event_suggestions",
]);

const UpdatePrefInput = z.object({
  key: PrefKey,
  value: z.boolean(),
});

export const updateNotificationPref = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => UpdatePrefInput.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    // Ensure a row exists (defaults) without overwriting existing values.
    const { error: upErr } = await supabase
      .from("notification_preferences")
      .upsert(
        { user_id: userId, ...DEFAULT_PREFS },
        { onConflict: "user_id", ignoreDuplicates: true },
      );
    if (upErr) throw new Error(upErr.message);
    // Then set the specific key (upsert above would overwrite others on first insert only).
    const patch: Record<string, boolean> = { [data.key]: data.value };
    const { error } = await supabase
      .from("notification_preferences")
      .update(patch as never)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const DisconnectInput = z.object({
  account_type: z.enum(["gmail", "google_calendar"]),
});

export const disconnectAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => DisconnectInput.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("connected_accounts")
      .delete()
      .eq("user_id", userId)
      .eq("account_type", data.account_type);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const skipConnections = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("profiles")
      .update({ connections_skipped_at: new Date().toISOString() })
      .eq("id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const StartOAuthInput = z.object({
  account_type: z.enum(["gmail", "google_calendar"]),
  origin: z.string().url(),
});

export const startGoogleOAuth = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => StartOAuthInput.parse(data))
  .handler(async ({ data, context }) => {
    const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      return { configured: false as const };
    }
    const { signState, hashState, GMAIL_SCOPES, CALENDAR_SCOPES } = await import("./oauth-state.server");
    const scopes = data.account_type === "gmail" ? GMAIL_SCOPES : CALENDAR_SCOPES;
    const redirectUri = `${data.origin}/api/public/oauth/google/callback`;
    const state = signState({
      uid: context.userId,
      type: data.account_type,
      redirect: `${data.origin}/settings?connected=${data.account_type}`,
    });
    const { error } = await context.supabase.from("oauth_connection_states").insert({
      state_hash: hashState(state),
      user_id: context.userId,
      account_type: data.account_type,
      redirect_url: `${data.origin}/settings?connected=${data.account_type}`,
      expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    });
    if (error) throw new Error(error.message);
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: scopes.join(" "),
      access_type: "offline",
      include_granted_scopes: "true",
      prompt: "consent",
      state,
    });
    const authorize_url = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
    return { configured: true as const, authorize_url };
  });

export const finishGoogleOAuth = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { getCookie, deleteCookie } = await import("@tanstack/react-start/server");
    const { decryptToken } = await import("./token-crypto.server");

    const rawCookie = getCookie("me2_google_oauth_result");
    if (!rawCookie) throw new Error("Missing OAuth handoff");

    const encrypted = JSON.parse(Buffer.from(rawCookie, "base64url").toString("utf8")) as {
      ciphertext: string;
      iv: string;
    };
    const payload = JSON.parse(decryptToken(encrypted.ciphertext, encrypted.iv)) as {
      state_hash: string;
      user_id: string;
      account_type: "gmail" | "google_calendar";
      email_address: string | null;
      access_token_ciphertext: string;
      refresh_token_ciphertext: string | null;
      token_iv: string;
      refresh_token_iv: string | null;
      scope: string;
    };

    if (payload.user_id !== context.userId) {
      deleteCookie("me2_google_oauth_result", { path: "/" });
      throw new Error("OAuth handoff belongs to another user");
    }

    const { data: state, error: stateError } = await context.supabase
      .from("oauth_connection_states")
      .select("account_type, consumed_at, expires_at")
      .eq("state_hash", payload.state_hash)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (stateError) throw new Error(stateError.message);
    if (!state || state.consumed_at || new Date(state.expires_at).getTime() < Date.now()) {
      deleteCookie("me2_google_oauth_result", { path: "/" });
      throw new Error("OAuth handoff expired");
    }
    if (state.account_type !== payload.account_type) {
      deleteCookie("me2_google_oauth_result", { path: "/" });
      throw new Error("OAuth handoff mismatch");
    }

    const accountPatch: Record<string, string | boolean | null> = {
      user_id: context.userId,
      account_type: payload.account_type,
      email_address: payload.email_address,
      access_token_ciphertext: payload.access_token_ciphertext,
      token_iv: payload.token_iv,
      scope: payload.scope,
      connected_at: new Date().toISOString(),
      last_synced: new Date().toISOString(),
      is_active: true,
    };
    if (payload.refresh_token_ciphertext && payload.refresh_token_iv) {
      accountPatch.refresh_token_ciphertext = payload.refresh_token_ciphertext;
      accountPatch.refresh_token_iv = payload.refresh_token_iv;
    }

    const { error: saveError } = await context.supabase
      .from("connected_accounts")
      .upsert(accountPatch as never, { onConflict: "user_id,account_type" });
    if (saveError) throw new Error(saveError.message);

    const { error: consumeError } = await context.supabase
      .from("oauth_connection_states")
      .update({ consumed_at: new Date().toISOString() })
      .eq("state_hash", payload.state_hash)
      .eq("user_id", context.userId);
    if (consumeError) throw new Error(consumeError.message);

    deleteCookie("me2_google_oauth_result", { path: "/" });
    return { ok: true, account_type: payload.account_type };
  });

export const getUnreadEmails = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { decryptToken } = await import("./token-crypto.server");
    const { fetchUnreadEmails, refreshAccessToken } = await import("./gmail.server");

    // Get Gmail account
    const { data: account, error } = await supabase
      .from("connected_accounts")
      .select("access_token_ciphertext, token_iv, refresh_token_ciphertext, refresh_token_iv")
      .eq("user_id", userId)
      .eq("account_type", "gmail")
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!account) {
      return { emails: [], error: "Gmail not connected" };
    }

    if (!account.access_token_ciphertext || !account.token_iv) {
      return { emails: [], error: "Invalid Gmail credentials" };
    }

    let accessToken = decryptToken(account.access_token_ciphertext, account.token_iv);

    // Try to fetch emails with current token
    let emails = await fetchUnreadEmails(accessToken, 10);

    // If we got a 401, try to refresh and retry once
    if (emails.length === 0 && account.refresh_token_ciphertext && account.refresh_token_iv) {
      const refreshToken = decryptToken(
        account.refresh_token_ciphertext,
        account.refresh_token_iv
      );
      const newToken = await refreshAccessToken(refreshToken);

      if (newToken) {
        // Save the new token
        const { encryptToken } = await import("./token-crypto.server");
        const encrypted = encryptToken(newToken);
        await supabase
          .from("connected_accounts")
          .update({
            access_token_ciphertext: encrypted.ciphertext,
            token_iv: encrypted.iv,
          })
          .eq("user_id", userId)
          .eq("account_type", "gmail");

        // Retry fetching emails
        accessToken = newToken;
        emails = await fetchUnreadEmails(accessToken, 10);
      }
    }

    return { emails, error: null };
  });
