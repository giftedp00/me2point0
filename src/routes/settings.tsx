import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";

import { useSession } from "@/hooks/use-session";
import { ConnectionsPanel } from "@/components/connections-panel";
import mark from "@/assets/me2-mark.png";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — me2.0" },
      { name: "description", content: "Manage your connected accounts and me2.0 preferences." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { session, loading } = useSession();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/auth" });
  }, [loading, session, navigate]);

  if (loading || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-background">
      <div
        className="pointer-events-none fixed inset-x-0 top-0 h-[420px] opacity-70"
        style={{
          background:
            "radial-gradient(60% 60% at 50% 0%, oklch(0.7 0.09 75 / 0.18), transparent 70%)",
        }}
      />

      <header className="relative mx-auto flex max-w-2xl items-center justify-between px-5 py-5">
        <Link to="/" className="flex items-center gap-2.5">
          <img src={mark} alt="" width={32} height={32} className="h-8 w-8" />
          <span className="font-display text-lg font-semibold tracking-tight">me2.0</span>
        </Link>
        <Link
          to="/"
          className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back
        </Link>
      </header>

      <main className="relative mx-auto max-w-2xl px-5 pb-16">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Settings</p>
          <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight md:text-4xl">
            Connected Accounts
          </h1>
          <p className="mt-2 max-w-lg text-sm leading-relaxed text-muted-foreground">
            Manage which parts of your world me2.0 can see, and how it shows up for you day to day.
          </p>
        </div>

        <div className="mt-8">
          <ConnectionsPanel />
        </div>

        <div className="mt-10 rounded-2xl border border-border/60 bg-card/50 p-4 text-sm">
          <p className="font-medium">What me2.0 can see</p>
          <ul className="mt-2 space-y-1.5 text-muted-foreground">
            <li>· Only the Google accounts you explicitly connect above.</li>
            <li>· Gmail: read messages and draft replies. Nothing is sent without your approval.</li>
            <li>· Calendar: read events and propose new ones. Nothing is created or changed without your approval.</li>
            <li>· Disconnect any account with one click — tokens are deleted immediately.</li>
          </ul>
        </div>
      </main>
    </div>
  );
}
