import { Share } from "lucide-react";
import { CREATOR } from "@/lib/site";
import { SocialLinks } from "@/components/social-links";

export function Landing({ onEnter }: { onEnter: () => void }) {
  return (
    <div className="gate" style={{ background: "#050505", color: "#f4f4f4", minHeight: "100svh" }}>
      <div className="gate-bg" />
      <div className="gate-shade" />
      <div className="gate-body">
        <img src="/logo-192.jpg" alt="Albanian AI" width={96} height={96} style={{ borderRadius: 24 }} />
        <h1 style={{ color: "#fff" }}>Albanian AI</h1>
        <p style={{ color: "#bdbdbd" }}>Krijuar nga {CREATOR.name}</p>
        <p style={{ color: "#cfcfd4", maxWidth: 340, fontSize: 14, lineHeight: 1.5, margin: "0 auto 8px" }}>
          Albanian AI është asistenti shqiptar për biseda, zë live, foto dhe kamera — në shqip, italisht dhe anglisht.
        </p>
        <button
          type="button"
          onClick={onEnter}
          style={{
            width: "min(280px,100%)",
            height: 52,
            border: 0,
            borderRadius: 16,
            background: "#a7192e",
            color: "#fff",
            fontSize: 17,
            fontWeight: 700,
          }}
        >
          Hap
        </button>
        <div className="gate-install">
          <strong>Shkarko në iPhone</strong>
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
          <p>Android: Chrome → ⋮ → Instalo app</p>
        </div>
        <SocialLinks />
        <p style={{ marginTop: 16, fontSize: 12, color: "#888" }}>
          <a href="/privacy" style={{ color: "#bbb" }}>
            Politika e privatësisë
          </a>
        </p>
      </div>
    </div>
  );
}
