import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/voice/speak")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const key = process.env.LOVABLE_API_KEY;
        if (!key) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        const { text } = (await request.json()) as { text?: string };
        if (!text || typeof text !== "string") {
          return new Response("Missing text", { status: 400 });
        }

        const trimmed = text.length > 3000 ? text.slice(0, 3000) : text;

        const res = await fetch("https://ai.gateway.lovable.dev/v1/audio/speech", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${key}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "openai/gpt-4o-mini-tts",
            input: trimmed,
            voice: "alloy",
            response_format: "mp3",
          }),
        });

        if (!res.ok) {
          const body = await res.text().catch(() => "");
          return new Response(body || `TTS failed: ${res.status}`, { status: res.status });
        }

        return new Response(res.body, {
          headers: { "Content-Type": "audio/mpeg" },
        });
      },
    },
  },
});
