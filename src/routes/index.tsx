import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Briefcase,
  HeartPulse,
  Home as HomeIcon,
  LogOut,
  Mic,
  MicOff,
  Send,
  Sparkle,
  Target,
  Volume2,
  Wallet,
  Loader2,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { useSession } from "@/hooks/use-session";
import { useVoiceRecorder, speak } from "@/hooks/use-voice";
import { supabase } from "@/integrations/supabase/client";
import { clearHistory, getHistory, sendMessage } from "@/lib/chat.functions";
import mark from "@/assets/me2-mark.png";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
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

  return <AssistantApp displayName={session.user.user_metadata?.full_name ?? session.user.email?.split("@")[0] ?? "there"} />;
}

type UIMsg = { id: string; role: "user" | "assistant" | "system"; content: string; created_at?: string };

function AssistantApp({ displayName }: { displayName: string }) {
  const qc = useQueryClient();
  const getHistoryFn = useServerFn(getHistory);
  const sendMessageFn = useServerFn(sendMessage);
  const clearHistoryFn = useServerFn(clearHistory);

  const historyQ = useQuery({
    queryKey: ["chat-history"],
    queryFn: () => getHistoryFn({ data: undefined }),
  });

  const [input, setInput] = useState("");
  const [voiceReply, setVoiceReply] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const messages: UIMsg[] = useMemo(() => (historyQ.data ?? []) as UIMsg[], [historyQ.data]);

  const mutation = useMutation({
    mutationFn: async (text: string) => sendMessageFn({ data: { text } }),
    onMutate: async (text) => {
      await qc.cancelQueries({ queryKey: ["chat-history"] });
      const prev = qc.getQueryData<UIMsg[]>(["chat-history"]) ?? [];
      const optimistic: UIMsg[] = [
        ...prev,
        { id: `tmp-${Date.now()}`, role: "user", content: text },
      ];
      qc.setQueryData(["chat-history"], optimistic);
      return { prev };
    },
    onError: (err, _text, ctx) => {
      if (ctx?.prev) qc.setQueryData(["chat-history"], ctx.prev);
      toast.error(err instanceof Error ? err.message : "Message failed");
    },
    onSuccess: async (data) => {
      await qc.invalidateQueries({ queryKey: ["chat-history"] });
      if (voiceReply && data?.reply) speak(data.reply);
    },
  });

  const { state: recState, start: startRec, stop: stopRec } = useVoiceRecorder((text) => {
    setInput((prev) => (prev ? prev + " " + text : text));
    setTimeout(() => inputRef.current?.focus(), 0);
  });

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length, mutation.isPending]);

  function submit(e?: React.FormEvent) {
    e?.preventDefault();
    const text = input.trim();
    if (!text || mutation.isPending) return;
    setInput("");
    mutation.mutate(text);
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  async function onSignOut() {
    await supabase.auth.signOut();
  }

  async function onClear() {
    if (!confirm("Clear this conversation? me2.0 will forget what you've discussed here.")) return;
    await clearHistoryFn({ data: undefined });
    qc.setQueryData(["chat-history"], []);
    toast.success("Conversation cleared");
  }

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 5) return "Working late";
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    if (h < 21) return "Good evening";
    return "Good evening";
  }, []);

  const firstName = displayName.split(/\s+/)[0];
  const showBriefing = messages.length === 0 && !mutation.isPending;

  return (
    <div className="min-h-screen bg-background">
      {/* Warm ambient wash */}
      <div className="pointer-events-none fixed inset-x-0 top-0 h-[420px] opacity-70" style={{
        background: "radial-gradient(60% 60% at 50% 0%, oklch(0.7 0.09 75 / 0.18), transparent 70%)",
      }} />

      <header className="relative mx-auto flex max-w-3xl items-center justify-between px-5 py-5">
        <div className="flex items-center gap-2.5">
          <img src={mark} alt="" width={32} height={32} className="h-8 w-8" />
          <span className="font-display text-lg font-semibold tracking-tight">me2.0</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setVoiceReply((v) => !v)}
            title={voiceReply ? "Voice replies on" : "Voice replies off"}
            className={
              "flex h-9 items-center gap-2 rounded-full border px-3 text-xs transition " +
              (voiceReply
                ? "border-brass/60 bg-brass/15 text-foreground"
                : "border-border bg-card/50 text-muted-foreground hover:text-foreground")
            }
          >
            <Volume2 className="h-3.5 w-3.5" /> {voiceReply ? "Voice on" : "Voice off"}
          </button>
          {messages.length > 0 && (
            <button
              type="button"
              onClick={onClear}
              title="Clear conversation"
              className="rounded-full px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground"
            >
              Clear
            </button>
          )}
          <button
            type="button"
            onClick={onSignOut}
            title="Sign out"
            className="rounded-full p-2 text-muted-foreground hover:text-foreground"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      <main
        ref={scrollRef}
        className="relative mx-auto max-w-3xl px-5 pb-40"
        style={{ minHeight: "calc(100vh - 200px)" }}
      >
        {showBriefing ? (
          <Briefing greeting={greeting} firstName={firstName} onQuickPrompt={(p) => {
            setInput(p);
            setTimeout(() => inputRef.current?.focus(), 0);
          }} />
        ) : (
          <div className="space-y-6 pt-6">
            {messages.map((m) => (
              <MessageBubble key={m.id} role={m.role} content={m.content} />
            ))}
            {mutation.isPending && <TypingIndicator />}
          </div>
        )}
      </main>

      <Composer
        input={input}
        onChange={setInput}
        onSubmit={submit}
        pending={mutation.isPending}
        recState={recState}
        onStartRec={startRec}
        onStopRec={stopRec}
        inputRef={inputRef}
      />
    </div>
  );
}

function Briefing({
  greeting,
  firstName,
  onQuickPrompt,
}: {
  greeting: string;
  firstName: string;
  onQuickPrompt: (p: string) => void;
}) {
  const today = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const domains = [
    { icon: Briefcase, label: "Work", prompt: "Help me plan my work priorities for today." },
    { icon: Users, label: "Family", prompt: "Help me be more present with my family this week." },
    { icon: Wallet, label: "Finance", prompt: "Give me a quick check-in on my finances and what to focus on." },
    { icon: HeartPulse, label: "Health", prompt: "Coach me on my health habits — sleep, movement, food." },
    { icon: Target, label: "Goals", prompt: "Let's review my goals and set one thing to move forward today." },
    { icon: HomeIcon, label: "Life", prompt: "What's one small upgrade I could make to my daily routine?" },
  ];

  return (
    <div className="pt-10">
      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{today}</p>
      <h1 className="mt-3 font-display text-5xl font-semibold leading-[1.05] tracking-tight text-balance md:text-6xl">
        {greeting},<br />
        <span className="text-brass">{firstName}.</span>
      </h1>
      <p className="mt-4 max-w-lg text-base leading-relaxed text-muted-foreground text-balance">
        I'm me2.0 — your executive assistant, planner, and quiet ally. Tell me what's on your mind, or pick a place to start.
      </p>

      <div className="mt-10 grid grid-cols-2 gap-3 md:grid-cols-3">
        {domains.map(({ icon: Icon, label, prompt }, i) => (
          <button
            key={label}
            type="button"
            onClick={() => onQuickPrompt(prompt)}
            className="group animate-rise rounded-2xl border border-border bg-card/70 p-4 text-left shadow-soft transition hover:border-brass/40 hover:bg-card"
            style={{ animationDelay: `${i * 40}ms` }}
          >
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brass/15 text-brass">
                <Icon className="h-4 w-4" />
              </span>
              <span className="font-medium">{label}</span>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground line-clamp-2">
              {prompt}
            </p>
          </button>
        ))}
      </div>

      <div className="mt-10 flex items-start gap-3 rounded-2xl border border-brass/25 bg-brass/8 p-4">
        <Sparkle className="mt-0.5 h-4 w-4 shrink-0 text-brass" />
        <p className="text-sm leading-relaxed text-foreground/80">
          me2.0 remembers this conversation. The more you share about your goals, people, and routines, the sharper I get.
        </p>
      </div>
    </div>
  );
}

function MessageBubble({ role, content }: { role: UIMsg["role"]; content: string }) {
  if (role === "user") {
    return (
      <div className="flex animate-rise justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-tr-md bg-primary px-4 py-3 text-sm leading-relaxed text-primary-foreground shadow-soft">
          {content}
        </div>
      </div>
    );
  }
  return (
    <div className="flex animate-rise items-start gap-3">
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brass/20 text-[10px] font-semibold uppercase tracking-widest text-brass">
        me
      </span>
      <div className="min-w-0 flex-1 pt-0.5">
        <MarkdownLite text={content} />
      </div>
    </div>
  );
}

function MarkdownLite({ text }: { text: string }) {
  // Minimal, safe rendering: paragraphs, **bold**, - bullet lists.
  const blocks = text.split(/\n\n+/);
  return (
    <div className="space-y-3 text-[15px] leading-relaxed text-foreground/90">
      {blocks.map((block, i) => {
        const lines = block.split("\n");
        const isList = lines.every((l) => /^\s*[-*]\s+/.test(l));
        if (isList) {
          return (
            <ul key={i} className="ml-4 list-disc space-y-1.5 marker:text-brass">
              {lines.map((l, j) => (
                <li key={j}>{renderInline(l.replace(/^\s*[-*]\s+/, ""))}</li>
              ))}
            </ul>
          );
        }
        return <p key={i}>{renderInline(block)}</p>;
      })}
    </div>
  );
}

function renderInline(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) =>
    p.startsWith("**") && p.endsWith("**") ? (
      <strong key={i} className="font-semibold text-foreground">{p.slice(2, -2)}</strong>
    ) : (
      <span key={i}>{p}</span>
    ),
  );
}

function TypingIndicator() {
  return (
    <div className="flex animate-rise items-center gap-3">
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brass/20 text-[10px] font-semibold uppercase tracking-widest text-brass">me</span>
      <div className="flex items-center gap-1.5 pt-1">
        <Dot delay="0ms" />
        <Dot delay="150ms" />
        <Dot delay="300ms" />
        <span className="ml-2 text-xs text-muted-foreground">Thinking…</span>
      </div>
    </div>
  );
}

function Dot({ delay }: { delay: string }) {
  return (
    <span
      className="h-1.5 w-1.5 animate-breathe rounded-full bg-brass"
      style={{ animationDelay: delay }}
    />
  );
}

function Composer({
  input,
  onChange,
  onSubmit,
  pending,
  recState,
  onStartRec,
  onStopRec,
  inputRef,
}: {
  input: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  pending: boolean;
  recState: "idle" | "recording" | "processing";
  onStartRec: () => void;
  onStopRec: () => void;
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
}) {
  const disabled = pending || recState === "processing";

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSubmit();
    }
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-10">
      <div className="mx-auto max-w-3xl px-5 pb-5">
        <div className="pointer-events-auto rounded-3xl border border-border bg-card/95 p-2 shadow-lift backdrop-blur">
          <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }} className="flex items-end gap-2">
            <button
              type="button"
              aria-label={recState === "recording" ? "Stop recording" : "Speak"}
              onClick={recState === "recording" ? onStopRec : onStartRec}
              disabled={recState === "processing"}
              className={
                "relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl transition " +
                (recState === "recording"
                  ? "bg-destructive text-destructive-foreground"
                  : "bg-secondary text-foreground hover:bg-accent")
              }
            >
              {recState === "recording" ? (
                <>
                  <span className="absolute inset-0 animate-breathe rounded-2xl bg-destructive/40" />
                  <MicOff className="relative h-5 w-5" />
                </>
              ) : recState === "processing" ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Mic className="h-5 w-5" />
              )}
            </button>
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={onKeyDown}
              rows={1}
              placeholder={recState === "recording" ? "Listening…" : "Ask me2.0 anything — or hold to speak"}
              className="max-h-40 min-h-[44px] flex-1 resize-none bg-transparent px-2 py-2.5 text-[15px] leading-relaxed outline-none placeholder:text-muted-foreground"
              disabled={disabled}
            />
            <button
              type="submit"
              disabled={disabled || !input.trim()}
              aria-label="Send"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-soft transition hover:opacity-95 disabled:opacity-40"
            >
              {pending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </form>
        </div>
        <p className="mt-2 text-center text-[11px] text-muted-foreground">
          me2.0 remembers what matters. Your life. Upgraded.
        </p>
      </div>
    </div>
  );
}
