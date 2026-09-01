import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { AuthProvider } from "@/lib/auth/provider";
import { PreviewHostBridge } from "@/components/preview-host-bridge";
import { AppUpdate } from "@/components/app-update";
import { Toaster } from "sonner";
import appCss from "../styles.css?url";
import { PUBLIC_SITE, CREATOR } from "@/lib/site";

const APP_NAME = "Albanian AI";

export const Route = createRootRoute({
  errorComponent: () => (
    <div className="gate">
      <div className="gate-body">
        <img src="/logo-192.jpg" alt="Albanian AI" />
        <h1>Albanian AI</h1>
        <p>Diçka u bllokua. Hap sërish app-in.</p>
        <a className="signin-button" href="/app" style={{ display: "flex", textDecoration: "none" }}>
          Hap Albanian AI
        </a>
      </div>
    </div>
  ),
  notFoundComponent: () => (
    <div className="gate">
      <div className="gate-body">
        <img src="/logo-192.jpg" alt="Albanian AI" />
        <h1>Albanian AI</h1>
        <p>Faqja u hap. Shtoje në ekran ose hape app-in.</p>
        <a className="signin-button" href="/app" style={{ display: "flex", textDecoration: "none" }}>
          Hap Albanian AI
        </a>
      </div>
    </div>
  ),
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover, user-scalable=no",
      },
      { title: "Albanian AI | Asistent shqip, italisht dhe anglisht" },
      { name: "theme-color", content: "#A7192E" },
      {
        name: "description",
        content:
          "Albanian AI është asistent inteligjent falas në shqip, italisht dhe anglisht. Zë live, foto, kamera. Krijuar nga Amarildo Hysa. www.albanianai.it",
      },
      {
        name: "keywords",
        content:
          "Albanian AI, albanianai.it, AI shqip, asistent shqip, chatbot shqip, inteligjencë artificiale shqip, Amarildo Hysa, AI italiano albanese",
      },
      { name: "robots", content: "index,follow,max-image-preview:large" },
      { name: "googlebot", content: "index,follow" },
      { property: "og:title", content: "Albanian AI" },
      {
        property: "og:description",
        content: "Asistent privat me zë live falas në shqip, italisht dhe anglisht. Krijuar nga Amarildo Hysa.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: PUBLIC_SITE },
      { property: "og:site_name", content: "Albanian AI" },
      { property: "og:image", content: `${PUBLIC_SITE}/albanian-ai-logo.jpg` },
      { property: "og:image:alt", content: "Albanian AI — logoja zyrtare, shqiponja dykrenare, krijuar nga Amarildo Hysa" },
      { property: "og:image:type", content: "image/jpeg" },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { property: "og:locale", content: "sq_AL" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Albanian AI" },
      { name: "twitter:url", content: PUBLIC_SITE },
      { name: "twitter:image", content: `${PUBLIC_SITE}/albanian-ai-logo.jpg` },
      { name: "twitter:image:alt", content: "Albanian AI logo — Amarildo Hysa" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "apple-mobile-web-app-title", content: APP_NAME },
      { name: "application-name", content: APP_NAME },
      { name: "author", content: "Amarildo Hysa" },
      { name: "format-detection", content: "telephone=no" },
    ],
    links: [
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "preload", href: "/logo-192.jpg", as: "image" },
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/logo-192.jpg" },
      { rel: "canonical", href: PUBLIC_SITE },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Figtree:wght@500;600;700&family=Fraunces:wght@600&display=swap",
      },
    ],
  }),
  component: () => (
    <html lang="sq" suppressHydrationWarning>
      <head>
        <HeadContent />
        <link rel="stylesheet" href="/app.css" />
        <style
          dangerouslySetInnerHTML={{
            __html: `html,body{margin:0;background:#050505;color:#f4f4f4;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif}
.gate{min-height:100svh;background:#050505;color:#f4f4f4;display:grid;place-items:center;position:relative;overflow:hidden;padding:max(16px,env(safe-area-inset-top)) 24px max(24px,env(safe-area-inset-bottom))}
.gate-bg{position:absolute;inset:-10%;background:url(/chat-bg.jpg) 50% 42%/cover no-repeat;opacity:.34;pointer-events:none}
.gate-shade{position:absolute;inset:0;background:radial-gradient(ellipse at 50% 42%,#0000 0%,#050505e8 72%);pointer-events:none}
.gate-body{position:relative;z-index:1;text-align:center;display:flex;flex-direction:column;align-items:center;gap:14px}
.gate-body img{width:96px;height:96px;border-radius:24px;object-fit:cover}
.gate-body h1{font-size:36px;margin:8px 0 0}
.gate-body p{margin:0;color:#bdbdbd}
.gate-body button,.download-cta{width:min(280px,100%);height:52px;border:0;border-radius:16px;background:#a7192e;color:#fff;font-size:17px;font-weight:700}
.gate-install{text-align:left;background:#ffffff12;border:1px solid #ffffff22;border-radius:16px;width:min(360px,100%);margin:8px auto 0;padding:14px 16px}
.gate-install ol{margin:0;padding-left:18px;line-height:1.7}
.gate-social{display:flex;flex-wrap:wrap;justify-content:center;gap:8px;margin-top:8px}
a.download-open{color:#fff;font-weight:700;text-decoration:none;margin-top:12px}
.gate-seo{max-width:22em;color:#777;font-size:12px}`,
          }}
        />
      </head>
      <body>
        <PreviewHostBridge />
        <AuthProvider>
          <Outlet />
        </AuthProvider>
        <AppUpdate />
        <Toaster position="top-center" richColors />
        <Scripts />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@graph": [
                {
                  "@type": "WebSite",
                  name: "Albanian AI",
                  url: PUBLIC_SITE,
                  inLanguage: ["sq", "it", "en"],
                  description:
                    "Albanian AI është asistent inteligjent falas në shqip, italisht dhe anglisht. Krijuar nga Amarildo Hysa.",
                },
                {
                  "@type": "SoftwareApplication",
                  name: "Albanian AI",
                  url: PUBLIC_SITE,
                  applicationCategory: "LifestyleApplication",
                  operatingSystem: "iOS, Android, Web",
                  inLanguage: ["sq", "it", "en"],
                  image: `${PUBLIC_SITE}/albanian-ai-logo.jpg`,
                  logo: `${PUBLIC_SITE}/logo.jpg`,
                  screenshot: `${PUBLIC_SITE}/albanian-ai-logo.jpg`,
                  description:
                    "Asistent privat falas me zë live, foto dhe kamerë në shqip, italisht dhe anglisht. Krijuar nga Amarildo Hysa.",
                  author: { "@type": "Person", name: CREATOR.name, email: CREATOR.email },
                  offers: { "@type": "Offer", price: "0", priceCurrency: "EUR" },
                  featureList: [
                    "Live voice Albanian Italian English",
                    "Chat",
                    "Image generation",
                    "Live camera",
                    "Private Google or email accounts",
                  ],
                },
                {
                  "@type": "ImageObject",
                  "@id": `${PUBLIC_SITE}/albanian-ai-logo.jpg`,
                  name: "Albanian AI",
                  caption: "Logoja zyrtare e Albanian AI — shqiponja dykrenare. Krijuar nga Amarildo Hysa. www.albanianai.it",
                  contentUrl: `${PUBLIC_SITE}/albanian-ai-logo.jpg`,
                  url: `${PUBLIC_SITE}/albanian-ai-logo.jpg`,
                  encodingFormat: "image/jpeg",
                  width: 1200,
                  height: 630,
                  creator: { "@type": "Person", name: CREATOR.name },
                  copyrightHolder: { "@type": "Person", name: CREATOR.name },
                  creditText: "Amarildo Hysa / Albanian AI",
                  acquireLicensePage: PUBLIC_SITE,
                },
                {
                  "@type": "Person",
                  name: CREATOR.name,
                  email: CREATOR.email,
                  birthPlace: CREATOR.born,
                  homeLocation: `${CREATOR.from}, ${CREATOR.based}`,
                  url: `${PUBLIC_SITE}/amarildo-hysa`,
                  sameAs: [CREATOR.instagram, CREATOR.facebook, CREATOR.tiktok, CREATOR.youtube],
                },
                {
                  "@type": "FAQPage",
                  mainEntity: [
                    {
                      "@type": "Question",
                      name: "Çfarë është Albanian AI?",
                      acceptedAnswer: {
                        "@type": "Answer",
                        text: "Albanian AI është asistent inteligjent falas në shqip, italisht dhe anglisht, me zë live, foto dhe kamerë. Faqja zyrtare është www.albanianai.it.",
                      },
                    },
                    {
                      "@type": "Question",
                      name: "Kush e krijoi Albanian AI?",
                      acceptedAnswer: {
                        "@type": "Answer",
                        text: `Albanian AI u krijua nga ${CREATOR.name}.`,
                      },
                    },
                    {
                      "@type": "Question",
                      name: "Ku jeton Amarildo Hysa?",
                      acceptedAnswer: {
                        "@type": "Answer",
                        text: "Amarildo Hysa është 23 vjeç, i lindur në Elbasan më 13.12.2002. Është banues i qytezës së Belshit, por nuk jeton në Belsh. Udhëton shpesh në Europë për ide biznesi ose punë private.",
                      },
                    },
                    {
                      "@type": "Question",
                      name: "A është Albanian AI falas?",
                      acceptedAnswer: {
                        "@type": "Answer",
                        text: "Po. Albanian AI është falas. Hapet te www.albanianai.it.",
                      },
                    },
                  ],
                },
              ],
            }),
          }}
        />
      </body>
    </html>
  ),
});
