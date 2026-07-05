
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS preferred_name text,
  ADD COLUMN IF NOT EXISTS timezone text,
  ADD COLUMN IF NOT EXISTS focus_areas text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS top_goals text,
  ADD COLUMN IF NOT EXISTS work_role text,
  ADD COLUMN IF NOT EXISTS work_hours text,
  ADD COLUMN IF NOT EXISTS wake_time text,
  ADD COLUMN IF NOT EXISTS sleep_time text,
  ADD COLUMN IF NOT EXISTS communication_style text,
  ADD COLUMN IF NOT EXISTS tone_preference text,
  ADD COLUMN IF NOT EXISTS values_notes text,
  ADD COLUMN IF NOT EXISTS onboarded_at timestamptz;
