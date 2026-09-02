import { createFileRoute } from "@tanstack/react-router";
import { PUBLIC_HOST } from "@/lib/site";

function originFrom(request: Request) {
  const forwarded = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? PUBLIC_HOST;
  const host = forwarded.split(",")[0]?.trim().split(":")[0] || PUBLIC_HOST;
  const publicHost = host.endsWith(".grok.me") ? PUBLIC_HOST : host;
  const proto = request.headers.get("x-forwarded-proto") || "https";
  return `${proto}://${publicHost}`;
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: ({ request }) => {
        const origin = originFrom(request);
        const now = new Date().toISOString().slice(0, 10);
        const body = `<?xml version="1.0" encoding="UTF-8"?>
	<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
	        xmlns:xhtml="http://www.w3.org/1999/xhtml"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
  <url>
    <loc>https://www.albanianai.it/</loc>
    <lastmod>${now}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
    <image:image>
      <image:loc>https://www.albanianai.it/albanian-ai-logo.jpg</image:loc>
      <image:title>Albanian AI</image:title>
      <image:caption>Logoja zyrtare e Albanian AI. Asistent shqip, italisht dhe anglisht. Krijuar nga Amarildo Hysa.</image:caption>
      <image:license>https://www.albanianai.it/license</image:license>
    </image:image>
    <image:image>
      <image:loc>https://www.albanianai.it/logo.jpg</image:loc>
      <image:title>Albanian AI logo</image:title>
      <image:caption>Albanian AI — Amarildo Hysa — www.albanianai.it</image:caption>
      <image:license>https://www.albanianai.it/license</image:license>
    </image:image>
  </url>
  <url>
    <loc>https://www.albanianai.it/</loc>
    <lastmod>${now}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
    <xhtml:link rel="alternate" hreflang="sq" href="https://www.albanianai.it/" />
    <xhtml:link rel="alternate" hreflang="it" href="https://www.albanianai.it/" />
    <xhtml:link rel="alternate" hreflang="en" href="https://www.albanianai.it/" />
  </url>
  <url>
    <loc>https://www.albanianai.it/amarildo-hysa</loc>
    <lastmod>${now}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://www.albanianai.it/links</loc>
    <lastmod>${now}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://www.albanianai.it/rreth</loc>
    <lastmod>${now}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://www.albanianai.it/privacy</loc>
    <lastmod>${now}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.95</priority>
  </url>
  <url>
    <loc>https://www.albanianai.it/license</loc>
    <lastmod>${now}</lastmod>
    <changefreq>yearly</changefreq>
    <priority>0.5</priority>
  </url>
  <url>
    <loc>${origin}/app</loc>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${origin}/login</loc>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
</urlset>`;
        return new Response(body, {
          headers: {
            "content-type": "application/xml; charset=utf-8",
            "cache-control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
