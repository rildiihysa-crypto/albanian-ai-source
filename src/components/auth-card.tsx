import { authClient, authEnabled } from "@/lib/auth/client";
import { Loader2, ShieldCheck } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";

export function AuthCard({
  eyebrow = "LLOgaria jote",
  title = "Meet Albanian AI.",
  note = "Krijo llogarinë tënde direkt te Albanian AI. Bisedat mbeten vetëm te llogaria jote.",
}: {
  eyebrow?: string;
  title?: string;
  note?: string;
}) {
  const [mode, setMode] = useState<"signup" | "signin">("signup");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    try {
      const hint = new URLSearchParams(window.location.search).get("hint") || "";
      if (hint.includes("@")) {
        setEmail(hint.trim().toLowerCase());
        setMode("signin");
      }
    } catch {
      /* ignore */
    }
  }, []);

  const submitEmail = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const nextName = String(data.get("name") || name).trim();
    const nextEmail = String(data.get("email") || email).trim().toLowerCase();
    const nextPassword = String(data.get("password") || password);
    setName(nextName);
    setEmail(nextEmail);
    setPassword(nextPassword);
    if (!nextEmail || nextPassword.length < 8) {
      toast.error("Shkruaj emailin dhe fjalëkalimin (të paktën 8 shenja).");
      return;
    }
    setBusy("email");
    try {
      if (mode === "signup") {
        if (!nextName) {
          toast.error("Shkruaj emrin tënd.");
          setBusy(null);
          return;
        }
        const { error } = await authClient.signUp.email({
          email: nextEmail,
          password: nextPassword,
          name: nextName,
        });
        if (error) {
          const msg = error.message || "";
          if (/exist|already|registered/i.test(msg)) {
            setMode("signin");
            throw new Error("Kjo email ka llogari. Prek Hyr.");
          }
          throw new Error(msg || "Regjistrimi dështoi.");
        }
      } else {
        const { error } = await authClient.signIn.email({
          email: nextEmail,
          password: nextPassword,
        });
        if (error) {
          const msg = error.message || "";
          if (/not found|invalid|credential|password/i.test(msg)) {
            throw new Error("Email ose fjalëkalim i gabuar. Nëse s’ke llogari, prek «Krijo llogari».");
          }
          throw new Error(msg || "Hyrja dështoi.");
        }
      }
      await authClient.getSession();
      window.location.href = "/";
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Nuk u krye hyrja.");
      setBusy(null);
    }
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

      <div className="auth-tabs">
        <button type="button" className={mode === "signup" ? "selected" : ""} onClick={() => setMode("signup")}>
          Krijo llogari
        </button>
        <button type="button" className={mode === "signin" ? "selected" : ""} onClick={() => setMode("signin")}>
          Hyr
        </button>
      </div>

      <form className="auth-form" onSubmit={(event) => void submitEmail(event)}>
        {mode === "signup" && (
          <label>
            Emri
            <input name="name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Amarildo" />
          </label>
        )}
        <label>
          Email
          <input name="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="emri@icloud.com" />
        </label>
        <label>
          Fjalëkalimi
          <input
            name="password"
            type="password"
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Të paktën 8 shenja"
          />
        </label>
        <button className="signin-button" type="submit" disabled={busy !== null}>
          {busy === "email" ? <Loader2 size={16} className="spin" /> : null}
          {mode === "signup" ? "Regjistrohu" : "Hyr në llogari"}
        </button>
      </form>

      <div className="local-auth-note">
        {authEnabled ? "Kjo është llogari lokale e Albanian AI — nuk kërkon Google ose Apple." : "Hyrja aktivizohet pas publikimit."}
      </div>
      <div className="secure-note">
        <ShieldCheck size={15} /> Të dhënat e tua nuk ndahen me përdorues të tjerë
      </div>
    </div>
  );
}
