import { createFileRoute, Link } from "@tanstack/react-router";
import { CREATOR, PUBLIC_SITE } from "@/lib/site";
import { SocialLinks } from "@/components/social-links";

export const Route = createFileRoute("/rreth")({
  head: () => ({
    meta: [
      { title: "Rreth Albanian AI | Amarildo Hysa" },
      {
        name: "description",
        content:
          "Albanian AI është asistent inteligjent falas në shqip, italisht dhe anglisht. Zë live, foto, kamerë. Krijuar nga Amarildo Hysa. Faqja zyrtare albanianai.it.",
      },
    ],
    links: [{ rel: "canonical", href: `${PUBLIC_SITE}/rreth` }],
  }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <main className="about-page">
      <img src="/logo-192.jpg" alt="Albanian AI" width={72} height={72} />
      <h1>Albanian AI</h1>
      <p className="lead">
        Asistent inteligjent falas në <strong>shqip</strong>, <strong>italisht</strong> dhe{" "}
        <strong>anglisht</strong>. Faqja zyrtare: <a href={PUBLIC_SITE}>www.albanianai.it</a>.
      </p>
      <p>
        Albanian AI ndihmon për bisedë, përkthim, shkrim, foto, kamerë live dhe zë. Hapë nga telefoni ose
        kompjuteri, pa pagesë.
      </p>
      <h2>Kush e krijoi</h2>
      <p>
        Krijuar nga <strong>{CREATOR.name}</strong>, {CREATOR.age} vjeç, lindur në {CREATOR.born} më {CREATOR.birthday}.
        Banues i qytezës së Belshit, por nuk jeton në Belsh — udhëton shpesh në Europë për ide biznesi ose punë private.{" "}
        <Link to="/amarildo-hysa">Profili i Amarildo Hysa</Link>.
      </p>
      <h2>Çfarë bën</h2>
      <ul>
        <li>Zë live në shqip, italisht dhe anglisht</li>
        <li>Chat me tekst, foto dhe kamerë</li>
        <li>Përkthim dhe shkrim (email, CV, letra)</li>
        <li>Llogari private me Google ose email</li>
      </ul>
      <h2>Rrjetet sociale të Amarildo Hysa</h2>
      <SocialLinks full />
      <p>
        Instagram: <a href={CREATOR.instagram}>https://www.instagram.com/r.1ld1</a>
        <br />
        Facebook: <a href={CREATOR.facebook}>{CREATOR.facebook}</a>
        <br />
        TikTok: <a href={CREATOR.tiktok}>{CREATOR.tiktok}</a>
        <br />
        YouTube: <a href={CREATOR.youtube}>{CREATOR.youtube}</a>
        <br />
        Email: <a href={`mailto:${CREATOR.email}`}>{CREATOR.email}</a>
      </p>
      <p>
        <Link to="/shkarko">Shkarko app falas</Link>
        {" · "}
        <Link to="/privacy">Privatësia</Link>
        {" · "}
        <Link to="/app">Hap Albanian AI</Link>
      </p>
    </main>
  );
}
