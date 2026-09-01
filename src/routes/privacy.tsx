import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { CREATOR, PUBLIC_SITE } from "@/lib/site";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Politika e privatësisë | Albanian AI" },
      {
        name: "description",
        content:
          "Politika e privatësisë së Albanian AI (shqip, italisht, anglisht). Të dhënat e llogarisë, bisedat, mikrofoni dhe kamera. Kontakt PEC: Amarildo.hysa@pecsicura.com",
      },
      { property: "og:title", content: "Politika e privatësisë | Albanian AI" },
      {
        property: "og:description",
        content: "Si i mbron Albanian AI të dhënat e tua. GDPR. Kontakt: Amarildo.hysa@pecsicura.com",
      },
      { property: "og:url", content: `${PUBLIC_SITE}/privacy` },
      { property: "og:type", content: "article" },
      { name: "robots", content: "index,follow" },
    ],
    links: [
      { rel: "canonical", href: `${PUBLIC_SITE}/privacy` },
      { rel: "alternate", hrefLang: "sq", href: `${PUBLIC_SITE}/privacy` },
      { rel: "alternate", hrefLang: "it", href: `${PUBLIC_SITE}/privacy` },
      { rel: "alternate", hrefLang: "en", href: `${PUBLIC_SITE}/privacy` },
    ],
  }),
  component: PrivacyPage,
});

const COPY = {
  sq: {
    title: "Politika e privatësisë",
    updated: "Përditësuar: 1 shtator 2026",
    intro:
      "Albanian AI (www.albanianai.it) është asistent inteligjent falas në shqip, italisht dhe anglisht, krijuar nga Amarildo Hysa. Kjo politikë shpjegon çfarë të dhënash mblidhen, si përdoren dhe çfarë të drejtash ke.",
    h1: "Kush e kontrollon të dhënat",
    p1: `Kontrolluesi i të dhënave është ${CREATOR.name} (${CREATOR.email}). Faqja zyrtare: ${PUBLIC_SITE}.`,
    h2: "Çfarë mblidhet",
    l2: [
      "Llogaria: emri, email-i dhe fotoja e profilit nëse hyn me Google ose email.",
      "Bisedat: mesazhet, fotot që ngarkon, dhe historia e chat-it te llogaria jote.",
      "Zëri dhe kamera: vetëm kur ti i lejon. Përdoren për t’iu përgjigjur ty, pastaj nuk ruhen si skedarë të veçantë te telefoni yt.",
      "Mysafir: pa llogari mund të bisedosh pak. Këto biseda nuk ruhen te një llogari derisa të hysh.",
      "Teknike: data e hyrjes, lloji i pajisjes dhe gabime serveri, për ta mbajtur app-in në punë.",
    ],
    h3: "Pse i përdorim",
    l3: [
      "Për t’ju dhënë përgjigje, zë live, foto dhe kamerë.",
      "Për të ruajtur bisedat te llogaria jote.",
      "Për siguri, hyrje dhe përditësime të app-it.",
    ],
    h4: "Me kë ndahen",
    p4: "Nuk i shesim të dhënat e tua për reklama. Për të punuar, Albanian AI përdor shërbime të nevojshme (hyrje Google, hosting, gjenerim teksti/zëri/foto). Ata i përpunojnë të dhënat vetëm për këtë qëllim, sipas kontratave të tyre.",
    h5: "Sa kohë ruhen",
    p5: "Bisedat dhe llogaria rrinë sa kohë ke llogari. Mund të fshish një bisedë nga menuja. Nëse do të fshish llogarinë, shkruaj te email-i i mësipërm.",
    h6: "Të drejtat e tua (GDPR)",
    l6: [
      "Të shohësh dhe të eksportosh të dhënat (Cilësimet → Eksporto të dhënat e mia).",
      "Të fshish biseda ose të kërkosh fshirjen e llogarisë.",
      "Të tërheqësh pëlqimin për mikrofonin dhe kamerën nga cilësimet e telefonit.",
      "Të ankohesh te autoriteti i mbrojtjes së të dhënave në vendin tënd.",
    ],
    h7: "Fëmijët",
    p7: "Albanian AI nuk është për fëmijë nën 13 vjeç. Nëse ke nën 16 vjeç në BE, përdore vetëm me pëlqimin e prindit.",
    h8: "Kontakt",
    p8: `Pyetje për privatësinë: ${CREATOR.email}`,
  },
  it: {
    title: "Informativa sulla privacy",
    updated: "Aggiornata: 1 settembre 2026",
    intro:
      "Albanian AI (www.albanianai.it) è un assistente gratuito in albanese, italiano e inglese, creato da Amarildo Hysa. Questa informativa spiega quali dati raccogliamo, come li usiamo e i tuoi diritti.",
    h1: "Titolare del trattamento",
    p1: `Il titolare è ${CREATOR.name} (${CREATOR.email}). Sito ufficiale: ${PUBLIC_SITE}.`,
    h2: "Dati raccolti",
    l2: [
      "Account: nome, email e foto profilo se accedi con Google o email.",
      "Chat: messaggi, foto caricate e cronologia sul tuo account.",
      "Microfono e fotocamera: solo se li autorizzi. Servono per risponderti.",
      "Ospite: senza account puoi parlare un po’. Le chat non restano sul tuo account finché non accedi.",
      "Tecnici: data di accesso, tipo di dispositivo ed errori del server, per far funzionare l’app.",
    ],
    h3: "Perché li usiamo",
    l3: [
      "Per darti risposte, voce live, foto e fotocamera.",
      "Per salvare le chat sul tuo account.",
      "Per sicurezza, accesso e aggiornamenti.",
    ],
    h4: "Con chi li condividiamo",
    p4: "Non vendiamo i tuoi dati per pubblicità. Per far funzionare il servizio usiamo fornitori necessari (login Google, hosting, generazione di testo/voce/immagini). Trattano i dati solo per questo scopo.",
    h5: "Conservazione",
    p5: "Chat e account restano finché hai un account. Puoi cancellare una chat dal menu. Per cancellare l’account, scrivi all’email sopra.",
    h6: "I tuoi diritti (GDPR)",
    l6: [
      "Vedere ed esportare i dati (Impostazioni → Esporta i miei dati).",
      "Cancellare chat o chiedere la cancellazione dell’account.",
      "Revocare microfono e fotocamera dalle impostazioni del telefono.",
      "Presentare reclamo all’autorità per la protezione dei dati.",
    ],
    h7: "Minori",
    p7: "Albanian AI non è per bambini sotto i 13 anni. Se hai meno di 16 anni in UE, usalo solo con il consenso di un genitore.",
    h8: "Contatti",
    p8: `Domande sulla privacy: ${CREATOR.email}`,
  },
  en: {
    title: "Privacy policy",
    updated: "Updated: 1 September 2026",
    intro:
      "Albanian AI (www.albanianai.it) is a free assistant in Albanian, Italian and English, created by Amarildo Hysa. This policy explains what data we collect, how we use it, and your rights.",
    h1: "Who controls the data",
    p1: `The data controller is ${CREATOR.name} (${CREATOR.email}). Official site: ${PUBLIC_SITE}.`,
    h2: "What we collect",
    l2: [
      "Account: name, email and profile photo if you sign in with Google or email.",
      "Chats: messages, photos you upload, and chat history on your account.",
      "Microphone and camera: only when you allow them. Used to answer you.",
      "Guest: you can chat a little without an account. Those chats are not saved to an account until you sign in.",
      "Technical: sign-in time, device type and server errors, to keep the app running.",
    ],
    h3: "Why we use it",
    l3: [
      "To give you answers, live voice, photos and camera.",
      "To store chats on your account.",
      "For security, sign-in and app updates.",
    ],
    h4: "Who we share with",
    p4: "We do not sell your data for ads. To run the service we use necessary providers (Google sign-in, hosting, text/voice/image generation). They process data only for that purpose.",
    h5: "How long we keep it",
    p5: "Chats and account stay while you have an account. You can delete a chat from the menu. To delete your account, email us.",
    h6: "Your rights (GDPR)",
    l6: [
      "See and export your data (Settings → Export my data).",
      "Delete chats or request account deletion.",
      "Revoke microphone and camera from your phone settings.",
      "Lodge a complaint with your data-protection authority.",
    ],
    h7: "Children",
    p7: "Albanian AI is not for children under 13. If you are under 16 in the EU, use it only with a parent’s consent.",
    h8: "Contact",
    p8: `Privacy questions: ${CREATOR.email}`,
  },
} as const;

function PrivacyPage() {
  const [lang, setLang] = useState<"sq" | "it" | "en">("sq");
  const t = COPY[lang];
  const ld = {
    "@context": "https://schema.org",
    "@type": "PrivacyPolicy",
    name: "Politika e privatësisë — Albanian AI",
    url: `${PUBLIC_SITE}/privacy`,
    inLanguage: ["sq", "it", "en"],
    dateModified: "2026-09-01",
    datePublished: "2026-09-01",
    publisher: {
      "@type": "Organization",
      name: "Albanian AI",
      url: PUBLIC_SITE,
      email: CREATOR.email,
      founder: { "@type": "Person", name: CREATOR.name, email: CREATOR.email },
    },
    about: { "@type": "SoftwareApplication", name: "Albanian AI", url: PUBLIC_SITE },
  };
  return (
    <main className="about-page privacy-page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <img src="/logo-192.jpg" alt="Albanian AI" width={72} height={72} />
      <div className="privacy-langs" role="tablist">
        {(["sq", "it", "en"] as const).map((code) => (
          <button
            key={code}
            type="button"
            role="tab"
            aria-selected={lang === code}
            className={lang === code ? "on" : undefined}
            onClick={() => setLang(code)}
          >
            {code === "sq" ? "Shqip" : code === "it" ? "Italiano" : "English"}
          </button>
        ))}
      </div>
      <h1>{t.title}</h1>
      <p className="lead">{t.updated}</p>
      <p>{t.intro}</p>
      <h2>{t.h1}</h2>
      <p>{t.p1}</p>
      <h2>{t.h2}</h2>
      <ul>
        {t.l2.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <h2>{t.h3}</h2>
      <ul>
        {t.l3.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <h2>{t.h4}</h2>
      <p>{t.p4}</p>
      <h2>{t.h5}</h2>
      <p>{t.p5}</p>
      <h2>{t.h6}</h2>
      <ul>
        {t.l6.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <h2>{t.h7}</h2>
      <p>{t.p7}</p>
      <h2>{t.h8}</h2>
      <p>
        {t.p8} · <a href={`mailto:${CREATOR.email}`}>{CREATOR.email}</a>
      </p>
      <p>
        <Link to="/">Albanian AI</Link>
        {" · "}
        <Link to="/rreth">Rreth nesh</Link>
        {" · "}
        <Link to="/app">Hap app</Link>
      </p>
    </main>
  );
}
