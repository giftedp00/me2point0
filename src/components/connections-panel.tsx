import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Calendar, Check, Loader2, Mail, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import {
  disconnectAccount,
  getConnectedAccounts,
  getNotificationPrefs,
  startGoogleOAuth,
  updateNotificationPref,
  type AccountType,
} from "@/lib/integrations.functions";

type PrefKey =
  | "summarize_emails_daily"
  | "urgent_email_alerts"
  | "draft_replies"
  | "key_contact_alerts"
  | "morning_schedule_briefing"
  | "conflict_warnings"
  | "event_reminders"
  | "ai_event_suggestions";

const GMAIL_TOGGLES: { key: PrefKey; label: string }[] = [
  { key: "summarize_emails_daily", label: "Summarize unread emails daily" },
  { key: "urgent_email_alerts", label: "Alert me to urgent emails instantly" },
  { key: "draft_replies", label: "Draft replies in my communication style" },
  { key: "key_contact_alerts", label: "Notify me of emails from key contacts" },
];

const CAL_TOGGLES: { key: PrefKey; label: string }[] = [
  { key: "morning_schedule_briefing", label: "Show me today's schedule every morning" },
  { key: "conflict_warnings", label: "Warn me about scheduling conflicts" },
  { key: "event_reminders", label: "Remind me 30 minutes before each event" },
  { key: "ai_event_suggestions", label: "Let me2.0 suggest new events based on my priorities" },
];

export function ConnectionsPanel({ compact = false }: { compact?: boolean }) {
  const qc = useQueryClient();
  const accountsFn = useServerFn(getConnectedAccounts);
  const prefsFn = useServerFn(getNotificationPrefs);
  const updateFn = useServerFn(updateNotificationPref);
  const disconnectFn = useServerFn(disconnectAccount);
  const startOAuthFn = useServerFn(startGoogleOAuth);

  const accountsQ = useQuery({
    queryKey: ["connected-accounts"],
    queryFn: () => accountsFn({ data: undefined }),
  });
  const prefsQ = useQuery({
    queryKey: ["notif-prefs"],
    queryFn: () => prefsFn({ data: undefined }),
  });

  const updatePref = useMutation({
    mutationFn: async (v: { key: PrefKey; value: boolean }) => updateFn({ data: v }),
    onMutate: async (v) => {
      await qc.cancelQueries({ queryKey: ["notif-prefs"] });
      const prev = qc.getQueryData<Record<string, unknown>>(["notif-prefs"]);
      qc.setQueryData(["notif-prefs"], { ...(prev ?? {}), [v.key]: v.value });
      return { prev };
    },
    onError: (err, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(["notif-prefs"], ctx.prev);
      toast.error(err instanceof Error ? err.message : "Couldn't update");
    },
  });

  const disconnect = useMutation({
    mutationFn: async (t: AccountType) => disconnectFn({ data: { account_type: t } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["connected-accounts"] });
      toast.success("Disconnected");
    },
  });

  const connect = useMutation({
    mutationFn: async (t: AccountType) => startOAuthFn({ data: { account_type: t } }),
    onSuccess: (data) => {
      if (!data?.configured) {
        toast.message("Almost ready", {
          description:
            "Google OAuth is being finalized for me2.0. Your preferences are saved — you'll be able to connect in a moment.",
        });
      }
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Couldn't start connection"),
  });

  const gmail = accountsQ.data?.find((a) => a.account_type === "gmail");
  const cal = accountsQ.data?.find((a) => a.account_type === "google_calendar");
  const prefs = prefsQ.data as Record<PrefKey, boolean> | undefined;

  const loading = accountsQ.isLoading || prefsQ.isLoading;

  return (
    <div className="space-y-4">
      <ConnectionCard
        icon={<Mail className="h-4 w-4" />}
        title="Gmail"
        description="Connect your email so me2.0 can summarize important messages, draft replies in your voice, and never let anything urgent slip through."
        connectedLabel={gmail?.email_address ?? null}
        lastSynced={gmail?.last_synced ?? null}
        onConnect={() => connect.mutate("gmail")}
        onDisconnect={() => disconnect.mutate("gmail")}
        pending={connect.isPending || disconnect.isPending || loading}
        toggles={GMAIL_TOGGLES}
        prefs={prefs}
        onToggle={(k, v) => updatePref.mutate({ key: k, value: v })}
        compact={compact}
      />

      <ConnectionCard
        icon={<Calendar className="h-4 w-4" />}
        title="Google Calendar"
        description="Connect your calendar so me2.0 knows what your day looks like and can help you protect your time."
        connectedLabel={cal?.email_address ?? null}
        lastSynced={cal?.last_synced ?? null}
        onConnect={() => connect.mutate("google_calendar")}
        onDisconnect={() => disconnect.mutate("google_calendar")}
        pending={connect.isPending || disconnect.isPending || loading}
        toggles={CAL_TOGGLES}
        prefs={prefs}
        onToggle={(k, v) => updatePref.mutate({ key: k, value: v })}
        compact={compact}
      />

      <div className="flex items-start gap-2.5 rounded-2xl border border-border/70 bg-card/60 p-3.5 text-xs leading-relaxed text-muted-foreground">
        <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brass" />
        <p>
          me2.0 encrypts every access token, never sends email or modifies calendar events without your explicit
          confirmation, and lets you disconnect any account in one click.
        </p>
      </div>
    </div>
  );
}

function ConnectionCard({
  icon,
  title,
  description,
  connectedLabel,
  lastSynced,
  onConnect,
  onDisconnect,
  pending,
  toggles,
  prefs,
  onToggle,
  compact,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  connectedLabel: string | null;
  lastSynced: string | null;
  onConnect: () => void;
  onDisconnect: () => void;
  pending: boolean;
  toggles: { key: PrefKey; label: string }[];
  prefs: Record<PrefKey, boolean> | undefined;
  onToggle: (k: PrefKey, v: boolean) => void;
  compact?: boolean;
}) {
  const connected = !!connectedLabel;
  return (
    <div className="rounded-2xl border border-border bg-card/70 p-4 shadow-soft">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brass/15 text-brass">
              {icon}
            </span>
            <span className="font-display text-base font-semibold tracking-tight">{title}</span>
            {connected && (
              <span className="inline-flex items-center gap-1 rounded-full bg-brass/15 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-brass">
                <Check className="h-3 w-3" /> Connected
              </span>
            )}
          </div>
          {!compact && (
            <p className="mt-2 max-w-lg text-sm leading-relaxed text-muted-foreground">{description}</p>
          )}
          {connected && (
            <p className="mt-1.5 text-xs text-muted-foreground">
              {connectedLabel}
              {lastSynced && (
                <>
                  {" · Last synced "}
                  {new Date(lastSynced).toLocaleString()}
                </>
              )}
            </p>
          )}
        </div>
        <div className="shrink-0">
          {connected ? (
            <button
              type="button"
              onClick={onDisconnect}
              disabled={pending}
              className="rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground disabled:opacity-40"
            >
              Disconnect
            </button>
          ) : (
            <button
              type="button"
              onClick={onConnect}
              disabled={pending}
              className="flex items-center gap-1.5 rounded-full bg-primary px-3.5 py-1.5 text-xs font-medium text-primary-foreground shadow-soft hover:opacity-95 disabled:opacity-40"
            >
              {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
              Connect {title === "Gmail" ? "Gmail" : "Calendar"}
            </button>
          )}
        </div>
      </div>

      <div className="mt-4 space-y-2 border-t border-border/60 pt-3">
        {toggles.map((t) => (
          <ToggleRow
            key={t.key}
            label={t.label}
            checked={prefs?.[t.key] ?? true}
            onChange={(v) => onToggle(t.key, v)}
          />
        ))}
      </div>
    </div>
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
        className={
          "relative h-5 w-9 shrink-0 rounded-full transition " +
          (checked ? "bg-brass" : "bg-border")
        }
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
