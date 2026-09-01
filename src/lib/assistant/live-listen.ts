import type { Lang } from "./types";

type SpeechRec = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onresult: ((event: {
    resultIndex: number;
    results: ArrayLike<{ isFinal: boolean; 0?: { transcript: string } }>;
  }) => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

type RecCtor = new () => SpeechRec;

function Recognition(): RecCtor | undefined {
  if (typeof window === "undefined") return undefined;
  const w = window as unknown as { SpeechRecognition?: RecCtor; webkitSpeechRecognition?: RecCtor };
  return w.SpeechRecognition || w.webkitSpeechRecognition;
}

export function isIOSDevice() {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

export function canLiveListen() {
  if (isIOSDevice()) return false;
  return Boolean(Recognition());
}

export function speechLang(lang: Lang) {
  if (lang === "it") return "it-IT";
  if (lang === "en") return "en-US";
  return "sq-AL";
}

function normSq(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function isAssistantEcho(heard: string, lastAssistant: string) {
  const a = normSq(heard);
  const b = normSq(lastAssistant);
  if (!a) return true;
  if (a.includes("albanian ai") || a.includes("amarildo") || a.includes("krijuar nga")) return true;
  if (a.includes("si mund t ju ndihmoj") || a.includes("si mund tju ndihmoj")) return true;
  if (b && a.length >= 12 && (b.includes(a) || a.includes(b.slice(0, 20)))) return true;
  return false;
}

export function startLiveListen(options: {
  lang: Lang;
  onPartial: (text: string) => void;
  onFinal: (text: string) => void;
  onListening: (on: boolean) => void;
  onError: (message: string) => void;
}) {
  const Ctor = Recognition();
  if (!Ctor) {
    return { supported: false as const, pause() {}, resume() {}, stop() {} };
  }

  let stopped = false;
  let paused = false;
  let rec: SpeechRec | undefined;
  let acc = "";
  let silence = 0;
  let restartTimer = 0;
  let langCode = speechLang(options.lang);

  const commit = () => {
    if (silence) window.clearTimeout(silence);
    silence = 0;
    const text = acc.replace(/\s+/g, " ").trim();
    acc = "";
    options.onPartial("");
    if (text.length >= 2 && !/^[A-Za-z]{1,3}\.?$/.test(text)) options.onFinal(text);
  };

  const boot = () => {
    if (stopped || paused) return;
    try {
      rec?.abort();
    } catch {
      /* ignore */
    }
    const next = new Ctor();
    rec = next;
    next.lang = langCode;
    next.continuous = true;
    next.interimResults = true;
    next.maxAlternatives = 3;
    next.onstart = () => options.onListening(true);
    next.onresult = (event) => {
      let interim = "";
      let finals = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const piece = event.results[i]![0]?.transcript || "";
        if (event.results[i]!.isFinal) finals += `${piece} `;
        else interim += piece;
      }
      if (finals.trim()) acc = `${acc} ${finals}`.replace(/\s+/g, " ").trim();
      options.onPartial([acc, interim].filter(Boolean).join(" ").trim());
      if (silence) window.clearTimeout(silence);
      silence = window.setTimeout(commit, 1_050);
    };
    next.onerror = (event) => {
      if (event.error === "no-speech" || event.error === "aborted" || event.error === "audio-capture") return;
      if (event.error === "language-not-supported") {
        if (langCode === "sq-AL") {
          langCode = "sq";
          boot();
          return;
        }
        stopped = true;
        options.onError("FALLBACK");
        return;
      }
      if (event.error === "not-allowed") options.onError("Lejo mikrofonin te Settings → Safari → Microphone.");
    };
    next.onend = () => {
      options.onListening(false);
      if (stopped || paused) return;
      if (restartTimer) window.clearTimeout(restartTimer);
      restartTimer = window.setTimeout(boot, 160);
    };
    try {
      next.start();
    } catch {
      if (restartTimer) window.clearTimeout(restartTimer);
      restartTimer = window.setTimeout(boot, 280);
    }
  };

  boot();

  return {
    supported: true as const,
    pause() {
      paused = true;
      if (silence) window.clearTimeout(silence);
      try {
        rec?.stop();
      } catch {
        /* ignore */
      }
    },
    resume() {
      if (stopped) return;
      paused = false;
      boot();
    },
    stop() {
      stopped = true;
      paused = true;
      if (silence) window.clearTimeout(silence);
      if (restartTimer) window.clearTimeout(restartTimer);
      try {
        rec?.abort();
      } catch {
        /* ignore */
      }
      options.onPartial("");
      options.onListening(false);
    },
  };
}

export type LiveListenHandle = ReturnType<typeof startLiveListen>;
