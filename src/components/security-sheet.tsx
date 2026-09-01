import { Lock, ShieldCheck, X } from "lucide-react";
import { CREATOR } from "@/lib/site";

const ITEMS = [
  {
    title: "Bisedat e tua",
    text: "Çdo bisedë rri te llogaria jote. Përdoruesit e tjerë nuk i shohin. Pas hyrjes me Google ose email, historia është vetëm e jote.",
  },
  {
    title: "Hyrje e sigurt",
    text: "Hyr me Google ose me emailin tënd. Fjalëkalimi nuk ndahet. Nëse je mysafir, bisedat nuk ruhen në llogari derisa të hysh.",
  },
  {
    title: "Lidhje e mbrojtur",
    text: "Albanian AI hapet vetëm me HTTPS. Të dhënat udhëtojnë të koduara ndërmjet telefonit dhe serverit.",
  },
  {
    title: "Mikrofoni dhe kamera",
    text: "Hapen vetëm kur ti i lejon. Zëri dhe fotoja përdoren për t’iu përgjigjur ty, jo për t’u shitur.",
  },
  {
    title: "Çelësat e sistemit",
    text: "Çelësat e shërbimeve rrinë në server, jo në telefonin tënd. Nuk dalin te biseda.",
  },
  {
    title: "Fshirja",
    text: "Mund ta fshish një bisedë nga menuja. Ajo nuk mbetet te lista jote.",
  },
  {
    title: "Privatësia",
    text: "Nuk i japim të dhënat e tua palëve për reklama. Politika e plotë: albanianai.it/privacy — " + CREATOR.email,
  },
];

export function SecuritySheet({ onClose }: { onClose: () => void }) {
  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-panel about-sheet" onClick={(event) => event.stopPropagation()}>
        <div className="settings-header">
          <div>
            <div className="eyebrow">SIGURIA JOTE</div>
            <h3>Biseda të mbrojtura</h3>
          </div>
          <button className="icon-button" onClick={onClose} type="button" aria-label="Mbyll">
            <X size={18} />
          </button>
        </div>
        <div className="settings-body about-body">
          <div className="security-hero">
            <ShieldCheck size={28} />
            <p>
              Albanian AI është ndërtuar që ti të jesh i qetë. Bisedat, zëri dhe fotot e tua
              mbeten te ti.
            </p>
          </div>
          {ITEMS.map((item) => (
            <div key={item.title} className="security-item">
              <Lock size={16} />
              <div>
                <strong>{item.title}</strong>
                <span>{item.text}</span>
              </div>
            </div>
          ))}
          <a className="about-link" href="/privacy">
            Lexo politikën e plotë të privatësisë
          </a>
        </div>
      </div>
    </div>
  );
}
