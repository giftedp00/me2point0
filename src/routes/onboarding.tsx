import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Check, Loader2, Sparkle } from "lucide-react";
import { toast } from "sonner";

import { useSession } from "@/hooks/use-session";
import { getProfile, saveOnboarding } from "@/lib/profile.functions";
import mark from "@/assets/me2-mark.png";

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      { title: "Set up me2.0 — Your AI Executive Assistant" },
      { name: "description", content: "Personalize me2.0 with your goals, schedule, and preferences." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: OnboardingPage,
});

const FOCUS_OPTIONS = [
  "Work & career",
  "Family",
  "Finances",
  "Health & fitness",
  "Relationships",
  "Personal growth",
  "Learning",
  "Creative projects",
  "Travel",
  "Spirituality",
];

const STYLE_OPTIONS = ["Direct & concise", "Warm & encouraging", "Coach-like & challenging", "Analytical & detailed"];
const TONE_OPTIONS = ["Formal", "Balanced", "Casual"];

type FormState = {
  preferred_name: string;
  timezone: string;
  focus_areas: string[];
  top_goals: string;
  work_role: string;
  work_hours: string;
  wake_time: string;
  sleep_time: string;
  communication_style: string;
  tone_preference: string;
  values_notes: string;
};

function OnboardingPage() {
  const { session, loading } = useSession();
  const navigate = useNavigate();
  const getProfileFn = useServerFn(getProfile);
  const saveFn = useServerFn(saveOnboarding);

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/auth" });
  }, [loading, session, navigate]);

  const profileQ = useQuery({
    queryKey: ["profile"],
    queryFn: () => getProfileFn({ data: undefined }),
    enabled: !!session,
  });

  const defaultName =
    session?.user.user_metadata?.full_name?.split(/\s+/)[0] ??
    session?.user.email?.split("@")[0] ??
    "";

  const tz = useMemo(() => {
    try { return Intl.DateTimeFormat().resolvedOptions().timeZone ?? ""; } catch { return ""; }
  }, []);

  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>({
    preferred_name: "",
    timezone: "",
    focus_areas: [],
    top_goals: "",
    work_role: "",
    work_hours: "",
    wake_time: "",
    sleep_time: "",
    communication_style: "",
    tone_preference: "Balanced",
    values_notes: "",
  });

  useEffect(() => {
    if (!profileQ.data && !loading) return;
    const p = profileQ.data;
    setForm((prev) => ({
      ...prev,
      preferred_name: p?.preferred_name ?? prev.preferred_name ?? defaultName,
      timezone: p?.timezone ?? prev.timezone ?? tz,
      focus_areas: (p?.focus_areas as string[] | null) ?? prev.focus_areas,
      top_goals: p?.top_goals ?? prev.top_goals,
      work_role: p?.work_role ?? prev.work_role,
      work_hours: p?.work_hours ?? prev.work_hours,
      wake_time: p?.wake_time ?? prev.wake_time,
      sleep_time: p?.sleep_time ?? prev.sleep_time,
      communication_style: p?.communication_style ?? prev.communication_style,
      tone_preference: p?.tone_preference ?? prev.tone_preference,
      values_notes: p?.values_notes ?? prev.values_notes,
    }));
  }, [profileQ.data, defaultName, tz, loading]);

  const save = useMutation({
    mutationFn: async () =>
      saveFn({
        data: {
          preferred_name: form.preferred_name.trim() || defaultName || "friend",
          timezone: form.timezone || null,
          focus_areas: form.focus_areas,
          top_goals: form.top_goals || null,
          work_role: form.work_role || null,
          work_hours: form.work_hours || null,
          wake_time: form.wake_time || null,
          sleep_time: form.sleep_time || null,
          communication_style: form.communication_style || null,
          tone_preference: form.tone_preference || null,
          values_notes: form.values_notes || null,
        },
      }),
    onSuccess: () => {
      toast.success("me2.0 is ready");
      navigate({ to: "/" });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not save"),
  });

  if (loading || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const steps = [
    {
      title: "Welcome",
      subtitle: "Let's set up your me2.0 — five quiet questions.",
      body: (
        <div className="space-y-4">
          <Field label="What should I call you?">
            <input
              autoFocus
              value={form.preferred_name}
              onChange={(e) => setForm({ ...form, preferred_name: e.target.value })}
              placeholder={defaultName || "Your first name"}
              className={inputCls}
              maxLength={80}
            />
          </Field>
          <Field label="Your timezone">
            <input
              value={form.timezone}
              onChange={(e) => setForm({ ...form, timezone: e.target.value })}
              placeholder={tz || "e.g. America/New_York"}
              className={inputCls}
              maxLength={80}
            />
          </Field>
        </div>
      ),
      canNext: () => (form.preferred_name.trim() || defaultName).length > 0,
    },
    {
      title: "Where should I focus?",
      subtitle: "Pick the areas of life you'd like me involved in.",
      body: (
        <div className="flex flex-wrap gap-2">
          {FOCUS_OPTIONS.map((opt) => {
            const on = form.focus_areas.includes(opt);
            return (
              <button
                type="button"
                key={opt}
                onClick={() =>
                  setForm({
                    ...form,
                    focus_areas: on
                      ? form.focus_areas.filter((x) => x !== opt)
                      : [...form.focus_areas, opt],
                  })
                }
                className={
                  "rounded-full border px-3.5 py-1.5 text-sm transition " +
                  (on
                    ? "border-brass bg-brass/15 text-foreground"
                    : "border-border bg-card/60 text-muted-foreground hover:text-foreground")
                }
              >
                {on && <Check className="mr-1 inline h-3.5 w-3.5 text-brass" />}
                {opt}
              </button>
            );
          })}
        </div>
      ),
      canNext: () => form.focus_areas.length > 0,
    },
    {
      title: "What are you working toward?",
      subtitle: "Share a few goals — big or small. I'll remember them.",
      body: (
        <Field label="Top goals right now">
          <textarea
            value={form.top_goals}
            onChange={(e) => setForm({ ...form, top_goals: e.target.value })}
            placeholder="e.g. Ship a new product by Q3, run a half-marathon, save for a home…"
            rows={5}
            className={inputCls + " resize-none"}
            maxLength={1000}
          />
        </Field>
      ),
      canNext: () => true,
    },
    {
      title: "Your rhythm",
      subtitle: "The shape of a typical day helps me time things well.",
      body: (
        <div className="space-y-4">
          <Field label="What do you do (role / work)?">
            <input
              value={form.work_role}
              onChange={(e) => setForm({ ...form, work_role: e.target.value })}
              placeholder="e.g. Founder at a design studio"
              className={inputCls}
              maxLength={200}
            />
          </Field>
          <Field label="Typical work hours">
            <input
              value={form.work_hours}
              onChange={(e) => setForm({ ...form, work_hours: e.target.value })}
              placeholder="e.g. 9–6 weekdays, deep work in the morning"
              className={inputCls}
              maxLength={120}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Wake time">
              <input
                type="time"
                value={form.wake_time}
                onChange={(e) => setForm({ ...form, wake_time: e.target.value })}
                className={inputCls}
              />
            </Field>
            <Field label="Sleep time">
              <input
                type="time"
                value={form.sleep_time}
                onChange={(e) => setForm({ ...form, sleep_time: e.target.value })}
                className={inputCls}
              />
            </Field>
          </div>
        </div>
      ),
      canNext: () => true,
    },
    {
      title: "How should I talk with you?",
      subtitle: "So I feel like the right kind of assistant for you.",
      body: (
        <div className="space-y-5">
          <Field label="Communication style">
            <div className="flex flex-wrap gap-2">
              {STYLE_OPTIONS.map((opt) => (
                <Chip
                  key={opt}
                  active={form.communication_style === opt}
                  onClick={() => setForm({ ...form, communication_style: opt })}
                >
                  {opt}
                </Chip>
              ))}
            </div>
          </Field>
          <Field label="Tone">
            <div className="flex flex-wrap gap-2">
              {TONE_OPTIONS.map((opt) => (
                <Chip
                  key={opt}
                  active={form.tone_preference === opt}
                  onClick={() => setForm({ ...form, tone_preference: opt })}
                >
                  {opt}
                </Chip>
              ))}
            </div>
          </Field>
          <Field label="Anything else I should know? (values, people, constraints)">
            <textarea
              value={form.values_notes}
              onChange={(e) => setForm({ ...form, values_notes: e.target.value })}
              rows={4}
              placeholder="Optional — family names, health notes, things that matter to you…"
              className={inputCls + " resize-none"}
              maxLength={1500}
            />
          </Field>
        </div>
      ),
      canNext: () => true,
    },
  ];

  const current = steps[step];
  const isLast = step === steps.length - 1;

  return (
    <div className="relative min-h-screen bg-background">
      <div
        className="pointer-events-none fixed inset-x-0 top-0 h-[420px] opacity-70"
        style={{ background: "radial-gradient(60% 60% at 50% 0%, oklch(0.7 0.09 75 / 0.18), transparent 70%)" }}
      />

      <header className="relative mx-auto flex max-w-2xl items-center justify-between px-5 py-5">
        <div className="flex items-center gap-2.5">
          <img src={mark} alt="" width={32} height={32} className="h-8 w-8" />
          <span className="font-display text-lg font-semibold tracking-tight">me2.0</span>
        </div>
        <button
          type="button"
          onClick={() => save.mutate()}
          disabled={save.isPending}
          className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-50"
        >
          Skip for now
        </button>
      </header>

      <main className="relative mx-auto max-w-2xl px-5 pb-16">
        <div className="mb-8 flex items-center gap-1.5">
          {steps.map((_, i) => (
            <span
              key={i}
              className={
                "h-1 flex-1 rounded-full transition " +
                (i <= step ? "bg-brass" : "bg-border")
              }
            />
          ))}
        </div>

        <div key={step} className="animate-rise">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Step {step + 1} of {steps.length}
          </p>
          <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight md:text-4xl">
            {current.title}
          </h1>
          <p className="mt-2 max-w-lg text-sm leading-relaxed text-muted-foreground">
            {current.subtitle}
          </p>

          <div className="mt-8">{current.body}</div>
        </div>

        <div className="mt-10 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
            className="flex items-center gap-1.5 rounded-full px-3 py-2 text-sm text-muted-foreground hover:text-foreground disabled:opacity-30"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
          {!isLast ? (
            <button
              type="button"
              onClick={() => setStep((s) => s + 1)}
              disabled={!current.canNext()}
              className="flex items-center gap-1.5 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-soft transition hover:opacity-95 disabled:opacity-40"
            >
              Continue <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => save.mutate()}
              disabled={save.isPending}
              className="flex items-center gap-1.5 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-soft transition hover:opacity-95 disabled:opacity-40"
            >
              {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkle className="h-4 w-4" />}
              Finish setup
            </button>
          )}
        </div>
      </main>
    </div>
  );
}

const inputCls =
  "w-full rounded-xl border border-border bg-card/70 px-3.5 py-2.5 text-[15px] outline-none transition placeholder:text-muted-foreground focus:border-brass/60 focus:bg-card";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "rounded-full border px-3.5 py-1.5 text-sm transition " +
        (active
          ? "border-brass bg-brass/15 text-foreground"
          : "border-border bg-card/60 text-muted-foreground hover:text-foreground")
      }
    >
      {children}
    </button>
  );
}
