import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Loader2, LogOut, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { useSession } from "@/hooks/use-session";
import { supabase } from "@/integrations/supabase/client";
import { ConnectionsPanel } from "@/components/connections-panel";
import { finishGoogleOAuth } from "@/lib/integrations.functions";
import { getProfile, updateProfile, deleteAccount } from "@/lib/profile.functions";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import mark from "@/assets/me2-mark.png";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — me2.0" },
      { name: "description", content: "Manage your me2.0 profile, life setup, connections, and account." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SettingsPage,
});

const STYLE_OPTIONS = ["Analytical", "Casual", "Concise", "Detailed"];
const FOCUS_OPTIONS = ["Work", "Family", "Health", "Finance", "Goals", "Relationships", "Personal growth", "Learning"];

type NotifExtras = {
  daily_briefing: boolean;
  daily_briefing_time: string;
  urgent_email_alerts: boolean;
  calendar_reminders: boolean;
  calendar_reminder_minutes: number;
  weekly_summary: boolean;
};

const NOTIF_EXTRAS_KEY = "me2:notif-extras";
const DEFAULT_EXTRAS: NotifExtras = {
  daily_briefing: true,
  daily_briefing_time: "06:00",
  urgent_email_alerts: true,
  calendar_reminders: true,
  calendar_reminder_minutes: 30,
  weekly_summary: true,
};

function SettingsPage() {
  const { session, loading } = useSession();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const finishOAuthFn = useServerFn(finishGoogleOAuth);
  const finishingOAuthRef = useRef(false);

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/auth" });
  }, [loading, session, navigate]);

  useEffect(() => {
    if (loading || !session) return;
    const params = new URLSearchParams(window.location.search);
    const finish = params.get("oauth_finish");
    const connected = params.get("connected");
    const err = params.get("oauth_error");

    if (finish && !finishingOAuthRef.current) {
      finishingOAuthRef.current = true;
      finishOAuthFn({ data: undefined })
        .then((result) => {
          const account = result.account_type === "gmail" ? "Gmail" : "Google Calendar";
          toast.success(`${account} connected`);
          qc.invalidateQueries({ queryKey: ["connected-accounts"] });
          window.history.replaceState({}, "", "/settings");
        })
        .catch((error) => {
          toast.error(`Couldn't connect: ${error instanceof Error ? error.message : "save_failed"}`);
          window.history.replaceState({}, "", "/settings");
        })
        .finally(() => {
          finishingOAuthRef.current = false;
        });
    } else if (connected) {
      toast.success(`${connected === "gmail" ? "Gmail" : "Google Calendar"} connected`);
      qc.invalidateQueries({ queryKey: ["connected-accounts"] });
      window.history.replaceState({}, "", "/settings");
    } else if (err) {
      toast.error(`Couldn't connect: ${err}`);
      window.history.replaceState({}, "", "/settings");
    }
  }, [finishOAuthFn, loading, qc, session]);

  if (loading || !session) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="relative min-h-dvh bg-background">
      <div
        className="pointer-events-none fixed inset-x-0 top-0 h-[420px] opacity-70"
        style={{
          background:
            "radial-gradient(60% 60% at 50% 0%, oklch(0.7 0.09 75 / 0.18), transparent 70%)",
        }}
      />

      <header className="relative mx-auto flex max-w-3xl items-center justify-between px-5 py-5">
        <Link to="/" className="flex items-center gap-2.5">
          <img src={mark} alt="" width={32} height={32} className="h-8 w-8" />
          <span className="font-display text-lg font-semibold tracking-tight">me2.0</span>
        </Link>
        <Link
          to="/"
          aria-label="Back to chat"
          className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to chat
        </Link>
      </header>

      <main className="relative mx-auto max-w-3xl px-5 pb-24">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Settings</p>
          <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight md:text-4xl">
            Your me2.0
          </h1>
          <p className="mt-2 max-w-lg text-sm leading-relaxed text-muted-foreground">
            Tune what me2.0 knows, what it can see, and how it shows up for you.
          </p>
        </div>

        <Tabs defaultValue="profile" className="mt-8">
          <TabsList className="flex w-full flex-wrap gap-1 bg-card/60">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="life">Life Setup</TabsTrigger>
            <TabsTrigger value="connections">Connections</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="account">Account</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="mt-6">
            <ProfileSection email={session.user.email ?? ""} />
          </TabsContent>
          <TabsContent value="life" className="mt-6">
            <LifeSection />
          </TabsContent>
          <TabsContent value="connections" className="mt-6">
            <div className="rounded-2xl border border-border/60 bg-card/40 p-4">
              <h2 className="font-display text-lg font-semibold tracking-tight">Connected accounts</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Manage which parts of your world me2.0 can see.
              </p>
              <div className="mt-5">
                <ConnectionsPanel />
              </div>
            </div>
          </TabsContent>
          <TabsContent value="notifications" className="mt-6">
            <NotificationsSection />
          </TabsContent>
          <TabsContent value="account" className="mt-6">
            <AccountSection email={session.user.email ?? ""} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

/* ------------ Profile ------------ */

function ProfileSection({ email }: { email: string }) {
  const getProfileFn = useServerFn(getProfile);
  const updateFn = useServerFn(updateProfile);
  const qc = useQueryClient();
  const profileQ = useQuery({
    queryKey: ["profile"],
    queryFn: () => getProfileFn({ data: undefined }),
  });

  const p = profileQ.data;
  const [name, setName] = useState("");
  const [tz, setTz] = useState("");
  const [style, setStyle] = useState<string>("");

  useEffect(() => {
    if (!p) return;
    setName(p.preferred_name ?? p.display_name ?? "");
    setTz(p.timezone ?? "");
    setStyle(p.communication_style ?? "");
  }, [p]);

  const save = useMutation({
    mutationFn: async () =>
      updateFn({
        data: {
          preferred_name: name.trim() || undefined,
          timezone: tz.trim() || null,
          communication_style: style || null,
        },
      }),
    onSuccess: () => {
      toast.success("Profile updated");
      qc.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Couldn't save"),
  });

  if (profileQ.isLoading) return <SectionLoader />;

  return (
    <SectionCard title="My profile" description="How me2.0 addresses you and calibrates its voice.">
      <Field label="Full name">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          placeholder="Your name"
        />
      </Field>
      <Field label="Email address">
        <input
          value={email}
          readOnly
          className="w-full rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground"
        />
      </Field>
      <Field label="Timezone">
        <input
          value={tz}
          onChange={(e) => setTz(e.target.value)}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          placeholder="e.g. Europe/London"
        />
      </Field>
      <Field label="Communication style">
        <div className="flex flex-wrap gap-2">
          {STYLE_OPTIONS.map((s) => (
            <ChipButton key={s} active={style === s} onClick={() => setStyle(s)}>
              {s}
            </ChipButton>
          ))}
        </div>
      </Field>
      <SaveBar pending={save.isPending} onClick={() => save.mutate()} />
    </SectionCard>
  );
}

/* ------------ Life Setup ------------ */

function LifeSection() {
  const getProfileFn = useServerFn(getProfile);
  const updateFn = useServerFn(updateProfile);
  const qc = useQueryClient();
  const navigate = useNavigate();
  const profileQ = useQuery({
    queryKey: ["profile"],
    queryFn: () => getProfileFn({ data: undefined }),
  });
  const p = profileQ.data;

  const [wake, setWake] = useState("");
  const [sleep, setSleep] = useState("");
  const [workHours, setWorkHours] = useState("");
  const [topGoals, setTopGoals] = useState("");
  const [focusAreas, setFocusAreas] = useState<string[]>([]);
  const [priorities, setPriorities] = useState<string[]>([]);
  const [contacts, setContacts] = useState<{ name: string; relationship: string }[]>([]);

  useEffect(() => {
    if (!p) return;
    setWake(p.wake_time ?? "");
    setSleep(p.sleep_time ?? "");
    setWorkHours(p.work_hours ?? "");
    setTopGoals(p.top_goals ?? "");
    setFocusAreas(p.focus_areas ?? []);
    try {
      const raw = localStorage.getItem("me2:priorities");
      if (raw) setPriorities(JSON.parse(raw));
    } catch { /* noop */ }
    try {
      const raw = localStorage.getItem("me2:contacts");
      if (raw) setContacts(JSON.parse(raw));
    } catch { /* noop */ }
  }, [p]);

  const save = useMutation({
    mutationFn: async () => {
      localStorage.setItem("me2:priorities", JSON.stringify(priorities));
      localStorage.setItem("me2:contacts", JSON.stringify(contacts));
      return updateFn({
        data: {
          wake_time: wake || null,
          sleep_time: sleep || null,
          work_hours: workHours || null,
          top_goals: topGoals || null,
          focus_areas: focusAreas,
        },
      });
    },
    onSuccess: () => {
      toast.success("Life setup updated");
      qc.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Couldn't save"),
  });

  function toggleFocus(f: string) {
    setFocusAreas((cur) => (cur.includes(f) ? cur.filter((x) => x !== f) : [...cur, f]));
  }

  if (profileQ.isLoading) return <SectionLoader />;

  return (
    <SectionCard title="My life setup" description="Give me2.0 the shape of your days and what matters most.">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Wake time">
          <input type="time" value={wake} onChange={(e) => setWake(e.target.value)} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
        </Field>
        <Field label="Sleep time">
          <input type="time" value={sleep} onChange={(e) => setSleep(e.target.value)} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
        </Field>
      </div>
      <Field label="Work hours">
        <input
          value={workHours}
          onChange={(e) => setWorkHours(e.target.value)}
          placeholder="e.g. 9:00 – 17:30"
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
        />
      </Field>

      <Field label="Top priorities right now">
        <EditableList
          items={priorities}
          onChange={setPriorities}
          placeholder="Add a priority…"
          renderItem={(v) => v}
        />
      </Field>

      <Field label="Key contacts">
        <ContactList items={contacts} onChange={setContacts} />
      </Field>

      <Field label="Focus areas">
        <div className="flex flex-wrap gap-2">
          {FOCUS_OPTIONS.map((f) => (
            <ChipButton key={f} active={focusAreas.includes(f)} onClick={() => toggleFocus(f)}>
              {f}
            </ChipButton>
          ))}
        </div>
      </Field>

      <Field label="Top goals (free text)">
        <textarea
          value={topGoals}
          onChange={(e) => setTopGoals(e.target.value)}
          rows={3}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
        />
      </Field>

      <div className="mt-2 rounded-xl border border-brass/30 bg-brass/8 p-3.5">
        <p className="text-sm font-medium">Want to start fresh?</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Re-run your full onboarding to update everything me2.0 knows about you.
        </p>
        <button
          type="button"
          onClick={() => navigate({ to: "/onboarding" })}
          className="mt-3 rounded-full border border-brass/50 bg-transparent px-3.5 py-1.5 text-xs font-medium text-brass hover:bg-brass/10"
        >
          Re-run full onboarding
        </button>
      </div>

      <SaveBar pending={save.isPending} onClick={() => save.mutate()} />
    </SectionCard>
  );
}

/* ------------ Notifications extras ------------ */

function NotificationsSection() {
  const [extras, setExtras] = useState<NotifExtras>(DEFAULT_EXTRAS);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(NOTIF_EXTRAS_KEY);
      if (raw) setExtras({ ...DEFAULT_EXTRAS, ...JSON.parse(raw) });
    } catch { /* noop */ }
  }, []);

  function save() {
    localStorage.setItem(NOTIF_EXTRAS_KEY, JSON.stringify(extras));
    toast.success("Notification preferences saved");
  }

  function patch<K extends keyof NotifExtras>(k: K, v: NotifExtras[K]) {
    setExtras((cur) => ({ ...cur, [k]: v }));
  }

  return (
    <SectionCard title="Notification preferences" description="Choose how and when me2.0 nudges you.">
      <ToggleRow
        label="Daily morning briefing"
        checked={extras.daily_briefing}
        onChange={(v) => patch("daily_briefing", v)}
      />
      {extras.daily_briefing && (
        <Field label="Briefing time">
          <input
            type="time"
            value={extras.daily_briefing_time}
            onChange={(e) => patch("daily_briefing_time", e.target.value)}
            className="w-40 rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
        </Field>
      )}
      <ToggleRow
        label="Urgent email alerts"
        checked={extras.urgent_email_alerts}
        onChange={(v) => patch("urgent_email_alerts", v)}
      />
      <ToggleRow
        label="Calendar reminders"
        checked={extras.calendar_reminders}
        onChange={(v) => patch("calendar_reminders", v)}
      />
      {extras.calendar_reminders && (
        <Field label="Minutes before each event">
          <select
            value={extras.calendar_reminder_minutes}
            onChange={(e) => patch("calendar_reminder_minutes", Number(e.target.value))}
            className="w-40 rounded-lg border border-border bg-background px-3 py-2 text-sm"
          >
            {[5, 10, 15, 30, 45, 60].map((m) => (
              <option key={m} value={m}>{m} minutes</option>
            ))}
          </select>
        </Field>
      )}
      <ToggleRow
        label="Weekly summary"
        checked={extras.weekly_summary}
        onChange={(v) => patch("weekly_summary", v)}
      />
      <SaveBar pending={false} onClick={save} />
    </SectionCard>
  );
}

/* ------------ Account ------------ */

function AccountSection({ email }: { email: string }) {
  const navigate = useNavigate();
  const deleteFn = useServerFn(deleteAccount);
  const [sendingReset, setSendingReset] = useState(false);

  async function onChangePassword() {
    if (!email) return;
    setSendingReset(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth`,
    });
    setSendingReset(false);
    if (error) toast.error(error.message);
    else toast.success("Password reset email sent");
  }

  async function onSignOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  }

  const del = useMutation({
    mutationFn: async () => deleteFn({ data: undefined }),
    onSuccess: async () => {
      await supabase.auth.signOut();
      toast.success("Account deleted");
      navigate({ to: "/auth" });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Couldn't delete account"),
  });

  return (
    <SectionCard title="Account" description="Security, sign-out, and account deletion.">
      <div className="flex items-center justify-between gap-4 rounded-xl border border-border/60 bg-background/50 p-3.5">
        <div>
          <p className="text-sm font-medium">Change password</p>
          <p className="text-xs text-muted-foreground">We'll email you a secure reset link.</p>
        </div>
        <button
          type="button"
          onClick={onChangePassword}
          disabled={sendingReset || !email}
          className="rounded-full border border-border px-3.5 py-1.5 text-xs disabled:opacity-40"
        >
          {sendingReset ? "Sending…" : "Send reset link"}
        </button>
      </div>

      <div className="flex items-center justify-between gap-4 rounded-xl border border-border/60 bg-background/50 p-3.5">
        <div>
          <p className="text-sm font-medium">Sign out</p>
          <p className="text-xs text-muted-foreground">You can sign back in anytime.</p>
        </div>
        <button
          type="button"
          onClick={onSignOut}
          className="flex items-center gap-1.5 rounded-full border border-border px-3.5 py-1.5 text-xs hover:bg-accent/40"
        >
          <LogOut className="h-3.5 w-3.5" /> Sign out
        </button>
      </div>

      <div className="flex items-center justify-between gap-4 rounded-xl border border-destructive/40 bg-destructive/5 p-3.5">
        <div>
          <p className="text-sm font-medium text-destructive">Delete account</p>
          <p className="text-xs text-muted-foreground">
            Permanently removes your profile, conversations, memory, and connections.
          </p>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-1.5 rounded-full bg-destructive px-3.5 py-1.5 text-xs font-medium text-destructive-foreground hover:opacity-95"
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete your me2.0 account?</AlertDialogTitle>
              <AlertDialogDescription>
                This permanently deletes your profile, conversation history, memory context, notification
                preferences, and any connected Gmail or Calendar accounts. This can't be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:opacity-95"
                onClick={() => del.mutate()}
              >
                {del.isPending ? "Deleting…" : "Yes, delete everything"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </SectionCard>
  );
}

/* ------------ shared bits ------------ */

function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border/60 bg-card/50 p-5">
      <h2 className="font-display text-lg font-semibold tracking-tight">{title}</h2>
      {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      <div className="mt-5 space-y-4">{children}</div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  );
}

function ChipButton({
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
      aria-pressed={active}
      className={
        "rounded-full border px-3 py-1.5 text-xs transition " +
        (active
          ? "border-brass bg-brass/15 text-foreground"
          : "border-border bg-background/60 text-muted-foreground hover:text-foreground")
      }
    >
      {children}
    </button>
  );
}

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-lg px-1 py-1.5 text-sm hover:bg-accent/40">
      <span className="text-foreground/85">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={"relative h-5 w-9 shrink-0 rounded-full transition " + (checked ? "bg-brass" : "bg-border")}
      >
        <span
          className={
            "absolute top-0.5 h-4 w-4 rounded-full bg-background shadow transition " +
            (checked ? "left-4" : "left-0.5")
          }
        />
      </button>
    </label>
  );
}

function SaveBar({ pending, onClick }: { pending: boolean; onClick: () => void }) {
  return (
    <div className="flex justify-end pt-2">
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-soft hover:opacity-95 disabled:opacity-40"
      >
        {pending ? "Saving…" : "Save changes"}
      </button>
    </div>
  );
}

function SectionLoader() {
  return (
    <div className="flex items-center justify-center rounded-2xl border border-border/60 bg-card/50 p-10">
      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
    </div>
  );
}

function EditableList({
  items,
  onChange,
  placeholder,
  renderItem,
}: {
  items: string[];
  onChange: (next: string[]) => void;
  placeholder: string;
  renderItem: (v: string) => React.ReactNode;
}) {
  const [draft, setDraft] = useState("");
  function add() {
    const v = draft.trim();
    if (!v) return;
    onChange([...items, v]);
    setDraft("");
  }
  return (
    <div className="space-y-2">
      <ul className="space-y-1.5">
        {items.map((it, i) => (
          <li key={i} className="flex items-center justify-between gap-2 rounded-lg border border-border/60 bg-background/60 px-3 py-2 text-sm">
            <span>{renderItem(it)}</span>
            <button
              type="button"
              aria-label="Remove"
              onClick={() => onChange(items.filter((_, j) => j !== i))}
              className="rounded-full p-1 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </li>
        ))}
      </ul>
      <div className="flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder={placeholder}
          className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={add}
          className="flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-xs text-muted-foreground hover:text-foreground"
        >
          <Plus className="h-3.5 w-3.5" /> Add
        </button>
      </div>
    </div>
  );
}

function ContactList({
  items,
  onChange,
}: {
  items: { name: string; relationship: string }[];
  onChange: (next: { name: string; relationship: string }[]) => void;
}) {
  const [name, setName] = useState("");
  const [rel, setRel] = useState("");
  function add() {
    if (!name.trim()) return;
    onChange([...items, { name: name.trim(), relationship: rel.trim() }]);
    setName("");
    setRel("");
  }
  return (
    <div className="space-y-2">
      <ul className="space-y-1.5">
        {items.map((it, i) => (
          <li key={i} className="flex items-center justify-between gap-2 rounded-lg border border-border/60 bg-background/60 px-3 py-2 text-sm">
            <span>
              <span className="font-medium">{it.name}</span>
              {it.relationship && <span className="text-muted-foreground"> · {it.relationship}</span>}
            </span>
            <button
              type="button"
              aria-label="Remove contact"
              onClick={() => onChange(items.filter((_, j) => j !== i))}
              className="rounded-full p-1 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </li>
        ))}
      </ul>
      <div className="grid grid-cols-[1fr_1fr_auto] gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name"
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
        />
        <input
          value={rel}
          onChange={(e) => setRel(e.target.value)}
          placeholder="Relationship (e.g. spouse)"
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={add}
          className="flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-xs text-muted-foreground hover:text-foreground"
        >
          <Plus className="h-3.5 w-3.5" /> Add
        </button>
      </div>
    </div>
  );
}
