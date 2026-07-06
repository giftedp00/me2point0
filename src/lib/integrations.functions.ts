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
    // Ensure a row exists first.
    const { error: upErr } = await supabase
      .from("notification_preferences")
      .upsert(
        { user_id: userId, ...DEFAULT_PREFS, [data.key]: data.value },
        { onConflict: "user_id" },
      );
    if (upErr) throw new Error(upErr.message);
    // Then set the specific key (upsert above would overwrite others on first insert only).
    const { error } = await supabase
      .from("notification_preferences")
      .update({ [data.key]: data.value })
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

// Placeholder — real Google OAuth will land here once Client ID/Secret are configured.
// Returns { configured: false } so the UI can show a friendly "coming soon" state.
const StartOAuthInput = z.object({
  account_type: z.enum(["gmail", "google_calendar"]),
});

export const startGoogleOAuth = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => StartOAuthInput.parse(data))
  .handler(async ({ context: _context }) => {
    const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      return { configured: false as const };
    }
    // TODO: build authorize URL with the right scope set per account_type
    // and return it to the client. Callback route stores encrypted tokens
    // via encryptToken() from token-crypto.server.ts.
    return { configured: false as const };
  });
