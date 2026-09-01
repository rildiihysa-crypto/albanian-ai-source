import { Lightbulb, X } from "lucide-react";
import { CREATOR, PUBLIC_SITE, ideaMailto } from "@/lib/site";

export function AboutSheet({ onClose }: { onClose: () => void }) {
  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-panel about-sheet" onClick={(event) => event.stopPropagation()}>
        <div className="settings-header">
          <div>
            <div className="eyebrow">RRETH NESH</div>
            <h3>Albanian AI</h3>
          </div>
          <button className="icon-button" onClick={onClose} type="button" aria-label="Mbyll">
            <X size={18} />
          </button>
        </div>
        <div className="settings-body about-body">
          <img className="about-logo" src="/logo-192.jpg" alt="Albanian AI" />
          <p>
            Asistent privat me zë në shqip, italisht dhe anglisht. Krijuar nga{" "}
            <strong>{CREATOR.name}</strong>, {CREATOR.age} vjeç, lindur në {CREATOR.born} më {CREATOR.birthday}.
            Banues i qytezës së Belshit, por nuk jeton në Belsh — udhëton shpesh në Europë për ide biznesi ose punë private.
          </p>
          <a className="idea-card" href={ideaMailto()}>
            <Lightbulb size={18} />
            <span>
              <strong>Dërgo një ide</strong>
              <small>Na ndihmo ta përmirësojmë Albanian AI. Shkruaj te {CREATOR.email}</small>
            </span>
          </a>
          <a className="about-link" href={`mailto:${CREATOR.email}`}>
            {CREATOR.email}
          </a>
          <a className="about-link" href={CREATOR.instagram} target="_blank" rel="noreferrer">
            Instagram · @r.1ld1
          </a>
          <a className="about-link" href={CREATOR.facebook} target="_blank" rel="noreferrer">
            Facebook
          </a>
          <a className="about-link" href={CREATOR.tiktok} target="_blank" rel="noreferrer">
            TikTok · @accountremoved034
          </a>
          <a className="about-link" href={CREATOR.youtube} target="_blank" rel="noreferrer">
            YouTube · @777productionmusic
          </a>
          <a className="about-link" href={PUBLIC_SITE} target="_blank" rel="noreferrer">
            {PUBLIC_SITE.replace("https://", "")}
          </a>
        </div>
      </div>
    </div>
  );
}
