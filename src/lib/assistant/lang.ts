import type { Lang } from "./types";

export function detectLang(text: string, fallback: Lang): Lang {
  const sample = text.slice(0, 500);
  if (/[\u0400-\u04FF]/.test(sample)) return "sq";
  const lower = sample.toLowerCase();
  const count = (re: RegExp) => (lower.match(re) || []).length;
  const sq = count(
    /\b(në|për|është|dhe|një|unë|ju|kjo|sepse|shumë|mund|si|me|nga|ose|por|jam|ke|të|që|pershendetje|përshëndetje|faleminderit|mirë|çfarë)\b/g,
  );
  const it = count(
    /\b(il|la|gli|che|non|sono|ciao|grazie|per|una|questo|della|come|molto|siamo|vorrei|buongiorno)\b/g,
  );
  const en = count(
    /\b(the|and|you|this|that|with|have|from|your|what|please|could|would|hello)\b/g,
  );
  const max = Math.max(sq, it, en);
  if (max < 2) return fallback === "it" || fallback === "en" ? fallback : "sq";
  if (sq === max) return "sq";
  if (it === max) return "it";
  return "en";
}
