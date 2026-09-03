import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { generateAssistantReply, publicChatError } from "./chat";
import { generateImageReply, wantsGeneratedImage } from "./imagine";
import { isImageFollowUp, isImageSubjectReply, assistantAskedForImage, lastImagePrompt } from "./imagine-detect";
import * as db from "./db";
import { getSql } from "@/lib/db";
import { CREATOR, isOwnerEmail } from "@/lib/site";
import { todaySpoken } from "./clock";
import { detectLang } from "./lang";
import { DEFAULT_PREFS, parseChatMode, type ChatMode, type ChatRole, type Lang } from "./types";
import { USER_GEMINI_API_KEY, USER_GROQ_API_KEY, USER_XAI_API_KEY, xaiKey, xaiKeys } from "./voice-secret.server";
import { readUsageCounts, usagePrompt } from "./usage.server";
import { closeVoiceBridge, sendVoiceBridge, takeVoiceEvents } from "./voice-bridge.server";
import { transcribeWhisperSq } from "./stt-whisper-sq";

const requestLog = new Map<string, number[]>();
const MAX_CHAT_REQUESTS = 80;
const RATE_WINDOW_MS = 2 * 60 * 1000;

function enforceRateLimit(userId: string) {
  const now = Date.now();
  const recent = (requestLog.get(userId) ?? []).filter((time) => now - time < RATE_WINDOW_MS);
  if (recent.length >= MAX_CHAT_REQUESTS) {
    throw new Error("Prit një moment para se të dërgosh një tjetër mesazh.");
  }
  recent.push(now);
  requestLog.set(userId, recent);
}

async function processExplicitMemory(userId: string, text: string) {
  const remember = text.match(/^(remember(?: this| that)?|mbaje mend|kujto|ricorda(?:ti)?)[\s,:-]+(.+)/i);
  if (remember?.[2]) {
    const content = remember[2].trim().slice(0, 1_000);
    await db.createMemory(userId, content, "owner-request");
    return `Do ta mbaj mend: **${content}**`;
  }
  const forget = text.match(/^(forget(?: this| that)?|harro|fshije|dimentica)[\s,:-]+(.+)/i);
  if (forget?.[2]) {
    const target = forget[2].trim().toLowerCase();
    const all = await db.listMemories(userId);
    const match = all.find(
      (item) => item.content.toLowerCase().includes(target) || target.includes(item.content.toLowerCase()),
    );
    if (match) {
      await db.deleteMemory(userId, match.id);
      return "E fshiva atë memorie.";
    }
    return "Nuk gjeta një memorie që përputhet.";
  }
  if (/^(what do you remember about me|çfarë mban mend për mua|cosa ricordi di me)\??$/i.test(text.trim())) {
    const memoryList = await db.listMemories(userId);
    if (!memoryList.length) {
      return "Nuk kam ende memorie të ruajtura për ty. Thuaj **«Mbaje mend: …»** kur do të ruaj një preferencë.";
    }
    return `Ja çfarë mbaj mend sepse e ke kërkuar ti:\n\n${memoryList.map((item) => `- ${item.content}`).join("\n")}`;
  }
  return null;
}

async function createReply(userId: string, conversationId: string, prompt: string, imageDataUrl?: string, spoken = false, mode: ChatMode = "lite") {
  enforceRateLimit(userId);
  const [conversation, memoryList, settings] = await Promise.all([
    db.getConversation(userId, conversationId),
    db.listMemories(userId),
    db.getSettings(userId),
  ]);
  if (!conversation) throw new Error("Biseda nuk u gjet.");
  if (settings.memoryEnabled !== "false") {
    const special = await processExplicitMemory(userId, prompt);
    if (special) return special;
  }
  if (!imageDataUrl && wantsGeneratedImage(prompt)) {
    return generateImageReply(prompt, settings.language);
  }
  if (!imageDataUrl && isImageFollowUp(prompt)) {
    const prior = lastImagePrompt(conversation.messages);
    if (prior) return generateImageReply(prior, settings.language);
  }
  if (
    !imageDataUrl &&
    assistantAskedForImage(conversation.messages) &&
    isImageSubjectReply(prompt)
  ) {
    const prior = lastImagePrompt(conversation.messages);
    return generateImageReply(prior ? `${prior}. ${prompt}` : prompt, settings.language);
  }
  const fileContext = conversation.files
    .filter((file) => file.extracted_text)
    .slice(0, 5)
    .map((file) => `File: ${file.file_name}\n${file.extracted_text}`)
    .join("\n\n");
  const reply = await generateAssistantReply({
    turns: conversation.messages.map((message) => ({
      role: message.role,
      content: message.content
          .replace(/\[\[AAI_IMG]][\s\S]*?\[\[\/AAI_IMG]]/g, "")
          .replace(/\[\[AAI_GEN]][\s\S]*?\[\[\/AAI_GEN]]/g, "(image shown)")
          .trim() || "Foto",
    })),
    language: settings.language,
    customInstructions: settings.customInstructions,
    memories: settings.memoryEnabled === "false" ? [] : memoryList.map((m) => m.content),
    attachmentContext: fileContext,
    responseStyle: spoken ? "concise" : settings.responseStyle,
    assistantName: settings.assistantName,
    imageDataUrl,
    spoken,
    mode,
  });
  return reply;
}

const GUEST_REPLY_LIMIT = 6;
const guestCounts = new Map<string, number>();

function guestKey(id: string) {
  return String(id || "anon").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 80) || "anon";
}

async function ilirSpeech(text: string, lang?: Lang) {
  const { synthesizeFreeSpeech } = await import("./tts");
  const spoken = lang ?? detectLang(text, "sq");
  return synthesizeFreeSpeech(text, spoken, "ilir");
}

export const liveGenerateImage = createServerFn({ method: "POST" })
  .validator((input: { prompt: string; language?: Lang }) => ({
    prompt: input.prompt.trim().slice(0, 2_000),
    language: input.language ?? "sq",
  }))
  .handler(async ({ data }) => {
    if (!data.prompt) throw new Error("Mungon përshkrimi i fotos.");
    return generateImageReply(data.prompt, data.language);
  });

export const guestReply = createServerFn({ method: "POST" })
  .validator((input: {
    guestId: string;
    content: string;
    turns: { role: ChatRole; content: string }[];
    language?: Lang;
    speak?: boolean;
    imageDataUrl?: string;
    responseStyle?: string;
    customInstructions?: string;
    assistantName?: string;
    mode?: ChatMode;
  }) => {
    const raw = (input && typeof input === "object" && "data" in input && (input as { data?: typeof input }).data)
      ? (input as { data: typeof input }).data
      : input || ({} as typeof input);
    return {
      guestId: guestKey(raw.guestId),
      content: String(raw.content || "").trim().slice(0, 12_000),
      turns: Array.isArray(raw.turns)
        ? raw.turns.slice(-20).map((turn) => ({
            role: turn.role,
            content: String(turn.content || "").slice(0, 8_000),
          }))
        : [],
      language: raw.language ?? "sq",
      speak: Boolean(raw.speak),
      imageDataUrl: String(raw.imageDataUrl || "").startsWith("data:image/")
        ? String(raw.imageDataUrl).slice(0, 700_000)
        : undefined,
      responseStyle: raw.responseStyle === "concise" || raw.responseStyle === "detailed" ? raw.responseStyle : "balanced",
      customInstructions: String(raw.customInstructions || "").slice(0, 2_000),
      assistantName: String(raw.assistantName || "Albanian AI").slice(0, 40),
      mode: parseChatMode(raw.mode),
    };
  })
  .handler(async ({ data }) => {
    try {
      if (!data.content && !data.imageDataUrl) throw new Error("Mesazhi është bosh.");
      const used = guestCounts.get(data.guestId) ?? 0;
      if (used >= GUEST_REPLY_LIMIT) throw new Error("LOGIN_REQUIRED");
      try {
        enforceRateLimit(`guest:${data.guestId}`);
      } catch {
        /* still reply */
      }
      const prompt = data.content || "Çfarë sheh në këtë foto?";
      if (/çfarë? dit|cfar[eë]? dit|what day|che giorno|data e sotme|dit[eë] [eë]?sht[eë] sot/i.test(prompt)) {
        guestCounts.set(data.guestId, used + 1);
        return { response: todaySpoken(data.language), remaining: GUEST_REPLY_LIMIT - used - 1, audioBase64: undefined as string | undefined };
      }
      if (/sa (është|esht|eshte) ora|what time|che ore/i.test(prompt)) {
        guestCounts.set(data.guestId, used + 1);
        const time = new Intl.DateTimeFormat(data.language === "it" ? "it-IT" : data.language === "en" ? "en-GB" : "sq-AL", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
          timeZone: "Europe/Tirane",
        }).format(new Date());
        const reply =
          data.language === "it" ? `Sono le ${time}.` : data.language === "en" ? `It's ${time}.` : `Ora është ${time}.`;
        return { response: reply, remaining: GUEST_REPLY_LIMIT - used - 1, audioBase64: undefined as string | undefined };
      }
      if (/^(përshëndetje|pershendetje|ciao|hello|hi|hey|çkemi|ckemi)[\s!.]*$/i.test(prompt.trim())) {
        guestCounts.set(data.guestId, used + 1);
        const hello =
          data.language === "it"
            ? "Ciao! Sono Albanian AI. Come posso aiutarti?"
            : data.language === "en"
              ? "Hello! I'm Albanian AI. How can I help?"
              : "Përshëndetje! Unë jam Albanian AI. Si mund t'ju ndihmoj?";
        return { response: hello, remaining: GUEST_REPLY_LIMIT - used - 1, audioBase64: undefined as string | undefined };
      }
      const imageAsk =
        !data.imageDataUrl &&
        (wantsGeneratedImage(prompt)
          ? prompt
          : isImageFollowUp(prompt) || (assistantAskedForImage(data.turns) && isImageSubjectReply(prompt))
            ? lastImagePrompt(data.turns) || prompt
            : null);
      const response = imageAsk
        ? await generateImageReply(imageAsk, data.language)
        : await generateAssistantReply({
            turns: [...data.turns, { role: "user", content: prompt }],
            language: data.language,
            memories: [],
            customInstructions: data.customInstructions,
            responseStyle: data.speak ? "concise" : data.responseStyle,
            assistantName: data.assistantName,
            imageDataUrl: data.imageDataUrl,
            spoken: data.speak,
            mode: data.mode,
          });
      guestCounts.set(data.guestId, used + 1);
      return {
        response: response || "Përshëndetje! Stafi i Albanian AI po kryen disa përditësime për të rregulluar disa probleme teknike. Do të rikthehemi shumë shpejt për t'ju ndihmuar. Faleminderit për mirëkuptimin dhe durimin tuaj.",
        remaining: GUEST_REPLY_LIMIT - used - 1,
        audioBase64: undefined as string | undefined,
      };
    } catch (error) {
      if (error instanceof Error && error.message === "LOGIN_REQUIRED") throw error;
      return {
        response: "Përshëndetje! Stafi i Albanian AI po kryen disa përditësime për të rregulluar disa probleme teknike. Do të rikthehemi shumë shpejt për t'ju ndihmuar. Faleminderit për mirëkuptimin dhe durimin tuaj.",
        remaining: 5,
        audioBase64: undefined as string | undefined,
      };
    }
  });

export const importGuestThread = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { messages: { role: ChatRole; content: string }[] }) => ({
    messages: input.messages.slice(0, 20).map((item) => ({
      role: item.role,
      content: item.content.trim().slice(0, 12_000),
    })),
  }))
  .handler(async ({ context, data }) => {
    const usable = data.messages.filter((item) => item.content);
    if (!usable.length) return { imported: false as const };
    const first = usable.find((item) => item.role === "user")?.content || "Bisedë e ruajtur";
    const created = await db.createConversation(context.userId, first.slice(0, 48));
    if (!created) throw new Error("Nuk u ruajt biseda.");
    for (const item of usable) {
      await db.addMessage(created.id, item.role, item.content);
    }
    return { imported: true as const, id: created.id };
  });

export const bootstrapWorkspace = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const [conversations, settings, memories] = await Promise.all([
      db.listConversations(context.userId),
      db.getSettings(context.userId),
      db.listMemories(context.userId),
    ]);
    return { conversations, settings, memories };
  });

export const listConversations = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { search?: string }) => input)
  .handler(async ({ context, data }) => db.listConversations(context.userId, data.search));

export const getConversation = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { id: string }) => input)
  .handler(async ({ context, data }) => db.getConversation(context.userId, data.id));

export const createConversation = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { title?: string } = {}) => input)
  .handler(async ({ context, data }) =>
    db.createConversation(context.userId, data.title?.trim() || "Bisedë e re"),
  );

export const saveLiveTurn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { conversationId?: string; user: string; assistant: string }) => ({
    conversationId: input.conversationId?.trim() || "",
    user: input.user.trim().slice(0, 8_000),
    assistant: input.assistant.trim().slice(0, 12_000),
  }))
  .handler(async ({ context, data }) => {
    let id = data.conversationId || undefined;
    if (id) {
      const existing = await db.getConversation(context.userId, id);
      if (!existing) id = undefined;
    }
    if (!id) {
      const created = await db.createConversation(context.userId, (data.user || "Live Voice").slice(0, 48));
      if (!created) throw new Error("Nuk u ruajt biseda.");
      id = created.id;
    }
    if (data.user) await db.addMessage(id, "user", data.user);
    if (data.assistant) await db.addMessage(id, "assistant", data.assistant);
    return { conversationId: id };
  });

export const seeLiveFrame = createServerFn({ method: "POST" })
  .validator((input: { imageDataUrl: string; language?: string; guestId?: string }) => ({
    imageDataUrl: input.imageDataUrl.startsWith("data:image/") ? input.imageDataUrl.slice(0, 900_000) : "",
    language: input.language === "it" || input.language === "en" ? input.language : "sq",
    guestId: input.guestId || "",
  }))
  .handler(async ({ data }) => {
    if (!data.imageDataUrl) return { seen: "" };
    const { askGeminiVision } = await import("./google-mode.server");
    const prompt =
      data.language === "it"
        ? "Descrivi tutto ciò che vedi: oggetti, testo, marche, cibo, persone, documenti. Sii concreto e breve."
        : data.language === "en"
          ? "Describe everything visible: objects, text, brands, food, people, documents. Be concrete and short."
          : "Përshkruaj gjithçka që shihet: objekte, tekst, marka, ushqim, njerëz, dokumente. Jii konkret dhe i shkurtër.";
    const seen = await askGeminiVision(prompt, data.imageDataUrl, data.language as Lang);
    return { seen: (seen || "").slice(0, 900) };
  });

export const deleteConversation = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { id: string }) => input)
  .handler(async ({ context, data }) => {
    await db.deleteConversation(context.userId, data.id);
    return { success: true as const };
  });

export const sendMessage = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { id: string; content: string; speak?: boolean; imageDataUrl?: string; mode?: ChatMode }) => ({
    id: input.id,
    content: input.content.trim().slice(0, 12_000),
    speak: Boolean(input.speak),
    mode: parseChatMode(input.mode),
    imageDataUrl: input.imageDataUrl?.startsWith("data:image/")
      ? input.imageDataUrl.slice(0, 700_000)
      : undefined,
  }))
  .handler(async ({ context, data }) => {
    if (!data.content && !data.imageDataUrl) throw new Error("Mesazhi është bosh.");
    const current = await db.getConversation(context.userId, data.id);
    if (!current) throw new Error("Biseda nuk u gjet.");
    const stored = data.imageDataUrl
      ? `[[AAI_IMG]]${data.imageDataUrl}[[/AAI_IMG]]${data.content || "Foto"}`
      : data.content;
    const userMessageId = await db.addMessage(data.id, "user", stored);
    await db.maybeRenameFromFirstMessage(context.userId, data.id, data.content || "Foto");
    let response: string;
    try {
      response = await createReply(context.userId, data.id, data.content || "Çfarë sheh në këtë foto?", data.imageDataUrl, data.speak, data.mode);
    } catch (error) {
      response = publicChatError(error);
    }
    const assistantMessageId = await db.addMessage(data.id, "assistant", response);
    return { userMessageId, assistantMessageId, response, audioBase64: undefined as string | undefined };
  });

export const regenerateMessage = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { id: string; mode?: ChatMode }) => ({
    id: input.id,
    mode: parseChatMode(input.mode),
  }))
  .handler(async ({ context, data }) => {
    const current = await db.getConversation(context.userId, data.id);
    if (!current?.messages.length) throw new Error("Nuk ka përgjigje për të rigjeneruar.");
    const lastUser = [...current.messages].reverse().find((message) => message.role === "user");
    if (!lastUser) throw new Error("Nuk ka pyetje për të rigjeneruar.");
    await db.deleteMessagesAfter(data.id, lastUser.created_at);
    const response = await createReply(context.userId, data.id, lastUser.content, undefined, false, data.mode);
    await db.addMessage(data.id, "assistant", response);
    return { response };
  });

export const editUserMessage = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { id: string; messageId: string; content: string; mode?: ChatMode }) => ({
    ...input,
    content: input.content.trim().slice(0, 12_000),
    mode: parseChatMode(input.mode),
  }))
  .handler(async ({ context, data }) => {
    const current = await db.getConversation(context.userId, data.id);
    const message = current?.messages.find((item) => item.id === data.messageId && item.role === "user");
    if (!message) throw new Error("Mesazhi nuk u gjet.");
    await db.replaceMessage(data.messageId, data.content);
    await db.deleteMessagesAfter(data.id, message.created_at);
    const response = await createReply(context.userId, data.id, data.content, undefined, false, data.mode);
    await db.addMessage(data.id, "assistant", response);
    return { response };
  });

export const listMemories = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => db.listMemories(context.userId));

export const addMemory = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { content: string }) => ({ content: input.content.trim().slice(0, 1_000) }))
  .handler(async ({ context, data }) => {
    if (!data.content) throw new Error("Memoria është bosh.");
    await db.createMemory(context.userId, data.content, "manual");
    return { success: true as const };
  });

export const removeMemory = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { id: string }) => input)
  .handler(async ({ context, data }) => {
    await db.deleteMemory(context.userId, data.id);
    return { success: true as const };
  });

export const clearAllMemories = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await db.clearMemories(context.userId);
    return { success: true as const };
  });

export const savePreferences = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { values: Record<string, string> }) => input)
  .handler(async ({ context, data }) => {
    const allowed = new Set(Object.keys(DEFAULT_PREFS));
    const safe = Object.fromEntries(Object.entries(data.values).filter(([key]) => allowed.has(key)));
    safe.assistantName = "Albanian AI";
    await db.saveSettings(context.userId, safe);
    return { success: true as const };
  });

export const uploadTextFile = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { conversationId: string; fileName: string; mimeType: string; text: string }) => input)
  .handler(async ({ context, data }) => {
    const conversation = await db.getConversation(context.userId, data.conversationId);
    if (!conversation) throw new Error("Biseda nuk u gjet.");
    const extracted = data.text.replace(/\u0000/g, "").slice(0, 18_000);
    return db.createFile({
      userId: context.userId,
      conversationId: data.conversationId,
      fileName: data.fileName.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 120) || "upload",
      mimeType: data.mimeType || "text/plain",
      size: extracted.length,
      extractedText: extracted,
    });
  });

export const exportMyData = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => db.exportPersonalData(context.userId));

function whisperLang(lang?: Lang) {
  if (lang === "it") return "it";
  if (lang === "en") return "en";
  return "sq";
}

function sttPrompt(lang?: Lang) {
  if (lang === "it") return "Trascrizione italiana fedele, parole esatte.";
  if (lang === "en") return "Exact English transcription of the speaker.";
  return "Transcribe ONLY spoken Albanian (shqip), exactly as spoken, using Latin letters and ë, ç. Do not invent words, translate, summarize, or answer. Keep the full phrase and normal spaces. Common: Përshëndetje. Si je. Faleminderit. Unë. Ti. Çfarë. Po. Jo. Mirë. Ju lutem. Si quhesh. Çfarë bën. Never Cyrillic. Never Japanese. Never 1-3 random letters.";
}

function mapCommonSq(text: string) {
  const t = text.trim();
  const lower = t.toLowerCase().replace(/[.,!?]/g, "").trim();
  const exact: Record<string, string> = {
    cn: "Si je",
    "cn.": "Si je",
    cne: "Si je",
    "see yeah": "Si je",
    siyeah: "Si je",
    "see ya": "Si je",
    "si je": "Si je",
    "si je?": "Si je?",
    po: "Po",
    jo: "Jo",
    ok: "Ok",
    "faleminderit": "Faleminderit",
    flm: "Faleminderit",
    une: "Unë",
    "unë": "Unë",
    mire: "Mirë",
    "mirë": "Mirë",
    cfare: "Çfarë",
    "çfarë": "Çfarë",
    pershendetje: "Përshëndetje",
    "përshëndetje": "Përshëndetje",
  };
  if (exact[lower]) return exact[lower];
  if (/почин|peschand|persend|pochin/i.test(t)) return "Përshëndetje";
  if (/^si\s*j/i.test(t) && t.length < 12) return "Si je";
  return t;
}

function looksGarbled(text: string, lang?: Lang) {
  const t = text.trim();
  if (!t) return true;
  if (/[\u0400-\u04FF]/.test(t)) return true;
  if (/peschand|pochin|persend|почин|japonez/i.test(t)) return true;
  if (/^[A-Za-z]{1,4}\.?$/.test(t) && !/^(po|jo|si|ok|hi)$/i.test(t)) return true;
  if (lang === "sq" && /\b(si je|përshëndetje|pershendetje|faleminderit|unë|une|mirë|mire|çfarë|cfare|ju lutem|po|jo)\b/i.test(t)) {
    return false;
  }
  if (lang === "sq" && /[ëçËÇ]/.test(t)) return false;
  if (lang === "sq" && !/[ëçËÇaeiouy]/i.test(t)) return true;
  return false;
}

async function toCleanSpeech(apiKey: string, text: string, lang?: Lang) {
  const spoken = lang === "it" ? "Italian" : lang === "en" ? "English" : "Albanian (shqip, Latin letters ë ç)";
  const mapped = lang === "sq" ? mapCommonSq(text) : text.trim();
  const res = await fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.GROK_FAST_MODEL?.trim() || "grok-4.20-0309-non-reasoning",
      temperature: 0,
      max_tokens: 120,
      messages: [
        {
          role: "system",
          content: `You turn broken speech-to-text into natural ${spoken} the speaker meant.
Output ONLY the corrected phrase. No quotes. No extra words. No emoji names.
Albanian: Cn/Cne/See yeah → Si je. Peschandetti/Почините/Persendetie → Përshëndetje. Flm → Faleminderit. Cfare → Çfarë. Une → Unë. Mire → Mirë.
Never Cyrillic, Japanese, German, Russian. If the audio STT is nonsense, pick the closest everyday Albanian greeting or question.
This clean text will be given to Albanian AI / Ilir to answer.`,
        },
        { role: "user", content: mapped.slice(0, 400) },
      ],
    }),
    signal: AbortSignal.timeout(8_000),
  });
  if (!res.ok) return mapped;
  const body = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const fixed = body.choices?.[0]?.message?.content?.trim().replace(/^["']|["']$/g, "");
  if (!fixed || /[\u0400-\u04FF]/.test(fixed) || /^[A-Za-z]{1,3}\.?$/.test(fixed)) return mapped;
  return fixed;
}

async function sttGemini(bytes: Buffer, mime: string, lang?: Lang) {
  const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY || USER_GEMINI_API_KEY;
  if (!key) return "";
  const spoken =
    lang === "it" ? "Italian" : lang === "en" ? "English" : "Albanian (shqip, Latin letters ë ç)";
  const audioMime = mime.includes("wav")
    ? "audio/wav"
    : mime.includes("mpeg") || mime.includes("mp3")
      ? "audio/mp3"
      : mime.includes("ogg")
        ? "audio/ogg"
        : mime.includes("webm")
          ? "audio/webm"
          : "audio/aac";
  const models = ["gemini-3.6-flash", "gemini-2.0-flash"];
  const prompt =
    lang === "sq"
      ? "Transcribe ONLY the spoken Albanian. Latin letters with ë and ç. Output the exact words. No quotes, no translation, no extra text. If it is a greeting: Përshëndetje, Si je, Faleminderit, Po, Jo."
      : `Transcribe ONLY the spoken ${spoken}. Output the exact words. No quotes. No extra text.`;
  for (const model of models) {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt },
                { inlineData: { mimeType: audioMime, data: bytes.toString("base64") } },
              ],
            },
          ],
          generationConfig: { temperature: 0, maxOutputTokens: 200 },
        }),
        signal: AbortSignal.timeout(20_000),
      },
    );
    if (!res.ok) {
      const err = await res.text().catch(() => "");
      console.warn("[STT Gemini]", model, res.status, err.slice(0, 180));
      continue;
    }
    const body = (await res.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const text = body.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join(" ").trim() || "";
    if (text) return text.replace(/^["']|["']$/g, "").trim();
  }
  return "";
}

async function sttGroq(bytes: Buffer, mime: string, ext: string, lang?: Lang) {
  const key = process.env.GROQ_API_KEY || USER_GROQ_API_KEY;
  if (!key) return "";
  const form = new FormData();
  form.append("file", new Blob([new Uint8Array(bytes)], { type: mime }), `speech.${ext}`);
  form.append("model", "whisper-large-v3");
  form.append("language", whisperLang(lang));
  form.append("response_format", "json");
  const res = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}` },
    body: form,
    signal: AbortSignal.timeout(18_000),
  });
  if (!res.ok) return "";
  const body = (await res.json()) as { text?: string };
  return body.text?.trim() || "";
}

async function sttWhisperPublic(bytes: Buffer, mime: string) {
  const token = process.env.HF_TOKEN || process.env.HUGGINGFACE_API_KEY;
  const res = await fetch("https://api-inference.huggingface.co/models/openai/whisper-large-v3", {
    method: "POST",
    headers: {
      "Content-Type": mime.includes("mp4") || mime.includes("m4a") || mime.includes("aac") ? "audio/mp4" : mime || "audio/wav",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: new Uint8Array(bytes),
    signal: AbortSignal.timeout(22_000),
  });
  if (!res.ok) return "";
  const body = (await res.json()) as { text?: string } | { text?: string }[] | string;
  if (typeof body === "string") return body.trim();
  if (Array.isArray(body)) return body[0]?.text?.trim() || "";
  return body.text?.trim() || "";
}

async function sttXai(apiKey: string, bytes: Buffer, mime: string, ext: string, lang?: Lang) {
  const form = new FormData();
  form.append("file", new Blob([new Uint8Array(bytes)], { type: mime }), `speech.${ext}`);
  form.append("language", whisperLang(lang));
  form.append("prompt", sttPrompt(lang));
  form.append("temperature", "0");
  const res = await fetch("https://api.x.ai/v1/stt", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) return "";
  const body = (await res.json()) as { text?: string };
  return body.text?.trim() || "";
}

export const transcribeSpeech = createServerFn({ method: "POST" })
  .validator((input: { audioBase64: string; mimeType?: string; lang?: Lang; guestId?: string }) => ({
    audioBase64: input.audioBase64.slice(0, 3_500_000),
    mimeType: input.mimeType || "audio/webm",
    lang: input.lang,
    guestId: input.guestId ? guestKey(input.guestId) : "anon",
  }))
  .handler(async ({ data }) => {
    try {
      enforceRateLimit(`stt:${data.guestId}`);
    } catch {
      /* live chat must keep listening */
    }
    const apiKey = xaiKey();
    const bytes = Buffer.from(data.audioBase64, "base64");
    if (bytes.length < 400) throw new Error("Nuk dëgjova asgjë. Prek PARLA dhe fol më afër.");
    const ext = data.mimeType.includes("wav")
      ? "wav"
      : data.mimeType.includes("mp4") || data.mimeType.includes("aac") || data.mimeType.includes("m4a")
      ? "m4a"
      : data.mimeType.includes("ogg")
        ? "ogg"
        : data.mimeType.includes("mpeg") || data.mimeType.includes("mp3")
          ? "mp3"
          : "webm";
    const lang = data.lang === "it" || data.lang === "en" ? data.lang : "sq";
    if (lang !== "sq" && !apiKey) throw new Error("Dëgjimi me zë nuk është i disponueshëm tani.");
    // Albanian live listening is server-side Whisper first; never use browser Safari STT.
    let text = lang === "sq"
      ? await transcribeWhisperSq(bytes, data.mimeType, ext).catch((error) => {
          console.warn("[STT Whisper SQ]", error);
          return "";
        })
      : (await sttGemini(bytes, data.mimeType, lang).catch((error) => {
          console.warn("[STT Gemini]", error);
          return "";
        })) || "";
    if ((!text || looksGarbled(text, lang)) && lang !== "sq") {
      const groq = await sttGroq(bytes, data.mimeType, ext, lang).catch(() => "");
      if (groq && !looksGarbled(groq, lang)) text = groq;
      else if (!text && groq) text = groq;
    }
    if ((!text || looksGarbled(text, lang)) && lang !== "sq") {
      const xai = await sttXai(apiKey, bytes, data.mimeType, ext, lang).catch(() => "");
      if (xai && !looksGarbled(xai, lang)) text = xai;
      else if (!text && xai) text = xai;
    }
    if (!text) throw new Error("Nuk dëgjova fjalë. Fol më qartë dhe prek PARLA përsëri.");
    const first = lang === "sq" ? mapCommonSq(text) : text;
    const clean = looksGarbled(first, lang)
      ? (await toCleanSpeech(apiKey, first, lang).catch(() => first)).trim()
      : first;
    if (!clean || (/^[A-Za-z]{1,4}\.?$/.test(clean) && !/^(po|jo|si|ok|hi)$/i.test(clean))) {
      throw new Error("Nuk të kuptova. Fol përsëri.");
    }
    return { text: clean };
  });

export const speakText = createServerFn({ method: "POST" })
  .validator((input: { text: string; lang?: Lang; voiceId?: string; guestId?: string; chunkIndex?: number; google?: boolean; speechgen?: boolean }) => ({
    text: input.text.slice(0, 12_000),
    lang: input.lang,
    voiceId: input.voiceId,
    guestId: input.guestId ? guestKey(input.guestId) : "anon",
    chunkIndex: Math.max(0, Math.min(20, Number(input.chunkIndex) || 0)),
    google: Boolean(input.google),
    speechgen: Boolean(input.speechgen),
  }))
  .handler(async ({ data }) => {
    const { synthesizeSpeechChunk } = await import("./tts");
    const lang = data.lang ?? detectLang(data.text, "sq");
    const result = await synthesizeSpeechChunk(data.text, lang, data.voiceId, data.chunkIndex, data.google, data.speechgen);
    return { ...result, lang };
  });

export const createVoiceSession = createServerFn({ method: "POST" })
  .validator((input: { guestId?: string; apiKey?: string; forceXai?: boolean; pro?: boolean } = {}) => ({
    guestId: input.guestId ? guestKey(input.guestId) : "anon",
    apiKey: input.apiKey?.trim() || "",
    forceXai: Boolean(input.forceXai),
    pro: Boolean(input.pro),
  }))
  .handler(async ({ data }) => {
    try {
      enforceRateLimit(`voice:${data.guestId}`);
    } catch {
      /* still try to connect */
    }
    let usage = "";
    try {
      usage = usagePrompt(await readUsageCounts());
    } catch {
      usage = "";
    }
    const keys = xaiKeys();
    let lastError = "Live Voice nuk u lidh.";
    for (const apiKey of keys) {
      try {
        const res = await fetch("https://api.x.ai/v1/realtime/client_secrets", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ expires_after: { seconds: 1_800 } }),
        });
        const body = (await res.json().catch(() => ({}))) as { value?: string; error?: { message?: string } | string };
        if (!res.ok) {
          lastError = typeof body.error === "string" ? body.error : body.error?.message || `Live Voice (${res.status})`;
          continue;
        }
        const token = body.value?.trim();
        if (!token) continue;
        return {
          provider: "xai" as const,
          token,
          value: token,
          clientSecret: token,
          agentId: "",
          hosted: false,
          usage,
          geminiKey: "",
        };
      } catch (error) {
        lastError = error instanceof Error ? error.message : lastError;
      }
    }
    return {
      provider: "xai" as const,
      token: "",
      value: "",
      clientSecret: "",
      agentId: "",
      hosted: false,
      usage,
      geminiKey: "",
      error: lastError,
    };
  });

export const pushVoiceEvent = createServerFn({ method: "POST" })
  .validator((input: { sessionId: string; payload: unknown }) => input)
  .handler(async ({ data }) => {
    sendVoiceBridge(data.sessionId, data.payload);
    return { ok: true as const };
  });

export const pollVoiceEvents = createServerFn({ method: "POST" })
  .validator((input: { sessionId: string }) => input)
  .handler(async ({ data }) => {
    const events = await takeVoiceEvents(data.sessionId);
    return {
      events: events.map((event) => ({
        type: event.type,
        delta: event.delta,
        transcript: event.transcript,
        error: event.error,
      })),
    };
  });

export const endVoiceSession = createServerFn({ method: "POST" })
  .validator((input: { sessionId: string }) => input)
  .handler(async ({ data }) => {
    closeVoiceBridge(data.sessionId);
    return { ok: true as const };
  });

export type UsageStats = {
  users: number;
  week: number;
  google: number;
  conversations: number;
  messages: number;
  owner: boolean;
};

const EMPTY_USAGE: UsageStats = {
  users: 0,
  week: 0,
  google: 0,
  conversations: 0,
  messages: 0,
  owner: false,
};

export const getOwnerUsage = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    try {
      const sql = await getSql();
      const me = await sql.query<{ email: string }>(`select email from "user" where id = $1 limit 1`, [
        context.userId,
      ]);
      if (!isOwnerEmail(me[0]?.email)) return EMPTY_USAGE;
      const counts = await readUsageCounts();
      let google = 0;
      try {
        const rows = await sql.query<{ n: number }>(`select count(*)::int as n from "account" where "providerId" = 'google'`);
        google = Number(rows[0]?.n ?? 0);
      } catch {
        google = 0;
      }
      return { ...counts, google, owner: true };
    } catch (error) {
      console.warn("[stats]", error);
      return EMPTY_USAGE;
    }
  });
