import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { APP_BUILD, APP_VERSION, APP_VERSION_KEY } from "@/lib/app-version";

type RemoteVersion = { version: string; build: number; notes?: string };

function seenBuild() {
  const raw = Number(localStorage.getItem(APP_VERSION_KEY));
  return Number.isFinite(raw) && raw > 0 ? raw : 0;
}

async function applyUpdate(build = APP_BUILD) {
  try {
    if ("serviceWorker" in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((reg) => reg.unregister()));
    }
    const keys = await caches.keys();
    await Promise.all(keys.map((key) => caches.delete(key)));
  } catch {
    /* ignore */
  }
  localStorage.setItem(APP_VERSION_KEY, String(build));
  const url = new URL(window.location.href);
  url.searchParams.set("v", String(build));
  window.location.replace(url.toString());
}

async function readRemote(): Promise<RemoteVersion | null> {
  const urls = [
    `/api/version?t=${Date.now()}`,
    `/version.json?t=${Date.now()}&b=${APP_BUILD}`,
  ];
  for (const url of urls) {
    try {
      const res = await fetch(url, {
        cache: "no-store",
        headers: { pragma: "no-cache", "cache-control": "no-cache" },
      });
      if (!res.ok) continue;
      const data = (await res.json()) as RemoteVersion;
      if (Number(data.build) > 0) return data;
    } catch {
      /* try next */
    }
  }
  return null;
}

export function AppUpdate() {
  const [remote, setRemote] = useState<RemoteVersion | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    sessionStorage.removeItem("aai-crash-reload");
    if (!localStorage.getItem(APP_VERSION_KEY)) {
      localStorage.setItem(APP_VERSION_KEY, String(APP_BUILD));
    }

    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker.getRegistrations().then((regs) => {
        void Promise.all(regs.map((reg) => reg.unregister()));
      });
    }

    const check = async () => {
      try {
        if ("serviceWorker" in navigator) {
          const regs = await navigator.serviceWorker.getRegistrations();
          await Promise.all(regs.map((reg) => reg.unregister()));
        }
      } catch {
        /* ignore */
      }
      const data = await readRemote();
      if (!data) return;
      const build = Number(data.build);
      const seen = seenBuild();
      if (build > seen || build > APP_BUILD) setRemote(data);
    };

    void check();
    window.setTimeout(() => void check(), 200);
    window.setTimeout(() => void check(), 600);
    const id = window.setInterval(() => void check(), 800);
    const onVis = () => {
      if (document.visibilityState === "visible") void check();
    };
    window.addEventListener("focus", check);
    window.addEventListener("pageshow", check);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("focus", check);
      window.removeEventListener("pageshow", check);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  if (!remote) return null;

  return (
    <div className="update-sheet" role="dialog" aria-label="Përditësim i ri">
      <div className="update-card">
        <img src="/logo-192.jpg" alt="" />
        <strong>Amarildo Hysa ka lëshuar versionin zyrtar</strong>
        <p>{remote.notes || "Ky version ka përforcuar sigurinë e përdoruesit."}</p>
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            setBusy(true);
            void applyUpdate(Number(remote.build) || APP_BUILD);
          }}
        >
          <RefreshCw size={16} className={busy ? "spin" : undefined} />
          {busy ? "Po përditësohet…" : "Përditëso tani"}
        </button>
        <small>
          Version {remote.version || APP_VERSION}. Përditëso këtu — s’ke nevojë ta fshish nga ekrani.
        </small>
      </div>
    </div>
  );
}

export function useForceUpdateCheck() {
  return applyUpdate;
}
