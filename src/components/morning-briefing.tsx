import { Briefcase, Clock, Mail, Target, Sparkle, Volume2, Pencil } from "lucide-react";

interface MorningBriefingProps {
  greeting: string;
  firstName: string;
  unreadEmailCount?: number;
  focusAreas?: string[];
  topGoals?: string;
  onQuickPrompt: (prompt: string) => void;
  onVoiceStart?: () => void;
}

export function MorningBriefing({
  greeting,
  firstName,
  unreadEmailCount = 0,
  focusAreas = [],
  topGoals,
  onQuickPrompt,
  onVoiceStart,
}: MorningBriefingProps) {
  const today = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const quickActions = [
    {
      icon: Briefcase,
      label: "Work Plan",
      prompt: "Help me plan my work priorities for today. What should I focus on?",
    },
    {
      icon: Mail,
      label: "Email",
      prompt: "Give me a summary of my important emails and what needs my attention.",
    },
    {
      icon: Target,
      label: "Goals",
      prompt: "Let's review my goals and what I can move forward today.",
    },
    {
      icon: Clock,
      label: "Calendar",
      prompt: "What's on my calendar today? Help me prepare and stay on track.",
    },
  ];

  return (
    <div className="space-y-8 pt-8 pb-6">
      {/* Greeting Section */}
      <div className="space-y-4">
        <div className="text-xs uppercase tracking-[0.15em] text-muted-foreground/70">
          {today}
        </div>
        <div className="space-y-3">
          <h1 className="font-display text-5xl sm:text-6xl font-semibold leading-[1.1] tracking-tight">
            {greeting},
            <br />
            <span className="text-brass bg-gradient-to-r from-brass via-amber-400 to-yellow-500 bg-clip-text text-transparent">
              {firstName}.
            </span>
          </h1>
          <p className="text-base sm:text-lg leading-relaxed text-muted-foreground/80 max-w-2xl">
            I'm your autonomous personal AI assistant. Let's make today count.
          </p>
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid gap-3 sm:grid-cols-2">
        {/* Emails Card */}
        {unreadEmailCount > 0 && (
          <div className="group rounded-2xl border border-brass/25 bg-gradient-to-br from-brass/10 to-amber-500/5 p-4 transition hover:border-brass/40">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className="mt-1 flex h-8 w-8 items-center justify-center rounded-lg bg-brass/20 text-brass">
                  <Mail className="h-4 w-4" />
                </div>
                <div className="space-y-1">
                  <div className="text-sm font-medium text-foreground">Unread Emails</div>
                  <div className="text-xs text-muted-foreground/70">
                    {unreadEmailCount} waiting for your attention
                  </div>
                </div>
              </div>
              <div className="text-2xl font-bold text-brass">{unreadEmailCount}</div>
            </div>
          </div>
        )}

        {/* Goals Card */}
        {topGoals && (
          <div className="group rounded-2xl border border-emerald-500/25 bg-gradient-to-br from-emerald-500/10 to-teal-500/5 p-4 transition hover:border-emerald-500/40">
            <div className="flex items-start gap-3">
              <div className="mt-1 flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-600">
                <Target className="h-4 w-4" />
              </div>
              <div className="space-y-1">
                <div className="text-sm font-medium text-foreground">Active Goals</div>
                <div className="text-xs leading-relaxed text-muted-foreground/70 line-clamp-2">
                  {topGoals}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="space-y-3">
        <div className="text-xs uppercase tracking-[0.15em] text-muted-foreground/60 px-1">
          What would you like to do?
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {quickActions.map(({ icon: Icon, label, prompt }, i) => (
            <button
              key={label}
              type="button"
              onClick={() => onQuickPrompt(prompt)}
              className="group relative animate-rise overflow-hidden rounded-2xl border border-border bg-card/50 p-4 text-left shadow-soft transition hover:border-brass/30 hover:bg-card/80 active:scale-95"
              style={{ animationDelay: `${i * 50}ms` }}
            >
              {/* Hover gradient background */}
              <div className="pointer-events-none absolute inset-0 opacity-0 transition group-hover:opacity-100 bg-gradient-to-br from-brass/10 to-transparent" />

              <div className="relative space-y-2">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brass/15 text-brass group-hover:bg-brass/25 transition">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="font-semibold text-sm">{label}</div>
                </div>
                <p className="text-xs leading-relaxed text-muted-foreground/70 line-clamp-2">
                  {prompt}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Input Prompt */}
      <div className="rounded-2xl border border-brass/20 bg-gradient-to-br from-brass/8 to-transparent p-4 flex items-start gap-3">
        <Sparkle className="h-4 w-4 mt-0.5 text-brass shrink-0" />
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">You're in control.</p>
          <p className="text-xs leading-relaxed text-muted-foreground/80">
            me2.0 remembers this conversation and learns from what you share. The more you tell me about your goals, people, routines, and values — the sharper I become.
          </p>
        </div>
      </div>

      {/* Voice Suggestion */}
      {onVoiceStart && (
        <button
          type="button"
          onClick={onVoiceStart}
          className="w-full flex items-center justify-center gap-2 rounded-2xl border border-border bg-gradient-to-r from-brass/10 to-transparent py-3 px-4 font-medium text-sm text-foreground transition hover:border-brass/30 hover:bg-gradient-to-r hover:from-brass/15 hover:to-brass/5"
        >
          <Volume2 className="h-4 w-4 text-brass" />
          Try speaking instead
        </button>
      )}
    </div>
  );
}
