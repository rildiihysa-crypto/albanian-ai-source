import { Bell, Clock, Gauge, Info, LogOut, Plus, Settings2, ShieldCheck, Sparkles, Trash2, UserRound } from "lucide-react";
import { AVATAR_COLORS, forgetAccount, listAccounts, type SavedAccount } from "@/lib/accounts";
import { signOut } from "@/lib/auth/client";
import type { AppUser } from "@/lib/auth/use-current-user";
import type { Lang } from "@/lib/assistant/types";

function hello(lang: Lang, name: string) {
  const hour = new Date().getHours();
  const first = name.split(" ")[0] || name;
  if (lang === "it") {
    if (hour < 12) return `Buongiorno, ${first}.`;
    if (hour < 18) return `Buon pomeriggio, ${first}.`;
    return `Buonasera, ${first}.`;
  }
  if (lang === "en") {
    if (hour < 12) return `Good morning, ${first}.`;
    if (hour < 18) return `Good afternoon, ${first}.`;
    return `Good evening, ${first}.`;
  }
  if (hour < 12) return `Mirëmëngjes, ${first}.`;
  if (hour < 18) return `Mirëdita, ${first}.`;
  return `Mirëmbrëma, ${first}.`;
}

export function AccountSheet({
  user,
  isGuest,
  lang,
  onClose,
  onSettings,
  onSecurity,
  onAbout,
  onPro,
  onHistory,
  onLogin,
  onDeleteChat,
  plan,
}: {
  user: AppUser | null;
  isGuest: boolean;
  lang: Lang;
  onClose: () => void;
  onSettings: () => void;
  onSecurity: () => void;
  onAbout: () => void;
  onPro: () => void;
  onHistory: () => void;
  onLogin: () => void;
  onDeleteChat?: () => void;
  plan?: "lite" | "flash" | "pro";
}) {
  const accounts = isGuest ? [] : listAccounts();
  const email = (user?.primaryEmail || "").trim();
  const name = user?.displayName || (isGuest ? "Mysafir" : email.split("@")[0] || "Llogaria ime");
  const others = accounts.filter((item) => item.email !== email.toLowerCase());

  const goLogin = async () => {
    onClose();
    if (user) {
      try {
        await signOut();
      } catch {
        /* ignore */
      }
    }
    window.location.href = "/login";
  };

  const switchTo = async (account: SavedAccount) => {
    onClose();
    try {
      await signOut();
    } catch {
      /* ignore */
    }
    window.location.href = `/login?next=/app&hint=${encodeURIComponent(account.email)}`;
  };

  return (
    <div className="acct-sheet" onClick={onClose}>
      <div className="acct-card" onClick={(event) => event.stopPropagation()}>
        <div className="acct-top">
          <span>{isGuest ? "Mysafir" : email || name}</span>
          <button type="button" onClick={onClose}>
            Mbyll
          </button>
        </div>
        <div className="acct-hero">
          <div className="acct-avatar">{name.slice(0, 1).toUpperCase()}</div>
          <h3>{isGuest ? "Hyr në llogarinë tënde" : hello(lang, name)}</h3>
          {!isGuest && email ? <p className="acct-mail">{email}</p> : null}
          <p className="acct-plan">
            {plan === "pro" ? "Plani: Albanian AI Pro" : plan === "flash" ? "Plani: Albanian AI Flash" : "Plani: Albanian AI Flash-Lite"}
          </p>
          <button
            type="button"
            className="acct-manage"
            onClick={() => {
              onClose();
              if (isGuest) onLogin();
              else onSettings();
            }}
          >
            Menaxho llogarinë
          </button>
        </div>
        <div className="acct-switch">
          <span>Ndrysho llogari</span>
          <div className="acct-dots">
            {others.map((account, index) => (
              <button
                key={account.email}
                type="button"
                className="acct-mini"
                style={{ background: AVATAR_COLORS[index % AVATAR_COLORS.length] }}
                title={account.email}
                onClick={() => void switchTo(account)}
              >
                {account.initial}
              </button>
            ))}
            <button type="button" className="acct-add" onClick={() => void goLogin()} title="Shto adresë">
              <Plus size={16} />
            </button>
          </div>
        </div>
        <p className="acct-hint">Shto Google ose email tjetër — çdo llogari ruan bisedat e veta.</p>
        <div className="acct-list">
          <button type="button" onClick={onHistory}>
            <Clock size={18} /> Aktiviteti i Albanian AI
          </button>
          <button
            type="button"
            onClick={() => {
              onClose();
              onSettings();
            }}
          >
            <Gauge size={18} /> Limitet e përdorimit
          </button>
          <button type="button" onClick={onClose}>
            <Bell size={18} /> Njoftimet e përditësimit
          </button>
          <button
            type="button"
            onClick={() => {
              onClose();
              onSettings();
            }}
          >
            <UserRound size={18} /> Konteksti personal
          </button>
          <button
            type="button"
            onClick={() => {
              onClose();
              onSecurity();
            }}
          >
            <ShieldCheck size={18} /> Siguria
          </button>
          <button
            type="button"
            onClick={() => {
              onClose();
              onSettings();
            }}
          >
            <Settings2 size={18} /> Cilësimet
          </button>
          <button
            type="button"
            onClick={() => {
              onClose();
              onAbout();
            }}
          >
            <Info size={18} /> Rreth nesh
          </button>
          <button
            type="button"
            onClick={() => {
              onClose();
              onPro();
            }}
          >
            <Sparkles size={18} /> Albanian AI Pro
          </button>
          {onDeleteChat ? (
            <button type="button" className="acct-danger" onClick={onDeleteChat}>
              <Trash2 size={18} /> Fshi bisedën
            </button>
          ) : null}
        </div>
        {isGuest ? (
          <button type="button" className="acct-out" onClick={onLogin}>
            Hyr ose krijo llogari
          </button>
        ) : (
          <button
            type="button"
            className="acct-out"
            onClick={() => {
              if (email) forgetAccount(email);
              void signOut();
            }}
          >
            <LogOut size={16} /> Dil nga kjo llogari
          </button>
        )}
      </div>
    </div>
  );
}
