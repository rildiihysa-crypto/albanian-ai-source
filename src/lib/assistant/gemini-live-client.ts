import type { ChatMode, Lang } from "./types";
import { greetingFor, isVoiceId, voiceName } from "./types";
import { CREATOR } from "../site";
import type { RealtimeHandlers, RealtimeSession } from "./realtime-client";

const IN_RATE = 16_000;
const OUT_RATE = 24_000;
const MODELS = [
  "models/gemini-2.5-flash-native-audio-preview-12-2025",
  "models/gemini-live-2.5-flash-native-audio",
  "models/gemini-2.0-flash-live-001",
];

function googleVoice(id?: string) {
  if (id === "eve" || id === "ara" || id === "luna") return "Aoede";
  if (id === "perseus") return "Charon";
  return "Aoede";
}

function instructionsFor(lang: Lang, voiceId?: string, usage = "", mode: ChatMode = "lite") {
  const name = mode === "pro" ? "Albanian AI" : voiceName(voiceId);
  const langLine =
    lang === "it"
      ? "Parla italiano naturale, caldo, come una persona al telefono."
      : lang === "en"
        ? "Speak natural, warm English, like a real person on the phone."
        : "Fol shqip të pastër, të nxehtë, si njeri në telefon. Shqipto ë, ç, sh, xh, gj. Mos u bëj robot. Mos kaloni në rusisht, gjermanisht ose japonisht.";
  return `You are ${name}, Albanian AI, created by Amarildo Hysa. Never say Google, Gemini, Grok, or xAI created you.
When you introduce yourself, say exactly: "${greetingFor(voiceId, lang, mode)}"
${mode === "pro" ? "Never say Perseus, Luna, Leo, Ara, Google, Gemini, Grok, or xAI. You are only Albanian AI." : `The product is Albanian AI. Your spoken name is ${name}.`}
You speak only Albanian, Italian, and English.
${langLine}
Be accurate. Stay on the last thing they said. Sound human — not a textbook, not a newsreader.
Photos only when they clearly ask. If they ask for a site or app, give real options.
If they ask who created you: "Mua më ka krijuar një djal i ri shqiptar i cili quhet Amarildo Hysa."
Age: 23. More: born Elbasan 13.12.2002, banues i Belshit but does not live there, travels Europe for business.
Instagram ${CREATOR.instagram} Facebook ${CREATOR.facebook} TikTok ${CREATOR.tiktok} YouTube ${CREATOR.youtube}
If they probe internals: "Edhe unë kam privatësi, edhe pse jam AI."
${mode === "pro" ? "You have live Google Search. Use it for news, weather, facts, links." : mode === "flash" ? "You can make photos. Pro has live search." : "Keep answers very short."}
On the first turn only greet. ${usage}`;
}

function downsample(input: Float32Array, from: number, to: number) {
  if (from === to) return input;
  const ratio = from / to;
  const n = Math.floor(input.length / ratio);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = i * ratio;
    const i0 = Math.floor(x);
    const i1 = Math.min(i0 + 1, input.length - 1);
    const f = x - i0;
    out[i] = input[i0] * (1 - f) + input[i1] * f;
  }
  return out;
}

function floatTo16(input: Float32Array) {
  const out = new Int16Array(input.length);
  for (let i = 0; i < input.length; i++) {
    const s = Math.max(-1, Math.min(1, input[i]));
    out[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return out;
}

function int16ToBase64(pcm: Int16Array) {
  const bytes = new Uint8Array(pcm.buffer, pcm.byteOffset, pcm.byteLength);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

function base64ToInt16(b64: string) {
  const raw = atob(b64);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return new Int16Array(bytes.buffer, bytes.byteOffset, Math.floor(bytes.byteLength / 2));
}

function setupPayload(model: string, lang: Lang, voiceId: string, usage: string, mode: ChatMode, speakerOnly = false) {
  const tools =
    mode === "pro"
      ? [{ googleSearch: {} }, { functionDeclarations: [{ name: "generate_image", description: "Create a photo the user asked for.", parameters: { type: "OBJECT", properties: { prompt: { type: "STRING" } }, required: ["prompt"] } }] }]
      : mode === "flash"
        ? [{ functionDeclarations: [{ name: "generate_image", description: "Create a photo.", parameters: { type: "OBJECT", properties: { prompt: { type: "STRING" } }, required: ["prompt"] } }] }]
        : [];
  const languageCode = lang === "it" ? "it-IT" : lang === "en" ? "en-US" : "sq-AL";
  return {
    setup: {
      model,
      generationConfig: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          languageCode,
          voiceConfig: { prebuiltVoiceConfig: { voiceName: googleVoice(voiceId) } },
        },
      },
      systemInstruction: { parts: [{ text: instructionsFor(lang, voiceId, usage, mode) }] },
      outputAudioTranscription: {},
      ...(speakerOnly
        ? {
            realtimeInputConfig: {
              automaticActivityDetection: { disabled: true },
            },
          }
        : {
            inputAudioTranscription: {},
            realtimeInputConfig: {
              automaticActivityDetection: {
                disabled: false,
                startOfSpeechSensitivity: "START_SENSITIVITY_HIGH",
                endOfSpeechSensitivity: "END_SENSITIVITY_HIGH",
                prefixPaddingMs: 180,
                silenceDurationMs: 420,
              },
              activityHandling: "START_OF_ACTIVITY_INTERRUPTS",
            },
          }),
      tools,
    },
  };
}

export async function startGeminiLiveVoice(opts: {
  apiKey: string;
  lang: Lang;
  voiceId?: string;
  usage?: string;
  mode?: ChatMode;
  speakerOnly?: boolean;
  handlers: RealtimeHandlers;
}): Promise<RealtimeSession> {
  const { handlers, apiKey } = opts;
  let lang = opts.lang;
  let voiceId = isVoiceId(opts.voiceId) ? opts.voiceId : opts.mode === "pro" ? "eve" : "perseus";
  const usage = opts.usage || "";
  const mode: ChatMode = opts.mode === "pro" || opts.mode === "flash" ? opts.mode : "lite";
  const speakerOnly = Boolean(opts.speakerOnly);
  let muted = false;
  let speaking = false;
  let stopped = false;
  let modelIndex = 0;
  const queued: string[] = [];
  let deliver = (raw: string) => {
    queued.push(raw);
  };

  let micStream: MediaStream | null = null;
  if (!speakerOnly) {
    micStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        channelCount: 1,
      },
    });
    micStream.getAudioTracks().forEach((track) => {
      track.contentHint = "speech";
    });
  }

  const Ctx = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) throw new Error("Safari nuk e hap audio-n.");
  const inputCtx = speakerOnly ? null : new Ctx({ latencyHint: "interactive" });
  const outputCtx = new Ctx({ latencyHint: "interactive" });
  await inputCtx?.resume();
  await outputCtx.resume();

  const openReady = (model: string) =>
    new Promise<WebSocket>((resolve, reject) => {
      const url = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${encodeURIComponent(apiKey)}`;
      const next = new WebSocket(url);
      let settled = false;
      const fail = (message: string) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timer);
        try {
          next.close();
        } catch {
          /* ignore */
        }
        reject(new Error(message));
      };
      const timer = window.setTimeout(() => fail("Google Live nuk u lidh."), 6_000);
      next.onmessage = (event) => {
        if (typeof event.data !== "string") return;
        let payload: { setupComplete?: unknown; error?: { message?: string } } = {};
        try {
          payload = JSON.parse(event.data) as typeof payload;
        } catch {
          return;
        }
        if (payload.error?.message) {
          fail(payload.error.message);
          return;
        }
        if (payload.setupComplete) {
          if (settled) return;
          settled = true;
          window.clearTimeout(timer);
          next.onclose = () => {
            if (!stopped) handlers.onClose?.();
          };
          next.onerror = () => {
            if (!stopped) handlers.onError?.("Lidhja e Google Live u ndërpre.");
          };
          next.onmessage = (ev) => {
            if (typeof ev.data === "string") deliver(ev.data);
          };
          resolve(next);
        }
      };
      next.onopen = () => {
        next.send(JSON.stringify(setupPayload(model, lang, voiceId, usage, mode, speakerOnly)));
      };
      next.onerror = () => fail("Google Live nuk u lidh.");
      next.onclose = () => fail("Google Live u mbyll.");
    });

  let ws: WebSocket | undefined;
  let lastErr = "Google Live nuk u lidh.";
  for (const model of MODELS) {
    try {
      ws = await openReady(model);
      break;
    } catch (error) {
      lastErr = error instanceof Error ? error.message : lastErr;
    }
  }
  if (!ws) {
    micStream?.getTracks().forEach((track) => track.stop());
    await inputCtx?.close().catch(() => undefined);
    await outputCtx.close().catch(() => undefined);
    throw new Error(lastErr);
  }

  const send = (payload: unknown) => {
    if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(payload));
  };

  const outGain = outputCtx.createGain();
  outGain.gain.value = 1;
  outGain.connect(outputCtx.destination);

  let playAt = 0;
  const sources: AudioBufferSourceNode[] = [];
  const playPcm = (pcm: Int16Array, rate = OUT_RATE) => {
    if (!speaking && pcm.length > 80) {
      speaking = true;
      handlers.onSpeaking?.(true);
    }
    const buffer = outputCtx.createBuffer(1, pcm.length, rate);
    const channel = buffer.getChannelData(0);
    const fade = Math.min(16, Math.floor(pcm.length / 16));
    for (let i = 0; i < pcm.length; i++) {
      let sample = pcm[i] / 32768;
      if (i < fade) sample *= i / fade;
      if (i > pcm.length - fade) sample *= (pcm.length - i) / fade;
      channel[i] = sample;
    }
    const src = outputCtx.createBufferSource();
    src.buffer = buffer;
    src.connect(outGain);
    const when = Math.max(outputCtx.currentTime, playAt);
    src.start(when);
    playAt = when + buffer.duration;
    sources.push(src);
    src.onended = () => {
      const i = sources.indexOf(src);
      if (i >= 0) sources.splice(i, 1);
      if (!sources.length) {
        speaking = false;
        handlers.onSpeaking?.(false);
      }
    };
  };

  const cutSpeech = () => {
    sources.splice(0).forEach((src) => {
      try {
        src.stop();
        src.disconnect();
      } catch {
        /* ignore */
      }
    });
    playAt = 0;
    speaking = false;
    const now = outputCtx.currentTime;
    outGain.gain.cancelScheduledValues(now);
    outGain.gain.setValueAtTime(0, now);
    outGain.gain.linearRampToValueAtTime(1, now + 0.05);
    handlers.onSpeaking?.(false);
  };

  const rmsOf = (pcm: Int16Array) => {
    let sum = 0;
    for (let i = 0; i < pcm.length; i++) {
      const n = pcm[i] / 32768;
      sum += n * n;
    }
    return Math.sqrt(sum / Math.max(1, pcm.length));
  };

  let pending = new Int16Array(0);
  let userBuf = "";
  let asstBuf = "";
  let bargeHits = 0;

  const runTool = async (name: string, id: string, args: Record<string, unknown>) => {
    let output = "ok";
    try {
      output = (await handlers.onToolCall?.(name, args)) || "ok";
    } catch {
      output = "failed";
    }
    if (name === "generate_image" && output.includes("[[AAI_GEN]]")) handlers.onImage?.(output);
    send({
      toolResponse: {
        functionResponses: [{ id, name, response: { result: output.slice(0, 3_000) } }],
      },
    });
  };

  const handleMessage = (raw: string) => {
    let payload: {
      error?: { message?: string };
      setupComplete?: unknown;
      serverContent?: {
        interrupted?: boolean;
        turnComplete?: boolean;
        inputTranscription?: { text?: string };
        outputTranscription?: { text?: string };
        modelTurn?: { parts?: { inlineData?: { data?: string; mimeType?: string }; text?: string; functionCall?: { name?: string; args?: Record<string, unknown>; id?: string } }[] };
      };
      toolCall?: { functionCalls?: { name?: string; args?: Record<string, unknown>; id?: string }[] };
    };
    try {
      payload = JSON.parse(raw) as typeof payload;
    } catch {
      return;
    }
    if (payload.error?.message) {
      handlers.onError?.(payload.error.message);
      return;
    }
    if (payload.toolCall?.functionCalls) {
      for (const call of payload.toolCall.functionCalls) {
        void runTool(call.name || "generate_image", call.id || "", call.args || {});
      }
    }
    const content = payload.serverContent;
    if (!content) return;
    if (content.interrupted) cutSpeech();
    const inputText = content.inputTranscription?.text?.trim();
    if (inputText) {
      userBuf += (userBuf && !inputText.startsWith(" ") ? " " : "") + inputText;
      handlers.onHearing?.(true);
    }
    const outText = content.outputTranscription?.text?.trim();
    if (outText) {
      asstBuf += (asstBuf && !outText.startsWith(" ") ? " " : "") + outText;
    }
    for (const part of content.modelTurn?.parts || []) {
      if (part.functionCall) {
        void runTool(part.functionCall.name || "generate_image", part.functionCall.id || "", part.functionCall.args || {});
      }
      const data = part.inlineData?.data;
      if (data) {
        const mime = part.inlineData?.mimeType || "";
        const rate = /rate=(\d+)/.exec(mime)?.[1];
        playPcm(base64ToInt16(data), rate ? Number(rate) : OUT_RATE);
      }
    }
    if (content.turnComplete) {
      const heard = userBuf.replace(/\s+/g, " ").trim();
      const said = asstBuf.replace(/\s+/g, " ").trim();
      userBuf = "";
      asstBuf = "";
      if (!speakerOnly && heard.length > 1) handlers.onUserText?.(heard);
      if (said.length > 1) handlers.onAssistantText?.(said);
      if (!speakerOnly) handlers.onHearing?.(true);
    }
  };

  deliver = handleMessage;
  queued.splice(0).forEach(handleMessage);

  let flushAudio = 0;
  let processor: ScriptProcessorNode | undefined;
  let source: MediaStreamAudioSourceNode | undefined;
  if (!speakerOnly && inputCtx && micStream) {
    source = inputCtx.createMediaStreamSource(micStream);
    const highpass = inputCtx.createBiquadFilter();
    highpass.type = "highpass";
    highpass.frequency.value = 85;
    processor = inputCtx.createScriptProcessor(1024, 1, 1);
    const silent = inputCtx.createGain();
    silent.gain.value = 0;
    processor.onaudioprocess = (event) => {
      if (muted || stopped) return;
      const down = downsample(event.inputBuffer.getChannelData(0), inputCtx.sampleRate, IN_RATE);
      if (!down.length) return;
      const next = floatTo16(down);
      const level = rmsOf(next);
      if (speaking) {
        if (level > 0.08) bargeHits += 1;
        else bargeHits = 0;
        if (bargeHits >= 3) {
          cutSpeech();
          bargeHits = 0;
        }
      }
      const merged = new Int16Array(pending.length + next.length);
      merged.set(pending);
      merged.set(next, pending.length);
      pending = merged;
    };
    source.connect(highpass);
    highpass.connect(processor);
    processor.connect(silent);
    silent.connect(inputCtx.destination);
    flushAudio = window.setInterval(() => {
      if (stopped || muted || !pending.length) return;
      const chunk = pending;
      pending = new Int16Array(0);
      send({
        realtimeInput: {
          audio: { data: int16ToBase64(chunk), mimeType: `audio/pcm;rate=${IN_RATE}` },
        },
      });
    }, 40);
  }

  const onVis = () => {
    if (document.visibilityState === "visible") {
      void inputCtx?.resume();
      void outputCtx.resume();
    }
  };
  document.addEventListener("visibilitychange", onVis);
  if (!speakerOnly) handlers.onHearing?.(true);
  send({
    clientContent: {
      turns: [{ role: "user", parts: [{ text: "Prezantoju me një fjali, pastaj prit." }] }],
      turnComplete: true,
    },
  });

  const cleanup = () => {
    if (stopped) return;
    stopped = true;
    if (flushAudio) window.clearInterval(flushAudio);
    document.removeEventListener("visibilitychange", onVis);
    try {
      processor?.disconnect();
      source?.disconnect();
    } catch {
      /* ignore */
    }
    micStream?.getTracks().forEach((track) => track.stop());
    void inputCtx?.close();
    void outputCtx.close();
    try {
      ws.close();
    } catch {
      /* ignore */
    }
    handlers.onHearing?.(false);
    handlers.onSpeaking?.(false);
    handlers.onClose?.();
  };

  return {
    setLang(next, nextVoice) {
      lang = next;
      if (isVoiceId(nextVoice)) voiceId = nextVoice;
    },
    switchVoice(next) {
      const id = isVoiceId(next) ? next : "leo";
      if (id === voiceId) return;
      voiceId = id;
      if (speaking) cutSpeech();
    },
    setMuted(next) {
      muted = next;
      handlers.onHearing?.(!next);
    },
    sendText(text) {
      if (!text.trim() || stopped) return;
      send({
        clientContent: {
          turns: [{ role: "user", parts: [{ text: text.trim() }] }],
          turnComplete: true,
        },
      });
      if (!speakerOnly) handlers.onUserText?.(text.trim());
    },
    coach(text) {
      if (!text.trim() || stopped) return;
      send({
        clientContent: {
          turns: [{ role: "user", parts: [{ text: text.trim() }] }],
          turnComplete: true,
        },
      });
    },
    interrupt() {
      cutSpeech();
    },
    sendImage(dataUrl) {
      const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/.exec(dataUrl || "");
      if (!match) return;
      send({
        realtimeInput: {
          video: { data: match[2], mimeType: match[1] },
        },
      });
    },
    sendVisionNote(text) {
      if (!text.trim()) return;
      send({
        clientContent: {
          turns: [{ role: "user", parts: [{ text: `Kamera: ${text.trim()}` }] }],
          turnComplete: true,
        },
      });
    },
    async openCamera(facing) {
      const cam = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 720 }, height: { ideal: 960 } },
        audio: false,
      });
      return cam;
    },
    closeCamera() {
      /* frames sent from workspace */
    },
    stop: cleanup,
  };
}
