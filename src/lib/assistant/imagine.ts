import { wantsGeneratedImage, toEnglishVisualPrompt } from "./imagine-detect";
import { xaiKey } from "./voice-secret.server";
import { fetchWebPhoto } from "./web-photo";
import type { Lang } from "./types";

export { wantsGeneratedImage };

const GEN_MARK_OPEN = "[[AAI_GEN]]";
const GEN_MARK_CLOSE = "[[/AAI_GEN]]";

function apiKey() {
  return xaiKey();
}

function caption(lang: Lang) {
  if (lang === "it") return "Ecco la foto.";
  if (lang === "en") return "Here is the image.";
  return "Ja fotoja.";
}

function pack(src: string, lang: Lang) {
  return `${GEN_MARK_OPEN}${src}${GEN_MARK_CLOSE}${caption(lang)}`;
}

async function persistImage(url: string) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(12_000) });
    if (!res.ok) return url;
    const buf = Buffer.from(await res.arrayBuffer());
    if (!buf.byteLength || buf.byteLength > 1_400_000) return url;
    const mime = res.headers.get("content-type")?.split(";")[0] || "image/jpeg";
    if (!mime.startsWith("image/")) return url;
    return `data:${mime};base64,${buf.toString("base64")}`;
  } catch {
    return url;
  }
}

async function requestImage(key: string, prompt: string) {
  return fetch("https://api.x.ai/v1/images/generations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: "grok-imagine-image-2.0",
      prompt,
      n: 1,
    }),
    signal: AbortSignal.timeout(22_000),
  });
}

async function tryPollinations(userText: string) {
  const prompt = toEnglishVisualPrompt(userText).slice(0, 400);
  const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=1024&nologo=true&model=flux`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(25_000), redirect: "follow" });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.byteLength < 4000) return null;
    const mime = res.headers.get("content-type")?.split(";")[0] || "image/jpeg";
    if (!mime.startsWith("image/")) return url;
    if (buf.byteLength > 1_400_000) return url;
    return `data:${mime};base64,${buf.toString("base64")}`;
  } catch (error) {
    console.warn("[imagine] pollinations", error);
    return null;
  }
}

async function tryGeminiImage(userText: string) {
  const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY || (await import("./voice-secret.server")).USER_GEMINI_API_KEY;
  if (!key) return null;
  const prompt = toEnglishVisualPrompt(userText);
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${encodeURIComponent(key)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { responseModalities: ["IMAGE", "TEXT"] },
        }),
        signal: AbortSignal.timeout(28_000),
      },
    );
    if (!res.ok) {
      console.warn("[imagine] gemini image", res.status, (await res.text().catch(() => "")).slice(0, 200));
      return null;
    }
    const body = (await res.json()) as {
      candidates?: { content?: { parts?: { inlineData?: { mimeType?: string; data?: string } }[] } }[];
    };
    const part = body.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data);
    if (!part?.inlineData?.data) return null;
    return `data:${part.inlineData.mimeType || "image/png"};base64,${part.inlineData.data}`;
  } catch (error) {
    console.warn("[imagine] gemini image", error);
    return null;
  }
}

async function tryGenerate(userText: string) {
  const key = apiKey();
  if (!key) {
    console.warn("[imagine] no api key");
    return null;
  }
  const prompt = toEnglishVisualPrompt(userText);
  const res = await requestImage(key, prompt);
  if (!res.ok) {
    const err = await res.text().catch(() => "");
    console.warn("[imagine] xAI", res.status, err.slice(0, 400));
    return null;
  }
  const body = (await res.json()) as { data?: { url?: string; b64_json?: string }[] };
  const item = body.data?.[0];
  if (item?.b64_json) return `data:image/jpeg;base64,${item.b64_json}`;
  if (item?.url) return persistImage(item.url);
  return null;
}

export async function generateImageReply(userText: string, lang: Lang) {
  try {
    const [xai, poli] = await Promise.all([
      tryGenerate(userText).catch(() => null),
      tryPollinations(userText).catch(() => null),
    ]);
    const img = xai || poli || (await tryGeminiImage(userText).catch(() => null)) || (await fetchWebPhoto(userText).catch(() => null));
    if (img) return pack(img, lang);
    return "Nuk gjeta një foto për këtë. Provo një përshkrim më të qartë.";
  } catch (error) {
    console.error("[imagine] throw", error);
    const web = await fetchWebPhoto(userText).catch(() => null);
    if (web) return pack(web, lang);
    return "Nuk arrita ta sjell foton. Provo përsëri.";
  }
}
