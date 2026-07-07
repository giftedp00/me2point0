import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const PROFILE_COLS =
  "id, display_name, preferred_name, timezone, focus_areas, top_goals, work_role, work_hours, wake_time, sleep_time, communication_style, tone_preference, values_notes, onboarded_at, connections_skipped_at";

export const getProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("profiles")
      .select(PROFILE_COLS)
      .eq("id", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  });

const OnboardingInput = z.object({
  preferred_name: z.string().trim().min(1).max(80),
  timezone: z.string().trim().max(80).optional().nullable(),
  focus_areas: z.array(z.string().max(40)).max(12).default([]),
  top_goals: z.string().trim().max(1000).optional().nullable(),
  work_role: z.string().trim().max(200).optional().nullable(),
  work_hours: z.string().trim().max(120).optional().nullable(),
  wake_time: z.string().trim().max(20).optional().nullable(),
  sleep_time: z.string().trim().max(20).optional().nullable(),
  communication_style: z.string().trim().max(60).optional().nullable(),
  tone_preference: z.string().trim().max(60).optional().nullable(),
  values_notes: z.string().trim().max(1500).optional().nullable(),
});

export const saveOnboarding = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => OnboardingInput.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const payload = {
      id: userId,
      display_name: data.preferred_name,
      ...data,
      onboarded_at: new Date().toISOString(),
    };
    const { error } = await supabase
      .from("profiles")
      .upsert(payload, { onConflict: "id" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const ProfileUpdateInput = z.object({
  preferred_name: z.string().trim().min(1).max(80).optional(),
  timezone: z.string().trim().max(80).nullable().optional(),
  communication_style: z.string().trim().max(60).nullable().optional(),
  tone_preference: z.string().trim().max(60).nullable().optional(),
  focus_areas: z.array(z.string().max(40)).max(12).optional(),
  top_goals: z.string().trim().max(1000).nullable().optional(),
  work_role: z.string().trim().max(200).nullable().optional(),
  work_hours: z.string().trim().max(120).nullable().optional(),
  wake_time: z.string().trim().max(20).nullable().optional(),
  sleep_time: z.string().trim().max(20).nullable().optional(),
  values_notes: z.string().trim().max(1500).nullable().optional(),
});

export const updateProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => ProfileUpdateInput.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const patch: Record<string, unknown> = { ...data };
    if (data.preferred_name) patch.display_name = data.preferred_name;
    const { error } = await supabase
      .from("profiles")
      .update(patch as never)
      .eq("id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Best-effort: remove app data first (RLS-cascading tables also drop via auth.users FK)
    await supabaseAdmin.from("chat_messages").delete().eq("user_id", userId);
    await supabaseAdmin.from("connected_accounts").delete().eq("user_id", userId);
    await supabaseAdmin.from("notification_preferences").delete().eq("user_id", userId);
    await supabaseAdmin.from("profiles").delete().eq("id", userId);
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
