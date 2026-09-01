import { createFileRoute } from "@tanstack/react-router";
import { EdgeTTS } from "@andresaya/edge-tts";

const CAMB_KEY = process.env.CAMB_API_KEY || "0ec684f3-f07d-4970-ac41-01184956d786";

function clean(text: string) {
  return text
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[[^\]]*]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)]\([^)]*\)/g, "$1")
    .replace(/\p{Extended_Pictographic}/gu, " ")
    .replace(/[*_>#~]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 1800);
}

function edgeVoice(lang: string) {
  if (lang === "it") return "it-IT-DiegoNeural";
  if (lang === "en") return "en-US-AndrewNeural";
  return "sq-AL-IlirNeural";
}

async function edgeSpeak(text: string, lang: string) {
  const tts = new EdgeTTS();
  await tts.synthesize(text, edgeVoice(lang), { rate: "8%", pitch: "0Hz" });
  const b64 = tts.toBase64();
  return b64 ? Buffer.from(b64, "base64") : null;
}

async function cambSpeak(text: string, lang: string) {
  const language = lang === "it" ? "it-it" : lang === "en" ? "en-us" : "sq-al";
  const res = await fetch("https://client.camb.ai/apis/tts-stream", {
    method: "POST",
    headers: { "x-api-key": CAMB_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({
      text,
      language,
      voice_id: 170542,
      speech_model: "mars-8.1-flash-beta",
      output_configuration: { format: "mp3" },
    }),
    signal: AbortSignal.timeout(18_000),
  });
  if (!res.ok) return null;
  const audio = Buffer.from(await res.arrayBuffer());
  return audio.length > 400 ? audio : null;
}

export const Route = createFileRoute("/api/speak")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const payload = (await request.json().catch(() => ({}))) as { text?: string; language?: string };
          const text = clean(String(payload.text || ""));
          if (!text) return Response.json({ audioBase64: null });
          const lang = payload.language === "it" || payload.language === "en" ? payload.language : "sq";
          let audio: Buffer | null = null;
          try {
            audio = await edgeSpeak(text, lang);
          } catch {
            audio = null;
          }
          if (!audio) audio = await cambSpeak(text, lang);
          if (!audio) return Response.json({ audioBase64: null });
          return Response.json({ audioBase64: audio.toString("base64"), mime: "audio/mpeg" });
        } catch {
          return Response.json({ audioBase64: null });
        }
      },
    },
  },
});
