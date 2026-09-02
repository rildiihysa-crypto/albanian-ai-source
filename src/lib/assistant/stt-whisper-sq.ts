import type { Buffer } from "node:buffer";

/**
 * Albanian live STT: Hugging Face Flutra Whisper first, Groq Whisper fallback.
 * This module is server-only by import convention; no provider is exposed to the UI.
 */
export async function transcribeWhisperSq(bytes: Buffer, mime: string, ext: string) {
  const token = process.env.HF_TOKEN || process.env.HUGGINGFACE_API_KEY;
  const model = process.env.HF_WHISPER_MODEL || "Flutra/whisper-large-v3-turbo-sq-v2";
  if (token) {
    const response = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": audioContentType(mime),
      },
      body: new Uint8Array(bytes),
      // Avoid blocking live conversation on a cold Hugging Face model.
      signal: AbortSignal.timeout(8_000),
    }).catch(() => null);
    if (response?.ok) {
      const body = await response.json() as { text?: string } | { text?: string }[] | string;
      const text = typeof body === "string" ? body : Array.isArray(body) ? body[0]?.text || "" : body.text || "";
      if (text.trim()) return text.trim();
    }
  }
  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) return "";
  const form = new FormData();
  form.append("file", new Blob([new Uint8Array(bytes)], { type: mime }), `speech.${ext}`);
  form.append("model", process.env.GROQ_WHISPER_MODEL || "whisper-large-v3");
  form.append("language", "sq");
  form.append("prompt", "Shqip e folur. Përdor vetëm alfabetin latin dhe shkronjat ë, ç.");
  form.append("response_format", "json");
  const response = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${groqKey}` },
    body: form,
    signal: AbortSignal.timeout(18_000),
  }).catch(() => null);
  if (!response?.ok) return "";
  const body = await response.json() as { text?: string };
  return body.text?.trim() || "";
}

function audioContentType(mime: string) {
  if (mime.includes("mp4") || mime.includes("m4a") || mime.includes("aac")) return "audio/mp4";
  return mime || "audio/wav";
}
