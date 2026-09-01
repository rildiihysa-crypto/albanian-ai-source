export const PUBLIC_HOST = "albanianai.it";
export const PUBLIC_SITE = `https://${PUBLIC_HOST}`;
export const PUBLIC_WWW = `https://www.${PUBLIC_HOST}`;

export const CREATOR = {
  name: "Amarildo Hysa",
  age: "23",
  born: "Elbasan",
  birthday: "13.12.2002",
  from: "Belsh",
  based: "Evropë",
  email: "Amarildo.hysa@pecsicura.com",
  pec: "Amarildo.hysa@pecsicura.com",
  instagram: "https://www.instagram.com/r.1ld1",
  tiktok: "https://www.tiktok.com/@accountremoved034",
  youtube: "https://youtube.com/@777productionmusic",
  facebook: "https://www.facebook.com/share/1EBjsAbdeN/",
};

const OWNER_LOGINS = new Set(["amarildohysa2002@gmail.com", CREATOR.email.toLowerCase()]);

export function isOwnerEmail(email?: string | null) {
  return OWNER_LOGINS.has(String(email || "").trim().toLowerCase());
}

export function ideaMailto() {
  const subject = encodeURIComponent("Ide për Albanian AI");
  const body = encodeURIComponent(
    "Përshëndetje Amarildo,\n\nKam një ide / sugjerim për Albanian AI:\n\n",
  );
  return `mailto:${CREATOR.email}?subject=${subject}&body=${body}`;
}
