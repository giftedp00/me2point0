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
