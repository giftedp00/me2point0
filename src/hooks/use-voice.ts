import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

export type RecorderState = "idle" | "recording" | "processing";

export function useVoiceRecorder(onTranscribed: (text: string) => void) {
  const [state, setState] = useState<RecorderState>("idle");
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  async function start() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mime = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4";
      const rec = new MediaRecorder(stream, { mimeType: mime });
      chunksRef.current = [];
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.onstop = async () => {
        setState("processing");
        try {
          const blob = new Blob(chunksRef.current, { type: mime });
          if (blob.size < 1024) {
            toast.error("Recording was too short.");
            setState("idle");
            return;
          }
          const ext = mime.includes("mp4") ? "mp4" : "webm";
          const form = new FormData();
          form.append("file", blob, `voice.${ext}`);
          const res = await fetch("/api/voice/transcribe", { method: "POST", body: form });
          if (!res.ok) throw new Error(await res.text());
          const { text } = (await res.json()) as { text: string };
          if (text?.trim()) onTranscribed(text.trim());
          else toast.error("I couldn't catch that.");
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Transcription failed");
        } finally {
          streamRef.current?.getTracks().forEach((t) => t.stop());
          streamRef.current = null;
          setState("idle");
        }
      };
      rec.start();
      recorderRef.current = rec;
      setState("recording");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Microphone access denied");
      setState("idle");
    }
  }

  function stop() {
    recorderRef.current?.stop();
    recorderRef.current = null;
  }

  return { state, start, stop };
}

export async function speak(text: string) {
  try {
    const res = await fetch("/api/voice/speak", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audio.play().catch(() => {});
    audio.onended = () => URL.revokeObjectURL(url);
  } catch {
    /* silent */
  }
}
