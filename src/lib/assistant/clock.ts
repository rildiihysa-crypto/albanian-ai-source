export function clockNow() {
  const fmt = new Intl.DateTimeFormat("sq-AL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Tirane",
  });
  return `SOT (ora e Shqipërisë): ${fmt.format(new Date())}. If they ask what day/date/time it is, answer immediately with this. Never say you do not know today's date.`;
}

export function todaySpoken(lang: "sq" | "it" | "en" = "sq") {
  const now = new Date();
  if (lang === "it") {
    const fmt = new Intl.DateTimeFormat("it-IT", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "Europe/Tirane",
    });
    return `Oggi è ${fmt.format(now)}.`;
  }
  if (lang === "en") {
    const fmt = new Intl.DateTimeFormat("en-GB", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "Europe/Tirane",
    });
    return `Today is ${fmt.format(now)}.`;
  }
  const fmt = new Intl.DateTimeFormat("sq-AL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Tirane",
  });
  return `Sot është ${fmt.format(now)}.`;
}
