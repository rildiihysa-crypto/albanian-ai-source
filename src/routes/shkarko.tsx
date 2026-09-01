import { createFileRoute, Link } from "@tanstack/react-router";
import { Share } from "lucide-react";
import { useEffect, useState } from "react";
import { PUBLIC_SITE } from "@/lib/site";
import { CREATOR } from "@/lib/site";
import appCss from "../styles.css?url";

type BeforeInstall = Event & { prompt: () => Promise<void> };

export const Route = createFileRoute("/shkarko")({
  head: () => ({
    meta: [
      { title: "Shkarko Albanian AI | Falas për iPhone dhe Android" },
      {
        name: "description",
        content:
          "Shkarko Albanian AI falas. Në iPhone shtoje në ekranin kryesor. Në Android instaloje si app.",
      },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "canonical", href: `${PUBLIC_SITE}/shkarko` },
    ],
  }),
  component: DownloadPage,
});

function DownloadPage() {
  const [ios, setIos] = useState(true);
  const [android, setAndroid] = useState(false);
  const [installEvent, setInstallEvent] = useState<BeforeInstall>();
  const [note, setNote] = useState("");

  useEffect(() => {
    const ua = navigator.userAgent;
    setIos(/iphone|ipad|ipod/i.test(ua));
    setAndroid(/android/i.test(ua));
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstall);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  return (
    <div className="gate">
      <div className="gate-bg" />
      <div className="gate-shade" />
      <div className="gate-body">
        <img src="/logo-192.jpg" alt="Albanian AI" />
        <p className="eyebrow">FALAS</p>
        <h1>Shkarko Albanian AI</h1>
        <p>Krijuar nga {CREATOR.name}.</p>

        <div className="gate-install">
          <strong>iPhone — Safari</strong>
          <ol>
            <li>
              Prek <Share size={14} /> <b>Ndaj</b> poshtë
            </li>
            <li>
              Prek <b>Shto në Ekranin Kryesor</b>
            </li>
            <li>
              Prek <b>Shto</b>
            </li>
          </ol>
        </div>

        <div className="gate-install">
          <strong>Android — Chrome</strong>
          {android ? (
            <button
              type="button"
              className="download-cta"
              onClick={() => {
                if (installEvent) {
                  void installEvent.prompt();
                  return;
                }
                setNote("Në Chrome prek ⋮ lart djathtas, pastaj Instalo app.");
              }}
            >
              Instalo në Android
            </button>
          ) : (
            <p>Ky buton punon vetëm në telefon Android me Chrome. Ti je në iPhone — përdor hapat e Safari lart.</p>
          )}
          {note ? <p>{note}</p> : null}
        </div>

        <Link to="/app" className="download-open">
          Hap Albanian AI tani
        </Link>
      </div>
    </div>
  );
}
