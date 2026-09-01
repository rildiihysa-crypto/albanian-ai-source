import { Archive, Moon, RefreshCw, ShieldCheck, Sun, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { addMemory, clearAllMemories, exportMyData, listMemories, removeMemory, savePreferences } from "@/lib/assistant/actions";
import { voicesForMode, type ChatMode, type MemoryRow, type Prefs } from "@/lib/assistant/types";
import { signOut } from "@/lib/auth/client";
import { APP_VERSION } from "@/lib/app-version";
import { CREATOR, PUBLIC_HOST, PUBLIC_SITE, ideaMailto } from "@/lib/site";

export function SettingsPanel({
  prefs,
  setPrefs,
  memories,
  onMemories,
  onClose,
  pro,
  mode,
}: {
  prefs: Prefs;
  setPrefs: (prefs: Prefs) => void;
  memories: MemoryRow[];
  onMemories: (rows: MemoryRow[]) => void;
  onClose: () => void;
  pro?: boolean;
  mode?: ChatMode;
}) {
  const [newMemory, setNewMemory] = useState("");
  const [saving, setSaving] = useState(false);
  const update = (key: keyof Prefs, value: string) => setPrefs({ ...prefs, [key]: value } as Prefs);

  const save = async () => {
    setSaving(true);
    try {
      await savePreferences({ data: { values: prefs as unknown as Record<string, string> } });
      toast.success("Cilësimet u ruajtën — Albanian AI i përdor tani");
      onClose();
    } catch {
      toast.success("Cilësimet u aplikuan në këtë pajisje");
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const add = async () => {
    const content = newMemory.trim();
    if (!content) return;
    try {
      await addMemory({ data: { content } });
      setNewMemory("");
      onMemories(await listMemories());
      toast.success("Memoria u ruajt");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Nuk u ruajt");
    }
  };

  const downloadExport = async () => {
    const result = await exportMyData();
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `albanian-ai-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    toast.success("Eksporti është gati");
  };

  return (
    <div className="settings-overlay">
      <div className="settings-panel">
        <div className="settings-header">
          <div>
            <div className="eyebrow">HAPËSIRË PERSONALE</div>
            <h3>Cilësimet e Albanian AI</h3>
          </div>
          <button className="icon-button" onClick={onClose} type="button" aria-label="Mbyll">
            <X size={18} />
          </button>
        </div>
        <div className="settings-body">
          <section>
            <div className="section-label">Pamja</div>
            <div className="theme-choice">
              <button
                type="button"
                className={prefs.theme !== "dark" ? "selected" : ""}
                onClick={() => update("theme", "light")}
              >
                <Sun size={17} /> Light
              </button>
              <button
                type="button"
                className={prefs.theme === "dark" ? "selected" : ""}
                onClick={() => update("theme", "dark")}
              >
                <Moon size={17} /> Dark
              </button>
            </div>
          </section>
          <section>
            <div className="section-label">Personalizimi</div>
            <label>
              Emri i asistentit
              <input value="Albanian AI" readOnly disabled />
            </label>
            <label>
              Gjuha kryesore
              <select
                value={prefs.language}
                onChange={(e) => {
                  const language = e.target.value as Prefs["language"];
                  setPrefs({ ...prefs, language });
                }}
              >
                <option value="sq">Shqip (kryesore)</option>
                <option value="it">Italiano</option>
                <option value="en">English</option>
              </select>
            </label>
            <label>
              Stili i përgjigjeve
              <select value={prefs.responseStyle} onChange={(e) => update("responseStyle", e.target.value)}>
                <option value="concise">I shkurtër</option>
                <option value="balanced">I balancuar</option>
                <option value="detailed">I detajuar</option>
              </select>
            </label>
            <label>
              Udhëzime personale
              <textarea rows={3} value={prefs.customInstructions} onChange={(e) => update("customInstructions", e.target.value)} />
            </label>
          </section>
          <section>
            <div className="section-label">Zëri</div>
            <p className="field-note">
              {mode === "pro"
                ? "Albanian AI Pro flet me zërin e saj."
                : "Sal, zë mashkull xAI, i butë dhe njerëzor. I njëjti zë në chat dhe Live Voice — shqip, italisht, anglisht."}
            </p>
            {mode === "pro" ? null : (
            <div className="theme-choice">
              {voicesForMode(mode || (pro ? "pro" : "lite")).map((voice) => (
                <button
                  key={voice.id}
                  type="button"
                  className={prefs.voiceId === voice.id ? "selected" : ""}
                  onClick={() => setPrefs({ ...prefs, voiceId: voice.id })}
                >
                  {`${voice.label} · mashkull`}
                </button>
              ))}
            </div>
            )}
          </section>
          <section>
            <div className="section-label">Memoria afatgjatë</div>
            <p className="field-note">Ndryshimet nisin menjëherë. Ruaj që të mbahen edhe pas mbylljes.</p>
            <label>
              Memoria
              <select value={prefs.memoryEnabled} onChange={(e) => update("memoryEnabled", e.target.value)}>
                <option value="true">E ndezur — mban mend çfarë i thua</option>
                <option value="false">E fikur</option>
              </select>
            </label>
            <div className="memory-add">
              <input
                value={newMemory}
                onChange={(e) => setNewMemory(e.target.value)}
                placeholder="Shto një preferencë…"
              />
              <Button size="sm" disabled={!newMemory.trim()} onClick={() => void add()}>
                Ruaj
              </Button>
            </div>
            <div className="memory-list">
              {memories.length ? (
                memories.map((memory) => (
                  <div className="memory-item" key={memory.id}>
                    <span>{memory.content}</span>
                    <button
                      type="button"
                      onClick={() => {
                        void removeMemory({ data: { id: memory.id } }).then(async () =>
                          onMemories(await listMemories()),
                        );
                      }}
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))
              ) : (
                <span className="field-note">Nuk ka ende memorie të ruajtura.</span>
              )}
            </div>
            {memories.length ? (
              <button
                className="text-action"
                type="button"
                onClick={() => {
                  if (confirm("Të fshihen të gjitha memoriet?")) {
                    void clearAllMemories().then(() => onMemories([]));
                  }
                }}
              >
                Fshi të gjitha memoriet
              </button>
            ) : null}
          </section>
          <section>
            <div className="section-label">Të dhënat dhe privatësia</div>
            <button className="data-button" type="button" onClick={() => void downloadExport()}>
              <Archive size={16} />
              <span>
                <strong>Eksporto të dhënat e mia</strong>
                <small>Shkarko bisedat, memoriet dhe cilësimet</small>
              </span>
            </button>
            <div className="security-row">
              <ShieldCheck size={18} />
              <div>
                <strong>Llogari private</strong>
                <span>Krijuar nga Amarildo Hysa · të dhënat e tua nuk ndahen</span>
              </div>
            </div>
            <a className="text-action" href="/privacy">
              Politika e privatësisë
            </a>
            <button className="text-action" type="button" onClick={() => void signOut()}>
              Dil nga Albanian AI
            </button>
          </section>
          <section>
            <div className="section-label">Përditësimi</div>
            <p className="field-note">
              Versioni {APP_VERSION}. Kur del një version i ri, Albanian AI të tregon «Përditëso tani» — s’ka nevojë ta fshish nga ekrani i telefonit.
            </p>
            <button
              className="data-button"
              type="button"
              onClick={async () => {
                try {
                  const res = await fetch(`/version.json?t=${Date.now()}`, { cache: "no-store" });
                  const data = (await res.json()) as { version: string; build: number };
                  toast.success(`Je në versionin ${APP_VERSION}. Serveri: ${data.version}`);
                } catch {
                  toast.error("Nuk u kontrollua përditësimi.");
                }
              }}
            >
              <RefreshCw size={16} />
              <span>
                <strong>Kontrollo për përditësim</strong>
                <small>Albanian AI {APP_VERSION} · {CREATOR.name}</small>
              </span>
            </button>
          </section>
          <section>
            <div className="section-label">Ide për Albanian AI</div>
            <p className="field-note">
              Ke një sugjerim? Shkruaji drejtpërdrejt {CREATOR.name} — çdo ide na ndihmon ta bëjmë app-in më të mirë.
            </p>
            <a className="about-link" href={ideaMailto()}>
              Dërgo ide · {CREATOR.email}
            </a>
          </section>
          <section>
            <div className="section-label">Rreth nesh</div>
            <p className="field-note">
              Krijuar nga {CREATOR.name}. Instagram, Facebook, TikTok dhe YouTube i gjen te Rreth nesh.
            </p>
            <a className="about-link" href={CREATOR.instagram} target="_blank" rel="noreferrer">
              Instagram
            </a>
            <a className="about-link" href={CREATOR.facebook} target="_blank" rel="noreferrer">
              Facebook
            </a>
            <a className="about-link" href={CREATOR.tiktok} target="_blank" rel="noreferrer">
              TikTok
            </a>
            <a className="about-link" href={CREATOR.youtube} target="_blank" rel="noreferrer">
              YouTube
            </a>
            <a className="about-link" href={PUBLIC_SITE} target="_blank" rel="noreferrer">
              {PUBLIC_HOST}
            </a>
          </section>
        </div>
        <div className="settings-footer">
          <button className="cancel-button" type="button" onClick={onClose}>
            Anulo
          </button>
          <Button onClick={() => void save()} disabled={saving}>
            Ruaj ndryshimet
          </Button>
        </div>
      </div>
    </div>
  );
}
