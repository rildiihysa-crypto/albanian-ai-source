import type { Lang } from "./types";

/**
 * Live-listen contract: the workspace owns microphone capture and VAD, then
 * sends one WAV segment after silence to transcribeSpeech (server-side Whisper).
 * Browser SpeechRecognition is intentionally not part of the Albanian path.
 */
export const WHISPER_LIVE_PIPELINE = "microphone → VAD silence → /server transcribeSpeech → brain → /api/speak (Ilir)" as const;
export function isWhisperLiveLanguage(lang: Lang) { return lang === "sq"; }
export function shouldRestartWhisperLive(handsFree: boolean, speaking: boolean) { return handsFree && !speaking; }
