import { useEffect, useState } from "react";
import { Users, X } from "lucide-react";
import { getOwnerUsage, type UsageStats } from "@/lib/assistant/actions";

export function StatsSheet({ owner, onClose }: { owner: boolean; onClose: () => void }) {
  const [stats, setStats] = useState<UsageStats>();

  useEffect(() => {
    void getOwnerUsage()
      .then(setStats)
      .catch(() => setStats({ users: 0, week: 0, google: 0, conversations: 0, messages: 0, owner: false }));
  }, [owner]);

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-panel about-sheet" onClick={(event) => event.stopPropagation()}>
        <div className="settings-header">
          <div>
            <div className="eyebrow">STATISTIKA</div>
            <h3>Përdoruesit</h3>
          </div>
          <button className="icon-button" onClick={onClose} type="button" aria-label="Mbyll">
            <X size={18} />
          </button>
        </div>
        <div className="settings-body about-body">
          <div className="stat-hero">
            <Users size={26} />
            <div>
              <strong>{stats ? stats.users : "…"}</strong>
              <span>të regjistruar me email ose Google</span>
            </div>
          </div>
          {stats?.owner ? (
            <div className="stat-grid">
              <div>
                <strong>{stats.week}</strong>
                <span>7 ditët e fundit</span>
              </div>
              <div>
                <strong>{stats.google}</strong>
                <span>me Google</span>
              </div>
              <div>
                <strong>{stats.conversations}</strong>
                <span>biseda</span>
              </div>
              <div>
                <strong>{stats.messages}</strong>
                <span>mesazhe</span>
              </div>
            </div>
          ) : (
            <p className="field-note">Mysafirët pa llogari nuk numërohen këtu.</p>
          )}
        </div>
      </div>
    </div>
  );
}
