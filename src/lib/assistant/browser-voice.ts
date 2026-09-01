import type { Lang } from "./types";

type RecognitionCtor = new () => {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onstart: (() => void) | null;
  onresult: ((event: {
    resultIndex: number;
    results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>;
  }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

const LANG_CODE: Record<Lang, string> = {
  sq: "sq-AL",
  it: "it-IT",
  en: "en-US",
};

const SILENT_WAV =
  "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQAAAAA=";

let speaker: HTMLAudioElement | null = null;
let captureCtx: AudioContext | null = null;
let stopPlayback: () => void = () => undefined;
let bufferSource: AudioBufferSourceNode | null = null;

export function getRecognitionCtor(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as Window & {
    SpeechRecognition?: RecognitionCtor;
    webkitSpeechRecognition?: RecognitionCtor;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

export function recognitionLang(lang: Lang) {
  return LANG_CODE[lang];
}

function artworkUrls() {
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  return [
    { src: `${origin}/logo-192.jpg`, sizes: "192x192", type: "image/jpeg" },
    { src: `${origin}/logo.jpg`, sizes: "512x512", type: "image/jpeg" },
  ];
}

export function setNowPlaying(title = "Albanian AI") {
  if (typeof navigator === "undefined" || !navigator.mediaSession) return;
  try {
    navigator.mediaSession.metadata = new MediaMetadata({
      title,
      artist: "Albanian AI",
      album: "Albanian AI",
      artwork: artworkUrls(),
    });
    navigator.mediaSession.playbackState = "playing";
  } catch {
    /* ignore */
  }
}

function audioCtor() {
  return window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
}

function speakerEl() {
  if (!speaker) {
    speaker = new Audio();
    speaker.preload = "auto";
    speaker.volume = 1;
    speaker.muted = false;
    (speaker as HTMLAudioElement & { playsInline?: boolean }).playsInline = true;
    speaker.setAttribute("playsinline", "true");
    speaker.setAttribute("webkit-playsinline", "true");
  }
  speaker.volume = 1;
  speaker.muted = false;
  return speaker;
}

async function routeToSpeaker(audio: HTMLAudioElement) {
  const withSink = audio as HTMLAudioElement & { setSinkId?: (id: string) => Promise<void> };
  if (typeof withSink.setSinkId === "function") {
    try {
      await withSink.setSinkId("");
    } catch {
      try {
        await withSink.setSinkId("default");
      } catch {
        /* keep default output */
      }
    }
  }
}

export function unlockAudio() {
  try {
    void captureAudioContext()?.resume();
    const audio = speakerEl();
    if (!audio.paused && audio.src && audio.src.startsWith("blob:")) return;
    audio.loop = false;
    audio.muted = false;
    audio.volume = 1;
    audio.src = SILENT_WAV;
    void audio.play().catch(() => undefined);
  } catch {
    /* ignore */
  }
}

export function keepAudioAlive() {
  void captureAudioContext()?.resume();
  return captureCtx;
}

export function captureAudioContext() {
  const Ctx = audioCtor();
  if (!Ctx) return null;
  if (!captureCtx || captureCtx.state === "closed") captureCtx = new Ctx();
  void captureCtx.resume();
  return captureCtx;
}

export function closeCaptureAudio() {
  if (captureCtx && captureCtx.state !== "closed") {
    void captureCtx.close().catch(() => undefined);
  }
  captureCtx = null;
}

function bytesFromBase64(base64: string) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export async function playMp3Base64(base64: string, mime = "audio/mpeg") {
  const blob = new Blob([bytesFromBase64(base64)], { type: mime || "audio/mpeg" });
  const url = URL.createObjectURL(blob);
  try {
    await playUrl(url);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function playUrl(url: string) {
  const audio = speakerEl();
  await routeToSpeaker(audio);
  audio.loop = false;
  audio.muted = false;
  audio.volume = 1;
  await new Promise<void>((resolve, reject) => {
    const done = () => {
      audio.onended = null;
      audio.onerror = null;
      resolve();
    };
    stopPlayback = () => {
      audio.pause();
      done();
    };
    audio.onended = done;
    audio.onerror = () => reject(new Error("audio"));
    audio.src = url;
    const run = audio.play();
    if (run) {
      run.catch(async () => {
        await captureAudioContext()?.resume();
        return audio.play();
      }).catch(() => reject(new Error("audio")));
    }
  });
}

export function pickRecorderMime() {
  if (typeof MediaRecorder === "undefined") return "";
  const types = ["audio/mp4", "audio/aac", "audio/webm;codecs=opus", "audio/webm"];
  return types.find((type) => MediaRecorder.isTypeSupported(type)) || "";
}

export function downsample(input: Float32Array, fromRate: number, toRate: number) {
  if (fromRate === toRate) return input;
  const ratio = fromRate / toRate;
  const length = Math.max(1, Math.round(input.length / ratio));
  const out = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    const x = i * ratio;
    const i0 = Math.min(input.length - 1, Math.floor(x));
    const i1 = Math.min(input.length - 1, i0 + 1);
    const f = x - i0;
    out[i] = (input[i0] ?? 0) * (1 - f) + (input[i1] ?? 0) * f;
  }
  return out;
}

export function cleanSpeechPcm(input: Float32Array) {
  const out = new Float32Array(input.length);
  let prevIn = 0;
  let prevOut = 0;
  let peak = 0.0001;
  for (let i = 0; i < input.length; i++) {
    const cur = input[i] ?? 0;
    const hp = cur - prevIn + 0.97 * prevOut;
    prevIn = cur;
    prevOut = hp;
    const gated = Math.abs(hp) < 0.01 ? hp * 0.15 : hp;
    out[i] = gated;
    peak = Math.max(peak, Math.abs(gated));
  }
  const gain = peak > 0.04 ? Math.min(0.85 / peak, 3.2) : 1;
  if (gain !== 1) {
    for (let i = 0; i < out.length; i++) out[i] *= gain;
  }
  const thresh = 0.02;
  let start = 0;
  let end = out.length - 1;
  while (start < end && Math.abs(out[start] ?? 0) < thresh) start++;
  while (end > start && Math.abs(out[end] ?? 0) < thresh) end--;
  const pad = 1600;
  start = Math.max(0, start - pad);
  end = Math.min(out.length - 1, end + pad);
  return out.subarray(start, end + 1);
}

export function encodeWav(float32: Float32Array, sampleRate: number) {
  const pcm = new Int16Array(float32.length);
  for (let i = 0; i < float32.length; i++) {
    const sample = Math.max(-1, Math.min(1, float32[i] ?? 0));
    pcm[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
  }
  const bytes = new ArrayBuffer(44 + pcm.length * 2);
  const view = new DataView(bytes);
  const ascii = (offset: number, value: string) => {
    for (let i = 0; i < value.length; i++) view.setUint8(offset + i, value.charCodeAt(i));
  };
  ascii(0, "RIFF");
  view.setUint32(4, 36 + pcm.length * 2, true);
  ascii(8, "WAVE");
  ascii(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  ascii(36, "data");
  view.setUint32(40, pcm.length * 2, true);
  let offset = 44;
  for (let i = 0; i < pcm.length; i++, offset += 2) view.setInt16(offset, pcm[i]!, true);
  return new Blob([bytes], { type: "audio/wav" });
}

export function stopAllSpeech() {
  stopPlayback();
  stopPlayback = () => undefined;
  if (bufferSource) {
    try {
      bufferSource.stop();
    } catch {
      /* ignore */
    }
    bufferSource = null;
  }
  if (speaker) {
    speaker.loop = false;
    speaker.pause();
    speaker.removeAttribute("src");
  }
  if (typeof navigator !== "undefined" && navigator.mediaSession) {
    navigator.mediaSession.playbackState = "none";
  }
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
}

export function browserSpeak(text: string, lang: Lang, onDone?: () => void) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    onDone?.();
    return false;
  }
  const synth = window.speechSynthesis;
  synth.cancel();
  const wanted =
    lang === "it" ? ["it-IT", "it"] : lang === "en" ? ["en-US", "en-GB", "en"] : ["sq-AL", "sq"];
  const voices = synth.getVoices();
  const voice =
    voices.find((item) => wanted.some((code) => item.lang.toLowerCase() === code.toLowerCase())) ||
    voices.find((item) =>
      lang === "sq" ? /alban/i.test(item.name) : item.lang.toLowerCase().startsWith(lang),
    );
  const clean = text
    .replace(/\p{Extended_Pictographic}/gu, " ")
    .replace(/[\uFE0F\u200D\u20E3]/g, "")
    .replace(/[*#>`_]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const chunks = clean.match(/.{1,260}(?:\s|$)/g) || [clean];
  let index = 0;
  const next = () => {
    if (index >= chunks.length) {
      onDone?.();
      return;
    }
    const utterance = new SpeechSynthesisUtterance(chunks[index++]!.trim());
    utterance.lang = wanted[0]!;
    utterance.volume = 1;
    if (voice) utterance.voice = voice;
    utterance.rate = lang === "sq" ? 0.92 : 0.96;
    utterance.onend = next;
    utterance.onerror = () => onDone?.();
    synth.speak(utterance);
  };
  next();
  return true;
}
