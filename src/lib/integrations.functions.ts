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
    const { signState, GMAIL_SCOPES, CALENDAR_SCOPES } = await import("./oauth-state.server");
    const scopes = data.account_type === "gmail" ? GMAIL_SCOPES : CALENDAR_SCOPES;
    const redirectUri = `${data.origin}/api/public/oauth/google/callback`;
    const state = signState({
      uid: context.userId,
      type: data.account_type,
      redirect: `${data.origin}/settings?connected=${data.account_type}`,
    });
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
