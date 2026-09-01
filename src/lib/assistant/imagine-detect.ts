/** Shared, client-safe: detect “make me a photo” in SQ / IT / EN. */
export function isImageFollowUp(text: string) {
  return /^(ku\s*(esht|është|eshte)?\s*(foto|fotografia|imazhi)?|nuk\s+e\s+(shikoj|shoh|gjej)|s'?e\s+shoh|dove\s*(è|e)?\s*(la\s*)?(foto|immagine)?|non\s+(la\s+)?vedo|where('s| is)?\s*(the\s*)?(photo|image)?|try\s*again|provo\s*(p[eë]rs[eë]ri|persesi|prap[eë]?)|rifresko|again|ancora|un[' ]altra|nje tjeter|një tjetër)\b/i.test(
    text.trim(),
  );
}

export function lastImagePrompt(messages: { role: string; content: string }[]) {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const item = messages[i];
    if (item.role === "user" && wantsGeneratedImage(item.content)) return item.content;
  }
  return null;
}

export function wantsGeneratedImage(text: string) {
  const value = text.trim();
  if (!value) return false;
  return (
    /(gjenero|gjeneroni|krijo|vizato|draw|generate|imagine|crea|fammi|bëj|bej|dëshiroj|deshiroj|dërgo|dergo|tregom|show\s*me).{0,90}(foto|fotografi|imazh|image|photo|pic|picture|immagine|figura|makin)/i.test(
      value,
    ) ||
    /(foto|fotografi|imazh|image|photo|immagine).{0,40}(gjenero|generate|vizato|krijo)/i.test(value) ||
    /(mi|ma|më|me)\s+(gjenero|bëj|bej|krijo|dërgo|dergo).{0,50}(foto|imazh|image|makin|vajz)/i.test(value)
  );
}

export function isImageSubjectReply(text: string) {
  const t = text.trim();
  if (t.length < 2 || t.length > 110) return false;
  return /^(nj[eë]\s+|una?\s+|an?\s+)?(makin\w*|vajz\w*|peizazh\w*|shqiponj\w*|flamur\w*|sht[eë]pi\w*|qytet\w*|det\w*|mal\w*|lule\w*|gru[a]\w*|burr\w*|car|girl|woman|house|sunset|macchina|ragazza|auto)(\s.+)?$/i.test(
    t,
  );
}

export function assistantAskedForImage(messages: { role: string; content: string }[]) {
  const last = [...messages].reverse().find((item) => item.role === "assistant");
  if (!last) return false;
  if (/\[\[AAI_GEN]]|Ja fotoja|Ecco la foto|Here is the image/i.test(last.content)) return false;
  return /(çfarë të vizatoj|cfare te vizatoj|siç e do ti|sic e do ti|peizazh,\s*vajz|what should I (draw|make)|che foto|përshkrim|pershkrim)/i.test(
    last.content,
  );
}

export function imagePromptFrom(text: string) {
  const cleaned = text
    .replace(/\b(te lutem|të lutem|please|per favore|per piacere)\b/gi, " ")
    .replace(/\b(gjenero|gjeneroni|krijo|vizato|draw|generate|imagine|crea|fammi)\b/gi, " ")
    .replace(/\b(më|me)\s+(bëj|bej)\b/gi, " ")
    .replace(/\b(një|nje|una|un[' ]?|an?)\s+(foto|fotografi|imazh|image|photo|pic|picture|immagine|figura)\b/gi, " ")
    .replace(/\b(foto|fotografi|imazh|image|photo|pic|picture|immagine|figura)\b/gi, " ")
    .replace(/^[\s:,-]+/, "")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned.slice(0, 800) || text.trim().slice(0, 800);
}

export function toEnglishVisualPrompt(userText: string) {
  const subject = imagePromptFrom(userText);
  return [
    "Create a photorealistic cinematic photograph of this subject, even if the words are Albanian or Italian.",
    "Read the user's style: realistic photo, cartoon, logo, drawing, landscape, portrait, car, etc. Match that style.",
    "Translate internally: flamur shqiptar = Albanian flag (red cloth, black double-headed eagle); shqiponja dykrenare = double-headed eagle; shqiponja = eagle; malet e Shqiperise = Albanian mountains; perendim dielli = sunset; deti = sea; qytet = city; grua = woman; burre = man; lule = flowers; makin = car; shtepi = house.",
    `Subject: ${subject}.`,
    "Natural lighting, highly detailed, real photography, no watermark, no caption text.",
  ].join(" ");
}

export function englishSearchQuery(userText: string) {
  const STOP = new Set(
    "gjenero gjeneroni krijo vizato generate imagine crea fammi please foto fotografi imazh image photo pic picture immagine figura te të nje një una un me më nje nje of a an the".split(
      " ",
    ),
  );
  let q = imagePromptFrom(userText);
  const pairs: [RegExp, string][] = [
    [/flamur\w*\s+shqiptar\w*/gi, "Flag of Albania"],
    [/flamur\w*/gi, "Albanian flag"],
    [/shqiponj\w*\s+dykrenare/gi, "double-headed eagle"],
    [/shqiponj\w*/gi, "golden eagle"],
    [/dykrenare/gi, "double-headed"],
    [/per[eë]ndim\s+dielli/gi, "sunset"],
    [/shqiptar\w*|shqipr\w*|Shqip[eë]ris[eë]/gi, "Albania"],
    [/makin\w*|makine/gi, "car"],
    [/berlin[ae]/gi, "sedan"],
    [/maleve|malet|malit/gi, "mountains"],
    [/tiran\w*/gi, "Tirana"],
    [/shtëpi\w*|shtepi\w*/gi, "house"],
    [/grua\w*|femër|femer/gi, "woman"],
    [/burrë\w*|burre\w*/gi, "man"],
    [/lule\w*/gi, "flowers"],
    [/deti|detit|\bdet\b/gi, "sea"],
    [/qytet\w*/gi, "city"],
  ];
  for (const [re, en] of pairs) q = q.replace(re, en);
  q = q.replace(/\b(of|te|të|nje|një|una|un|me|më)\b/gi, " ").replace(/\s+/g, " ").trim();
  const keep = (userText.match(/[A-Za-z0-9][A-Za-z0-9.-]{0,24}/g) || []).filter(
    (word) => !STOP.has(word.toLowerCase()) && !/^n[jeë]+$/i.test(word),
  );
  const merged = [...q.split(" "), ...keep].filter(Boolean);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of merged) {
    const key = part.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(part);
  }
  return out.join(" ").trim() || "Albania";
}

export function searchQueryVariants(userText: string) {
  const main = englishSearchQuery(userText);
  const compact = (userText.match(/[A-Za-z0-9]{2,}/g) || [])
    .filter((w) => !/^(gjenero|foto|nje|nje|te|me|una|image|photo)$/i.test(w))
    .join(" ");
  return [...new Set([main, compact, `${main} photo`].filter((item) => item.length > 2))];
}

export function preferWebPhoto(userText: string) {
  return /flamur|flag|logo|stema|portret|wikipedia|tiran|prizren|kosov|real/i.test(userText);
}

export function parseGeneratedImage(content: string) {
  const match = content.match(/\[\[AAI_GEN]]([\s\S]*?)\[\[\/AAI_GEN]]/);
  return {
    image: match?.[1],
    text: content.replace(/\[\[AAI_GEN]][\s\S]*?\[\[\/AAI_GEN]]/g, "").trim(),
  };
}
