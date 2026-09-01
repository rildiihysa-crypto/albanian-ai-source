import { Share, X } from "lucide-react";
import { useEffect, useState } from "react";

const KEY = "albanian-ai-install-dismissed";

type BeforeInstall = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

function isStandalone() {
  if (typeof window === "undefined") return true;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone))
  );
}

function isIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

export function InstallPrompt() {
  const [open, setOpen] = useState(false);
  const [installEvent, setInstallEvent] = useState<BeforeInstall>();

  useEffect(() => {
    if (isStandalone() || localStorage.getItem(KEY) === "1") return;
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstall);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    const t = window.setTimeout(() => setOpen(true), 1800);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.clearTimeout(t);
    };
  }, []);

  if (!open) return null;

  const close = () => {
    localStorage.setItem(KEY, "1");
    setOpen(false);
  };

  const install = async () => {
    if (isIOS()) return;
    if (!installEvent) return;
    await installEvent.prompt();
    const choice = await installEvent.userChoice;
    if (choice.outcome === "accepted") close();
  };

  return (
    <div className="install-sheet">
      <div className="install-card">
        <button className="install-close" type="button" onClick={close} aria-label="Mbyll">
          <X size={16} />
        </button>
        <img src="/logo-192.jpg" alt="" />
        <strong>Shkarko Albanian AI</strong>
        <p>Falas. Shtoje në ekranin e telefonit dhe hapet si app.</p>
        {isIOS() ? (
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
        ) : (
          <ol>
            <li>Prek butonin Instalo</li>
            <li>Konfirmo në dritaren e Chrome</li>
          </ol>
        )}
        <button type="button" onClick={() => void install()}>
          {isIOS() ? "Si ta shtoj" : "Instalo app"}
        </button>
      </div>
    </div>
  );
}
