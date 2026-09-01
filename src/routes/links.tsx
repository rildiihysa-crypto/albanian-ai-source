import { createFileRoute } from "@tanstack/react-router";
import { CREATOR, PUBLIC_SITE } from "@/lib/site";

const LINKS = [
  { label: "Hap Albanian AI", href: "/app", hint: "Asistent shqip · falas" },
  { label: "Instagram", href: CREATOR.instagram, hint: "@r.1ld1" },
  { label: "Facebook", href: CREATOR.facebook, hint: CREATOR.name },
  { label: "TikTok", href: CREATOR.tiktok, hint: "@accountremoved034" },
  { label: "YouTube", href: CREATOR.youtube, hint: "@777productionmusic" },
  { label: "Email", href: `mailto:${CREATOR.email}`, hint: CREATOR.email },
  { label: "Privatësia", href: "/privacy", hint: "Politika e privatësisë" },
];

export const Route = createFileRoute("/links")({
  head: () => ({
    meta: [
      { title: "Lidhjet · Albanian AI · Amarildo Hysa" },
      {
        name: "description",
        content:
          "Të gjitha lidhjet e Albanian AI dhe Amarildo Hysa: app, Instagram @r.1ld1, Facebook, TikTok, YouTube, email, privatësi.",
      },
    ],
    links: [{ rel: "canonical", href: `${PUBLIC_SITE}/links` }],
  }),
  component: LinksPage,
});

function LinksPage() {
  return (
    <main className="links-page">
      <img src="/logo-192.jpg" alt="Albanian AI" width={88} height={88} />
      <h1>Albanian AI</h1>
      <p className="links-bio">
        Krijuar nga <strong>{CREATOR.name}</strong>
        <br />
        Shqip · Italisht · Anglisht
      </p>
      <nav className="links-stack">
        {LINKS.map((item) => (
          <a key={item.label} href={item.href} target={item.href.startsWith("/") ? undefined : "_blank"} rel="noreferrer">
            <strong>{item.label}</strong>
            <span>{item.hint}</span>
          </a>
        ))}
      </nav>
      <p className="links-foot">www.albanianai.it</p>
    </main>
  );
}
