import { createFileRoute, Link } from "@tanstack/react-router";
import { CREATOR, PUBLIC_SITE } from "@/lib/site";

export const Route = createFileRoute("/license")({
  head: () => ({
    meta: [
      { title: "Licenca dhe të drejtat | Albanian AI" },
      {
        name: "description",
        content: `Të drejtat e logos dhe përmbajtjes së Albanian AI. Krijuar nga ${CREATOR.name}.`,
      },
    ],
    links: [{ rel: "canonical", href: `${PUBLIC_SITE}/license` }],
  }),
  component: LicensePage,
});

function LicensePage() {
  return (
    <main className="wiki-page">
      <p className="wiki-kicker">Të drejta dhe licencë</p>
      <h1>Albanian AI — të drejtat e logos</h1>
      <p>
        Logoja dhe identiteti vizual i Albanian AI në <a href={PUBLIC_SITE}>www.albanianai.it</a> janë krijuar dhe
        mirëmbahen nga <strong>{CREATOR.name}</strong>.
      </p>
      <h2>Copyright</h2>
      <p>© 2026 {CREATOR.name}. Albanian AI. Të gjitha të drejtat e rezervuara, përveç rasteve kur shënohet ndryshe.</p>
      <h2>Përdorimi</h2>
      <p>
        Riprodhimi, rishpërndarja ose përdorimi komercial i logos dhe materialeve të markës kërkon leje paraprake nga
        krijuesi. Për kërkesa, kontakto: <a href={`mailto:${CREATOR.email}`}>{CREATOR.email}</a>.
      </p>
      <p className="wiki-nav">
        <Link to="/">Kreu</Link> · <Link to="/amarildo-hysa">Amarildo Hysa</Link> · <Link to="/privacy">Privatësia</Link>
      </p>
    </main>
  );
}
