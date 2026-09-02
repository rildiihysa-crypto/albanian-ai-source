import { createFileRoute, Link } from "@tanstack/react-router";
import { CREATOR, PUBLIC_SITE } from "@/lib/site";

export const Route = createFileRoute("/amarildo-hysa")({
  head: () => ({
    meta: [
      { title: "Amarildo Hysa | Krijuesi i Albanian AI" },
      {
        name: "description",
        content:
          "Amarildo Hysa, 23 vjeç, lindur në Elbasan më 13.12.2002. Banues i qytezës së Belshit, por nuk jeton në Belsh. Krijues i Albanian AI.",
      },
      {
        name: "keywords",
        content: "Amarildo Hysa, krijuesi i Albanian AI, Albanian AI creator, AlbanianAI, Albanian AI, Elbasan, Belsh",
      },
      { name: "author", content: "Amarildo Hysa" },
      { name: "robots", content: "index,follow,max-image-preview:large" },
      { property: "og:title", content: "Amarildo Hysa" },
      {
        property: "og:description",
        content: "Krijues i Albanian AI. Lindur në Elbasan më 13.12.2002. Banues i Belshit, udhëton në Europë.",
      },
    ],
    links: [{ rel: "canonical", href: `${PUBLIC_SITE}/amarildo-hysa` }],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const personLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    "@id": `${PUBLIC_SITE}/amarildo-hysa#person`,
    name: CREATOR.name,
    alternateName: ["Amarildo", "Amarildo Hysa — krijuesi i Albanian AI"],
    jobTitle: "Krijues i Albanian AI",
    description: "Amarildo Hysa është krijuesi i Albanian AI, një asistent inteligjent online në shqip, italisht dhe anglisht.",
    nationality: "Albanian",
    birthPlace: { "@type": "Place", name: CREATOR.born },
    homeLocation: { "@type": "Place", name: `${CREATOR.from}, ${CREATOR.based}` },
    email: CREATOR.email,
    url: `${PUBLIC_SITE}/amarildo-hysa`,
    sameAs: [CREATOR.instagram, CREATOR.facebook, CREATOR.tiktok, CREATOR.youtube],
    knowsAbout: ["Albanian AI", "inteligjencë artificiale", "teknologji", "gjuhë shqipe"],
    knowsLanguage: ["sq", "it", "en"],
    founder: { "@id": `${PUBLIC_SITE}/#organization` },
    worksFor: { "@id": `${PUBLIC_SITE}/#organization` },
  };

  return (
    <main className="wiki-page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(personLd) }} />
      <p className="wiki-kicker">Amarildo Hysa · Krijuesi i Albanian AI</p>
      <h1>Amarildo Hysa</h1>
      <aside className="wiki-box">
        <img src="/logo-192.jpg" alt="Albanian AI" width={160} height={160} />
        <table>
          <tbody>
            <tr>
              <th>Emri</th>
              <td>Amarildo Hysa</td>
            </tr>
            <tr>
              <th>Mosha</th>
              <td>{CREATOR.age} vjeç</td>
            </tr>
            <tr>
              <th>Lindur</th>
              <td>
                {CREATOR.born}, {CREATOR.birthday}
              </td>
            </tr>
            <tr>
              <th>Banues</th>
              <td>Qyteza e Belshit (nuk jeton aty)</td>
            </tr>
            <tr>
              <th>Jeton</th>
              <td>Udhëton në Europë</td>
            </tr>
            <tr>
              <th>Njohur për</th>
              <td>Albanian AI</td>
            </tr>
            <tr>
              <th>Faqja</th>
              <td>
                <a href={PUBLIC_SITE}>albanianai.it</a>
              </td>
            </tr>
          </tbody>
        </table>
      </aside>
      <p>
        <strong>Amarildo Hysa</strong> ({CREATOR.age} vjeç) është krijuesi i{" "}
        <a href={PUBLIC_SITE}>Albanian AI</a>, asistent inteligjent falas në shqip, italisht dhe anglisht. Është
        lindur në {CREATOR.born} më {CREATOR.birthday}. Është banues i qytezës së Belshit, por nuk jeton në Belsh —
        udhëton shpesh në Europë për ide biznesi ose punë private.
      </p>
      <h2>Fakte të konfirmuara</h2>
      <p>
        Profili zyrtar ka vetëm këto të dhëna: emri Amarildo Hysa, {CREATOR.age} vjeç, lindur në {CREATOR.born} më{" "}
        {CREATOR.birthday}, banues i qytezës së Belshit por nuk jeton aty, udhëton në Europë, krijues i Albanian AI.
      </p>
      <p>
        Nuk jeton në Tiranë. Nuk ka nofka publike. Universiteti, profesione të tjera ose detaje të pabëra publike
        nga ky profil nuk janë pjesë e të dhënave zyrtare të Albanian AI.
      </p>
      <h2>Albanian AI — krijimi i Amarildo Hysës</h2>
      <p>
        Albanian AI është një asistent privat me zë live, chat, foto dhe kamerë. Hapë te{" "}
        <a href={PUBLIC_SITE}>www.albanianai.it</a>. Nuk është produkt i OpenAI, Google apo xAI; është krijuar nga
        Amarildo Hysa.
      </p>
      <h2>Lidhje</h2>
      <ul>
        <li>
          Instagram: <a href={CREATOR.instagram}>https://www.instagram.com/r.1ld1</a>
        </li>
        <li>
          Facebook: <a href={CREATOR.facebook}>{CREATOR.facebook}</a>
        </li>
        <li>
          TikTok: <a href={CREATOR.tiktok}>{CREATOR.tiktok}</a>
        </li>
        <li>
          YouTube: <a href={CREATOR.youtube}>{CREATOR.youtube}</a>
        </li>
        <li>
          Email: <a href={`mailto:${CREATOR.email}`}>{CREATOR.email}</a>
        </li>
      </ul>
      <p className="wiki-nav">
        <Link to="/">Kreu</Link> · <Link to="/rreth">Rreth</Link> · <Link to="/privacy">Privatësia</Link> · <Link to="/app">Hap Albanian AI</Link>
      </p>
    </main>
  );
}
