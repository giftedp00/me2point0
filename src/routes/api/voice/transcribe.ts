import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/voice/transcribe")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const key = process.env.LOVABLE_API_KEY;
        if (!key) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        const contentType = request.headers.get("content-type") ?? "";
        if (!contentType.includes("multipart/form-data")) {
          return new Response("Expected multipart/form-data", { status: 400 });
        }

        const form = await request.formData();
        const file = form.get("file");
        if (!(file instanceof Blob)) return new Response("Missing file", { status: 400 });

        const upstream = new FormData();
        upstream.append("model", "openai/gpt-4o-mini-transcribe");
        const filename = (file as File).name || "recording.webm";
        upstream.append("file", file, filename);

        const res = await fetch("https://ai.gateway.lovable.dev/v1/audio/transcriptions", {
          method: "POST",
          headers: { Authorization: `Bearer ${key}` },
          body: upstream,
        });

        if (!res.ok) {
          const body = await res.text().catch(() => "");
          return new Response(body || `Transcription failed: ${res.status}`, { status: res.status });
        }
        const data = await res.json();
        return Response.json({ text: (data as { text?: string }).text ?? "" });
      },
    },
  },
});
