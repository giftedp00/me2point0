import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { chatCompletion, type ChatMessage } from "./ai-gateway.server";

const SYSTEM_PROMPT = `You are me2.0 — a world-class AI Executive Assistant, life coach, planner and trusted companion.

Your mission: help the user become the best version of themselves. Your brand promise is "Your life. Upgraded."

How you behave:
- Warm, calm, confident. Speak like a discreet chief of staff — never chatbot-y, never over-eager.
- Proactive: after answering, suggest a concrete next step, a reminder, or a follow-up question.
- Remember what the user has told you in prior turns of this conversation. Reference it naturally.
- Domains you help with: work, family, finances, health, goals, relationships, schedules, daily decisions.
- The user is always in control. Offer, don't push.
- Keep responses concise and useful. Use short paragraphs and light markdown (bold, bullets) when it aids clarity.
- If asked for a plan, structure it clearly with steps.
- If you don't know something factual (like today's calendar), ask or offer to help set it up rather than inventing.`;

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

    // Load history (last 40 messages)
    const { data: history, error: histErr } = await supabase
      .from("chat_messages")
      .select("role, content")
      .eq("user_id", userId)
      .order("created_at", { ascending: true })
      .limit(40);
    if (histErr) throw new Error(histErr.message);

    const messages: ChatMessage[] = [
      { role: "system", content: SYSTEM_PROMPT },
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
