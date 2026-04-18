import { useState } from "react";
import { Icon } from "./shared";

export default function Settings({ user, onLogout, theme, onThemeChange }) {
  const userKey = user?.id ? `sanctum_display_name_${user.id}` : "sanctum_display_name";
  const emailUsername = (user?.email || "").split("@")[0];
  const [displayName, setDisplayName] = useState(() =>
    localStorage.getItem(userKey) ||
    localStorage.getItem("sanctum_display_name") ||
    emailUsername
  );
  const [weeklyGoal, setWeeklyGoal] = useState(() => localStorage.getItem("sanctum_weekly_goal") || "10");
  const [saved, setSaved] = useState(false);

  const save = () => {
    localStorage.setItem(userKey, displayName);
    localStorage.setItem("sanctum_display_name", displayName); // legacy compat
    localStorage.setItem("sanctum_weekly_goal", weeklyGoal);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const THEMES = [
    {
      id: "dark",
      name: "Midnight",
      desc: "Deep navy, blue accents",
      sidebar: "#0d1117",
      body: "#161b22",
      accent: "#7b8ec8",
    },
    {
      id: "light",
      name: "Light",
      desc: "Clean, airy, blue accents",
      sidebar: "#ffffff",
      body: "#f6f8fa",
      accent: "#0969da",
    },
    {
      id: "tamara",
      name: "Tamara",
      desc: "Dark base, pink accents",
      sidebar: "#0d1117",
      body: "#161b22",
      accent: "#ec4899",
    },
  ];

  return (
    <div className="page-body animate-in">
      <div className="card mb18">
        <div className="card-header"><div className="card-title">Appearance</div></div>
        <div className="theme-cards">
          {THEMES.map(t => (
            <div
              key={t.id}
              className={`theme-card${theme === t.id ? " active" : ""}`}
              onClick={() => onThemeChange(t.id)}
            >
              <div className="theme-swatch">
                <div className="theme-swatch-sidebar" style={{ background: t.sidebar }} />
                <div className="theme-swatch-body" style={{ background: t.body, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: t.accent }} />
                </div>
              </div>
              <div className="theme-card-name">{t.name}</div>
              <div className="theme-card-desc">{t.desc}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid-2 mb18">
        <div className="card">
          <div className="card-header"><div className="card-title">Profile</div></div>
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
            <div style={{ width: 56, height: 56, borderRadius: "50%", background: "linear-gradient(135deg, var(--blue), var(--purple))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, color: "#fff", fontWeight: 700, fontFamily: "var(--mono)", flexShrink: 0 }}>
              {(displayName || user?.email || "?").slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "var(--t1)" }}>{displayName || "Set your name"}</div>
              <div style={{ fontSize: 12, color: "var(--t3)", fontFamily: "var(--mono)" }}>{user?.email}</div>
            </div>
          </div>
          <div className="form-row">
            <label className="form-label">Display name</label>
            <input className="inp" value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder={emailUsername || "Your name"} />
          </div>
          <div className="form-row">
            <label className="form-label">Weekly study goal (hours)</label>
            <input className="inp" type="number" min="1" max="40" value={weeklyGoal} onChange={e => setWeeklyGoal(e.target.value)} />
          </div>
          <button className="btn primary" onClick={save} style={{ marginTop: 8 }}>{saved ? "✓ Saved" : "Save changes"}</button>
        </div>

        <div className="card">
          <div className="card-header"><div className="card-title">Account</div></div>
          {[
            { label: "Email", value: user?.email },
            { label: "Account created", value: user?.created_at?.slice(0, 10) || "—" },
            { label: "Data location", value: "EU — Stockholm" },
            { label: "Encryption", value: "End-to-end" },
            { label: "Plan", value: "Personal" },
          ].map(item => (
            <div key={item.label} className="fin-row">
              <span style={{ fontSize: 12, color: "var(--t3)", fontWeight: 600 }}>{item.label}</span>
              <span style={{ fontSize: 13, color: "var(--t1)" }}>{item.value}</span>
            </div>
          ))}
          <button className="btn danger" style={{ width: "100%", justifyContent: "center", marginTop: 16 }} onClick={onLogout}>
            <Icon name="logout" size={14} /> Sign out
          </button>
        </div>
      </div>

      <div className="card" style={{ background: "rgba(16,185,129,0.05)", borderColor: "rgba(16,185,129,0.2)" }}>
        <div className="card-header"><div className="card-title">🔒 Privacy & Security</div></div>
        <div className="grid-3">
          {[
            { icon: "🚫", title: "No ads. Ever.", body: "Sanctum will never show ads or sell your data." },
            { icon: "🇪🇺", title: "EU data residency", body: "All data stored in Stockholm, Sweden (eu-north-1). Fully GDPR compliant." },
            { icon: "🔐", title: "Encrypted", body: "Data encrypted in transit and at rest. We cannot read your notes." },
          ].map(item => (
            <div key={item.title} style={{ padding: 16, background: "var(--bg2)", borderRadius: 12, border: "1px solid var(--b1)" }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>{item.icon}</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--t1)", marginBottom: 4 }}>{item.title}</div>
              <div style={{ fontSize: 12, color: "var(--t3)", lineHeight: 1.5 }}>{item.body}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
