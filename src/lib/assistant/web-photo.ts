import { searchQueryVariants } from "./imagine-detect";

const UA = "AlbanianAI/1.10 (https://www.albanianai.it; image lookup)";

async function getJson(url: string, timeout = 7_000) {
  const res = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": UA },
    signal: AbortSignal.timeout(timeout),
  });
  if (!res.ok) throw new Error(String(res.status));
  return res.json();
}

async function wikimediaUrls(query: string): Promise<string[]> {
  const url =
    "https://commons.wikimedia.org/w/api.php?action=query&format=json&origin=*" +
    "&generator=search&gsrnamespace=6&gsrlimit=6" +
    `&gsrsearch=${encodeURIComponent(query)}` +
    "&prop=imageinfo&iiprop=url|mime|size&iiurlwidth=1024";
  const data = (await getJson(url)) as {
    query?: { pages?: Record<string, { imageinfo?: { thumburl?: string; url?: string }[] }> };
  };
  const out: string[] = [];
  for (const page of Object.values(data.query?.pages ?? {})) {
    const info = page.imageinfo?.[0];
    const src = info?.thumburl || info?.url;
    if (src && !/\.svg($|\?)/i.test(src)) out.push(src);
  }
  return out;
}

async function wikipediaThumb(query: string): Promise<string[]> {
  const slug = query.replace(/ /g, "_");
  const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(slug)}`;
  try {
    const data = (await getJson(url, 6_000)) as { thumbnail?: { source?: string }; originalimage?: { source?: string } };
    return [data.thumbnail?.source, data.originalimage?.source].filter(Boolean) as string[];
  } catch {
    return [];
  }
}

async function openverseUrls(query: string): Promise<string[]> {
  const url = `https://api.openverse.org/v1/images/?q=${encodeURIComponent(query)}&page_size=6`;
  const data = (await getJson(url, 7_000)) as { results?: { url?: string; thumbnail?: string }[] };
  return (data.results ?? [])
    .flatMap((item) => [item.thumbnail, item.url])
    .filter((src): src is string => Boolean(src) && !/\.svg($|\?)/i.test(src));
}

async function downloadPhoto(url: string) {
  const res = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "image/avif,image/webp,image/*,*/*;q=0.8" },
    signal: AbortSignal.timeout(8_000),
    redirect: "follow",
  });
  if (!res.ok) return url.startsWith("https://") ? url : null;
  const mime = (res.headers.get("content-type") || "").split(";")[0].toLowerCase();
  if (mime.includes("svg")) return null;
  if (mime && !mime.startsWith("image/") && mime !== "application/octet-stream") return null;
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.byteLength < 1_500) return null;
  if (buf.byteLength > 1_200_000) return url;
  const kind = mime.startsWith("image/") ? mime : "image/jpeg";
  return `data:${kind};base64,${buf.toString("base64")}`;
}

export async function fetchWebPhoto(userText: string) {
  const queries = searchQueryVariants(userText).slice(0, 2);
  const builders = [wikimediaUrls, wikipediaThumb, openverseUrls];
  for (const query of queries) {
    for (const source of builders) {
      try {
        const urls = await source(query);
        for (const url of urls.slice(0, 4)) {
          if (/\.svg($|\?)/i.test(url)) continue;
          const data = await downloadPhoto(url).catch(() => url);
          if (data) return data;
        }
      } catch (error) {
        console.warn("[web-photo]", query, error);
      }
    }
  }
  return null;
}
