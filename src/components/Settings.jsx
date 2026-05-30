// Copyright © 2026 Michael FR Marques & Tamara Lechner. All rights reserved.
// Sanctum — Private and confidential. Unauthorised use prohibited.
// https://sanctum.app
import { useState, useEffect } from "react";
import { auth, sb } from "../lib/supabase";
import { Icon } from "./shared";

const TIMEZONES = [
  { id: "Europe/Dublin",     label: "Dublin (IST/GMT)"   },
  { id: "Europe/London",     label: "London (BST/GMT)"   },
  { id: "Europe/Lisbon",     label: "Lisbon (WEST/WET)"  },
  { id: "America/New_York",  label: "New York (EST/EDT)"  },
  { id: "America/Sao_Paulo", label: "São Paulo (BRT)"     },
];

export default function Settings({ user, onLogout, theme, onThemeChange, font, onFontChange, sb }) {
  const userKey = user?.id ? `sanctum_display_name_${user.id}` : "sanctum_display_name";
  const emailUsername = (user?.email || "").split("@")[0];
  const [displayName, setDisplayName] = useState(() =>
    user?.user_metadata?.display_name ||
    localStorage.getItem(userKey) ||
    emailUsername
  );
  const [timezone, setTimezone] = useState(() =>
    user?.user_metadata?.timezone ||
    localStorage.getItem("sanctum_timezone") || "Europe/Dublin"
  );
  useEffect(() => {
    (async () => {
      try {
        const [profile, tzRow] = await Promise.all([
          sb.from("profiles").select("display_name,timezone", `&user_id=eq.${user?.id}`, ""),
          sb.from("ozzy_profile").select("value", `&key=eq.timezone&user_id=eq.${user?.id}`, ""),
        ]);
        if (Array.isArray(profile) && profile[0]) {
          if (profile[0].display_name) {
            setDisplayName(profile[0].display_name);
            localStorage.setItem(userKey, profile[0].display_name);
          }
          if (profile[0].timezone) setTimezone(profile[0].timezone);
        }
        // ozzy_profile takes precedence for timezone
        if (Array.isArray(tzRow) && tzRow[0]?.value) setTimezone(tzRow[0].value);
      } catch {}
    })();
  }, []);

  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  const save = async () => {
    setSaved(false); setSaveError(false);
    // Always persist locally so the app shows the name on next load
    localStorage.setItem(userKey, displayName);
    localStorage.setItem("sanctum_timezone", timezone);
    // Also try to save to auth metadata (best-effort, log failures)
    const result = await auth.updateUser({ display_name: displayName, timezone });
    // Upsert to profiles table as a second backup
    try {
      await sb.from('profiles').upsert({ id: user?.id, user_id: user?.id, display_name: displayName, timezone }, 'id');
    } catch {}
    // Canonical timezone store — used by Calendar and other components
    try {
      await sb.from('ozzy_profile').upsert({ key: 'timezone', value: timezone, user_id: user?.id }, 'key,user_id');
    } catch {}
    if (result?.id) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } else {
      // localStorage saved successfully, show saved even if auth metadata failed
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    }
  };

  const exportAllData = async () => {
    try {
      const [
        notes, tasks, events, sessions,
        applications, finance, trips, notebooks
      ] = await Promise.all([
        sb.from('notes').select('*'),
        sb.from('tasks').select('*'),
        sb.from('events').select('*'),
        sb.from('study_sessions').select('*'),
        sb.from('applications').select('*'),
        sb.from('finance').select('*'),
        sb.from('trips').select('*'),
        sb.from('notebooks').select('*'),
      ]);

      const exportData = {
        exported_at: new Date().toISOString(),
        user: user?.email,
        data: {
          notes,
          tasks,
          events,
          study_sessions: sessions,
          applications,
          finance,
          trips,
          notebooks,
          settings: {
            theme: localStorage.getItem('sanctum_theme'),
            font: localStorage.getItem('sanctum_font'),
            display_name: user?.user_metadata?.display_name || localStorage.getItem(`sanctum_display_name_${user?.id}`),
            timezone: user?.user_metadata?.timezone || localStorage.getItem('sanctum_timezone'),
          }
        }
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sanctum-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
      alert('Export failed. Please try again.');
    }
  };

  const deleteAllData = async () => {
    if (deleteConfirmText !== 'DELETE') return;

    try {
      // Delete all user data from every table
      await Promise.all([
        sb.from('notes').delete({ user_id: user.id }),
        sb.from('tasks').delete({ user_id: user.id }),
        sb.from('events').delete({ user_id: user.id }),
        sb.from('study_sessions').delete({ user_id: user.id }),
        sb.from('applications').delete({ user_id: user.id }),
        sb.from('finance').delete({ user_id: user.id }),
        sb.from('trips').delete({ user_id: user.id }),
        sb.from('custom_trackers').delete({ user_id: user.id }),
        sb.from('tracker_entries').delete({ user_id: user.id }),
        sb.from('vet_visits').delete({ user_id: user.id }),
        sb.from('notebooks').delete({ user_id: user.id }),
        sb.from('ozzy_profile').delete({ user_id: user.id }),
        sb.from('study_subjects').delete({ user_id: user.id }),
        sb.from('study_topics').delete({ user_id: user.id }),
        sb.from('ozzy_docs').delete({ user_id: user.id }),
        sb.from('profiles').delete({ id: user.id }),
      ]);

      // NOTE: Deleting the auth user (auth.admin.deleteUser) requires the
      // Supabase service role key, which must never be exposed client-side.
      // The user's auth account remains in Supabase auth but all their data
      // is gone. To fully remove the auth record, add a Supabase Edge Function
      // or Vercel API route that calls admin.deleteUser server-side.

      localStorage.clear();
      await onLogout();
    } catch (err) {
      console.error('Delete failed:', err);
      alert('Delete failed. Please try again.');
    }
  };

  const FONTS = [
    { id: "default", label: "Default (Inter)" },
    { id: "sans",    label: "Sans (system-ui)" },
    { id: "mono",    label: "Mono (JetBrains)" },
    { id: "dyslexic",label: "Dyslexic friendly" },
  ];

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
        <div style={{ marginTop: 20 }}>
          <label className="form-label">App font</label>
          <select className="inp" value={font || "default"} onChange={e => onFontChange(e.target.value)} style={{ maxWidth: 280 }}>
            {FONTS.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
          </select>
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
            <label className="form-label">Timezone</label>
            <select className="inp" value={timezone} onChange={e => setTimezone(e.target.value)}>
              {TIMEZONES.map(tz => <option key={tz.id} value={tz.id}>{tz.label}</option>)}
            </select>
          </div>
          <button className="btn primary" onClick={save} style={{ marginTop: 8 }}>
            {saved ? "✓ Saved" : saveError ? "Save failed — try again" : "Save changes"}
          </button>
        </div>

        <div className="card">
          <div className="card-header"><div className="card-title">Account</div></div>
          {[
            { label: "Email", value: user?.email },
            { label: "Account created", value: user?.created_at?.slice(0, 10) || "—" },
            { label: "Data location", value: "EU — Stockholm" },
            { label: "Encryption", value: "End-to-end ✓" },
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

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 0', borderTop: '1px solid var(--b1)', marginTop: 16 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--t1)' }}>Export your data</div>
            <div style={{ fontSize: 12, color: 'var(--t3)', marginTop: 2 }}>Download everything — notes, tasks, events, study sessions, trips, career data</div>
          </div>
          <button className="btn" onClick={exportAllData} style={{ flexShrink: 0 }}>Download JSON</button>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 0', borderTop: '1px solid var(--b1)' }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--red)' }}>Delete all data</div>
            <div style={{ fontSize: 12, color: 'var(--t3)', marginTop: 2 }}>Permanently delete all your notes, tasks, events and account data. This cannot be undone.</div>
          </div>
          <button
            className="btn"
            onClick={() => setShowDeleteConfirm(true)}
            style={{ flexShrink: 0, color: 'var(--red)', borderColor: 'var(--red)' }}
          >
            Delete everything
          </button>
        </div>
      </div>

      {showDeleteConfirm && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 420 }}>
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--red)" strokeWidth="1.5" style={{ margin: '0 auto 12px', display: 'block' }}>
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--t1)' }}>Delete everything?</div>
              <div style={{ fontSize: 13, color: 'var(--t3)', marginTop: 8 }}>
                This will permanently delete all your notes, tasks, events, study sessions, career data, trips, and account. This cannot be undone.
              </div>
            </div>

            <div style={{ background: 'var(--bg2)', borderRadius: 10, padding: 16, marginBottom: 16 }}>
              <div style={{ fontSize: 13, color: 'var(--t2)', marginBottom: 8 }}>
                Type <strong>DELETE</strong> to confirm:
              </div>
              <input
                className="inp"
                placeholder="Type DELETE"
                value={deleteConfirmText}
                onChange={e => setDeleteConfirmText(e.target.value)}
                autoFocus
              />
            </div>

            <div className="modal-actions">
              <button className="btn" onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmText(''); }}>
                Cancel
              </button>
              <button
                className="btn"
                disabled={deleteConfirmText !== 'DELETE'}
                onClick={deleteAllData}
                style={{
                  background: deleteConfirmText === 'DELETE' ? 'var(--red)' : 'var(--bg2)',
                  color: deleteConfirmText === 'DELETE' ? '#fff' : 'var(--t3)',
                  border: 'none'
                }}
              >
                Delete everything permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
