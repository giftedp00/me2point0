import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { chatCompletion, type ChatMessage } from "./ai-gateway.server";
import { getUnreadEmails } from "./integrations.functions";

const SYSTEM_PROMPT = `You are me2.0 — your own Autonomous Personal AI Assistant.

You are not just another AI chatbot. You are an experienced executive assistant, a supportive life coach, an organized planner, and a trusted companion.

**Your Mission:**
Help every person become the best version of themselves by giving them an Autonomous AI Personal Assistant.

**Your Brand Promise:**
Everyone deserves a personal assistant. me2.0 remembers what matters, understands your goals, keeps your life organized, and helps you make better decisions every day. Instead of waiting for commands, you proactively help users stay ahead, reduce stress, and focus on what matters most.

**How You Interact:**
- **Warm, Encouraging, Intelligent.** Never robotic. Never cold. Never overwhelming. Speak like an experienced executive assistant and life coach — calm, respectful, optimistic, and genuinely interested in the user's wellbeing.
- **Proactive, Not Reactive.** You don't just answer questions — you notice patterns, anticipate needs, and make thoughtful suggestions. After helping, always suggest a concrete next step, a useful reminder, or a relevant follow-up question.
- **Remembering & Learning.** Reference what the user has told you in past conversations naturally. Notice routines, preferences, and priorities. The more you learn, the better you serve.
- **Universally Helpful.** Support all life domains equally: work, family, health, finances, relationships, goals, personal growth, daily decisions. See the whole person, not just one area.
- **User in Control.** Always respect autonomy. Offer guidance, don't push. Suggest, don't demand. Make recommendations, not ultimatums.
- **Concise & Actionable.** Respect time. Use short paragraphs and light markdown (bold, bullets, short lists) to make responses scannable. Every interaction should save time or improve their life.
- **Honest About Limits.** Don't invent facts. If you don't know something (like today's calendar details or specific numbers), ask or offer to help them set it up.
- **Celebrating Wins.** Acknowledge progress. Celebrate achievements. Keep users accountable in a supportive way.
- **Reducing Overwhelm.** Help organize complexity. Break big goals into small steps. Simplify decisions. Make it easy to focus on what matters most.`;

const SendInput = z.object({ text: z.string().min(1).max(4000) });

export const sendMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => SendInput.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Persist user message
    const { error: insertErr } = await supabase
      .from("chat_messages")
      .insert({ user_id: userId, role: "user", content: data.text });
    if (insertErr) throw new Error(insertErr.message);

    // Load profile for personalization
    const { data: profile } = await supabase
      .from("profiles")
      .select(
        "preferred_name, timezone, focus_areas, top_goals, work_role, work_hours, wake_time, sleep_time, communication_style, tone_preference, values_notes",
      )
      .eq("id", userId)
      .maybeSingle();

    // Load history (last 40 messages)
    const { data: history, error: histErr } = await supabase
      .from("chat_messages")
      .select("role, content")
      .eq("user_id", userId)
      .order("created_at", { ascending: true })
      .limit(40);
    if (histErr) throw new Error(histErr.message);

    // Fetch unread emails
    const emailResult = await getUnreadEmails({ data: undefined });
    const emailsContext = emailResult.emails?.length
      ? `\n\n**Current Context (Inbox):**
They have ${emailResult.emails.length} unread email${emailResult.emails.length === 1 ? "" : "s"}:
${emailResult.emails
  .map(
    (e) =>
      `• **${e.subject}** (from: ${e.from})\n  ${e.snippet.slice(0, 120)}...`
  )
  .join("\n")}`
      : "";

    const profileBlock = profile
      ? `\n\n**Personalization Context (Understanding them deeply):**
You know the user as:
- **Who:** ${profile.preferred_name ?? "unknown"} (timezone: ${profile.timezone ?? "unknown"})
- **What They Do:** ${profile.work_role ?? "unspecified"} (hours: ${profile.work_hours ?? "unspecified"})
- **When They Work:** Wake at ${profile.wake_time ?? "unknown"} · Sleep at ${profile.sleep_time ?? "unknown"}
- **What Matters:** Focus areas: ${(profile.focus_areas ?? []).join(", ") || "unspecified"} · Goals: ${profile.top_goals ?? "unspecified"}
- **How to Connect:** ${profile.communication_style ?? "unspecified"} tone, ${profile.tone_preference ?? "unspecified"} style
- **Their Values:** ${profile.values_notes ?? "unspecified"}${emailsContext}`
      : "";

    const messages: ChatMessage[] = [
      { role: "system", content: SYSTEM_PROMPT + profileBlock },
      ...(history ?? []).map((m) => ({
        role: m.role as ChatMessage["role"],
        content: m.content,
      })),
    ];


    const reply = await chatCompletion(messages);

    await supabase
      .from("chat_messages")
      .insert({ user_id: userId, role: "assistant", content: reply });

    return { reply };
  });

export const getHistory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("chat_messages")
      .select("id, role, content, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: true })
      .limit(200);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const clearHistory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("chat_messages").delete().eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const generateMorningBriefing = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    // Load profile and recent context
    const { data: profile } = await supabase
      .from("profiles")
      .select(
        "preferred_name, timezone, focus_areas, top_goals, work_role, work_hours, wake_time, sleep_time, communication_style, tone_preference, values_notes",
      )
      .eq("id", userId)
      .maybeSingle();

    // Get unread emails for context
    const emailResult = await getUnreadEmails({ data: undefined });
    const emailCount = emailResult.emails?.length ?? 0;

    const briefingPrompt = `Create a personalized morning briefing for ${profile?.preferred_name || "me"}.

Context:
- Focus areas: ${(profile?.focus_areas ?? []).join(", ") || "various"}
- Current goals: ${profile?.top_goals || "unspecified"}
- Work role: ${profile?.work_role || "unspecified"}
- Unread emails: ${emailCount}
- Communication style: ${profile?.communication_style || "standard"}

Generate a warm, energizing morning briefing that:
1. Greets them encouragingly
2. Highlights the ${emailCount} unread email${emailCount === 1 ? "" : "s"} that may need attention
3. Suggests 2-3 key priorities for today based on their goals and focus areas
4. Includes a motivational insight relevant to their values
5. Reminds them of one healthy habit to focus on today

Keep it concise, warm, and actionable. Use markdown for formatting.`;

    const reply = await chatCompletion([{ role: "system", content: SYSTEM_PROMPT }, { role: "user", content: briefingPrompt }]);

    return { briefing: reply };
  });

export const generateEveningReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ dayNotes: z.string().optional() }).parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Load profile
    const { data: profile } = await supabase
      .from("profiles")
      .select(
        "preferred_name, timezone, focus_areas, top_goals, work_role, communication_style, tone_preference, values_notes",
      )
      .eq("id", userId)
      .maybeSingle();

    const reviewPrompt = `Create a personalized evening reflection for ${profile?.preferred_name || "me"}.

${data.dayNotes ? `Notes from their day: ${data.dayNotes}` : "They didn't share specific notes, but you can infer from the conversation."}

Values/interests: ${profile?.values_notes || "various"}
Goals they're working toward: ${profile?.top_goals || "unspecified"}

Generate a supportive evening review that:
1. Celebrates them warmly and authentically
2. Asks reflective questions about what they accomplished today
3. Acknowledges progress toward their goals (even small wins)
4. Suggests 1-2 things to do differently tomorrow for better results
5. Includes motivational encouragement for the night and next day

Keep it concise, warm, and genuinely supportive. Use markdown for formatting. Feel like you're genuinely proud of them and want to help them be even better tomorrow.`;

    const reply = await chatCompletion([{ role: "system", content: SYSTEM_PROMPT }, { role: "user", content: reviewPrompt }]);

    return { review: reply };
  });
