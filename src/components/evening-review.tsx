import { CheckCircle2, Clock, Flame, ArrowRight, Star } from "lucide-react";

interface EveningReviewProps {
  userName: string;
  accomplishments?: string[];
  unfinishedTasks?: string[];
  progressNotes?: string;
  onAskForSummary?: () => void;
  onScheduleTomorrow?: () => void;
}

export function EveningReview({
  userName,
  accomplishments = [],
  unfinishedTasks = [],
  progressNotes,
  onAskForSummary,
  onScheduleTomorrow,
}: EveningReviewProps) {
  const firstName = userName.split(/\s+/)[0];

  return (
    <div className="space-y-8 pb-6">
      {/* Header */}
      <div className="space-y-3">
        <div className="text-xs uppercase tracking-[0.15em] text-muted-foreground/70">
          Evening Reflection
        </div>
        <h2 className="text-4xl sm:text-5xl font-semibold leading-[1.1] tracking-tight">
          Great work today,
          <br />
          <span className="text-brass bg-gradient-to-r from-brass via-amber-400 to-yellow-500 bg-clip-text text-transparent">
            {firstName}.
          </span>
        </h2>
        <p className="text-base leading-relaxed text-muted-foreground/80 max-w-2xl">
          Let's take a moment to reflect on what you accomplished and set yourself up for an even better tomorrow.
        </p>
      </div>

      {/* Accomplishments */}
      {accomplishments.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            <h3 className="font-semibold text-foreground">What You Accomplished</h3>
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            {accomplishments.map((accomplishment, i) => (
              <div
                key={i}
                className="group rounded-xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 to-teal-500/5 p-3 transition hover:border-emerald-500/40"
              >
                <div className="flex items-start gap-2">
                  <div className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
                  <p className="text-sm leading-relaxed text-foreground/90">{accomplishment}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Progress */}
      {progressNotes && (
        <div className="space-y-3 rounded-2xl border border-brass/25 bg-gradient-to-br from-brass/10 to-amber-500/5 p-4">
          <div className="flex items-center gap-2">
            <Flame className="h-5 w-5 text-brass" />
            <h3 className="font-semibold text-foreground">Progress Toward Goals</h3>
          </div>
          <p className="text-sm leading-relaxed text-foreground/80">{progressNotes}</p>
        </div>
      )}

      {/* Unfinished Tasks */}
      {unfinishedTasks.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-amber-500" />
            <h3 className="font-semibold text-foreground">For Tomorrow</h3>
          </div>
          <div className="space-y-2">
            {unfinishedTasks.map((task, i) => (
              <div
                key={i}
                className="flex items-start gap-3 rounded-lg border border-amber-500/20 bg-gradient-to-r from-amber-500/5 to-transparent p-3 transition hover:border-amber-500/40"
              >
                <div className="mt-1 h-4 w-4 rounded border border-amber-500/40 flex-shrink-0" />
                <p className="text-sm leading-relaxed text-foreground/90">{task}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Motivation */}
      <div className="space-y-3 rounded-2xl border border-blue-500/25 bg-gradient-to-br from-blue-500/10 to-purple-500/5 p-4">
        <div className="flex items-center gap-2">
          <Star className="h-5 w-5 text-blue-500" />
          <h3 className="font-semibold text-foreground">Remember</h3>
        </div>
        <p className="text-sm leading-relaxed text-foreground/80">
          Every day you're building momentum toward your goals. The fact that you're tracking your progress and reflecting on it shows your commitment to becoming the best version of yourself. I'm here to support you every step of the way.
        </p>
      </div>

      {/* Call to Actions */}
      <div className="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={onAskForSummary}
          className="group relative rounded-2xl border border-border bg-card/50 p-4 text-left transition hover:border-brass/30 hover:bg-card/80"
        >
          <div className="flex items-center justify-between">
            <span className="font-semibold text-sm">Get AI Summary</span>
            <ArrowRight className="h-4 w-4 text-brass opacity-0 group-hover:opacity-100 transition" />
          </div>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground/70">
            Let me create a detailed summary of today
          </p>
        </button>
        <button
          type="button"
          onClick={onScheduleTomorrow}
          className="group relative rounded-2xl border border-border bg-card/50 p-4 text-left transition hover:border-brass/30 hover:bg-card/80"
        >
          <div className="flex items-center justify-between">
            <span className="font-semibold text-sm">Plan Tomorrow</span>
            <ArrowRight className="h-4 w-4 text-brass opacity-0 group-hover:opacity-100 transition" />
          </div>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground/70">
            Help me prioritize tomorrow
          </p>
        </button>
      </div>

      {/* Closing */}
      <div className="text-center space-y-2 pt-4">
        <p className="text-sm text-foreground/70">
          Sleep well. You've earned it.
        </p>
        <p className="text-xs text-muted-foreground">
          I'll be here to greet you with your morning briefing tomorrow.
        </p>
      </div>
    </div>
  );
}
