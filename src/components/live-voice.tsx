import { Camera, Mic, RefreshCw, Send, Square, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { type ChatMode, type Lang } from "@/lib/assistant/types";
import { parseGeneratedImage } from "@/lib/assistant/imagine-detect";

export function LiveVoicePanel({
  speaking,
  hearing,
  lang,
  voiceId,
  messages,
  micError,
  onLang,
  onVoice,
  onClose,
  onRefresh,
  onMic,
  onSend,
  onCamera,
  cameraOn,
  pro,
  mode,
}: {
  speaking: boolean;
  hearing: boolean;
  lang: Lang;
  voiceId: string;
  messages: { role: "user" | "assistant"; content: string }[];
  micError?: string;
  onLang: (lang: Lang) => void;
  onVoice: (id: string) => void;
  onClose: () => void;
  onRefresh: () => void;
  onMic: () => void;
  onSend: (text: string) => void;
  onCamera: () => void;
  cameraOn?: boolean;
  pro?: boolean;
  mode?: ChatMode;
}) {
  const [draft, setDraft] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const visible = messages.filter((item) => item.content.trim());
  const connecting = !visible.length && !speaking;

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [visible, speaking]);

  return (
    <div className="xai-live">
      <header className="xai-live-top">
        <div>
          <h1>Live chat</h1>
          <p>Albanian AI</p>
        </div>
        <div className="xai-live-actions">
          <button type="button" onClick={onRefresh} aria-label="Rifillo">
            <RefreshCw size={18} />
          </button>
          <button type="button" onClick={onClose} aria-label="Mbyll">
            <X size={22} />
          </button>
        </div>
      </header>

      {connecting ? (
        <div className="xai-live-stage">
          <div className={`xai-orb${hearing ? " listening" : ""}${speaking ? " talking" : ""}`}>
            <img src="/logo-192.jpg" alt="Albanian AI" />
          </div>
          <p>{micError || (hearing ? "Të dëgjoj… fol tani." : "Fol tani — lejo mikrofonin.")}</p>
          {!hearing ? (
            <button type="button" className="xai-live-go" onClick={onMic}>
              Lejo mikrofonin
            </button>
          ) : null}
        </div>
      ) : (
        <div className="xai-live-thread">
          {visible.map((item, index) => {
            const parsed = parseGeneratedImage(item.content);
            return (
            <article key={`${item.role}-${index}`} className={`xai-live-msg ${item.role}`}>
              {item.role === "assistant" ? <img src="/logo-192.jpg" alt="" /> : <span className="xai-live-you">Ti</span>}
              <div>
                {parsed.image ? <img className="xai-live-photo" src={parsed.image} alt="" /> : null}
                {parsed.text ? <p>{parsed.text}</p> : null}
              </div>
            </article>
            );
          })}
          {speaking && !visible.some((item) => item.role === "assistant") ? (
            <p className="xai-live-status">Po flet Albanian AI…</p>
          ) : null}
          {micError ? <p className="xai-live-error">{micError}</p> : null}
          <div ref={endRef} />
        </div>
      )}

      <div className="xai-live-bottom">
        <div className="xai-live-voices">
          <button
            type="button"
            className="xai-live-lang"
            onClick={() => {
              const order: Lang[] = ["sq", "it", "en"];
              onLang(order[(order.indexOf(lang) + 1) % order.length]);
            }}
          >
            {lang === "sq" ? "Shqip" : lang === "it" ? "Italiano" : "English"}
          </button>
        </div>
        <form
          className="xai-live-bar"
          onSubmit={(event) => {
            event.preventDefault();
            const text = draft.trim();
            if (!text) return;
            onSend(text);
            setDraft("");
          }}
        >
          <button type="button" className={cameraOn ? "on" : ""} onClick={onCamera} aria-label="Kamera">
            <Camera size={18} />
          </button>
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Dërgo mesazh"
            enterKeyHint="send"
          />
          <button type="button" className={hearing ? "on" : ""} onClick={onMic} aria-label="Mikrofoni">
            <Mic size={18} />
          </button>
          {draft.trim() ? (
            <button type="submit" className="xai-live-go" aria-label="Dërgo">
              <Send size={16} />
            </button>
          ) : (
            <button type="button" className="xai-live-go stop" onClick={onClose} aria-label="Stop">
              <Square size={11} fill="currentColor" />
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
