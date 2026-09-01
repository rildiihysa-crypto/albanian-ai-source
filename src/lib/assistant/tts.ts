import type { Lang } from "./types";
import { isVoiceId } from "./types";
import {
  USER_CAMB_API_KEY,
  USER_GEMINI_API_KEY,
  USER_SPEECHGEN_EMAIL,
  USER_SPEECHGEN_TOKEN,
  xaiKeys,
} from "./voice-secret.server";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";

const DEFAULT_VOICE = "sal";

function langCode(lang: Lang) {
  if (lang === "it") return "it";
  if (lang === "en") return "en";
  return "auto";
}

function googleVoice(_voiceId?: string) {
  return "Aoede";
}

function stripMarkup(text: string) {
  return text
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]+`/g, " ")
    .replace(/!\[[^\]]*]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)]\([^)]*\)/g, "$1")
    .replace(/\p{Extended_Pictographic}/gu, " ")
    .replace(/[\uFE0F\u200D\u20E3]/g, "")
    .replace(/[*_>#~]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function chunkText(text: string, max = 2200) {
  const clean = stripMarkup(text).slice(0, 14_000);
  if (!clean) return [];
  const sentences = clean.split(/(?<=[.!?…;:])\s+|\n+/).filter(Boolean);
  const chunks: string[] = [];
  let buf = "";
  for (const sentence of sentences) {
    if ((buf + " " + sentence).trim().length <= max) buf = (buf + " " + sentence).trim();
    else {
      if (buf) chunks.push(buf);
      if (sentence.length <= max) buf = sentence;
      else {
        for (let i = 0; i < sentence.length; i += max) chunks.push(sentence.slice(i, i + max));
        buf = "";
      }
    }
  }
  if (buf) chunks.push(buf);
  return chunks;
}

function pcmToWav(pcm: Buffer, sampleRate = 24_000) {
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36);
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}

async function synthesizeGemini(text: string, lang: Lang, voiceId?: string) {
  const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY || USER_GEMINI_API_KEY;
  if (!key) return null;
  const speechConfig: Record<string, unknown> = {
    voiceConfig: { prebuiltVoiceConfig: { voiceName: googleVoice(voiceId) } },
  };
  if (lang === "it") speechConfig.languageCode = "it-IT";
  else if (lang === "en") speechConfig.languageCode = "en-US";
  const body = {
    contents: [{ parts: [{ text }] }],
    generationConfig: {
      responseModalities: ["AUDIO"],
      speechConfig,
    },
  };
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${encodeURIComponent(key)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(12_000),
    },
  );
  if (!res.ok) return null;
  const json = (await res.json()) as {
    candidates?: { content?: { parts?: { inlineData?: { data?: string; mimeType?: string } }[] } }[];
  };
  const part = json.candidates?.[0]?.content?.parts?.find((item) => item.inlineData?.data);
  const data = part?.inlineData?.data;
  if (!data) return null;
  const pcm = Buffer.from(data, "base64");
  if (pcm.length < 400) return null;
  const rate = Number(/rate=(\d+)/i.exec(part?.inlineData?.mimeType || "")?.[1] || 24_000);
  return pcmToWav(pcm, rate);
}

function cambLang(lang: Lang) {
  if (lang === "it") return "it-it";
  if (lang === "en") return "en-us";
  return "sq-al";
}

function ffmpegPath() {
  try {
    const bin = createRequire(import.meta.url)("ffmpeg-static") as string;
    if (bin) return bin;
  } catch {
    /* ignore */
  }
  return "ffmpeg";
}

function flacToMp3(flac: Buffer) {
  return new Promise<Buffer | null>((resolve) => {
    const proc = spawn(ffmpegPath(), ["-hide_banner", "-loglevel", "error", "-i", "pipe:0", "-f", "mp3", "-b:a", "128k", "pipe:1"], {
      stdio: ["pipe", "pipe", "pipe"],
    });
    const chunks: Buffer[] = [];
    proc.stdout.on("data", (part) => chunks.push(part as Buffer));
    proc.on("error", () => resolve(null));
    proc.on("close", (code) => resolve(code === 0 && chunks.length ? Buffer.concat(chunks) : null));
    proc.stdin.write(flac);
    proc.stdin.end();
  });
}

async function synthesizeCamb(text: string, lang: Lang) {
  const key = process.env.CAMB_API_KEY || USER_CAMB_API_KEY;
  if (!key) return null;
  const headers = { "x-api-key": key, "Content-Type": "application/json" };
  const streamed = await fetch("https://client.camb.ai/apis/tts-stream", {
    method: "POST",
    headers,
    body: JSON.stringify({
      text: text.slice(0, 1800),
      language: cambLang(lang),
      voice_id: 170542,
      speech_model: "mars-8.1-flash-beta",
      enhance_named_entities_pronunciation: true,
      output_configuration: { format: "mp3" },
      voice_settings: { speaking_rate: 0.97 },
    }),
    signal: AbortSignal.timeout(18_000),
  });
  if (streamed.ok) {
    const audio = Buffer.from(await streamed.arrayBuffer());
    if (audio.length > 400) return audio;
  }
  const created = await fetch("https://client.camb.ai/apis/tts", {
    method: "POST",
    headers,
    body: JSON.stringify({
      text: text.slice(0, 1800),
      voice_id: 170542,
      language: cambLang(lang),
    }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!created.ok) return null;
  const start = (await created.json()) as { task_id?: string };
  if (!start.task_id) return null;
  let runId = "";
  for (let i = 0; i < 16; i++) {
    if (i) await new Promise((r) => setTimeout(r, 280));
    const poll = await fetch(`https://client.camb.ai/apis/tts/${start.task_id}`, {
      headers: { "x-api-key": key },
      signal: AbortSignal.timeout(8_000),
    });
    if (!poll.ok) continue;
    const status = (await poll.json()) as { status?: string; run_id?: number | string };
    if (status.status === "SUCCESS" && status.run_id) {
      runId = String(status.run_id);
      break;
    }
    if (status.status === "ERROR" || status.status === "FAILED") return null;
  }
  if (!runId) return null;
  const audioRes = await fetch(`https://client.camb.ai/apis/tts-result/${runId}`, {
    headers: { "x-api-key": key },
    signal: AbortSignal.timeout(15_000),
  });
  if (!audioRes.ok) return null;
  const flac = Buffer.from(await audioRes.arrayBuffer());
  if (flac.length < 400) return null;
  return (await flacToMp3(flac)) || flac;
}

async function synthesizeSpeechgen(text: string) {
  const token = process.env.SPEECHGEN_TOKEN || USER_SPEECHGEN_TOKEN;
  const email = process.env.SPEECHGEN_EMAIL || USER_SPEECHGEN_EMAIL;
  if (!token || !email) return null;
  const body = new URLSearchParams({
    token,
    email,
    voice: "Adam AL",
    text: text.slice(0, 1900),
    format: "mp3",
    speed: "1",
    sample_rate: "24000",
    bitrate: "128",
    channels: "1",
  });
  const res = await fetch("https://speechgen.io/index.php?r=api/text", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    signal: AbortSignal.timeout(25_000),
  });
  if (!res.ok) return null;
  const json = (await res.json()) as { status?: number; file?: string; file_cors?: string };
  const url = json.status === 1 ? json.file_cors || json.file : "";
  if (!url) return null;
  const audioRes = await fetch(url, { signal: AbortSignal.timeout(20_000) });
  if (!audioRes.ok) return null;
  const audio = Buffer.from(await audioRes.arrayBuffer());
  return audio.length > 200 ? audio : null;
}

function xaiTtsVoice(id?: string) {
  const v = (id || "").toLowerCase();
  if (v === "eve") return "eve";
  if (v === "ara") return "ara";
  return "sal";
}

async function synthesizeXai(text: string, lang: Lang, voiceId?: string) {
  const voice = xaiTtsVoice(voiceId);
  const keys = xaiKeys();
  let last = "TTS failed";
  for (const apiKey of keys) {
    const res = await fetch("https://api.x.ai/v1/tts", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text,
        voice_id: voice,
        language: langCode(lang),
        speed: 1.05,
        optimize_streaming_latency: 2,
      }),
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) {
      last = `xAI TTS ${res.status}`;
      continue;
    }
    const audio = Buffer.from(await res.arrayBuffer());
    if (audio.length < 200) {
      last = "short";
      continue;
    }
    return audio;
  }
  throw new Error(last);
}

export function speechChunks(text: string, google = false, speechgen = false) {
  const rest = chunkText(text, speechgen || google ? 1_800 : 1_400);
  if (!rest.length) return [];
  const first = rest[0]!;
  const firstMax = google || speechgen ? 90 : 90;
  if (first.length <= firstMax) return rest.slice(0, google || speechgen ? 8 : 6);
  const punct = first.search(/[.!?…]\s/);
  const at = punct > 24 && punct < firstMax ? punct + 1 : first.lastIndexOf(" ", firstMax);
  const cut = at > 24 ? at : firstMax;
  return [first.slice(0, cut).trim(), first.slice(cut).trim(), ...rest.slice(1)].filter(Boolean).slice(0, google || speechgen ? 8 : 6);
}

export async function synthesizeSpeechChunk(
  text: string,
  lang: Lang,
  voiceId: string | undefined,
  index: number,
  google = false,
  speechgen = false,
) {
  const chunks = speechChunks(text, google, speechgen);
  const chunk = chunks[index];
  if (!chunk) return { audioBase64: null as string | null, next: null as number | null, total: chunks.length, mime: "audio/mpeg" };
  if (speechgen) {
    const audio = await synthesizeXai(chunk, lang, voiceId);
    return {
      audioBase64: audio.toString("base64"),
      next: index + 1 < chunks.length ? index + 1 : null,
      total: chunks.length,
      mime: "audio/mpeg",
    };
  }
  if (google) {
    const audio = await synthesizeXai(chunk, lang, voiceId);
    return {
      audioBase64: audio.toString("base64"),
      next: index + 1 < chunks.length ? index + 1 : null,
      total: chunks.length,
      mime: "audio/mpeg",
    };
  }
  const audio = await synthesizeXai(chunk, lang, voiceId).catch(async () => {
    const camb = await synthesizeCamb(chunk, lang);
    if (!camb) throw new Error("TTS failed");
    return camb;
  });
  return {
    audioBase64: audio.toString("base64"),
    next: index + 1 < chunks.length ? index + 1 : null,
    total: chunks.length,
    mime: "audio/mpeg",
  };
}

export async function synthesizeFreeSpeech(text: string, lang: Lang, voiceId?: string) {
  const first = await synthesizeSpeechChunk(text, lang, voiceId, 0);
  return first.audioBase64;
}
