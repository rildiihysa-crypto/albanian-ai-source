/** Server-only. Do not import from client components. */
export const USER_XAI_API_KEY =
  process.env.XAI_USER_API_KEY ||
  "xai-REDACTED";

const BAKED_XAI_API_KEY =
  "xai-REDACTED";

const DEAD_XAI = new Set([
  "xai-REDACTED",
]);

export function xaiKeys() {
  const seen = new Set<string>();
  const keys: string[] = [];
  for (const key of [USER_XAI_API_KEY, BAKED_XAI_API_KEY, process.env.XAI_API_KEY, process.env.GROK_API_KEY]) {
    if (key && key.length > 20 && !seen.has(key) && !DEAD_XAI.has(key)) {
      seen.add(key);
      keys.push(key);
    }
  }
  if (!keys.length && BAKED_XAI_API_KEY) keys.push(BAKED_XAI_API_KEY);
  return keys;
}

export function xaiKey() {
  return xaiKeys()[0] || "";
}

export const USER_GROQ_API_KEY =
  process.env.GROQ_API_KEY ||
  "gsk_REDACTED";

export const USER_GEMINI_API_KEY =
  process.env.GEMINI_API_KEY ||
  process.env.GOOGLE_AI_API_KEY ||
  "AQ.REDACTED";

export const USER_SPEECHGEN_TOKEN = process.env.SPEECHGEN_TOKEN || "";
export const USER_SPEECHGEN_EMAIL = process.env.SPEECHGEN_EMAIL || "";
export const USER_CAMB_API_KEY = process.env.CAMB_API_KEY || "CAMB_REDACTED";
