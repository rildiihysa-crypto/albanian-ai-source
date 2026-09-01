const KEY = "albanian-ai-accounts";

export type SavedAccount = {
  email: string;
  name: string;
  initial: string;
  at: number;
};

function read(): SavedAccount[] {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "[]") as SavedAccount[];
    return Array.isArray(raw) ? raw.filter((item) => item?.email) : [];
  } catch {
    return [];
  }
}

export function listAccounts(): SavedAccount[] {
  return read().sort((a, b) => b.at - a.at).slice(0, 8);
}

export function rememberAccount(input: { email?: string | null; name?: string | null }) {
  const email = (input.email || "").trim().toLowerCase();
  if (!email || email === "dev@example.com") return;
  const name = (input.name || email.split("@")[0] || "Llogari").trim();
  const next: SavedAccount = {
    email,
    name,
    initial: name.slice(0, 1).toUpperCase(),
    at: Date.now(),
  };
  const others = read().filter((item) => item.email !== email);
  localStorage.setItem(KEY, JSON.stringify([next, ...others].slice(0, 8)));
}

export function forgetAccount(email: string) {
  localStorage.setItem(
    KEY,
    JSON.stringify(read().filter((item) => item.email !== email.toLowerCase())),
  );
}

export const AVATAR_COLORS = ["#34a853", "#a142f4", "#1a73e8", "#e37400", "#d93025"];
