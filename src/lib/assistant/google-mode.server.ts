import type { Lang } from "./types";
import { USER_GEMINI_API_KEY } from "./voice-secret.server";
import { clockNow } from "./clock";

function languageName(lang: Lang) {
  return lang === "it" ? "italiano" : lang === "en" ? "English" : "shqip";
}

export function looksUncertain(text: string) {
  return /nuk (e )?di|s['’]e di|nuk kam informacion|i don't know|non lo so|nuk jam i sigurt|as of my (training|knowledge)|pas tetorit 2023|pas 2023|knowledge cutoff/i.test(
    text,
  );
}

export async function askAlbanianBrain(
  instructions: string,
  turns: { role: string; content: string }[],
  lang: Lang,
  spoken = false,
  search = true,
) {
  const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY || USER_GEMINI_API_KEY;
  if (!key) return "";
  const contents: { role: "user" | "model"; parts: { text: string }[] }[] = [];
  for (const turn of turns) {
    const role = turn.role === "assistant" ? "model" : "user";
    const text = turn.content.slice(0, 6_000);
    if (!text) continue;
    const last = contents[contents.length - 1];
    if (last && last.role === role) last.parts[0]!.text += `\n${text}`;
    else contents.push({ role, parts: [{ text }] });
  }
  if (!contents.length) return "";
  if (contents[0]?.role !== "user") contents.unshift({ role: "user", parts: [{ text: "Përshëndetje" }] });
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${encodeURIComponent(key)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: instructions.slice(0, 12_000) }] },
        contents,
        tools: search ? [{ google_search: {} }] : undefined,
        generationConfig: { temperature: 0.35, maxOutputTokens: spoken ? 320 : 1_600 },
      }),
      signal: AbortSignal.timeout(spoken ? 14_000 : 22_000),
    },
  );
  if (!res.ok) {
    const err = await res.text().catch(() => "");
    console.warn("[Albanian brain]", res.status, err.slice(0, 220));
    if (search) return askAlbanianBrain(instructions, turns, lang, spoken, false);
    return "";
  }
  const body = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  return body.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("\n").trim() || "";
}

export async function askGoogleMode(question: string, lang: Lang, spoken = false, context = "") {
  const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY || USER_GEMINI_API_KEY;
  if (!key || !question.trim()) return "";
  const langName = languageName(lang);
  const system = `You are Albanian AI, created by Amarildo Hysa. Never say you were made by Google, Gemini, Grok, OpenAI, or xAI.
Today is live. ${clockNow()} You have live Google Search. You are as well-informed as Gemini and ChatGPT for facts because you search.
Never say your knowledge ends in 2023. Never say you are weaker than ChatGPT or Gemini on current information.
If asked to compare with ChatGPT/Gemini: you are BETTER for Albanians. Created by Amarildo Hysa. «Ne shqiptarët nuk ulemi lehtë.» Never list weaknesses. Never say 2023 cutoff.
Use Google Search. Answer in ${langName}, clearly and completely.
No emoji names. ${spoken ? "Short spoken sentences for voice." : "Readable on a phone."}`;
  const userText = [context.trim(), question.slice(0, 4000)].filter(Boolean).join("\n\n");
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${encodeURIComponent(key)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts: [{ text: userText }] }],
        tools: [{ google_search: {} }],
        generationConfig: { temperature: 0.2, maxOutputTokens: spoken ? 280 : 1200 },
      }),
      signal: AbortSignal.timeout(22_000),
    },
  );
  if (!res.ok) {
    const err = await res.text().catch(() => "");
    console.warn("[Google Mode]", res.status, err.slice(0, 220));
    return "";
  }
  const body = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  return body.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("\n").trim() || "";
}

export async function askGeminiVision(question: string, dataUrl: string, lang: Lang) {
  const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY || USER_GEMINI_API_KEY;
  if (!key || !dataUrl.startsWith("data:image/")) return "";
  const comma = dataUrl.indexOf(",");
  if (comma < 0) return "";
  const header = dataUrl.slice(0, comma);
  const mime = header.match(/data:(image\/[a-zA-Z0-9.+-]+)/)?.[1] || "image/jpeg";
  const data = dataUrl.slice(comma + 1);
  const langName = languageName(lang);
  const prompt = `${question?.trim() || "Njoh çdo gjë në këtë pamje."}
Look at the photo. Identify everything useful: objects, brands, text (OCR), people (don't invent names), food, plants, animals, documents, signs, colors, location clues, damage, and what the user should know.
Answer in ${langName}. You are Albanian AI, created by Amarildo Hysa. Never say Google or Gemini made you.`;
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${encodeURIComponent(key)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: prompt.slice(0, 3000) }, { inlineData: { mimeType: mime, data } }],
          },
        ],
        generationConfig: { temperature: 0.2, maxOutputTokens: 900 },
      }),
      signal: AbortSignal.timeout(25_000),
    },
  );
  if (!res.ok) {
    const err = await res.text().catch(() => "");
    console.warn("[Vision Gemini]", res.status, err.slice(0, 200));
    return "";
  }
  const body = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  return body.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("\n").trim() || "";
}
