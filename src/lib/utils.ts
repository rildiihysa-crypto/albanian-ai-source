import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function titleFromText(text: string) {
  const clean = text
    .replace(/\[\[AAI_IMG]][\s\S]*?\[\[\/AAI_IMG]]/g, "")
    .replace(/\[\[AAI_GEN]][\s\S]*?\[\[\/AAI_GEN]]/g, "")
    .replace(/[^\p{L}\p{N}\p{P}\p{Zs}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
  return clean.length > 42 ? `${clean.slice(0, 40).trim()}…` : clean || "Bisedë e re";
}
