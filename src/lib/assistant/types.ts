export type Lang = "sq" | "it" | "en";
export type ChatRole = "user" | "assistant";

export type ConversationRow = {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
};

export type MessageRow = {
  id: string;
  conversation_id: string;
  role: ChatRole;
  content: string;
  created_at: string;
};

export type MemoryRow = {
  id: string;
  user_id: string;
  content: string;
  category: string;
  created_at: string;
  updated_at: string;
};

export type FileRow = {
  id: string;
  user_id: string;
  conversation_id: string | null;
  message_id: string | null;
  file_name: string;
  mime_type: string;
  size: number;
  extracted_text: string | null;
  created_at: string;
};

export type ChatMode = "lite" | "flash" | "pro";

export function parseChatMode(value?: string): ChatMode {
  if (value === "flash" || value === "pro") return value;
  return "lite";
}

export type Prefs = {
  assistantName: string;
  language: Lang;
  theme: "light" | "dark" | "system";
  responseStyle: "concise" | "balanced" | "detailed";
  customInstructions: string;
  memoryEnabled: string;
  voiceEnabled: string;
  voiceId: string;
};

export const DEFAULT_PREFS: Prefs = {
  assistantName: "Albanian AI",
  language: "sq",
  theme: "light",
  responseStyle: "balanced",
  customInstructions:
    "Përgjigju vetëm shqip, italisht ose anglisht. Mos përdor asnjë gjuhë tjetër. Shqipja është e para.",
  memoryEnabled: "true",
  voiceEnabled: "true",
  voiceId: "ilir",
};

export const FIRST_ASSISTANT_MESSAGE = `Përshëndetje, unë jam Albanian AI.`;

export const VOICE_OPTIONS = [
  { id: "ilir", label: "Ilir", gender: "m" as const, plans: ["lite", "flash", "pro"] as ChatMode[] },
] as const;

export type VoiceId = (typeof VOICE_OPTIONS)[number]["id"];

export function isVoiceId(value?: string): value is VoiceId {
  return value === "ilir" || VOICE_OPTIONS.some((item) => item.id === value);
}

export function voicesForMode(_mode: ChatMode | boolean) {
  return [...VOICE_OPTIONS];
}

export function voiceForMode(_voiceId?: string, _mode?: ChatMode | boolean): VoiceId {
  return "ilir";
}

export function voiceName(_voiceId?: string) {
  return "Ilir";
}

export function greetingFor(_voiceId: string | undefined, lang: Lang, _mode?: ChatMode) {
  if (lang === "it") return "Ciao, sono Ilir, Albanian AI.";
  if (lang === "en") return "Hello, I'm Ilir, Albanian AI.";
  return "Përshëndetje, unë jam Ilir, Albanian AI.";
}
