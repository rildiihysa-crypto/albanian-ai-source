import { ShieldCheck } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";

const GUEST_NAME_KEY = "albanian-ai-guest-name";

export function AuthCard({
  eyebrow = "MIRË SE ERDHE",
  title = "Vazhdo me Albanian AI",
  note = "Shkruaj vetëm emrin dhe mbiemrin për të filluar. Nuk kërkohet email ose fjalëkalim.",
}: {
  eyebrow?: string;
  title?: string;
  note?: string;
}) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(GUEST_NAME_KEY)?.trim() || "";
      const parts = saved.split(/\s+/).filter(Boolean);
      setFirstName(parts[0] || "");
      setLastName(parts.slice(1).join(" "));
    } catch {
      /* storage unavailable — the name can still be entered for this visit */
    }
  }, []);

  const submitName = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const first = firstName.trim();
    const last = lastName.trim();
    if (!first || !last) {
      toast.error("Shkruaj emrin dhe mbiemrin.");
      return;
    }
    const fullName = `${first} ${last}`.replace(/\s+/g, " ");
    try {
      localStorage.setItem(GUEST_NAME_KEY, fullName);
    } catch {
      /* continue even if private browsing blocks storage */
    }
    window.location.href = "/app";
  };

  return (
    <div className="signin-card">
      <div className="brand-mark large">
        <img src="/logo-192.jpg" alt="Albanian AI" />
      </div>
      <div className="eyebrow">{eyebrow}</div>
      <h1>{title}</h1>
      <p>{note}</p>
      <p className="creator-line">Krijuar nga Amarildo Hysa</p>

      <form className="auth-form" onSubmit={submitName}>
        <label>
          Emri
          <input
            name="firstName"
            autoComplete="given-name"
            value={firstName}
            onChange={(event) => setFirstName(event.target.value)}
            placeholder="Emri"
            required
          />
        </label>
        <label>
          Mbiemri
          <input
            name="lastName"
            autoComplete="family-name"
            value={lastName}
            onChange={(event) => setLastName(event.target.value)}
            placeholder="Mbiemri"
            required
          />
        </label>
        <button className="signin-button" type="submit">
          Vazhdo
        </button>
      </form>

      <div className="local-auth-note">
        Hyrje lokale në këtë pajisje — pa Google, Apple, email ose fjalëkalim.
      </div>
      <div className="secure-note">
        <ShieldCheck size={15} /> Bisedat e kësaj mënyre ruhen vetëm në këtë pajisje dhe nuk janë të dukshme për krijuesin.
      </div>
    </div>
  );
}

export { GUEST_NAME_KEY };
