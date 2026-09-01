import { pipeline, env } from "@huggingface/transformers";

env.allowLocalModels = false;
env.useBrowserCache = true;

let transcriberPromise: Promise<any> | undefined;
let loading = false;

/** Free, private Albanian STT: inference happens on the user's device. */
export async function transcribeLocalWhisper(audio: Blob, onStatus?: (status: string) => void) {
  if (typeof window === "undefined") return "";
  onStatus?.("Po përgatit dëgjimin shqip…");
  const AudioCtx = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) throw new Error("AudioContext nuk mbështetet në këtë browser.");
  const ctx = new AudioCtx();
  try {
    const pcm = await ctx.decodeAudioData(await audio.arrayBuffer());
    const mono = pcm.numberOfChannels === 1 ? pcm.getChannelData(0) : mixToMono(pcm);
    const target = resample(mono, pcm.sampleRate, 16_000);
    if (!transcriberPromise) {
      loading = true;
      transcriberPromise = pipeline(
        "automatic-speech-recognition",
        "onnx-community/whisper-tiny",
        { device: "wasm", dtype: "q8" } as any,
      ).finally(() => { loading = false; });
    }
    if (loading) onStatus?.("Modeli falas po shkarkohet një herë…");
    const transcriber = await transcriberPromise;
    onStatus?.("Po kuptoj shqipen…");
    const result = await transcriber(target, { language: "sq", task: "transcribe", return_timestamps: false });
    return String(result?.text || "").replace(/\s+/g, " ").trim();
  } finally {
    await ctx.close().catch(() => undefined);
  }
}

function mixToMono(buffer: AudioBuffer) {
  const out = new Float32Array(buffer.length);
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    const data = buffer.getChannelData(c);
    for (let i = 0; i < out.length; i++) out[i] += data[i] / buffer.numberOfChannels;
  }
  return out;
}
function resample(input: Float32Array, from: number, to: number) {
  if (from === to) return input;
  const out = new Float32Array(Math.round(input.length * to / from));
  for (let i = 0; i < out.length; i++) {
    const pos = i * from / to; const left = Math.floor(pos); const right = Math.min(left + 1, input.length - 1);
    out[i] = input[left] * (1 - (pos - left)) + input[right] * (pos - left);
  }
  return out;
}
