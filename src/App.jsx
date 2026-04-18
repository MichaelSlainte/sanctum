import { useState, useEffect, useRef, useCallback, useMemo } from "react";

// ─── SUPABASE ────────────────────────────────────────────────────────────────
const SUPABASE_URL = "https://hqlgwisfkkosgekotojz.supabase.co";
const SUPABASE_KEY = "sb_publishable_Eky9AvrbiYjejxogwxwJ6Q_x7eoySQ4";

const auth = {
  signUp: async (email, password) => {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
      method: "POST", headers: { apikey: SUPABASE_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });
    return res.json();
  },
  signIn: async (email, password) => {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: "POST", headers: { apikey: SUPABASE_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });
    return res.json();
  },
  signOut: () => {
    localStorage.removeItem("sanctum_token");
    localStorage.removeItem("sanctum_user");
    localStorage.removeItem("sanctum_expiry");
    localStorage.removeItem("sanctum_refresh");
  },
  getSession: () => {
    const token = localStorage.getItem("sanctum_token");
    const user = localStorage.getItem("sanctum_user");
    const expiry = localStorage.getItem("sanctum_expiry");
    if (token && user) {
      if (expiry && Date.now() > parseInt(expiry)) {
        localStorage.removeItem("sanctum_token");
        localStorage.removeItem("sanctum_user");
        localStorage.removeItem("sanctum_expiry");
        return null;
      }
      return { token, user: JSON.parse(user) };
    }
    return null;
  },
  saveSession: (data) => {
    localStorage.setItem("sanctum_token", data.access_token);
    localStorage.setItem("sanctum_user", JSON.stringify(data.user));
    if (data.refresh_token) localStorage.setItem("sanctum_refresh", data.refresh_token);
    const expiry = Date.now() + (data.expires_in || 3600) * 1000;
    localStorage.setItem("sanctum_expiry", expiry.toString());
  },
  refreshSession: async () => {
    const refresh = localStorage.getItem("sanctum_refresh");
    if (!refresh) return false;
    try {
      const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
        method: "POST",
        headers: { apikey: SUPABASE_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refresh })
      });
      const data = await res.json();
      if (data.access_token) { auth.saveSession(data); return true; }
    } catch { }
    return false;
  }
};

const sb = {
  from: (table) => ({
    select: async (cols = "*", filters = "") => {
      const session = auth.getSession();
      const headers = { apikey: SUPABASE_KEY, "Content-Type": "application/json" };
      if (session) headers.Authorization = `Bearer ${session.token}`;
      const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=${cols}&order=created_at.desc${filters}`, { headers });
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    },
    insert: async (data) => {
      const session = auth.getSession();
      const headers = { apikey: SUPABASE_KEY, "Content-Type": "application/json", Prefer: "return=representation" };
      if (session) headers.Authorization = `Bearer ${session.token}`;
      const payload = session ? { ...data, user_id: session.user.id } : data;
      const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, { method: "POST", headers, body: JSON.stringify(payload) });
      return res.json();
    },
    update: async (data, match) => {
      const session = auth.getSession();
      const headers = { apikey: SUPABASE_KEY, "Content-Type": "application/json", Prefer: "return=representation" };
      if (session) headers.Authorization = `Bearer ${session.token}`;
      const params = Object.entries(match).map(([k, v]) => `${k}=eq.${v}`).join("&");
      const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${params}`, { method: "PATCH", headers, body: JSON.stringify(data) });
      return res.json();
    },
    delete: async (match) => {
      const session = auth.getSession();
      const headers = { apikey: SUPABASE_KEY, "Content-Type": "application/json" };
      if (session) headers.Authorization = `Bearer ${session.token}`;
      const params = Object.entries(match).map(([k, v]) => `${k}=eq.${v}`).join("&");
      const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${params}`, { method: "DELETE", headers });
      return res.ok;
    }
  })
};

// ─── CSS ─────────────────────────────────────────────────────────────────────
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,300;0,14..32,400;0,14..32,500;0,14..32,600;0,14..32,700;1,14..32,400&family=JetBrains+Mono:wght@400;500&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    /* Base surfaces — Midnight (default) */
    --bg:    #0d1117;
    --bg1:   #0d1117;
    --bg2:   #161b22;
    --bg3:   #1c2128;
    /* Borders */
    --b1:    #21262d;
    --b2:    #30363d;
    --b3:    #484f58;
    /* Text */
    --t1:    #e6edf3;
    --t2:    #8b949e;
    --t3:    #484f58;
    /* Accent */
    --blue:  #7b8ec8;
    --blue2: #6a7db8;
    --bluem: rgba(123,142,200,0.1);
    --blueb: rgba(123,142,200,0.25);
    --grn:   #10b981;
    --grnm:  rgba(16,185,129,0.10);
    --red:   #ef4444;
    --amber: #f59e0b;
    --purple:#a78bcc;
    --pink:  #ec4899;
    /* Type */
    --mono:  'JetBrains Mono', monospace;
    --sans:  'Inter', sans-serif;
    /* Shape */
    --r:     12px;
    --r2:    16px;
    /* Shadows */
    --shadow:  0 4px 24px rgba(0,0,0,0.45);
    --shadow2: 0 12px 48px rgba(0,0,0,0.55);
    /* Glass */
    --glass-bg:     rgba(13,17,23,0.75);
    --glass-border: rgba(255,255,255,0.06);
    --glass-blur:   blur(20px) saturate(140%);
  }

  [data-theme="light"] {
    --bg:    #f6f8fa;
    --bg1:   #ffffff;
    --bg2:   #f6f8fa;
    --bg3:   #eaeef2;
    --b1:    #d0d7de;
    --b2:    #bfc7cf;
    --b3:    #8c959f;
    --t1:    #1f2328;
    --t2:    #656d76;
    --t3:    #8c959f;
    --blue:  #0969da;
    --blue2: #0550ae;
    --bluem: rgba(9,105,218,0.1);
    --blueb: rgba(9,105,218,0.3);
    --grn:   #1a7f37;
    --grnm:  rgba(26,127,55,0.10);
    --red:   #cf222e;
    --amber: #9a6700;
    --purple:#7c3aed;
    --pink:  #db2777;
    --glass-bg:     rgba(255,255,255,0.85);
    --glass-border: rgba(0,0,0,0.08);
    --glass-blur:   blur(20px) saturate(140%);
    --shadow:       0 4px 24px rgba(0,0,0,0.1);
  }

  [data-theme="tamara"] {
    --bg:    #0d1117;
    --bg1:   #0d1117;
    --bg2:   #161b22;
    --bg3:   #1c2128;
    --b1:    #21262d;
    --b2:    #30363d;
    --b3:    #484f58;
    --t1:    #e6edf3;
    --t2:    #8b949e;
    --t3:    #484f58;
    --blue:  #ec4899;
    --blue2: #db2777;
    --bluem: rgba(236,72,153,0.1);
    --blueb: rgba(236,72,153,0.25);
    --grn:   #10b981;
    --grnm:  rgba(16,185,129,0.10);
    --red:   #ef4444;
    --amber: #f59e0b;
    --purple:#f472b6;
    --pink:  #f472b6;
    --glass-bg:     rgba(13,17,23,0.75);
    --glass-border: rgba(236,72,153,0.08);
    --glass-blur:   blur(20px) saturate(140%);
  }

  html, body, #root {
    height: 100%; background: var(--bg);
    color: var(--t1); font-family: var(--sans);
    font-size: 14px; -webkit-font-smoothing: antialiased;
    font-feature-settings: "cv11", "ss01";
  }

  .shell { display: flex; height: 100vh; overflow: hidden; }

  .main-bg {
    background-image:
      radial-gradient(ellipse at 12% 20%, var(--bluem) 0%, transparent 52%),
      radial-gradient(ellipse at 88% 80%, var(--bluem) 0%, transparent 52%),
      radial-gradient(ellipse at 50% 50%, var(--grnm) 0%, transparent 60%);
  }

  /* ── Sidebar ── */
  .sidebar {
    width: 224px; min-width: 224px;
    background: var(--bg1);
    backdrop-filter: var(--glass-blur); -webkit-backdrop-filter: var(--glass-blur);
    border-right: 1px solid var(--glass-border);
    display: flex; flex-direction: column;
    overflow-y: auto;
  }
  .sidebar-logo {
    display: flex; align-items: center; gap: 12px;
    padding: 24px 20px 20px;
    border-bottom: 1px solid var(--b1);
  }
  .logo-mark {
    width: 36px; height: 36px; border-radius: 10px;
    background: linear-gradient(135deg, var(--blue), var(--purple));
    display: flex; align-items: center; justify-content: center;
    font-family: var(--mono); font-size: 14px; font-weight: 700;
    color: #fff; flex-shrink: 0;
    box-shadow: 0 4px 16px var(--bluem), 0 0 0 1px var(--blueb);
  }
  .logo-name { font-size: 15px; font-weight: 700; color: var(--t1); letter-spacing: -.3px; }
  .logo-sub  { font-size: 10px; color: var(--t3); font-family: var(--mono); margin-top: 2px; letter-spacing: .3px; }

  .nav-section { padding: 16px 10px 4px; }
  .nav-label {
    font-size: 9px; letter-spacing: 2px; text-transform: uppercase;
    color: var(--t3); padding: 0 10px; margin-bottom: 6px; font-weight: 600;
  }
  .nav-item {
    display: flex; align-items: center; gap: 10px;
    padding: 9px 12px; border-radius: 10px; cursor: pointer;
    color: var(--t3); font-size: 13px; font-weight: 500;
    transition: all .15s; border: 1px solid transparent;
    user-select: none; margin-bottom: 2px;
  }
  .nav-item:hover { background: rgba(255,255,255,0.04); color: var(--t2); border-color: var(--b1); }
  .nav-item.active {
    background: linear-gradient(135deg, rgba(59,130,246,0.14), rgba(59,130,246,0.07));
    color: var(--blue); border-color: rgba(59,130,246,0.22); font-weight: 600;
    box-shadow: 0 2px 8px rgba(59,130,246,0.10);
  }
  .nav-icon { width: 18px; height: 18px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; opacity: .75; }
  .nav-item.active .nav-icon { opacity: 1; }
  .nav-badge {
    margin-left: auto; font-size: 10px; font-family: var(--mono);
    background: var(--bg3); color: var(--t3);
    padding: 1px 6px; border-radius: 10px;
  }
  .nav-item.active .nav-badge { background: rgba(59,130,246,0.18); color: var(--blue); }
  .sidebar-footer { margin-top: auto; padding: 12px; border-top: 1px solid var(--b1); }

  /* ── Main ── */
  .main { flex: 1; display: flex; flex-direction: column; overflow: hidden; position: relative; }
  .topbar {
    height: 56px;
    background: var(--bg1);
    backdrop-filter: var(--glass-blur); -webkit-backdrop-filter: var(--glass-blur);
    border-bottom: 1px solid var(--glass-border);
    display: flex; align-items: center; justify-content: space-between;
    padding: 0 32px; flex-shrink: 0;
  }
  .topbar-left { display: flex; align-items: center; gap: 12px; }
  .topbar-title { font-size: 16px; font-weight: 700; color: var(--t1); letter-spacing: -.4px; }
  .topbar-sub   { font-size: 11px; color: var(--t3); font-family: var(--mono); letter-spacing: .2px; }
  .topbar-right { display: flex; align-items: center; gap: 10px; }
  .page-body { flex: 1; overflow-y: auto; padding: 32px; }

  /* ── Cards ── */
  .card {
    background: var(--glass-bg);
    backdrop-filter: var(--glass-blur); -webkit-backdrop-filter: var(--glass-blur);
    border: 1px solid var(--glass-border);
    border-radius: var(--r2); padding: 24px;
    transition: border-color .2s, box-shadow .2s;
  }
  .card:hover { border-color: rgba(255,255,255,0.11); box-shadow: 0 8px 36px rgba(0,0,0,0.32); }
  .card-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 18px; }
  .card-title { font-size: 14px; font-weight: 700; color: var(--t1); letter-spacing: -.2px; }
  .card-sub   { font-size: 11px; color: var(--t3); font-family: var(--mono); margin-top: 2px; }

  /* ── Grids ── */
  .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }
  .grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 18px; }
  .grid-4 { display: grid; grid-template-columns: repeat(4,1fr); gap: 18px; }
  .mb18 { margin-bottom: 18px; }
  .mb28 { margin-bottom: 28px; }

  /* ── Stat tiles ── */
  .stat {
    background: var(--glass-bg);
    backdrop-filter: var(--glass-blur); -webkit-backdrop-filter: var(--glass-blur);
    border: 1px solid var(--glass-border);
    border-radius: var(--r2); padding: 20px;
    transition: all .2s; cursor: default;
    position: relative; overflow: hidden;
  }
  .stat::before {
    content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px;
    background: linear-gradient(90deg, var(--blue), var(--purple));
    opacity: 0; transition: opacity .2s;
  }
  .stat:hover::before { opacity: 1; }
  .stat:hover { border-color: var(--b2); transform: translateY(-1px); box-shadow: var(--shadow); }
  .stat-icon { width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center; justify-content: center; margin-bottom: 12px; font-size: 16px; }
  .stat-label { font-size: 10px; letter-spacing: 1.5px; text-transform: uppercase; color: var(--t3); margin-bottom: 6px; font-weight: 600; }
  .stat-value { font-size: 28px; font-weight: 700; font-family: var(--mono); color: var(--t1); letter-spacing: -1.5px; line-height: 1; }
  .stat-sub   { font-size: 11px; color: var(--t3); margin-top: 6px; }
  .stat-bar   { height: 3px; background: var(--b2); border-radius: 2px; margin-top: 14px; }
  .stat-fill  { height: 100%; border-radius: 2px; background: var(--blue); transition: width .6s ease; }
  .stat-fill.grn   { background: var(--grn); }
  .stat-fill.amber { background: var(--amber); }
  .stat-fill.red   { background: var(--red); }

  /* ── Badges ── */
  .badge { display: inline-flex; align-items: center; gap: 4px; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; }
  .badge.blue   { background: var(--bluem); color: var(--blue); }
  .badge.green  { background: var(--grnm); color: var(--grn); }
  .badge.amber  { background: rgba(245,158,11,.12); color: var(--amber); }
  .badge.red    { background: rgba(239,68,68,.12); color: var(--red); }
  .badge.purple { background: rgba(139,92,246,.12); color: var(--purple); }
  .badge.pink   { background: rgba(236,72,153,.12); color: var(--pink); }
  .badge.muted  { background: var(--bg3); color: var(--t2); }

  /* ── Buttons ── */
  .btn {
    padding: 7px 16px; border-radius: 9px; border: 1px solid var(--b2);
    background: transparent; color: var(--t2); font-size: 12px;
    font-family: var(--sans); font-weight: 500;
    cursor: pointer; transition: all .15s;
    display: inline-flex; align-items: center; gap: 6px;
  }
  .btn:hover { border-color: var(--b3); color: var(--t1); background: var(--bg2); }
  .btn.sm { padding: 5px 12px; font-size: 11px; border-radius: 7px; }
  .btn.xs { padding: 3px 8px; font-size: 10px; border-radius: 6px; }
  .btn.primary { background: var(--blue); border-color: var(--blue); color: #fff; font-weight: 600; box-shadow: 0 2px 12px rgba(59,130,246,0.3); }
  .btn.primary:hover { background: var(--blue2); box-shadow: 0 4px 16px rgba(59,130,246,0.4); transform: translateY(-1px); }
  .btn.danger  { background: rgba(239,68,68,.10); border-color: rgba(239,68,68,.3); color: var(--red); }
  .btn.danger:hover { background: rgba(239,68,68,.20); }
  .btn.ghost { border-color: transparent; }

  /* ── Inputs ── */
  .inp {
    width: 100%; padding: 9px 14px; border-radius: 9px;
    background: var(--bg2); border: 1px solid var(--b2);
    color: var(--t1); font-size: 13px; font-family: var(--sans);
    outline: none; transition: all .15s;
  }
  .inp:focus { border-color: var(--blue); box-shadow: 0 0 0 3px rgba(59,130,246,0.1); }
  .inp::placeholder { color: var(--t3); }
  textarea.inp { resize: vertical; min-height: 100px; line-height: 1.6; }
  select.inp { cursor: pointer; }

  /* ── Divider ── */
  .divider { height: 1px; background: var(--b1); margin: 18px 0; }

  /* ── Login ── */
  .login-wrap {
    min-height: 100vh; display: flex; align-items: center; justify-content: center;
    background: var(--bg);
    background-image: radial-gradient(ellipse at 30% 20%, rgba(59,130,246,0.08) 0%, transparent 50%),
                      radial-gradient(ellipse at 70% 80%, rgba(139,92,246,0.06) 0%, transparent 50%);
  }
  .login-box {
    background: var(--bg1); border: 1px solid var(--b1);
    border-radius: 20px; padding: 44px; width: 100%; max-width: 400px;
    box-shadow: var(--shadow2);
  }
  .login-logo { display: flex; align-items: center; gap: 12px; margin-bottom: 36px; justify-content: center; }
  .login-mark {
    width: 44px; height: 44px; border-radius: 14px;
    background: linear-gradient(135deg, var(--blue), var(--purple));
    display: flex; align-items: center; justify-content: center;
    font-family: var(--mono); font-size: 18px; font-weight: 700; color: #fff;
    box-shadow: 0 4px 20px rgba(59,130,246,0.4);
  }
  .login-name { font-size: 22px; font-weight: 700; color: var(--t1); }
  .login-title { font-size: 18px; font-weight: 700; color: var(--t1); margin-bottom: 6px; text-align: center; }
  .login-sub   { font-size: 13px; color: var(--t3); margin-bottom: 32px; text-align: center; }
  .login-error { background: rgba(239,68,68,.10); border: 1px solid rgba(239,68,68,.3); color: var(--red); font-size: 12px; padding: 10px 14px; border-radius: 9px; margin-bottom: 18px; }

  /* ── Modal ── */
  .modal-overlay {
    position: fixed; inset: 0; background: rgba(0,0,0,.7);
    display: flex; align-items: center; justify-content: center;
    z-index: 200; backdrop-filter: blur(8px);
    animation: fadeIn .15s ease;
  }
  .modal {
    background: var(--bg1); border: 1px solid var(--b2);
    border-radius: 20px; padding: 28px; width: 100%; max-width: 460px;
    box-shadow: var(--shadow2);
    animation: slideUp .2s ease;
  }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  @keyframes slideUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
  .modal-title { font-size: 16px; font-weight: 700; color: var(--t1); }
  .form-row { margin-bottom: 14px; }
  .form-label { font-size: 11px; color: var(--t3); margin-bottom: 6px; display: block; font-weight: 600; letter-spacing: .5px; text-transform: uppercase; }
  .modal-actions { display: flex; gap: 8px; justify-content: flex-end; margin-top: 24px; }

  /* ── Loading ── */
  .loading { display: flex; align-items: center; justify-content: center; height: 120px; color: var(--t3); font-size: 12px; font-family: var(--mono); gap: 8px; }

  /* ── Dashboard widgets ── */
  .dash-widget {
    background: var(--glass-bg);
    backdrop-filter: var(--glass-blur); -webkit-backdrop-filter: var(--glass-blur);
    border: 1px solid var(--glass-border);
    border-radius: var(--r2); padding: 20px; cursor: pointer;
    transition: all .2s; position: relative; overflow: hidden;
  }
  .dash-widget:hover { border-color: var(--blueb); transform: translateY(-2px); box-shadow: var(--shadow); }
  .dw-icon { width: 40px; height: 40px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 18px; margin-bottom: 14px; }
  .dw-label { font-size: 10px; letter-spacing: 1.5px; text-transform: uppercase; color: var(--t3); margin-bottom: 6px; font-weight: 600; }
  .dw-value { font-size: 26px; font-weight: 700; font-family: var(--mono); color: var(--t1); letter-spacing: -1px; line-height: 1; }
  .dw-sub   { font-size: 11px; color: var(--t2); margin-top: 6px; }
  .dw-arrow { position: absolute; right: 16px; top: 16px; color: var(--t3); font-size: 18px; opacity: 0; transition: opacity .2s; }
  .dash-widget:hover .dw-arrow { opacity: 1; }

  /* ── Week strip ── */
  .week-strip { display: flex; gap: 8px; }
  .day-cell {
    flex: 1; border-radius: 12px; padding: 10px 6px; text-align: center;
    background: var(--bg2); border: 1px solid var(--b1);
    cursor: pointer; transition: all .2s;
  }
  .day-cell:hover { border-color: var(--b3); background: var(--bg3); }
  .day-cell.today {
    background: linear-gradient(135deg, rgba(59,130,246,0.2), rgba(139,92,246,0.2));
    border-color: var(--blueb);
  }
  .day-cell.has-event { border-color: var(--b2); }
  .day-name { font-size: 9px; text-transform: uppercase; letter-spacing: 1px; color: var(--t3); font-weight: 600; }
  .day-num  { font-size: 18px; font-weight: 700; font-family: var(--mono); color: var(--t1); margin: 4px 0; line-height: 1; }
  .day-cell.today .day-num { color: var(--blue); }
  .day-dots { display: flex; gap: 3px; justify-content: center; min-height: 6px; }
  .day-dot  { width: 5px; height: 5px; border-radius: 50%; }

  /* ── Tasks ── */
  .task-item {
    display: flex; align-items: center; gap: 12px;
    padding: 10px 12px; border-radius: 10px;
    transition: background .15s; group: true;
    border: 1px solid transparent;
  }
  .task-item:hover { background: var(--bg2); border-color: var(--b1); }
  .task-check {
    width: 18px; height: 18px; border-radius: 6px;
    border: 2px solid var(--b3); display: flex;
    align-items: center; justify-content: center;
    flex-shrink: 0; cursor: pointer; transition: all .15s;
  }
  .task-check:hover { border-color: var(--grn); }
  .task-check.done { background: var(--grn); border-color: var(--grn); }
  .task-content { flex: 1; min-width: 0; }
  .task-text { font-size: 13px; color: var(--t1); font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .task-text.done { color: var(--t3); text-decoration: line-through; font-weight: 400; }
  .task-edit-input { background: transparent; border: none; outline: none; color: var(--t1); font-size: 13px; font-family: var(--sans); font-weight: 500; width: 100%; }
  .task-meta { display: flex; align-items: center; gap: 6px; margin-top: 2px; }
  .task-tag  { font-size: 10px; color: var(--t3); font-family: var(--mono); background: var(--bg3); padding: 1px 6px; border-radius: 4px; }
  .task-actions { display: flex; gap: 4px; opacity: 0; transition: opacity .15s; flex-shrink: 0; }
  .task-item:hover .task-actions { opacity: 1; }

  /* ── Notes ── */
  .notes-shell { display: flex; flex: 1; overflow: hidden; position: relative; }
  .notes-sidebar {
    width: 200px; min-width: 200px; border-right: 1px solid var(--b1);
    background: var(--bg1); overflow-y: auto; display: flex; flex-direction: column; flex-shrink: 0;
  }
  .notes-sidebar-header {
    padding: 14px 14px 10px; border-bottom: 1px solid var(--b1);
    display: flex; align-items: center; justify-content: space-between; flex-shrink: 0;
  }
  .notebook-item {
    display: flex; align-items: center; gap: 7px;
    padding: 8px 8px 8px 10px; cursor: pointer; color: var(--t2);
    font-size: 12px; font-weight: 500; transition: all .15s;
    border-left: 2px solid transparent; position: relative; user-select: none;
  }
  .notebook-item:hover { background: rgba(255,255,255,0.04); color: var(--t1); }
  .notebook-item.nb-active { background: var(--bluem); color: var(--blue); border-left-color: var(--blue); }
  .notebook-item.nb-drag-over { outline: 1.5px dashed var(--blue); border-radius: 6px; }
  .notebook-icon { width: 22px; height: 22px; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 10px; flex-shrink: 0; opacity: 0.6; }
  .nb-chev { font-size: 7px; color: var(--t3); flex-shrink: 0; transition: transform .15s; }
  .nb-count { font-size: 9px; color: var(--t3); font-family: var(--mono); flex-shrink: 0; }
  .nb-dot-btn {
    width: 20px; height: 20px; border-radius: 5px; border: none;
    background: transparent; color: var(--t3); cursor: pointer;
    font-size: 13px; display: flex; align-items: center; justify-content: center;
    opacity: 0; transition: opacity .12s, background .12s; flex-shrink: 0; line-height: 1; padding-bottom: 2px;
  }
  .notebook-item:hover .nb-dot-btn, .section-item:hover .nb-dot-btn, .note-list-item:hover .nb-dot-btn { opacity: 1; }
  .nb-dot-btn:hover { background: rgba(255,255,255,0.10); color: var(--t1); opacity: 1; }
  .nb-dropdown {
    position: absolute; z-index: 120; right: 4px; top: calc(100% + 2px);
    background: var(--bg1); border: 1px solid var(--b2); border-radius: 10px;
    padding: 4px; box-shadow: var(--shadow2); min-width: 156px; animation: fadeIn .1s ease;
  }
  .nb-dropdown button {
    display: flex; align-items: center; gap: 8px; width: 100%;
    padding: 7px 11px; border: none; border-radius: 7px;
    background: transparent; color: var(--t2); font-size: 12px;
    font-family: var(--sans); cursor: pointer; transition: all .12s; text-align: left;
  }
  .nb-dropdown button:hover { background: rgba(255,255,255,0.06); color: var(--t1); }
  .nb-dropdown button.danger { color: var(--red); }
  .nb-dropdown button.danger:hover { background: rgba(239,68,68,0.1); }
  .nb-dropdown .dd-sep { height: 1px; background: var(--b1); margin: 3px 0; }
  .section-item {
    display: flex; align-items: center; gap: 7px;
    padding: 5px 8px 5px 26px; cursor: pointer; color: var(--t3);
    font-size: 11px; font-weight: 500; transition: all .15s;
    border-left: 2px solid transparent; position: relative; user-select: none;
  }
  .section-item:hover { background: rgba(255,255,255,0.03); color: var(--t2); }
  .section-item.active { color: var(--blue); border-left-color: var(--blue); background: var(--bluem); }
  .section-item.sec-drag-over { outline: 1.5px dashed var(--blue); border-radius: 5px; }
  .section-dot { width: 4px; height: 4px; border-radius: 50%; background: var(--b3); flex-shrink: 0; }
  .section-item.active .section-dot { background: var(--blue); }
  .sec-count { font-size: 9px; color: var(--t3); font-family: var(--mono); flex-shrink: 0; }
  .nb-rename-input {
    background: rgba(59,130,246,0.12); border: 1px solid var(--blue); border-radius: 5px;
    color: var(--t1); font-size: 12px; font-family: var(--sans); padding: 1px 5px; outline: none; flex: 1;
  }
  .nb-new-input {
    background: rgba(255,255,255,0.05); border: 1px solid var(--b2); border-radius: 7px;
    color: var(--t1); font-size: 12px; font-family: var(--sans); padding: 6px 10px; outline: none; flex: 1;
  }
  .nb-new-input:focus { border-color: var(--blue); }
  .notes-list {
    width: 260px; min-width: 260px; border-right: 1px solid var(--b1);
    background: var(--bg2); overflow-y: auto; display: flex; flex-direction: column; flex-shrink: 0;
  }
  .notes-list-header {
    padding: 10px 12px; border-bottom: 1px solid var(--b1);
    display: flex; align-items: center; justify-content: space-between;
    flex-shrink: 0; background: var(--bg1); gap: 8px;
  }
  .notes-list-header-title {
    font-size: 12px; font-weight: 700; color: var(--t1);
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; min-width: 0;
  }
  .note-list-item {
    padding: 12px 10px 10px 14px; cursor: pointer;
    border-bottom: 1px solid var(--b1); transition: background .15s;
    border-left: 3px solid transparent; position: relative; user-select: none;
  }
  .note-list-item:hover { background: rgba(255,255,255,0.04); }
  .note-list-item.active { background: rgba(59,130,246,0.08); border-left-color: var(--blue); }
  .note-list-item.note-drag-over { border-top: 2px solid var(--blue); }
  .note-list-item.note-dragging { opacity: 0.4; }
  .nli-row   { display: flex; align-items: flex-start; justify-content: space-between; gap: 4px; }
  .nli-title   { font-size: 13px; font-weight: 600; color: var(--t1); margin-bottom: 3px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 1; min-width: 0; }
  .nli-preview { font-size: 11px; color: var(--t3); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 1.4; }
  .nli-date    { font-size: 10px; color: var(--t3); font-family: var(--mono); margin-top: 4px; }
  .nli-tags    { display: flex; gap: 4px; margin-top: 5px; flex-wrap: wrap; }
  .nli-tag     { font-size: 9px; padding: 2px 6px; border-radius: 20px; background: rgba(59,130,246,0.12); color: var(--blue); font-weight: 600; letter-spacing: .2px; }
  .note-ctx-menu {
    position: fixed; z-index: 150; background: var(--bg1); border: 1px solid var(--b2);
    border-radius: 10px; padding: 4px; box-shadow: var(--shadow2); min-width: 160px; animation: fadeIn .1s ease;
  }
  .note-ctx-menu button {
    display: flex; align-items: center; gap: 8px; width: 100%;
    padding: 7px 12px; border: none; border-radius: 7px;
    background: transparent; color: var(--t2); font-size: 12px;
    font-family: var(--sans); cursor: pointer; transition: all .12s;
  }
  .note-ctx-menu button:hover { background: rgba(255,255,255,0.06); color: var(--t1); }
  .note-ctx-menu button.danger { color: var(--red); }
  .note-ctx-menu button.danger:hover { background: rgba(239,68,68,0.1); }
  .note-ctx-menu .ctx-sep { height: 1px; background: var(--b1); margin: 3px 4px; }
  .note-editor { flex: 1; display: flex; flex-direction: column; overflow: hidden; background: var(--bg); position: relative; }
  .note-toolbar {
    padding: 7px 16px; border-bottom: 1px solid var(--b1);
    display: flex; align-items: center; gap: 2px; flex-wrap: wrap;
    background: var(--bg1); flex-shrink: 0; min-height: 42px;
  }
  .note-toolbar-sep { width: 1px; height: 18px; background: var(--b1); margin: 0 3px; }
  .note-tool-btn {
    height: 26px; min-width: 26px; padding: 0 5px; border-radius: 6px;
    display: flex; align-items: center; justify-content: center;
    background: transparent; border: 1px solid transparent;
    color: var(--t3); cursor: pointer; font-size: 11px; font-weight: 700;
    font-family: var(--mono); transition: all .12s; flex-shrink: 0; line-height: 1; white-space: nowrap;
  }
  .note-tool-btn:hover { background: rgba(255,255,255,0.06); border-color: rgba(255,255,255,0.1); color: var(--t1); }
  .note-tool-btn.on { background: var(--bluem); border-color: var(--blueb); color: var(--blue); }
  .note-title-input {
    width: 100%; padding: 24px 32px 14px;
    background: transparent; border: none; color: var(--t1);
    font-size: 26px; font-weight: 700; font-family: var(--sans);
    outline: none; border-bottom: 1px solid var(--b1); letter-spacing: -.5px;
    box-sizing: border-box;
  }
  .note-title-input::placeholder { color: var(--t3); }
  .note-meta { padding: 8px 32px; display: flex; align-items: center; gap: 14px; border-bottom: 1px solid var(--b1); flex-wrap: wrap; }
  .note-meta-item { font-size: 10px; color: var(--t3); font-family: var(--mono); display: flex; align-items: center; gap: 4px; }
  .note-body-input {
    flex: 1; padding: 22px 32px; min-height: 0;
    background: transparent; border: none; color: var(--t2);
    font-size: 14px; line-height: 1.9; font-family: var(--sans);
    outline: none; resize: none; tab-size: 2;
  }
  .note-body-input::placeholder { color: var(--t3); opacity: .5; }
  .note-body-input::selection { background: rgba(59,130,246,0.3); }
  .note-tags-bar {
    padding: 10px 32px; border-top: 1px solid var(--b1);
    display: flex; align-items: center; gap: 7px; flex-shrink: 0; flex-wrap: wrap;
    background: var(--bg1);
  }
  .note-tags-input {
    background: transparent; border: none; outline: none;
    color: var(--t3); font-size: 11px; font-family: var(--mono); min-width: 100px; flex: 1;
  }
  .note-empty {
    flex: 1; display: flex; align-items: center; justify-content: center;
    flex-direction: column; gap: 14px; color: var(--t3);
  }
  .note-empty-icon { opacity: .1; margin-bottom: 4px; }
  .enc-badge {
    display: inline-flex; align-items: center; gap: 4px; padding: 3px 9px; border-radius: 20px;
    background: rgba(16,185,129,.10); color: var(--grn); font-size: 10px; font-weight: 600;
  }
  @keyframes saveAppear { from { opacity:0; transform:translateY(2px); } to { opacity:1; transform:translateY(0); } }
  @keyframes saveFade { 0%{opacity:1;} 60%{opacity:1;} 100%{opacity:0;} }
  .save-ind { font-size: 10px; font-family: var(--mono); padding: 2px 8px; border-radius: 6px; animation: saveAppear .15s ease; }
  .save-ind.saving { color: var(--amber); background: rgba(245,158,11,0.1); }
  .save-ind.saved  { color: var(--grn); background: rgba(16,185,129,0.1); animation: saveFade 2.2s ease forwards; }
  /* ── WYSIWYG editor ── */
  .note-body-wysiwyg {
    flex: 1; padding: 22px 32px; min-height: 0; overflow-y: auto;
    color: var(--t2); font-size: 14px; line-height: 1.9; font-family: var(--sans);
    outline: none; caret-color: var(--blue);
  }
  .note-body-wysiwyg:empty::before { content: attr(data-placeholder); color: var(--t3); opacity: .5; pointer-events: none; display: block; }
  .note-body-wysiwyg > div { min-height: 1.4em; }
  .note-body-wysiwyg .we-h1 { font-size: 22px; font-weight: 700; color: var(--t1); margin: 4px 0 2px; letter-spacing: -.3px; border-bottom: 1px solid var(--b1); padding-bottom: 6px; }
  .note-body-wysiwyg .we-h2 { font-size: 17px; font-weight: 700; color: var(--t1); margin: 14px 0 2px; }
  .note-body-wysiwyg .we-h3 { font-size: 14px; font-weight: 600; color: var(--t2); margin: 10px 0 2px; }
  .note-body-wysiwyg .we-ul { display: flex; align-items: baseline; gap: 8px; }
  .note-body-wysiwyg .we-bullet { color: var(--blue); font-size: 10px; flex-shrink: 0; user-select: none; }
  .note-body-wysiwyg .we-check { display: flex; align-items: baseline; gap: 8px; }
  .note-body-wysiwyg .we-checkbox { font-size: 13px; flex-shrink: 0; cursor: default; user-select: none; }
  .note-body-wysiwyg .we-checkbox.checked { color: var(--grn); }
  .note-body-wysiwyg .we-hr { pointer-events: none; }
  .note-body-wysiwyg .we-hr hr { border: none; border-top: 1px solid var(--b1); margin: 10px 0; }
  .note-body-wysiwyg .we-codeblock pre { background: var(--bg3); border: 1px solid var(--b1); border-radius: 10px; padding: 14px 18px; margin: 8px 0; overflow-x: auto; }
  .note-body-wysiwyg .we-codeblock code { color: var(--t2); font-size: 13px; font-family: var(--mono); }
  .note-body-wysiwyg strong { color: var(--t1); font-weight: 700; }
  .note-body-wysiwyg em { font-style: italic; }
  .note-body-wysiwyg code { background: rgba(59,130,246,0.1); border: 1px solid rgba(59,130,246,0.2); padding: 1px 5px; border-radius: 4px; font-family: var(--mono); font-size: 12px; color: var(--blue); }
  .note-body-wysiwyg a { color: var(--blue); text-decoration: underline; }

  /* ── Split editor ── */
  .split-editor-shell { flex: 1; display: flex; flex-direction: column; min-height: 0; overflow: hidden; }
  .split-editor-modebar {
    display: flex; align-items: center; gap: 3px; padding: 5px 32px 5px;
    border-bottom: 1px solid var(--b1); flex-shrink: 0; background: var(--bg1);
  }
  .split-editor-modebar span { font-size: 10px; color: var(--t3); margin-right: 4px; }
  .split-editor-body { flex: 1; display: flex; min-height: 0; overflow: hidden; }
  .note-body-textarea {
    padding: 22px 32px; min-height: 0; overflow-y: auto;
    background: transparent; border: none; color: var(--t2);
    font-size: 13px; line-height: 1.9; font-family: var(--sans);
    outline: none; resize: none; tab-size: 2; box-sizing: border-box;
  }
  .note-body-textarea::placeholder { color: var(--t3); opacity: .5; }
  .note-body-textarea::selection { background: rgba(59,130,246,0.3); }
  .note-body-preview {
    padding: 22px 32px; min-height: 0; overflow-y: auto;
    color: var(--t2); font-size: 14px; line-height: 1.9; font-family: var(--sans);
    box-sizing: border-box;
  }
  .note-body-preview h1 { font-size: 22px; font-weight: 700; color: var(--t1); margin: 4px 0 6px; letter-spacing: -.3px; border-bottom: 1px solid var(--b1); padding-bottom: 6px; }
  .note-body-preview h2 { font-size: 17px; font-weight: 700; color: var(--t1); margin: 14px 0 4px; }
  .note-body-preview h3 { font-size: 14px; font-weight: 600; color: var(--t2); margin: 10px 0 3px; }
  .note-body-preview ul { list-style: none; margin: 4px 0; padding: 0; }
  .note-body-preview ul li::before { content: "•"; color: var(--blue); margin-right: 8px; font-size: 10px; }
  .note-body-preview li { display: flex; align-items: baseline; margin: 2px 0; }
  .note-body-preview strong { color: var(--t1); font-weight: 700; }
  .note-body-preview em { font-style: italic; }
  .note-body-preview code { background: rgba(59,130,246,0.1); border: 1px solid rgba(59,130,246,0.2); padding: 1px 5px; border-radius: 4px; font-family: var(--mono); font-size: 12px; color: var(--blue); }
  .note-body-preview pre { background: var(--bg3); border: 1px solid var(--b1); border-radius: 10px; padding: 14px 18px; margin: 8px 0; overflow-x: auto; }
  .note-body-preview pre code { background: none; border: none; padding: 0; color: var(--t2); font-size: 13px; }
  .note-body-preview hr { border: none; border-top: 1px solid var(--b1); margin: 12px 0; }
  .note-body-preview p { margin: 3px 0; }
  .note-body-preview a { color: var(--blue); text-decoration: underline; }
  /* Split / write / preview modes */
  .split-mode-write .note-body-textarea { flex: 1; }
  .split-mode-write .note-body-preview { display: none; }
  .split-mode-preview .note-body-textarea { display: none; }
  .split-mode-preview .note-body-preview { flex: 1; }
  .split-mode-split .note-body-textarea { flex: 1; border-right: 1px solid var(--b1); }
  .split-mode-split .note-body-preview { flex: 1; }

  /* ── Dots menu ── */
  .note-dots-menu {
    position: absolute; z-index: 200; right: 0; top: calc(100% + 4px);
    background: var(--bg1); border: 1px solid var(--b2); border-radius: 10px;
    padding: 4px; box-shadow: var(--shadow2); min-width: 150px; animation: fadeIn .1s ease;
  }
  .note-dots-menu button {
    display: flex; align-items: center; gap: 8px; width: 100%;
    padding: 7px 12px; border: none; border-radius: 7px;
    background: transparent; color: var(--t2); font-size: 12px;
    font-family: var(--sans); cursor: pointer; transition: all .12s;
  }
  .note-dots-menu button.danger { color: var(--red); }
  .note-dots-menu button.danger:hover { background: rgba(239,68,68,0.1); }

  /* ── Fullscreen buttons ── */
  .fs-exit-btn, .fs-expand-btn {
    position: absolute; top: 8px; right: 12px; z-index: 10;
    background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);
    color: var(--t3); border-radius: 7px; width: 28px; height: 28px;
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; font-size: 14px; transition: all .15s; flex-shrink: 0;
  }
  .fs-exit-btn:hover, .fs-expand-btn:hover { background: rgba(255,255,255,0.12); color: var(--t1); }

  /* ── Notes fullscreen mode ── */
  body.notes-fullscreen .sidebar,
  body.notes-fullscreen .topbar,
  body.notes-fullscreen .bottom-nav { display: none !important; }
  body.notes-fullscreen .notes-sidebar,
  body.notes-fullscreen .notes-list { display: none !important; }
  body.notes-fullscreen .main { height: 100vh; }
  .move-modal-sections { max-height: 320px; overflow-y: auto; margin-top: 8px; }
  .move-modal-nb { font-size: 10px; color: var(--t3); font-weight: 700; text-transform: uppercase; letter-spacing: 1px; padding: 10px 4px 4px; }
  .move-modal-sec {
    padding: 8px 12px; border-radius: 8px; cursor: pointer; font-size: 13px; color: var(--t2);
    transition: all .12s; display: flex; align-items: center; gap: 8px;
  }
  .move-modal-sec:hover { background: var(--bluem); color: var(--blue); }

  /* ── Calendar ── */
  .cal-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 22px; flex-wrap: wrap; gap: 12px; }
  .cal-month-nav { display: flex; align-items: center; gap: 14px; }
  .cal-month-title { font-size: 19px; font-weight: 700; color: var(--t1); letter-spacing: -.4px; min-width: 200px; text-align: center; }
  .cal-grid-header { display: grid; grid-template-columns: repeat(7,1fr); gap: 6px; margin-bottom: 6px; }
  .cal-day-header { text-align: center; font-size: 9px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; color: var(--t3); padding: 6px 0; }
  .cal-grid { display: grid; grid-template-columns: repeat(7,1fr); gap: 6px; }
  .cal-cell {
    min-height: 88px;
    background: var(--glass-bg);
    backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
    border: 1px solid var(--glass-border);
    border-radius: 11px; padding: 8px; cursor: pointer; transition: all .2s;
    display: flex; flex-direction: column;
  }
  .cal-cell:hover { border-color: var(--b2); background: var(--bg2); }
  .cal-cell.today { border-color: var(--blueb); background: rgba(59,130,246,0.1); }
  .cal-cell.other-month { opacity: .22; cursor: default; }
  .cal-day-num {
    font-size: 12px; font-family: var(--mono); font-weight: 600;
    color: var(--t2); margin-bottom: 5px; width: 22px; height: 22px;
    display: flex; align-items: center; justify-content: center; border-radius: 6px;
  }
  .cal-cell.today .cal-day-num { background: var(--blue); color: #fff; font-weight: 700; }
  .cal-events { display: flex; flex-direction: column; gap: 3px; flex: 1; overflow: hidden; }
  .cal-event {
    font-size: 10px; font-weight: 600; padding: 3px 6px;
    border-radius: 5px; white-space: nowrap; overflow: hidden;
    text-overflow: ellipsis; line-height: 1.3; cursor: pointer; transition: opacity .15s;
  }
  .cal-event:hover { opacity: .82; }
  .cal-event-more { font-size: 9px; color: var(--t3); padding: 2px 4px; font-weight: 500; }

  /* ── Week view ── */
  .week-view { display: grid; grid-template-columns: repeat(7,1fr); gap: 8px; }
  .week-col {
    background: var(--glass-bg);
    backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
    border: 1px solid var(--glass-border);
    border-radius: 12px; overflow: hidden; min-height: 280px;
    display: flex; flex-direction: column;
  }
  .week-col.today { border-color: var(--blueb); background: rgba(59,130,246,0.08); }
  .week-col-header {
    padding: 10px 8px 8px; text-align: center;
    border-bottom: 1px solid rgba(255,255,255,0.06);
    background: rgba(0,0,0,0.12); flex-shrink: 0;
  }
  .week-col-day { font-size: 8px; text-transform: uppercase; letter-spacing: 1px; color: var(--t3); font-weight: 700; }
  .week-col-num { font-size: 18px; font-weight: 700; font-family: var(--mono); color: var(--t1); margin-top: 2px; line-height: 1; }
  .week-col.today .week-col-num { color: var(--blue); }
  .week-col-events { padding: 6px; display: flex; flex-direction: column; gap: 4px; flex: 1; }
  .week-event {
    padding: 5px 7px; border-radius: 7px; font-size: 10px; font-weight: 600;
    line-height: 1.35; cursor: pointer; transition: opacity .15s;
  }
  .week-event:hover { opacity: .82; }
  .week-add-btn {
    display: flex; align-items: center; justify-content: center;
    height: 28px; color: var(--t3); font-size: 20px; cursor: pointer;
    transition: color .15s; opacity: 0; border-radius: 7px; margin-top: 4px;
    border: 1px dashed rgba(255,255,255,0.08);
  }
  .week-col:hover .week-add-btn { opacity: 1; }
  .week-add-btn:hover { color: var(--blue); border-color: var(--blueb); background: rgba(59,130,246,0.06); }

  /* ── Career ── */
  .app-table { width: 100%; border-collapse: collapse; }
  .app-table th {
    text-align: left; font-size: 10px; font-weight: 700;
    letter-spacing: 1.5px; text-transform: uppercase; color: var(--t3);
    padding: 8px 14px 12px; border-bottom: 1px solid var(--b1);
  }
  .app-table td { padding: 12px 14px; border-bottom: 1px solid var(--b1); vertical-align: middle; }
  .app-table tr:last-child td { border-bottom: none; }
  .app-table tr:hover td { background: var(--bg2); }
  .company-name { font-size: 14px; font-weight: 600; color: var(--t1); }
  .company-role { font-size: 12px; color: var(--t3); margin-top: 2px; }

  /* ── Finance ── */
  .fin-category-card {
    background: var(--bg2); border: 1px solid var(--b1);
    border-radius: 14px; padding: 18px; cursor: pointer;
    transition: all .2s; text-align: center;
  }
  .fin-category-card:hover { border-color: var(--b3); transform: translateY(-2px); box-shadow: var(--shadow); }
  .fin-cat-icon { width: 48px; height: 48px; border-radius: 14px; display: flex; align-items: center; justify-content: center; font-size: 22px; margin: 0 auto 12px; }
  .fin-cat-name { font-size: 12px; font-weight: 600; color: var(--t2); margin-bottom: 4px; }
  .fin-cat-amount { font-size: 18px; font-weight: 700; font-family: var(--mono); color: var(--t1); letter-spacing: -0.5px; }
  .fin-row { display: flex; align-items: center; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid var(--b1); }
  .fin-row:last-child { border-bottom: none; }
  .fin-icon { width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 16px; flex-shrink: 0; margin-right: 12px; }
  .fin-label  { font-size: 13px; color: var(--t1); font-weight: 500; }
  .fin-cat-tag { font-size: 11px; color: var(--t3); font-family: var(--mono); }
  .fin-amount { font-size: 15px; font-weight: 700; font-family: var(--mono); }

  /* ── User avatar ── */
  .user-avatar {
    width: 32px; height: 32px; border-radius: 50%;
    background: linear-gradient(135deg, var(--blue), var(--purple));
    display: flex; align-items: center; justify-content: center;
    font-size: 12px; color: #fff; font-weight: 700;
    font-family: var(--mono); cursor: pointer;
    box-shadow: 0 2px 8px rgba(59,130,246,0.3);
  }

  /* ── Tracker hub ── */
  .tracker-hub { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 18px; }
  .tracker-card {
    background: var(--glass-bg);
    backdrop-filter: var(--glass-blur); -webkit-backdrop-filter: var(--glass-blur);
    border: 1px solid var(--glass-border);
    border-radius: var(--r2); padding: 26px; cursor: pointer;
    transition: all .2s; position: relative; overflow: hidden;
  }
  .tracker-card:hover { border-color: var(--blueb); transform: translateY(-2px); box-shadow: 0 8px 32px rgba(0,0,0,0.3); }
  .tracker-card::before {
    content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px;
    background: linear-gradient(90deg, var(--blue), var(--purple));
    opacity: 0; transition: opacity .2s;
  }
  .tracker-card:hover::before { opacity: 1; }
  .tc-emoji { font-size: 34px; margin-bottom: 16px; }
  .tc-name { font-size: 16px; font-weight: 700; color: var(--t1); margin-bottom: 6px; letter-spacing: -.3px; }
  .tc-sub { font-size: 12px; color: var(--t3); line-height: 1.55; }
  .tc-arrow { position: absolute; right: 20px; top: 20px; color: var(--t3); opacity: 0; transition: opacity .2s; font-size: 18px; }
  .tracker-card:hover .tc-arrow { opacity: 1; }

  /* ── Home page ── */
  .home-greeting-name { font-size: 26px; font-weight: 700; color: var(--t1); letter-spacing: -.5px; line-height: 1.2; }
  .home-greeting-date { font-size: 13px; color: var(--t3); margin-top: 3px; }

  .ai-bar {
    background: var(--glass-bg);
    backdrop-filter: var(--glass-blur); -webkit-backdrop-filter: var(--glass-blur);
    border: 1px solid rgba(255,255,255,0.09);
    border-radius: 16px; padding: 8px 8px 8px 18px;
    display: flex; align-items: center; gap: 12px;
    transition: border-color .2s, box-shadow .2s;
  }
  .ai-bar:focus-within {
    border-color: var(--blueb);
    box-shadow: 0 0 0 3px rgba(59,130,246,0.08), 0 8px 32px rgba(0,0,0,0.22);
  }
  .ai-avatar {
    width: 30px; height: 30px; border-radius: 10px; flex-shrink: 0;
    background: linear-gradient(135deg, var(--blue), var(--purple));
    display: flex; align-items: center; justify-content: center;
    box-shadow: 0 2px 8px rgba(59,130,246,0.35);
  }
  .ai-bar-input {
    flex: 1; background: transparent; border: none; outline: none;
    color: var(--t1); font-size: 14px; font-family: var(--sans); padding: 9px 0;
    min-width: 0;
  }
  .ai-bar-input::placeholder { color: var(--t3); }
  .ai-bar-btn {
    width: 40px; height: 40px; background: var(--blue); border: none;
    border-radius: 11px; display: flex; align-items: center; justify-content: center;
    cursor: pointer; transition: all .15s; flex-shrink: 0; gap: 3px;
  }
  .ai-bar-btn:hover:not(:disabled) { background: var(--blue2); transform: translateY(-1px); box-shadow: 0 4px 14px rgba(59,130,246,0.45); }
  .ai-bar-btn:disabled { opacity: .4; cursor: default; transform: none !important; box-shadow: none !important; }
  /* Loading dots inside button */
  @keyframes aiDot { 0%,80%,100% { opacity:.25; transform:translateY(0); } 40% { opacity:1; transform:translateY(-3px); } }
  .ai-dot { width:5px; height:5px; border-radius:50%; background:#fff; display:inline-block;
    animation: aiDot 1.2s ease-in-out infinite; }
  .ai-dot:nth-child(2) { animation-delay:.15s; }
  .ai-dot:nth-child(3) { animation-delay:.3s; }

  .ai-response {
    margin-top: 10px; padding: 13px 16px;
    background: rgba(13,19,30,0.72);
    backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
    border: 1px solid rgba(255,255,255,0.07);
    border-radius: 13px; font-size: 13px; color: var(--t2); line-height: 1.65;
    display: flex; align-items: flex-start; justify-content: space-between; gap: 12px;
    animation: fadeInUp .18s ease both;
  }
  .ai-response-body { flex: 1; min-width: 0; display: flex; align-items: flex-start; gap: 10px; }
  .ai-response-icon { flex-shrink: 0; margin-top: 1px; }
  .ai-response-ok { border-color: rgba(16,185,129,0.22); background: rgba(16,185,129,0.04); }
  .ai-response-err { border-color: rgba(239,68,68,0.22); color: var(--red); background: rgba(239,68,68,0.04); }
  .ai-response-close {
    background: none; border: none; color: var(--t3); cursor: pointer;
    padding: 2px; border-radius: 5px; display: flex; align-items: center;
    transition: color .15s, background .15s; flex-shrink: 0; margin-top: 1px;
  }
  .ai-response-close:hover { color: var(--t1); background: rgba(255,255,255,0.06); }
  .ai-suggestions { display: flex; gap: 6px; margin-top: 10px; flex-wrap: wrap; }
  .ai-suggestion-chip {
    background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);
    color: var(--t3); font-size: 11px; font-family: var(--sans); font-weight: 500;
    padding: 5px 12px; border-radius: 20px; cursor: pointer;
    transition: all .15s; white-space: nowrap;
  }
  .ai-suggestion-chip:hover { background: rgba(59,130,246,0.1); border-color: rgba(59,130,246,0.3); color: var(--blue); }

  /* ── Tracker back bar ── */
  .tracker-back-bar {
    display: flex; align-items: center; gap: 10px;
    padding: 10px 32px;
    background: var(--bg1);
    backdrop-filter: var(--glass-blur); -webkit-backdrop-filter: var(--glass-blur);
    border-bottom: 1px solid var(--b1);
    flex-shrink: 0;
  }
  .tracker-back-btn {
    display: flex; align-items: center; gap: 5px;
    cursor: pointer; color: var(--t3); font-size: 12px; font-weight: 500;
    transition: color .15s; background: none; border: none;
    font-family: var(--sans); padding: 0;
  }
  .tracker-back-btn:hover { color: var(--blue); }
  .tracker-section-label { font-size: 13px; font-weight: 600; color: var(--t2); }

  /* ── Animations ── */
  @keyframes pageIn { from { opacity: 0; transform: translateY(7px); } to { opacity: 1; transform: translateY(0); } }
  .page-enter { animation: pageIn .22s ease both; }

  /* ── Mobile responsive ── */
  .bottom-nav {
    display: none;
    position: fixed; bottom: 0; left: 0; right: 0;
    background: var(--bg1);
    backdrop-filter: blur(24px) saturate(180%); -webkit-backdrop-filter: blur(24px) saturate(180%);
    border-top: 1px solid var(--b1);
    padding: 8px 0 max(8px, env(safe-area-inset-bottom));
    z-index: 100;
  }
  .bottom-nav-inner { display: flex; justify-content: space-around; align-items: center; }
  .bottom-nav-item {
    display: flex; flex-direction: column; align-items: center; gap: 3px;
    padding: 6px 10px; border-radius: 10px; cursor: pointer;
    color: var(--t3); font-size: 10px; font-weight: 600;
    transition: all .15s; min-width: 52px; text-align: center;
  }
  .bottom-nav-item.active { color: var(--blue); }
  .bottom-nav-item svg { width: 22px; height: 22px; }

  /* ── Notes: collapsible panels ── */
  .notes-sidebar { transition: width .2s, min-width .2s; }
  .notes-sidebar.collapsed { width: 36px; min-width: 36px; overflow: hidden; }
  .notes-sidebar.collapsed > *:not(.notes-sidebar-header) { display: none; }
  .notes-sidebar.collapsed .notes-sidebar-header { padding: 12px 0; justify-content: center; }
  .notes-sidebar.collapsed .notes-sidebar-header > *:not(.panel-collapse-btn) { display: none; }
  .notes-list { transition: width .2s, min-width .2s; }
  .notes-list.collapsed { width: 36px; min-width: 36px; overflow: hidden; }
  .notes-list.collapsed > *:not(.notes-list-header) { display: none; }
  .notes-list.collapsed .notes-list-header { padding: 10px 0; justify-content: center; gap: 0; }
  .notes-list.collapsed .notes-list-header > *:not(.panel-collapse-btn) { display: none; }
  .panel-collapse-btn {
    background: none; border: none; cursor: pointer; color: var(--t3);
    font-size: 15px; width: 24px; height: 24px; border-radius: 6px; flex-shrink: 0;
    transition: color .15s, background .15s; display: inline-flex; align-items: center; justify-content: center;
  }
  .panel-collapse-btn:hover { color: var(--t2); background: rgba(255,255,255,0.07); }
  .mobile-back-btn { display: none; }
  .mobile-editor-toolbar { display: none; }
  .notes-list-header-mobile { display: none; }
  .preview-body.clickable { cursor: text; }
  .preview-body.clickable:empty::before { content: 'Click to edit...'; color: var(--t3); font-style: italic; }
  .preview-edit-hint { text-align: center; padding: 8px; font-size: 11px; color: var(--t3); font-style: italic; }

  @media (max-width: 768px) {
    .sidebar { display: none; }
    .bottom-nav { display: block; }
    .page-body { padding: 18px; padding-bottom: 84px; }
    .grid-4 { grid-template-columns: 1fr 1fr; }
    .grid-3 { grid-template-columns: 1fr 1fr; }
    .grid-2 { grid-template-columns: 1fr; }
    /* Mobile notes: single-panel navigation via data-mobile-panel */
    .notes-shell { flex-direction: column; overflow: hidden; height: calc(100vh - 56px - 60px); }
    .notes-sidebar { transition: none; }
    .notes-list { transition: none; }
    .notes-shell[data-mobile-panel="notebooks"] .notes-sidebar { display: flex; flex: 1; width: 100%; min-width: unset; max-height: none; border-right: none; border-bottom: none; }
    .notes-shell[data-mobile-panel="notebooks"] .notes-list { display: none; }
    .notes-shell[data-mobile-panel="notebooks"] .note-editor { display: none; }
    .notes-shell[data-mobile-panel="list"] .notes-sidebar { display: none; }
    .notes-shell[data-mobile-panel="list"] .notes-list { display: flex; flex: 1; width: 100%; min-width: unset; max-height: none; border-right: none; border-bottom: none; }
    .notes-shell[data-mobile-panel="list"] .note-editor { display: none; }
    .notes-shell[data-mobile-panel="editor"] .notes-sidebar { display: none; }
    .notes-shell[data-mobile-panel="editor"] .notes-list { display: none; }
    .notes-shell[data-mobile-panel="editor"] .note-editor { display: flex; flex: 1; }
    .mobile-back-btn { display: inline-flex; align-items: center; gap: 5px; background: none; border: none; color: var(--blue); font-size: 13px; font-family: var(--sans); font-weight: 600; cursor: pointer; padding: 4px 0; }
    .mobile-editor-toolbar { display: flex; align-items: center; gap: 2px; padding: 8px 10px; border-top: 1px solid var(--b1); background: var(--bg1); overflow-x: auto; flex-shrink: 0; -webkit-overflow-scrolling: touch; }
    .mobile-editor-toolbar .note-tool-btn { padding: 8px 9px; font-size: 13px; min-width: 34px; min-height: 34px; }
    .sel-toolbar { display: none; }
    .app-table th:nth-child(4), .app-table td:nth-child(4),
    .app-table th:nth-child(5), .app-table td:nth-child(5) { display: none; }
    .topbar { padding: 0 16px; }
    .cal-cell { min-height: 55px; }
    .week-view { grid-template-columns: repeat(7,1fr); gap: 4px; }
    .week-col-num { font-size: 13px; }
    .week-event { font-size: 9px; padding: 3px 5px; }
    .cal-event { font-size: 9px; }
    .modal { margin: 16px; max-width: calc(100vw - 32px); }
    .notes-list-header-mobile { display: flex; align-items: center; gap: 8px; padding: 8px 12px; border-bottom: 1px solid var(--b1); flex-shrink: 0; background: var(--bg1); }
  }
  @media (min-width: 769px) {
    .mobile-back-btn { display: none; }
    .mobile-editor-toolbar { display: none; }
    .notes-list-header-mobile { display: none; }
  }

  @media (max-width: 480px) {
    .grid-4 { grid-template-columns: 1fr 1fr; }
    .grid-3 { grid-template-columns: 1fr; }
    .stat-value { font-size: 22px; }
  }
  ::-webkit-scrollbar { width: 5px; height: 5px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: var(--b2); border-radius: 3px; }
  ::-webkit-scrollbar-thumb:hover { background: var(--b3); }

  /* ── Drag-and-drop ── */
  .stat[draggable="true"] { cursor: grab; user-select: none; }
  .stat[draggable="true"]:active { cursor: grabbing; }
  .stat.is-dragging { opacity: .3; transform: scale(0.96); transition: opacity .15s, transform .15s; }
  .stat.drag-over { border-color: var(--blueb); background: rgba(59,130,246,0.12); transform: translateY(-3px) scale(1.01); box-shadow: 0 8px 28px rgba(59,130,246,0.18); }

  .card[draggable="true"] { cursor: default; }
  .card.is-dragging { opacity: .3; transform: scale(0.98); transition: opacity .15s, transform .15s; }
  .card.drag-over { border-color: var(--blueb); background: rgba(59,130,246,0.07); box-shadow: 0 0 0 3px rgba(59,130,246,0.06); }

  /* ── Drag handle ── */
  .drag-handle {
    display: flex; align-items: center; justify-content: center;
    color: var(--t3); opacity: 0; transition: opacity .15s;
    cursor: grab; border-radius: 6px; padding: 3px; flex-shrink: 0;
  }
  .drag-handle:active { cursor: grabbing; }
  .stat:hover .drag-handle,
  .card:hover .drag-handle,
  .nav-item:hover .drag-handle,
  .tracker-card:hover .drag-handle { opacity: 0.45; }
  .drag-handle:hover { opacity: 1 !important; color: var(--t2); background: rgba(255,255,255,0.06); }

  /* Tracker card drag states */
  .tracker-card[draggable="true"] { cursor: default; }
  .tracker-card.is-dragging { opacity: .3; transform: scale(0.97) !important; transition: opacity .15s, transform .15s; }
  .tracker-card.drag-over { border-color: var(--blueb) !important; box-shadow: 0 0 0 3px rgba(59,130,246,0.08), 0 8px 32px rgba(0,0,0,0.3) !important; transform: translateY(-2px) !important; }

  /* Sidebar nav drag states */
  .nav-item[draggable="true"] { cursor: default; }
  .nav-item.is-dragging { opacity: .35; }
  .nav-item.nav-drag-over { background: rgba(59,130,246,0.10) !important; border-color: var(--blueb) !important; }

  /* ── Animations ── */
  @keyframes fadeInUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
  .animate-in { animation: fadeInUp .3s ease both; }

  /* ── Theme switcher ── */
  .theme-cards { display: flex; gap: 12px; flex-wrap: wrap; }
  .theme-card {
    flex: 1; min-width: 120px; padding: 14px; border-radius: 12px;
    border: 2px solid var(--b2); background: var(--bg2);
    cursor: pointer; transition: all .15s; user-select: none;
  }
  .theme-card:hover { border-color: var(--b3); background: var(--bg3); }
  .theme-card.active { border-color: var(--blue); }
  .theme-swatch {
    display: flex; gap: 4px; margin-bottom: 10px; border-radius: 6px;
    overflow: hidden; height: 32px;
  }
  .theme-swatch-sidebar { width: 28%; border-radius: 4px 0 0 4px; }
  .theme-swatch-body { flex: 1; border-radius: 0 4px 4px 0; }
  .theme-card-name { font-size: 12px; font-weight: 600; color: var(--t1); margin-bottom: 2px; }
  .theme-card-desc { font-size: 11px; color: var(--t3); line-height: 1.4; }
`;


// ─── ICONS ───────────────────────────────────────────────────────────────────
const Icon = ({ name, size = 16, color = "currentColor" }) => {
  const s = { width: size, height: size, stroke: color, fill: "none", strokeWidth: 1.6, strokeLinecap: "round", strokeLinejoin: "round", flexShrink: 0 };
  const p = {
    home: <><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></>,
    notes: <><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></>,
    calendar: <><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></>,
    career: <><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16" /></>,
    finance: <><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" /></>,
    study: <><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z" /><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z" /></>,
    travel: <><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" /></>,
    pet: <><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" /></>,
    plus: <><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></>,
    trash: <><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" /><path d="M10 11v6M14 11v6M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" /></>,
    lock: <><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></>,
    check: <><polyline points="20 6 9 17 4 12" /></>,
    x: <><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></>,
    chevL: <><polyline points="15 18 9 12 15 6" /></>,
    chevR: <><polyline points="9 18 15 12 9 6" /></>,
    logout: <><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></>,
    edit: <><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></>,
    tag: <><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" /><line x1="7" y1="7" x2="7.01" y2="7" /></>,
    search: <><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></>,
    ai: <><path d="M12 2a10 10 0 110 20A10 10 0 0112 2z" /><path d="M12 8v4l3 3" /><circle cx="12" cy="12" r="1" /><path d="M16.24 7.76l-1.42 1.42M7.76 7.76l1.42 1.42M7.76 16.24l1.42-1.42M16.24 16.24l-1.42-1.42" /></>,
    trackers: <><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></>,
    grab: <><line x1="8" y1="7" x2="16" y2="7"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="8" y1="17" x2="16" y2="17"/></>,
    eye:  <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>,
    eyeOff: <><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></>,
    code: <><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></>,
    list: <><line x1="9" y1="6" x2="20" y2="6"/><line x1="9" y1="12" x2="20" y2="12"/><line x1="9" y1="18" x2="20" y2="18"/><line x1="4" y1="6" x2="4.01" y2="6" strokeWidth="3" strokeLinecap="round"/><line x1="4" y1="12" x2="4.01" y2="12" strokeWidth="3" strokeLinecap="round"/><line x1="4" y1="18" x2="4.01" y2="18" strokeWidth="3" strokeLinecap="round"/></>,
    folder: <><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></>,
  };
  return <svg viewBox="0 0 24 24" style={s}>{p[name]}</svg>;
};

// ─── NOTEBOOKS CONFIG ────────────────────────────────────────────────────────
const DEFAULT_NOTEBOOKS = [
  {
    id: "finance", label: "Finance", emoji: "💰", color: "#10b981", bg: "rgba(16,185,129,0.15)",
    sections: [
      { id: "mortgage", label: "Mortgage & House" },
      { id: "expenses", label: "Monthly Expenses" },
      { id: "goals", label: "Financial Goals" },
      { id: "investments", label: "Investments" },
    ]
  },
  {
    id: "travel", label: "Travel", emoji: "✈️", color: "#3b82f6", bg: "rgba(59,130,246,0.15)",
    sections: [
      { id: "scotland", label: "Scotland Sep 2026" },
      { id: "italy", label: "Italy Jun 2026" },
      { id: "wishlist", label: "Wish List" },
      { id: "packing", label: "Packing Lists" },
    ]
  },
  {
    id: "career", label: "Career", emoji: "💼", color: "#f59e0b", bg: "rgba(245,158,11,0.15)",
    sections: [
      { id: "applications", label: "Applications" },
      { id: "pmp", label: "PMP Study" },
      { id: "networking", label: "Networking" },
      { id: "interview", label: "Interview Prep" },
    ]
  },
  {
    id: "personal", label: "Personal", emoji: "🌿", color: "#ec4899", bg: "rgba(236,72,153,0.15)",
    sections: [
      { id: "health", label: "Health & Fitness" },
      { id: "reading", label: "Reading List" },
      { id: "home", label: "Home & House" },
      { id: "ozzy", label: "Ozzy 🐾" },
    ]
  },
  {
    id: "ideas", label: "Ideas", emoji: "💡", color: "#8b5cf6", bg: "rgba(139,92,246,0.15)",
    sections: [
      { id: "sanctum", label: "Sanctum App" },
      { id: "projects", label: "Projects" },
      { id: "random", label: "Random" },
    ]
  },
];

const STATUS_COLORS = { submitted: "blue", interview: "amber", offer: "green", rejected: "red", withdrawn: "muted" };
const CAT_ICONS = {
  expense: { emoji: "💳", color: "#ef4444", bg: "rgba(239,68,68,0.15)" },
  income: { emoji: "💰", color: "#10b981", bg: "rgba(16,185,129,0.15)" },
  mortgage: { emoji: "🏠", color: "#3b82f6", bg: "rgba(59,130,246,0.15)" },
  insurance: { emoji: "🛡️", color: "#f59e0b", bg: "rgba(245,158,11,0.15)" },
  subscription: { emoji: "📱", color: "#8b5cf6", bg: "rgba(139,92,246,0.15)" },
  savings: { emoji: "🏦", color: "#10b981", bg: "rgba(16,185,129,0.15)" },
};
const EVENT_COLORS = {
  personal: { color: "#3b82f6", bg: "rgba(59,130,246,0.2)" },
  career: { color: "#f59e0b", bg: "rgba(245,158,11,0.2)" },
  travel: { color: "#10b981", bg: "rgba(16,185,129,0.2)" },
  study: { color: "#8b5cf6", bg: "rgba(139,92,246,0.2)" },
  family: { color: "#ec4899", bg: "rgba(236,72,153,0.2)" },
};

// ─── MODAL ───────────────────────────────────────────────────────────────────
function Modal({ title, onClose, children, wide }) {
  useEffect(() => {
    const handler = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={wide ? { maxWidth: 560 } : {}}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22 }}>
          <div className="modal-title">{title}</div>
          <button className="btn sm ghost" onClick={onClose}><Icon name="x" size={14} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ─── LOGIN ───────────────────────────────────────────────────────────────────
function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState("login");

  const attempts = useRef(0);
  const lockUntil = useRef(0);

  const handle = async () => {
    if (Date.now() < lockUntil.current) {
      const secs = Math.ceil((lockUntil.current - Date.now()) / 1000);
      return setError(`Too many attempts. Try again in ${secs}s.`);
    }
    if (!email || !password) return setError("Please enter your email and password.");
    if (password.length < 8) return setError("Password must be at least 8 characters.");
    setLoading(true); setError("");
    try {
      const data = mode === "login" ? await auth.signIn(email, password) : await auth.signUp(email, password);
      if (data.access_token) {
        attempts.current = 0;
        auth.saveSession(data);
        onLogin(data.user);
      } else if (data.id && mode === "signup") {
        setError("Account created. Check your email to confirm, then sign in.");
        setMode("login");
      } else {
        attempts.current += 1;
        if (attempts.current >= 5) {
          lockUntil.current = Date.now() + 30000;
          attempts.current = 0;
          setError("Too many failed attempts. Locked for 30 seconds.");
        } else {
          setError(data.error_description || data.message || "Invalid email or password.");
        }
      }
    } catch { setError("Connection error. Try again."); }
    setLoading(false);
  };

  return (
    <div className="login-wrap">
      <div className="login-box animate-in">
        <div className="login-logo">
          <div className="login-mark">S</div>
          <div className="login-name">Sanctum</div>
        </div>
        <div className="login-title">{mode === "login" ? "Welcome back" : "Create account"}</div>
        <div className="login-sub">{mode === "login" ? "Sign in to your private space" : "Set up your Sanctum"}</div>
        {error && <div className="login-error">{error}</div>}
        <div className="form-row">
          <label className="form-label">Email</label>
          <input className="inp" type="email" value={email} onChange={e => setEmail(e.target.value)}
            placeholder="you@email.com" onKeyDown={e => e.key === "Enter" && handle()} autoFocus />
        </div>
        <div className="form-row">
          <label className="form-label">Password</label>
          <input className="inp" type="password" value={password} onChange={e => setPassword(e.target.value)}
            placeholder="••••••••" onKeyDown={e => e.key === "Enter" && handle()} />
        </div>
        <button className="btn primary" style={{ width: "100%", justifyContent: "center", padding: "12px", marginTop: 8 }}
          onClick={handle} disabled={loading}>
          {loading ? "Please wait..." : mode === "login" ? "Sign in" : "Create account"}
        </button>
        <div style={{ textAlign: "center", marginTop: 18, fontSize: 12, color: "var(--t3)" }}>
          {mode === "login" && (
            <div style={{ textAlign: "center", marginTop: 12 }}>
              <button className="btn ghost" style={{ fontSize: 12, color: "var(--t3)", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}
                onClick={async () => {
                  if (!email) return setError("Enter your email address first, then click forgot password.");
                  setLoading(true); setError("");
                  try {
                    const res = await fetch(`${SUPABASE_URL}/auth/v1/recover`, {
                      method: "POST",
                      headers: { apikey: SUPABASE_KEY, "Content-Type": "application/json" },
                      body: JSON.stringify({ email })
                    });
                    if (res.ok) setError("✓ Password reset email sent. Check your inbox.");
                    else setError("Could not send reset email. Check the address and try again.");
                  } catch { setError("Connection error. Try again."); }
                  setLoading(false);
                }}>
                Forgot password?
              </button>
            </div>
          )}
          <span style={{ color: "var(--blue)", cursor: "pointer", fontWeight: 600 }}
            onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(""); }}>
            {mode === "login" ? "Create one" : "Sign in"}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── DASHBOARD ───────────────────────────────────────────────────────────────
function Dashboard({ onNavigate, onGoToCalendarDay }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState("");
  const [newTask, setNewTask] = useState({ text: "", tag: "" });
  const [events, setEvents] = useState([]);
  const [showArchived, setShowArchived] = useState(false);

  const today = new Date();
  const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const todayDow = today.getDay() === 0 ? 6 : today.getDay() - 1;
  const weekDates = DAYS.map((_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - todayDow + i);
    return d;
  });

  useEffect(() => { loadTasks(); loadEvents(); }, []);

  const loadTasks = async () => {
    setLoading(true);
    try {
      const data = await sb.from("tasks").select("*");
      if (Array.isArray(data) && data.length > 0) setTasks(data);
      else setTasks([]);
    } catch { setTasks([]); }
    setLoading(false);
  };

  const loadEvents = async () => {
    try {
      const data = await sb.from("events").select("*");
      if (Array.isArray(data)) setEvents(data);
    } catch { }
  };

  const toggleTask = async (t) => {
    setTasks(prev => prev.map(x => x.id === t.id ? { ...x, done: !x.done } : x));
    try { await sb.from("tasks").update({ done: !t.done }, { id: t.id }); } catch { }
  };

  const deleteTask = async (id) => {
    setTasks(prev => prev.filter(t => t.id !== id));
    try { await sb.from("tasks").delete({ id }); } catch { }
  };

  const startEdit = (t) => { setEditingId(t.id); setEditText(t.text); };

  const saveEdit = async (id) => {
    if (!editText.trim()) return;
    setTasks(prev => prev.map(t => t.id === id ? { ...t, text: editText } : t));
    setEditingId(null);
    try { await sb.from("tasks").update({ text: editText }, { id }); } catch { }
  };

  const addTask = async () => {
    if (!newTask.text.trim()) return;
    const task = { text: newTask.text, tag: newTask.tag, done: false };
    try {
      const res = await sb.from("tasks").insert(task);
      const created = Array.isArray(res) && res[0] ? res[0] : { ...task, id: Date.now().toString() };
      setTasks(t => [...t, created]);
    } catch { setTasks(t => [...t, { ...task, id: Date.now().toString() }]); }
    setNewTask({ text: "", tag: "" }); setShowAdd(false);
  };

  const eventsOnDate = (date) => {
    const ds = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    return events.filter(e => e.date === ds);
  };

  const done = tasks.filter(t => t.done).length;
  const activeTasks = tasks.filter(t => !t.done);
  const archivedTasks = tasks.filter(t => t.done);

  return (
    <div className="page-body animate-in">
      {showAdd && (
        <Modal title="Add task" onClose={() => setShowAdd(false)}>
          <div className="form-row"><label className="form-label">Task</label>
            <input className="inp" value={newTask.text} onChange={e => setNewTask(n => ({ ...n, text: e.target.value }))}
              placeholder="What needs doing?" onKeyDown={e => e.key === "Enter" && addTask()} autoFocus /></div>
          <div className="form-row"><label className="form-label">Tag</label>
            <input className="inp" value={newTask.tag} onChange={e => setNewTask(n => ({ ...n, tag: e.target.value }))}
              placeholder="Career, PMP, Travel..." /></div>
          <div className="modal-actions">
            <button className="btn" onClick={() => setShowAdd(false)}>Cancel</button>
            <button className="btn primary" onClick={addTask}>Add task</button>
          </div>
        </Modal>
      )}

      {/* Week strip */}
      <div className="card mb18">
        <div className="card-header">
          <div>
            <div className="card-title">This week</div>
            <div className="card-sub">{today.toLocaleDateString("en-IE", { month: "long", year: "numeric" })}</div>
          </div>
          <span className="badge green">{done}/{tasks.length} done</span>
        </div>
        <div className="week-strip">
          {weekDates.map((date, i) => {
            const dayEvents = eventsOnDate(date);
            const isToday = i === todayDow;
            return (
              <div key={i} className={`day-cell${isToday ? " today" : ""}${dayEvents.length > 0 ? " has-event" : ""}`}
                onClick={() => onGoToCalendarDay(date)}>
                <div className="day-name">{DAYS[i]}</div>
                <div className="day-num">{date.getDate()}</div>
                <div className="day-dots">
                  {dayEvents.slice(0, 3).map((ev, j) => (
                    <div key={j} className="day-dot" style={{ background: EVENT_COLORS[ev.category]?.color || "var(--blue)" }} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Stat widgets */}
      <div className="grid-4 mb18">
        <div className="dash-widget" onClick={() => onNavigate("career")}>
          <div className="dw-arrow"><Icon name="chevR" size={16} /></div>
          <div className="dw-icon" style={{ background: "rgba(245,158,11,0.15)", color: "var(--amber)" }}><Icon name="career" size={20} color="var(--amber)" /></div>
          <div className="dw-label">Applications</div>
          <div className="dw-value">3</div>
          <div className="dw-sub">Anthropic, Google ×2</div>
        </div>
        <div className="dash-widget" onClick={() => onNavigate("study")}>
          <div className="dw-arrow"><Icon name="chevR" size={16} /></div>
          <div className="dw-icon" style={{ background: "rgba(139,92,246,0.15)", color: "var(--purple)" }}><Icon name="study" size={20} color="var(--purple)" /></div>
          <div className="dw-label">PMP Exam</div>
          <div className="dw-value">Jul 7</div>
          <div className="dw-sub">2026 target</div>
        </div>
        <div className="dash-widget" onClick={() => onNavigate("finance")}>
          <div className="dw-arrow"><Icon name="chevR" size={16} /></div>
          <div className="dw-icon" style={{ background: "rgba(16,185,129,0.15)", color: "var(--grn)" }}><Icon name="finance" size={20} color="var(--grn)" /></div>
          <div className="dw-label">Monthly spend</div>
          <div className="dw-value">€685</div>
          <div className="dw-sub">Apr 2026</div>
        </div>
        <div className="dash-widget" onClick={() => onNavigate("travel")}>
          <div className="dw-arrow"><Icon name="chevR" size={16} /></div>
          <div className="dw-icon" style={{ background: "rgba(59,130,246,0.15)", color: "var(--blue)" }}><Icon name="travel" size={20} color="var(--blue)" /></div>
          <div className="dw-label">Next trip</div>
          <div className="dw-value">152d</div>
          <div className="dw-sub">Scotland — Sep 7</div>
        </div>
      </div>

      {/* Tasks + Notes preview */}
      <div className="grid-2 mb18">
        <div className="card">
          <div className="card-header">
            <div><div className="card-title">Tasks</div><div className="card-sub">{activeTasks.length} active · {archivedTasks.length} done</div></div>
            <button className="btn sm primary" onClick={() => setShowAdd(true)}><Icon name="plus" size={13} /> Add</button>
          </div>
          {loading ? <div className="loading">Loading...</div> : (
            <div>
              {activeTasks.length === 0 && (
                <div style={{ color: "var(--t3)", fontSize: 13, textAlign: "center", padding: "20px 0" }}>No active tasks 🎉</div>
              )}
              {activeTasks.map(t => (
                <div key={t.id} className="task-item">
                  <div className="task-check" onClick={() => toggleTask(t)} />
                  <div className="task-content">
                    {editingId === t.id ? (
                      <input className="task-edit-input" value={editText}
                        onChange={e => setEditText(e.target.value)}
                        onBlur={() => saveEdit(t.id)}
                        onKeyDown={e => { if (e.key === "Enter") saveEdit(t.id); if (e.key === "Escape") setEditingId(null); }}
                        autoFocus />
                    ) : (
                      <div className="task-text">{t.text}</div>
                    )}
                    {t.tag && <div className="task-meta"><span className="task-tag">{t.tag}</span></div>}
                  </div>
                  <div className="task-actions">
                    <button className="btn xs ghost" onClick={() => startEdit(t)}><Icon name="edit" size={12} /></button>
                    <button className="btn xs danger" onClick={() => deleteTask(t.id)}><Icon name="trash" size={12} /></button>
                  </div>
                </div>
              ))}

              {archivedTasks.length > 0 && (
                <div style={{ marginTop: 12 }}>
                  <button className="btn sm ghost" style={{ width: "100%", justifyContent: "center", color: "var(--t3)", fontSize: 11 }}
                    onClick={() => setShowArchived(s => !s)}>
                    {showArchived ? "▲ Hide" : "▼ Show"} {archivedTasks.length} completed
                  </button>
                  {showArchived && archivedTasks.map(t => (
                    <div key={t.id} className="task-item" style={{ opacity: .5 }}>
                      <div className="task-check done" onClick={() => toggleTask(t)}>
                        <Icon name="check" size={10} color="#fff" />
                      </div>
                      <div className="task-content">
                        <div className="task-text done">{t.text}</div>
                        {t.tag && <div className="task-meta"><span className="task-tag">{t.tag}</span></div>}
                      </div>
                      <div className="task-actions">
                        <button className="btn xs danger" onClick={() => deleteTask(t.id)}><Icon name="trash" size={12} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-header">
            <div><div className="card-title">Quick access</div></div>
          </div>
          <div className="grid-2" style={{ gap: 10 }}>
            {[
              { label: "Notes", emoji: "📝", page: "notes", sub: "Notebooks & sections" },
              { label: "Calendar", emoji: "📅", page: "calendar", sub: "Events & plans" },
              { label: "Finance", emoji: "💰", page: "finance", sub: "Apr balance: €3,344" },
              { label: "Ozzy", emoji: "🐾", page: "pet", sub: "Golden Retriever" },
            ].map(item => (
              <div key={item.page} onClick={() => onNavigate(item.page)}
                style={{ background: "var(--bg2)", border: "1px solid var(--b1)", borderRadius: 12, padding: 16, cursor: "pointer", transition: "all .2s" }}
                onMouseEnter={e => e.currentTarget.style.borderColor = "var(--b3)"}
                onMouseLeave={e => e.currentTarget.style.borderColor = "var(--b1)"}>
                <div style={{ fontSize: 22, marginBottom: 8 }}>{item.emoji}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--t1)", marginBottom: 2 }}>{item.label}</div>
                <div style={{ fontSize: 11, color: "var(--t3)" }}>{item.sub}</div>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 14 }}>
            <span className="enc-badge"><Icon name="lock" size={10} color="var(--grn)" /> End-to-end encrypted</span>
          </div>
        </div>
      </div>

      {/* Progress */}
      <div className="grid-3">
        <div className="stat">
          <div className="stat-icon" style={{ background: "rgba(139,92,246,0.15)" }}>📚</div>
          <div className="stat-label">PMP Study</div>
          <div className="stat-value">2h</div>
          <div className="stat-sub">Target: Jul 7 2026</div>
          <div className="stat-bar"><div className="stat-fill" style={{ width: "0.1%" }} /></div>
        </div>
        <div className="stat">
          <div className="stat-icon" style={{ background: "rgba(16,185,129,0.15)" }}>🎓</div>
          <div className="stat-label">MSc Cybersecurity</div>
          <div className="stat-value">159d</div>
          <div className="stat-sub">SETU — Sep 14 2026</div>
          <div className="stat-bar"><div className="stat-fill grn" style={{ width: "62%" }} /></div>
        </div>
        <div className="stat">
          <div className="stat-icon" style={{ background: "rgba(59,130,246,0.15)" }}>✈️</div>
          <div className="stat-label">Scotland trip</div>
          <div className="stat-value">152d</div>
          <div className="stat-sub">Sep 7–13 · Tamara + Ozzy 🐾</div>
          <div className="stat-bar"><div className="stat-fill amber" style={{ width: "59%" }} /></div>
        </div>
      </div>
    </div>
  );
}

// ─── WYSIWYG HELPERS ─────────────────────────────────────────────────────────

const mdToHtmlWysiwyg = (text) => {
  if (!text) return '';
  const esc = s => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const inlineFmt = s => s
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(?<!\*|_)_([^_]+)_(?!\*|_)/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  const lines = text.split('\n');
  let html = '', inCode = false, codeBuf = [];
  for (const line of lines) {
    if (line.trim().startsWith('```')) {
      if (inCode) { html += `<div class="we-codeblock"><pre><code>${esc(codeBuf.join('\n'))}</code></pre></div>`; codeBuf = []; inCode = false; }
      else { inCode = true; }
      continue;
    }
    if (inCode) { codeBuf.push(line); continue; }
    const hm = line.match(/^(#{1,3}) (.*)/);
    if (hm) { html += `<div class="we-h we-h${hm[1].length}">${inlineFmt(hm[2] || '')}</div>`; continue; }
    if (line.trim() === '---') { html += `<div class="we-hr"><hr></div>`; continue; }
    if (/^[-*] \[[x ]\] /i.test(line)) {
      const checked = /^[-*] \[x\] /i.test(line);
      const content = line.replace(/^[-*] \[[x ]\] /i, '');
      html += `<div class="we-check"><span class="we-checkbox${checked?' checked':''}" contenteditable="false">${checked?'☑':'☐'}</span>${inlineFmt(content)}</div>`;
      continue;
    }
    if (/^[-*] /.test(line)) { html += `<div class="we-ul"><span class="we-bullet" contenteditable="false">•</span>${inlineFmt(line.slice(2))}</div>`; continue; }
    if (/^\d+\. /.test(line)) { const m = line.match(/^\d+\. (.*)/); html += `<div class="we-ol">${inlineFmt(m?m[1]:line)}</div>`; continue; }
    if (line.trim() === '') { html += `<div class="we-line"><br></div>`; continue; }
    html += `<div class="we-line">${inlineFmt(line)}</div>`;
  }
  if (inCode) html += `<div class="we-codeblock"><pre><code>${esc(codeBuf.join('\n'))}</code></pre></div>`;
  return html || `<div class="we-line"><br></div>`;
};

// ─── MARKDOWN → HTML PREVIEW ─────────────────────────────────────────────────
const mdToHtmlPreview = (text) => {
  if (!text) return '';
  const esc = s => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const inline = s => s
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
  const lines = text.split('\n');
  let html = '', inCode = false, codeBuf = [];
  for (const line of lines) {
    if (line.trim().startsWith('```')) {
      if (inCode) { html += `<pre><code>${esc(codeBuf.join('\n'))}</code></pre>`; codeBuf = []; inCode = false; }
      else { inCode = true; }
      continue;
    }
    if (inCode) { codeBuf.push(line); continue; }
    const hm = line.match(/^(#{1,3}) (.*)/);
    if (hm) { html += `<h${hm[1].length}>${inline(hm[2]||'')}</h${hm[1].length}>`; continue; }
    if (line.trim() === '---') { html += '<hr>'; continue; }
    if (/^[-*] /.test(line)) { html += `<ul><li>${inline(line.slice(2))}</li></ul>`; continue; }
    if (line.trim() === '') { html += '<br>'; continue; }
    html += `<p>${inline(line)}</p>`;
  }
  if (inCode) html += `<pre><code>${esc(codeBuf.join('\n'))}</code></pre>`;
  return html;
};

const htmlToMd = (el) => {
  if (!el) return '';
  let md = '';
  function walkNode(node) {
    if (node.nodeType === 3) { md += node.textContent; return; }
    if (node.nodeType !== 1) return;
    const tag = node.tagName;
    const cls = node.className || '';
    const kids = () => { for (const c of node.childNodes) walkNode(c); };
    if (tag === 'BR') { md += '\n'; return; }
    if (tag === 'STRONG' || tag === 'B') { md += '**'; kids(); md += '**'; return; }
    if (tag === 'EM' || tag === 'I') { md += '_'; kids(); md += '_'; return; }
    if (tag === 'CODE' && node.parentElement?.tagName !== 'PRE') { md += '`'; kids(); md += '`'; return; }
    if (tag === 'A') { const href = node.getAttribute('href')||''; let t=''; node.childNodes.forEach(c=>{if(c.nodeType===3)t+=c.textContent;}); md += `[${t||node.textContent}](${href})`; return; }
    if (tag === 'HR') { md += '---\n'; return; }
    if (tag === 'PRE') { const code = node.querySelector('code'); md += '```\n' + (code?code.textContent:node.textContent) + '\n```\n'; return; }
    if (tag === 'SPAN') {
      if (cls.includes('we-bullet') || cls.includes('we-checkbox')) return;
      kids(); return;
    }
    if (tag === 'DIV' || tag === 'P') {
      const before = md.length;
      if (cls.includes('we-h1')) { md += '# '; kids(); if (!md.endsWith('\n')) md += '\n'; return; }
      if (cls.includes('we-h2')) { md += '## '; kids(); if (!md.endsWith('\n')) md += '\n'; return; }
      if (cls.includes('we-h3')) { md += '### '; kids(); if (!md.endsWith('\n')) md += '\n'; return; }
      if (cls.includes('we-hr')) { md += '---\n'; return; }
      if (cls.includes('we-codeblock')) { const pre = node.querySelector('pre'); const code = node.querySelector('code'); md += '```\n' + (code?code.textContent:(pre?pre.textContent:node.textContent)) + '\n```\n'; return; }
      if (cls.includes('we-ul')) { md += '- '; kids(); if (!md.endsWith('\n')) md += '\n'; return; }
      if (cls.includes('we-check')) {
        const chk = node.querySelector('.we-checkbox'); const checked = chk?.classList.contains('checked');
        md += checked ? '- [x] ' : '- [ ] '; kids(); if (!md.endsWith('\n')) md += '\n'; return;
      }
      if (cls.includes('we-ol')) { md += '1. '; kids(); if (!md.endsWith('\n')) md += '\n'; return; }
      // plain div / we-line — if this is the root el, just walk children
      if (node === el) { kids(); return; }
      if (md.length > 0 && !md.endsWith('\n')) md += '\n';
      kids();
      if (md.length > before && !md.endsWith('\n')) md += '\n';
      return;
    }
    kids();
  }
  walkNode(el);
  return md.replace(/\n{3,}/g, '\n\n').trim();
};

const saveCursorOffset = (el) => {
  try {
    const sel = window.getSelection();
    if (!sel?.rangeCount) return null;
    const range = sel.getRangeAt(0);
    const pre = range.cloneRange();
    pre.selectNodeContents(el);
    pre.setEnd(range.startContainer, range.startOffset);
    return pre.toString().length;
  } catch { return null; }
};

const restoreCursorOffset = (el, offset) => {
  if (offset === null || offset === undefined || !el) return;
  try {
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
    let remaining = offset, lastNode = null;
    while (walker.nextNode()) {
      const node = walker.currentNode;
      lastNode = node;
      if (remaining <= node.length) {
        const range = document.createRange();
        range.setStart(node, remaining);
        range.collapse(true);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
        return;
      }
      remaining -= node.length;
    }
    if (lastNode) {
      const range = document.createRange();
      range.setStart(lastNode, lastNode.length);
      range.collapse(true);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
    }
  } catch {}
};

function SplitEditor({ value, onChange, placeholder, textareaRef, editorMode, setMode }) {
  const innerRef = useRef(null);
  const ref = textareaRef || innerRef;
  const preview = useMemo(() => mdToHtmlPreview(value), [value]);

  const handleKeyDown = useCallback((e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
      e.preventDefault();
      const ta = ref.current; if (!ta) return;
      const s = ta.selectionStart, en = ta.selectionEnd;
      const sel = value.slice(s, en) || 'bold';
      const ins = `**${sel}**`;
      const nv = value.slice(0, s) + ins + value.slice(en);
      onChange(nv);
      setTimeout(() => ta.setSelectionRange(s + ins.length, s + ins.length), 0);
    }
    if ((e.metaKey || e.ctrlKey) && e.key === 'i') {
      e.preventDefault();
      const ta = ref.current; if (!ta) return;
      const s = ta.selectionStart, en = ta.selectionEnd;
      const sel = value.slice(s, en) || 'italic';
      const ins = `_${sel}_`;
      const nv = value.slice(0, s) + ins + value.slice(en);
      onChange(nv);
      setTimeout(() => ta.setSelectionRange(s + ins.length, s + ins.length), 0);
    }
  }, [value, onChange, ref]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="split-editor-shell">
      <div className="split-editor-modebar">
        <span>View:</span>
        <button className={`note-tool-btn${editorMode==='write'?' on':''}`} onClick={() => setMode('write')}>Write</button>
        <button className={`note-tool-btn${editorMode==='split'?' on':''}`} onClick={() => setMode('split')}>Split</button>
        <button className={`note-tool-btn${editorMode==='preview'?' on':''}`} onClick={() => setMode('preview')}>Preview</button>
      </div>
      <div className={`split-editor-body split-mode-${editorMode}`}>
        <textarea
          ref={ref}
          className="note-body-textarea"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder || 'Start writing in Markdown...\n\n# Heading 1\n## Heading 2\n\n**bold**  _italic_  `code`\n- bullet\n```\ncode block\n```\n--- (divider)'}
          spellCheck={true}
          onKeyDown={handleKeyDown}
        />
        <div
          className="note-body-preview"
          dangerouslySetInnerHTML={{ __html: preview || '<p style="color:var(--t3);opacity:.4;font-size:13px">Start writing to see preview...</p>' }}
        />
      </div>
    </div>
  );
}

// ─── NOTES ───────────────────────────────────────────────────────────────────
function Notes() {
  // ── Notebooks (localStorage backed) ──────────────────────────────────
  const [notebooks, setNotebooks] = useState(() => {
    try { const s = localStorage.getItem('sanctum_notebooks_v2'); if (s) return JSON.parse(s); } catch {}
    return DEFAULT_NOTEBOOKS;
  });
  const saveNotebooks = useCallback((nbs) => {
    setNotebooks(nbs);
    localStorage.setItem('sanctum_notebooks_v2', JSON.stringify(nbs));
  }, []);
  const [expandedNBs, setExpandedNBs] = useState(() => {
    try { const s = localStorage.getItem('sanctum_expanded_nbs'); if (s) return new Set(JSON.parse(s)); } catch {}
    return new Set([DEFAULT_NOTEBOOKS[0]?.id]);
  });
  const toggleExpand = (id) => {
    setExpandedNBs(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      localStorage.setItem('sanctum_expanded_nbs', JSON.stringify([...next]));
      return next;
    });
  };

  // ── Active selection (localStorage backed) ───────────────────────────
  const [activeNB,      setActiveNB]      = useState(() => localStorage.getItem('sanctum_active_nb') || DEFAULT_NOTEBOOKS[0]?.id || '');
  const [activeSection, setActiveSection] = useState(() => localStorage.getItem('sanctum_active_sec') || null);

  // ── Notes (Supabase) ─────────────────────────────────────────────────
  const [allNotes,   setAllNotes]   = useState([]);
  const [activeNote, setActiveNote] = useState(null);
  const [editTitle,  setEditTitle]  = useState('');
  const [editBody,   setEditBody]   = useState('');
  const [editTags,   setEditTags]   = useState('');
  const [loading,    setLoading]    = useState(false);
  const [saveStatus, setSaveStatus] = useState('idle');
  const saveTimer   = useRef(null);
  const dirtyRef    = useRef(false);
  const pendingSave = useRef({ id: null, title: '', body: '', tags: '' });
  const editorRef   = useRef(null);
  const [editorMode, setEditorMode] = useState(() => localStorage.getItem('sanctum_editor_mode') || 'write');
  const setMode = (m) => { setEditorMode(m); localStorage.setItem('sanctum_editor_mode', m); };
  // Collapsible panels
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => localStorage.getItem('sanctum_sidebar_col') === 'true');
  const [listCollapsed, setListCollapsed] = useState(() => localStorage.getItem('sanctum_list_col') === 'true');
  // Mobile single-panel nav
  const [mobilePanel, setMobilePanel] = useState('notebooks');
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 769);

  // ── Note ordering ─────────────────────────────────────────────────────
  const [noteOrder, setNoteOrder] = useState(() => {
    try { return JSON.parse(localStorage.getItem('sanctum_note_order') || '{}'); } catch { return {}; }
  });
  const saveNoteOrder = (order) => { setNoteOrder(order); localStorage.setItem('sanctum_note_order', JSON.stringify(order)); };
  const getOrderedNotes = useCallback((sectionId, src) => {
    const sid = sectionId?.toLowerCase().trim() || '';
    const notes = (src || allNotes).filter(n => (n.section?.toLowerCase().trim() || '') === sid);
    const order = noteOrder[sectionId];
    if (!order) return notes;
    return [...notes].sort((a, b) => {
      const ai = order.indexOf(String(a.id)), bi = order.indexOf(String(b.id));
      if (ai === -1 && bi === -1) return 0; if (ai === -1) return 1; if (bi === -1) return -1; return ai - bi;
    });
  }, [allNotes, noteOrder]);

  // ── UI state ──────────────────────────────────────────────────────────
  const [nbMenu,       setNbMenu]       = useState(null);
  const [noteMenu,     setNoteMenu]     = useState(null);
  const [dotsMenu,     setDotsMenu]     = useState(false);
  const [dragNBId,     setDragNBId]     = useState(null);
  const [dragSecId,    setDragSecId]    = useState(null);
  const [dragNoteId,   setDragNoteId]   = useState(null);
  const [dragOverId,   setDragOverId]   = useState(null);
  const [renameTarget, setRenameTarget] = useState(null);
  const [newNBValue,   setNewNBValue]   = useState('');
  const [showNewNB,    setShowNewNB]    = useState(false);
  const [moveModal,    setMoveModal]    = useState(null);
  const [fullscreen,   setFullscreen]   = useState(() => localStorage.getItem('sanctum_notes_fs') === 'true');

  // ── Close menus on outside click ──────────────────────────────────────
  useEffect(() => {
    const h = (e) => {
      if (!e.target.closest('.nb-dropdown') && !e.target.closest('.nb-dot-btn')) setNbMenu(null);
      if (!e.target.closest('.note-ctx-menu') && !e.target.closest('.nb-dot-btn')) setNoteMenu(null);
      if (!e.target.closest('.note-dots-menu') && !e.target.closest('.dots-trigger')) setDotsMenu(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  // ── Fullscreen body class ─────────────────────────────────────────────
  useEffect(() => {
    document.body.classList.toggle('notes-fullscreen', fullscreen);
    return () => document.body.classList.remove('notes-fullscreen');
  }, [fullscreen]);
  const toggleFullscreen = () => {
    const v = !fullscreen; setFullscreen(v); localStorage.setItem('sanctum_notes_fs', String(v));
  };

  // ── Mobile resize ─────────────────────────────────────────────────────
  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < 769);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);

  // ── Load ──────────────────────────────────────────────────────────────
  useEffect(() => { loadNotes(); }, []);
  const loadNotes = async () => {
    setLoading(true);
    try {
      const data = await sb.from("notes").select("*");
      if (Array.isArray(data)) {
        // Normalize notebook/section: match by id OR label (case-insensitive) → canonical id
        const normalized = data.map(n => {
          let nbVal  = n.notebook?.trim() || '';
          let secVal = n.section?.trim()  || '';
          const nbMatch = DEFAULT_NOTEBOOKS.find(nb =>
            nb.id.toLowerCase() === nbVal.toLowerCase() ||
            nb.label.toLowerCase() === nbVal.toLowerCase()
          );
          if (nbMatch) {
            nbVal = nbMatch.id;
            const secMatch = nbMatch.sections.find(s =>
              s.id.toLowerCase() === secVal.toLowerCase() ||
              s.label.toLowerCase() === secVal.toLowerCase()
            );
            if (secMatch) secVal = secMatch.id;
          }
          return { ...n, notebook: nbVal, section: secVal };
        });
        setAllNotes(normalized);
        // Restore last viewed state — case-insensitive so legacy label-stored values still match
        const storedNB  = (localStorage.getItem('sanctum_active_nb')  || DEFAULT_NOTEBOOKS[0]?.id || '').toLowerCase().trim();
        const storedSec = (localStorage.getItem('sanctum_active_sec') || '').toLowerCase().trim();
        // Also match stored value as a label (e.g. localStorage had "mortgage & house" → id "mortgage")
        const resolveNBId  = (v) => DEFAULT_NOTEBOOKS.find(nb => nb.id.toLowerCase()===v||nb.label.toLowerCase()===v)?.id || v;
        const resolveSecId = (nbId, v) => DEFAULT_NOTEBOOKS.find(nb=>nb.id===nbId)?.sections.find(s=>s.id.toLowerCase()===v||s.label.toLowerCase()===v)?.id || v;
        const resolvedNB  = resolveNBId(storedNB);
        const resolvedSec = resolveSecId(resolvedNB, storedSec);
        let first;
        if (resolvedSec) first = normalized.find(n => n.section.toLowerCase() === resolvedSec.toLowerCase());
        if (!first && resolvedNB) first = normalized.find(n => n.notebook.toLowerCase() === resolvedNB.toLowerCase());
        if (!first && normalized.length > 0) first = normalized[0];
        if (first) {
          const nbId  = first.notebook || DEFAULT_NOTEBOOKS[0]?.id || '';
          const secId = first.section  || '';
          setActiveNB(nbId);   localStorage.setItem('sanctum_active_nb', nbId);
          if (secId) { setActiveSection(secId); localStorage.setItem('sanctum_active_sec', secId); }
          else       { setActiveSection(null);  localStorage.setItem('sanctum_active_sec', ''); }
          openNote(first);
        }
      }
    } catch { setAllNotes([]); }
    setLoading(false);
  };

  // ── Auto-save (700ms debounce) ────────────────────────────────────────
  const flushSave = useCallback(async () => {
    if (!dirtyRef.current) return;
    if (saveTimer.current) { clearTimeout(saveTimer.current); saveTimer.current = null; }
    const { id, title, body, tags } = pendingSave.current;
    if (!id) return;
    setSaveStatus('saving');
    const updated = new Date().toISOString();
    setAllNotes(prev => prev.map(n => n.id === id ? { ...n, title, body, tags, updated_at: updated } : n));
    try { await sb.from("notes").update({ title, body, tags, updated_at: updated }, { id }); } catch {}
    dirtyRef.current = false;
    setSaveStatus('saved');
    setTimeout(() => setSaveStatus(s => s === 'saved' ? 'idle' : s), 2000);
  }, []);

  const autoSave = useCallback((id, title, body, tags) => {
    dirtyRef.current = true;
    pendingSave.current = { id, title, body, tags };
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      setSaveStatus('saving');
      const updated = new Date().toISOString();
      setAllNotes(prev => prev.map(n => n.id === id ? { ...n, title, body, tags, updated_at: updated } : n));
      try { await sb.from("notes").update({ title, body, tags, updated_at: updated }, { id }); } catch {}
      dirtyRef.current = false;
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus(s => s === 'saved' ? 'idle' : s), 2000);
    }, 700);
  }, []);

  const openNote = async (n) => {
    if (dirtyRef.current) await flushSave();
    setActiveNote(n.id); setEditTitle(n.title || ''); setEditBody(n.body || ''); setEditTags(n.tags || '');
    if (window.innerWidth < 769) setMobilePanel('editor');
  };
  const selectSection = (sid, nbid) => {
    setActiveNB(nbid); localStorage.setItem('sanctum_active_nb', nbid);
    setActiveSection(sid); localStorage.setItem('sanctum_active_sec', sid || '');
    setNbMenu(null);
    if (window.innerWidth < 769) { setMobilePanel('list'); return; }
    const sidL = sid?.toLowerCase().trim() || '';
    const first = allNotes.find(n => (n.section?.toLowerCase().trim() || '') === sidL);
    if (first) openNote(first); else { setActiveNote(null); setEditTitle(''); setEditBody(''); setEditTags(''); }
  };
  const selectNotebook = (nbid) => {
    setActiveNB(nbid); localStorage.setItem('sanctum_active_nb', nbid);
    setActiveSection(null); localStorage.setItem('sanctum_active_sec', '');
    setNbMenu(null);
    if (window.innerWidth < 769) { setMobilePanel('list'); return; }
    const nbidL = nbid?.toLowerCase().trim() || '';
    const first = allNotes.find(n => (n.notebook?.toLowerCase().trim() || '') === nbidL);
    if (first) openNote(first); else { setActiveNote(null); setEditTitle(''); setEditBody(''); setEditTags(''); }
  };

  const onTitleChange = (v) => { setEditTitle(v); if (activeNote) autoSave(activeNote, v, editBody, editTags); };
  const onBodyChange  = (v) => {
    setEditBody(v);
    if (activeNote) autoSave(activeNote, editTitle, v, editTags);
  };
  const onTagsChange  = (v) => { setEditTags(v);  if (activeNote) autoSave(activeNote, editTitle, editBody, v); };

  // ── CRUD ──────────────────────────────────────────────────────────────
  const newNote = async () => {
    const nb = notebooks.find(n => n.id === activeNB);
    const sectionId = activeSection || nb?.sections[0]?.id || '';
    const sec = nb?.sections.find(s => s.id === sectionId);
    // Save capitalised label so DB is consistent with config (normalization on load handles legacy lowercase ids)
    const note = { notebook: nb?.label || activeNB, section: sec?.label || sectionId, title: 'Untitled', body: '', tags: '', updated_at: new Date().toISOString().slice(0, 10) };
    try {
      const res = await sb.from("notes").insert(note);
      const created = Array.isArray(res) && res[0] ? res[0] : { ...note, id: Date.now().toString() };
      setAllNotes(prev => [created, ...prev]); openNote(created);
    } catch { const n = { ...note, id: Date.now().toString() }; setAllNotes(prev => [n, ...prev]); openNote(n); }
  };

  const deleteNote = async (id) => {
    const nid = id || activeNote; if (!nid) return;
    const remaining = allNotes.filter(n => n.id !== nid); setAllNotes(remaining);
    if (nid === activeNote) {
      const _secL = activeSection?.toLowerCase().trim() || '';
      const _nbL  = activeNB?.toLowerCase().trim() || '';
      const next = activeSection
        ? remaining.find(n => (n.section?.toLowerCase().trim() || '') === _secL)
        : remaining.find(n => (n.notebook?.toLowerCase().trim() || '') === _nbL);
      if (next) openNote(next); else { setActiveNote(null); setEditTitle(''); setEditBody(''); setEditTags(''); }
    }
    try { await sb.from("notes").delete({ id: nid }); } catch {}
    setNoteMenu(null);
  };

  const duplicateNote = async (id) => {
    const note = allNotes.find(n => n.id === id); if (!note) return;
    const { id: _id, ...rest } = note;
    const dup = { ...rest, title: (note.title || 'Untitled') + ' copy', updated_at: new Date().toISOString().slice(0, 10) };
    try {
      const res = await sb.from("notes").insert(dup);
      const created = Array.isArray(res) && res[0] ? res[0] : { ...dup, id: Date.now().toString() };
      setAllNotes(prev => [created, ...prev]); openNote(created);
    } catch { const n = { ...dup, id: Date.now().toString() }; setAllNotes(prev => [n, ...prev]); openNote(n); }
    setNoteMenu(null);
  };

  const moveNote = async (noteId, toNBId, toSecId) => {
    const nbConf  = notebooks.find(n => n.id === toNBId);
    const secConf = nbConf?.sections.find(s => s.id === toSecId);
    // Normalize internally to id; save label to DB for consistency
    const nbId  = nbConf?.id  || toNBId;
    const secId = secConf?.id || toSecId;
    const nbLabel  = nbConf?.label  || toNBId;
    const secLabel = secConf?.label || toSecId;
    setAllNotes(prev => prev.map(n => n.id === noteId ? { ...n, notebook: nbId, section: secId } : n));
    try { await sb.from("notes").update({ notebook: nbLabel, section: secLabel }, { id: noteId }); } catch {}
    setMoveModal(null); setNoteMenu(null);
  };

  // ── Formatting (WYSIWYG) ──────────────────────────────────────────────
  const applyFormat = (fmt) => {
    const ta = editorRef.current; if (!ta) return;
    if (editorMode !== 'write' && editorMode !== 'split') setMode('write');
    ta.focus();
    const text = editBody;
    const start = ta.selectionStart ?? text.length;
    const end   = ta.selectionEnd   ?? text.length;
    const selText = text.slice(start, end);

    if (['h1','h2','h3','ul','ol','check','hr'].includes(fmt)) {
      const pm = { h1:'# ', h2:'## ', h3:'### ', ul:'- ', ol:'1. ', check:'- [ ] ', hr:'---' };
      const px = pm[fmt];
      const lineStart = text.lastIndexOf('\n', start - 1) + 1;
      const lineEnd   = (() => { const i = text.indexOf('\n', start); return i === -1 ? text.length : i; })();
      const line = text.slice(lineStart, lineEnd);
      let newText, newCursor;
      if (fmt === 'hr') {
        const ins = '\n---\n';
        newText = text.slice(0, lineEnd) + ins + text.slice(lineEnd);
        newCursor = lineEnd + ins.length;
      } else {
        const existing = Object.entries(pm).find(([,p]) => p !== '---' && line.startsWith(p));
        const stripped = line.replace(/^#{1,3} |^[-*] \[[ x]\] |^[-*] |^\d+\. /,'');
        const newLine  = (existing && existing[0] === fmt) ? stripped : px + stripped;
        newText = text.slice(0, lineStart) + newLine + text.slice(lineEnd);
        const diff = newLine.length - line.length;
        newCursor = Math.max(lineStart, start + diff);
      }
      onBodyChange(newText);
      setTimeout(() => ta.setSelectionRange(newCursor, newCursor), 0);
      return;
    }

    // Inline formats
    const map = { bold:`**${selText||'bold'}**`, italic:`_${selText||'italic'}_`, code:`\`${selText||'code'}\``, codeblock:`\`\`\`\n${selText||'code'}\n\`\`\``, link:`[${selText||'text'}](url)` };
    const insert = map[fmt]; if (!insert) return;
    const newText = text.slice(0, start) + insert + text.slice(end);
    onBodyChange(newText);
    const nc = start + insert.length;
    setTimeout(() => ta.setSelectionRange(nc, nc), 0);
  };

  // ── Markdown renderer with collapsible headings ───────────────────────
  // ── Notebook CRUD ─────────────────────────────────────────────────────
  const addNotebook = () => {
    if (!newNBValue.trim()) { setShowNewNB(false); return; }
    const id='nb-'+Date.now(), secId='sec-'+Date.now();
    const nb={id, label:newNBValue.trim(), emoji:'📓', color:'#8b5cf6', bg:'rgba(139,92,246,0.15)', sections:[{id:secId,label:'General'}]};
    saveNotebooks([...notebooks, nb]); toggleExpand(id);
    setNewNBValue(''); setShowNewNB(false);
  };
  const deleteNotebook = (id) => {
    const rem = notebooks.filter(n => n.id!==id); saveNotebooks(rem);
    if (activeNB===id && rem[0]) selectSection(rem[0].sections[0]?.id, rem[0].id);
    setNbMenu(null);
  };
  const addSection = async (nbId) => {
    const id='sec-'+Date.now(), label='New Section';
    saveNotebooks(notebooks.map(nb => nb.id!==nbId ? nb : {...nb, sections:[...nb.sections,{id,label}]}));
    setNbMenu(null);
    try {
      const res = await sb.from("notes").insert({ notebook: nbId, section: id, title: label, body: '', tags: '' });
      const created = Array.isArray(res) && res[0] ? res[0] : { notebook: nbId, section: id, title: label, body: '', tags: '', id: Date.now().toString() };
      setAllNotes(prev => [...prev, created]);
    } catch {}
    setTimeout(() => setRenameTarget({type:'section',id,parentId:nbId,value:label}), 50);
  };
  const deleteSection = async (secId, parentId) => {
    const nb=notebooks.find(n=>n.id===parentId); if(!nb||nb.sections.length<=1) return;
    saveNotebooks(notebooks.map(n=>n.id!==parentId?n:{...n,sections:n.sections.filter(s=>s.id!==secId)}));
    if (activeSection===secId) { const rem=nb.sections.filter(s=>s.id!==secId); if(rem[0]) selectSection(rem[0].id,parentId); }
    setAllNotes(prev => prev.filter(n => n.section !== secId));
    try { await sb.from("notes").delete({ section: secId, notebook: parentId }); } catch {}
    setNbMenu(null);
  };
  const commitRename = async () => {
    if (!renameTarget || !renameTarget.value?.trim()) { setRenameTarget(null); return; }
    const {type, id, parentId, value} = renameTarget;
    if (type==='notebook') saveNotebooks(notebooks.map(nb=>nb.id!==id?nb:{...nb,label:value.trim()}));
    else if (type==='section') {
      const newLabel = value.trim();
      saveNotebooks(notebooks.map(nb=>nb.id!==parentId?nb:{...nb,sections:nb.sections.map(s=>s.id!==id?s:{...s,id:newLabel,label:newLabel})}));
      setAllNotes(prev => prev.map(n => n.section===id ? {...n,section:newLabel} : n));
      if (activeSection===id) { setActiveSection(newLabel); localStorage.setItem('sanctum_active_sec', newLabel); }
      try { await sb.from("notes").update({section:newLabel},{section:id,notebook:parentId}); } catch {}
    }
    else if (type==='note') onTitleChange(value.trim());
    setRenameTarget(null);
  };

  // ── Note counts ───────────────────────────────────────────────────────
  const noteCountFor = (sid, nbId) => allNotes.filter(n =>
    (n.section?.toLowerCase().trim() || '') === (sid?.toLowerCase().trim() || '') &&
    (!nbId || (n.notebook?.toLowerCase().trim() || '') === (nbId?.toLowerCase().trim() || ''))
  ).length;
  const nbNoteCount  = (nb) => allNotes.filter(n => (n.notebook?.toLowerCase().trim() || '') === (nb.id?.toLowerCase().trim() || '')).length;

  // ── Notebook drag ─────────────────────────────────────────────────────
  const onNBDragStart = (e,id) => { setDragNBId(id); e.dataTransfer.effectAllowed='move'; };
  const onNBDragOver  = (e,id) => { e.preventDefault(); setDragOverId('nb-'+id); };
  const onNBDrop      = (e,tid) => {
    e.preventDefault();
    if (!dragNBId||dragNBId===tid){setDragNBId(null);setDragOverId(null);return;}
    const arr=[...notebooks], fi=arr.findIndex(n=>n.id===dragNBId), ti=arr.findIndex(n=>n.id===tid);
    const [m]=arr.splice(fi,1); arr.splice(ti,0,m); saveNotebooks(arr); setDragNBId(null); setDragOverId(null);
  };

  // ── Section drag ──────────────────────────────────────────────────────
  const onSecDragStart = (e,sid,nbId) => { e.stopPropagation(); setDragSecId({id:sid,nbId}); e.dataTransfer.effectAllowed='move'; };
  const onSecDragOver  = (e,sid) => { e.preventDefault(); e.stopPropagation(); setDragOverId('sec-'+sid); };
  const onSecDrop      = (e,tsid,nbId) => {
    e.preventDefault(); e.stopPropagation();
    if (!dragSecId||dragSecId.id===tsid||dragSecId.nbId!==nbId){setDragSecId(null);setDragOverId(null);return;}
    const nbs=notebooks.map(nb=>{
      if(nb.id!==nbId) return nb;
      const secs=[...nb.sections], fi=secs.findIndex(s=>s.id===dragSecId.id), ti=secs.findIndex(s=>s.id===tsid);
      const [m]=secs.splice(fi,1); secs.splice(ti,0,m); return {...nb,sections:secs};
    });
    saveNotebooks(nbs); setDragSecId(null); setDragOverId(null);
  };

  // ── Note drag ─────────────────────────────────────────────────────────
  const onNoteDragStart = (e,id) => { setDragNoteId(id); e.dataTransfer.effectAllowed='move'; };
  const onNoteDragOver  = (e,id) => { e.preventDefault(); setDragOverId('note-'+id); };
  const onNoteDrop      = (e,tid) => {
    e.preventDefault();
    if (!dragNoteId||dragNoteId===tid){setDragNoteId(null);setDragOverId(null);return;}
    if (!activeSection){setDragNoteId(null);setDragOverId(null);return;}
    const ordered=getOrderedNotes(activeSection), ids=ordered.map(n=>String(n.id));
    const fi=ids.indexOf(String(dragNoteId)), ti=ids.indexOf(String(tid));
    if(fi===-1||ti===-1){setDragNoteId(null);setDragOverId(null);return;}
    const [m]=ids.splice(fi,1); ids.splice(ti,0,m);
    saveNoteOrder({...noteOrder,[activeSection]:ids}); setDragNoteId(null); setDragOverId(null);
  };

  const currentNote    = allNotes.find(n => n.id === activeNote);
  const currentNB      = notebooks.find(n => n.id === activeNB);
  const currentSection = currentNB?.sections.find(s => s.id === activeSection);
  const _nbLower       = activeNB?.toLowerCase().trim() || '';
  const displayedNotes = activeSection
    ? getOrderedNotes(activeSection)
    : allNotes.filter(n => (n.notebook?.toLowerCase().trim() || '') === _nbLower);

  return (
    <div className="notes-shell" data-mobile-panel={mobilePanel} onClick={() => { setNbMenu(null); setNoteMenu(null); }}>

      {/* ── Notebooks sidebar ── */}
      <div className={`notes-sidebar${sidebarCollapsed?' collapsed':''}`} onClick={e => e.stopPropagation()}>
        <div className="notes-sidebar-header">
          {!sidebarCollapsed && <span style={{fontSize:11,fontWeight:700,color:'var(--t1)',letterSpacing:-.2,flex:1}}>Notes</span>}
          {!sidebarCollapsed && <span className="enc-badge"><Icon name="lock" size={8} color="var(--grn)"/> enc</span>}
          <button className="panel-collapse-btn" title={sidebarCollapsed?'Expand sidebar':'Collapse sidebar'}
            onClick={()=>{const v=!sidebarCollapsed;setSidebarCollapsed(v);localStorage.setItem('sanctum_sidebar_col',String(v));}}
          >{sidebarCollapsed?'›':'‹'}</button>
        </div>

        {notebooks.map(nb => {
          const isExpanded = expandedNBs.has(nb.id);
          return (
            <div key={nb.id}>
              <div
                className={`notebook-item${activeNB===nb.id?' nb-active':''}${dragOverId==='nb-'+nb.id?' nb-drag-over':''}`}
                draggable
                onDragStart={e=>onNBDragStart(e,nb.id)} onDragOver={e=>onNBDragOver(e,nb.id)}
                onDragLeave={()=>setDragOverId(null)} onDrop={e=>onNBDrop(e,nb.id)}
                onDragEnd={()=>{setDragNBId(null);setDragOverId(null);}}
                onClick={() => { toggleExpand(nb.id); selectNotebook(nb.id); }}
              >
                <span className="nb-chev" style={{transform:isExpanded?'rotate(0)':'rotate(-90deg)',display:'inline-block',transition:'transform .15s'}}>▼</span>
                <div className="notebook-icon" style={{background:nb.bg}}>{nb.emoji}</div>
                {renameTarget?.type==='notebook'&&renameTarget?.id===nb.id ? (
                  <input className="nb-rename-input" autoFocus value={renameTarget.value}
                    onChange={e=>setRenameTarget(r=>({...r,value:e.target.value}))}
                    onBlur={commitRename} onClick={e=>e.stopPropagation()}
                    onKeyDown={e=>{if(e.key==='Enter')commitRename();if(e.key==='Escape')setRenameTarget(null);}}/>
                ) : (
                  <span style={{flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{nb.label}</span>
                )}
                {!(renameTarget?.type==='notebook'&&renameTarget?.id===nb.id) && <>
                  <span className="nb-count">{nbNoteCount(nb)}</span>
                  <button className="nb-dot-btn" onClick={e=>{e.stopPropagation();setNbMenu(m=>m?.id===nb.id&&m?.type==='notebook'?null:{type:'notebook',id:nb.id});}}>···</button>
                  {nbMenu?.type==='notebook'&&nbMenu?.id===nb.id&&(
                    <div className="nb-dropdown" onClick={e=>e.stopPropagation()}>
                      <button onClick={()=>{setRenameTarget({type:'notebook',id:nb.id,value:nb.label});setNbMenu(null);}}>Rename</button>
                      <button onClick={()=>addSection(nb.id)}>Add section</button>
                      <div className="dd-sep"/>
                      <button className="danger" onClick={()=>deleteNotebook(nb.id)}>Delete notebook</button>
                    </div>
                  )}
                </>}
              </div>

              {isExpanded && nb.sections.filter(sec => sec.label !== 'New Section').map(sec => (
                <div key={sec.id}
                  className={`section-item${activeSection===sec.id?' active':''}${dragOverId==='sec-'+sec.id?' sec-drag-over':''}`}
                  draggable
                  onDragStart={e=>onSecDragStart(e,sec.id,nb.id)} onDragOver={e=>onSecDragOver(e,sec.id)}
                  onDragLeave={()=>setDragOverId(null)} onDrop={e=>onSecDrop(e,sec.id,nb.id)}
                  onDragEnd={()=>{setDragSecId(null);setDragOverId(null);}}
                  onClick={()=>selectSection(sec.id,nb.id)}
                >
                  <span className="section-dot"/>
                  {renameTarget?.type==='section'&&renameTarget?.id===sec.id ? (
                    <input className="nb-rename-input" autoFocus value={renameTarget.value} style={{marginRight:4}}
                      onChange={e=>setRenameTarget(r=>({...r,value:e.target.value}))}
                      onBlur={commitRename} onClick={e=>e.stopPropagation()}
                      onKeyDown={e=>{if(e.key==='Enter')commitRename();if(e.key==='Escape')setRenameTarget(null);}}/>
                  ) : (
                    <span style={{flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{sec.label}</span>
                  )}
                  {!(renameTarget?.type==='section'&&renameTarget?.id===sec.id) && <>
                    <span className="sec-count">{noteCountFor(sec.id, nb.id)}</span>
                    <button className="nb-dot-btn" onClick={e=>{e.stopPropagation();setNbMenu(m=>m?.id===sec.id&&m?.type==='section'?null:{type:'section',id:sec.id,parentId:nb.id});}}>···</button>
                    {nbMenu?.type==='section'&&nbMenu?.id===sec.id&&(
                      <div className="nb-dropdown" onClick={e=>e.stopPropagation()}>
                        <button onClick={()=>{setRenameTarget({type:'section',id:sec.id,parentId:nb.id,value:sec.label});setNbMenu(null);}}>Rename</button>
                        <div className="dd-sep"/>
                        <button className="danger" onClick={()=>deleteSection(sec.id,nb.id)}>Delete section</button>
                      </div>
                    )}
                  </>}
                </div>
              ))}
            </div>
          );
        })}

        {/* New notebook button */}
        <div style={{padding:'10px',marginTop:'auto',borderTop:'1px solid rgba(255,255,255,0.06)',flexShrink:0}}>
          {showNewNB ? (
            <div style={{display:'flex',gap:6,alignItems:'center'}}>
              <input className="nb-new-input" autoFocus placeholder="Notebook name" value={newNBValue}
                onChange={e=>setNewNBValue(e.target.value)}
                onKeyDown={e=>{if(e.key==='Enter')addNotebook();if(e.key==='Escape'){setShowNewNB(false);setNewNBValue('');}}}
                onBlur={()=>{if(!newNBValue.trim())setShowNewNB(false);}}/>
              <button className="btn xs primary" onClick={addNotebook}>Add</button>
            </div>
          ) : (
            <button style={{display:'flex',alignItems:'center',gap:6,background:'none',border:'1px dashed rgba(255,255,255,0.12)',borderRadius:7,color:'var(--t3)',cursor:'pointer',padding:'6px 10px',width:'100%',fontSize:11,fontFamily:'var(--sans)',transition:'all .15s',boxSizing:'border-box'}}
              onMouseEnter={e=>{e.currentTarget.style.color='var(--t2)';e.currentTarget.style.borderColor='rgba(255,255,255,0.22)';}}
              onMouseLeave={e=>{e.currentTarget.style.color='var(--t3)';e.currentTarget.style.borderColor='rgba(255,255,255,0.12)';}}
              onClick={()=>setShowNewNB(true)}>
              <Icon name="plus" size={11}/> New notebook
            </button>
          )}
        </div>
      </div>

      {/* ── Notes list ── */}
      <div className={`notes-list${listCollapsed?' collapsed':''}`}>
        {/* Mobile back button — list header */}
        <div className="notes-list-header-mobile">
          <button className="mobile-back-btn" onClick={()=>setMobilePanel('notebooks')}>
            ‹ <span>Notebooks</span>
          </button>
          <span style={{fontSize:12,fontWeight:700,color:'var(--t1)',flex:1,textAlign:'center'}}>{currentSection?.label||'Notes'}</span>
          <button className="btn xs primary" onClick={newNote} style={{flexShrink:0}}><Icon name="plus" size={11}/></button>
        </div>
        <div className="notes-list-header">
          {!listCollapsed && <span className="notes-list-header-title">{currentSection?.label || 'Notes'}</span>}
          {!listCollapsed && <button className="btn xs primary" onClick={newNote} title="New note" style={{flexShrink:0}}>
            <Icon name="plus" size={11}/> New
          </button>}
          <button className="panel-collapse-btn" title={listCollapsed?'Expand panel':'Collapse panel'}
            onClick={()=>{const v=!listCollapsed;setListCollapsed(v);localStorage.setItem('sanctum_list_col',String(v));}}
          >{listCollapsed?'›':'‹'}</button>
        </div>

        {loading && <div className="loading" style={{padding:20,textAlign:'center',fontSize:12,color:'var(--t3)'}}>Loading...</div>}
        {!loading && displayedNotes.length===0 && (
          <div style={{padding:28,textAlign:'center',color:'var(--t3)',display:'flex',flexDirection:'column',alignItems:'center',gap:10}}>
            <Icon name="notes" size={32} color="var(--t3)" style={{opacity:.3}}/>
            <div style={{fontSize:12}}>No notes in this section</div>
            <button className="btn xs primary" onClick={newNote}><Icon name="plus" size={11}/> New note</button>
          </div>
        )}

        {displayedNotes.map(n => (
          <div key={n.id}
            className={`note-list-item${activeNote===n.id?' active':''}${dragOverId==='note-'+n.id?' note-drag-over':''}${dragNoteId===n.id?' note-dragging':''}`}
            draggable
            onDragStart={e=>onNoteDragStart(e,n.id)} onDragOver={e=>onNoteDragOver(e,n.id)}
            onDragLeave={()=>setDragOverId(null)} onDrop={e=>onNoteDrop(e,n.id)}
            onDragEnd={()=>{setDragNoteId(null);setDragOverId(null);}}
            onClick={()=>openNote(n)}
            onContextMenu={e=>{e.preventDefault();setNoteMenu({id:n.id,x:e.clientX,y:e.clientY});}}
          >
            <div className="nli-row">
              <div className="nli-title">{n.title||'Untitled'}</div>
              <button className="nb-dot-btn" onClick={e=>{e.stopPropagation();setNoteMenu(m=>m?.id===n.id?null:{id:n.id,x:e.clientX,y:e.clientY});}}>···</button>
            </div>
            <div className="nli-preview">{(n.body||'').replace(/[#*_`\[\]]/g,'').replace(/\n/g,' ').slice(0,72)||'No content'}</div>
            {n.tags&&<div className="nli-tags">{n.tags.split(',').filter(Boolean).slice(0,3).map(t=><span key={t} className="nli-tag">{t.trim()}</span>)}</div>}
            <div className="nli-date">{n.updated_at ? new Date(n.updated_at).toLocaleDateString("en-IE", { day: "numeric", month: "short", year: "numeric" }) : ''}</div>
          </div>
        ))}
      </div>

      {/* Note context menu */}
      {noteMenu && (
        <div className="note-ctx-menu" style={{top:noteMenu.y,left:noteMenu.x}} onClick={e=>e.stopPropagation()}>
          <button onClick={()=>{const n=allNotes.find(x=>x.id===noteMenu.id);if(n){if(n.id!==activeNote)openNote(n);setRenameTarget({type:'note',id:n.id,value:n.title||''});}setNoteMenu(null);}}>Rename</button>
          <button onClick={()=>duplicateNote(noteMenu.id)}>Duplicate</button>
          <button onClick={()=>{setMoveModal({noteId:noteMenu.id});setNoteMenu(null);}}>Move to section</button>
          <div className="ctx-sep"/>
          <button className="danger" onClick={()=>deleteNote(noteMenu.id)}>Delete</button>
        </div>
      )}

      {/* ── Note editor ── */}
      <div className="note-editor">
        {currentNote ? (
          <>
            {/* Toolbar */}
            <div className="note-toolbar">
              {/* Mobile back button */}
              <button className="mobile-back-btn" style={{marginRight:6}} onClick={()=>setMobilePanel('list')}>‹ Notes</button>
              <span className="enc-badge" style={{flexShrink:0}}><Icon name="lock" size={8} color="var(--grn)"/> enc</span>
              {saveStatus==='saving' && <span key="saving" className="save-ind saving">saving...</span>}
              {saveStatus==='saved'  && <span key="saved"  className="save-ind saved">saved ✓</span>}
              <div style={{flex:1}}/>
              <button className="note-tool-btn" title="Bold ⌘B"      onMouseDown={e=>{e.preventDefault();applyFormat('bold');}}><strong>B</strong></button>
              <button className="note-tool-btn" title="Italic ⌘I"    onMouseDown={e=>{e.preventDefault();applyFormat('italic');}}><em>I</em></button>
              <div className="note-toolbar-sep"/>
              <button className="note-tool-btn" title="Heading 1"    onMouseDown={e=>{e.preventDefault();applyFormat('h1');}}>H1</button>
              <button className="note-tool-btn" title="Heading 2"    onMouseDown={e=>{e.preventDefault();applyFormat('h2');}}>H2</button>
              <div className="note-toolbar-sep"/>
              <button className="note-tool-btn" title="Bullet list"  onMouseDown={e=>{e.preventDefault();applyFormat('ul');}}>•—</button>
              <button className="note-tool-btn" title="Checkbox"     onMouseDown={e=>{e.preventDefault();applyFormat('check');}}>☐</button>
              <button className="note-tool-btn" title="Divider"      onMouseDown={e=>{e.preventDefault();applyFormat('hr');}}>—</button>
              <div className="note-toolbar-sep"/>
              <span style={{fontSize:10,color:'var(--t3)',fontFamily:'var(--mono)',padding:'0 3px',flexShrink:0}}>
                {editBody.split(/\s+/).filter(Boolean).length}w
              </span>
              <div style={{position:'relative'}}>
                <button className="note-tool-btn dots-trigger" title="More" onClick={e=>{e.stopPropagation();setDotsMenu(v=>!v);}}>···</button>
                {dotsMenu && (
                  <div className="note-dots-menu" onClick={e=>e.stopPropagation()}>
                    <button className="danger" onClick={()=>{deleteNote(activeNote);setDotsMenu(false);}}>
                      <Icon name="trash" size={12}/> Delete note
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Fullscreen expand/exit button — top-right corner of editor */}
            {fullscreen ? (
              <button className="fs-exit-btn" onClick={toggleFullscreen} title="Exit fullscreen">✕</button>
            ) : (
              <button className="fs-expand-btn" onClick={toggleFullscreen} title="Fullscreen">⊞</button>
            )}

            {/* Title */}
            <input className="note-title-input"
              value={renameTarget?.type==='note' ? renameTarget.value : editTitle}
              onChange={e=>{
                if(renameTarget?.type==='note') setRenameTarget(r=>({...r,value:e.target.value}));
                else onTitleChange(e.target.value);
              }}
              onBlur={()=>{if(renameTarget?.type==='note') commitRename();}}
              onKeyDown={e=>{if(renameTarget?.type==='note'&&e.key==='Enter'){commitRename();e.target.blur();}}}
              placeholder="Untitled note"/>

            {/* Meta */}
            <div className="note-meta">
              <span className="note-meta-item"><Icon name="calendar" size={10} color="var(--t3)"/> {currentNote.updated_at ? new Date(currentNote.updated_at).toLocaleDateString("en-IE", { day: "numeric", month: "short", year: "numeric" }) : ''}</span>
              <span className="note-meta-item"><Icon name="folder" size={10} color="var(--t3)"/> {currentNB?.label}{currentSection?.label ? ` / ${currentSection.label}` : ''}</span>
            </div>

            {/* Split editor: textarea + live preview */}
            <SplitEditor
              textareaRef={editorRef}
              value={editBody}
              onChange={onBodyChange}
              editorMode={editorMode}
              setMode={setMode}
            />

            {/* Mobile bottom formatting toolbar */}
            <div className="mobile-editor-toolbar">
              <button className="note-tool-btn" onMouseDown={e=>{e.preventDefault();applyFormat('bold');}}><strong>B</strong></button>
              <button className="note-tool-btn" onMouseDown={e=>{e.preventDefault();applyFormat('italic');}}><em>I</em></button>
              <button className="note-tool-btn" onMouseDown={e=>{e.preventDefault();applyFormat('h1');}}>H1</button>
              <button className="note-tool-btn" onMouseDown={e=>{e.preventDefault();applyFormat('h2');}}>H2</button>
              <button className="note-tool-btn" onMouseDown={e=>{e.preventDefault();applyFormat('ul');}}>•—</button>
              <button className="note-tool-btn" onMouseDown={e=>{e.preventDefault();applyFormat('check');}}>☐</button>
              <button className="note-tool-btn" onMouseDown={e=>{e.preventDefault();applyFormat('code');}}><Icon name="code" size={12}/></button>
            </div>

            {/* Tags */}
            <div className="note-tags-bar">
              <Icon name="tag" size={11} color="var(--t3)"/>
              {editTags.split(',').filter(t=>t.trim()).map(t=><span key={t} className="nli-tag">{t.trim()}</span>)}
              <input className="note-tags-input" placeholder="Add tags: work, idea, ..." value={editTags} onChange={e=>onTagsChange(e.target.value)}/>
            </div>
          </>
        ) : (
          <div className="note-empty">
            <div className="note-empty-icon"><Icon name="notes" size={52} color="var(--t3)"/></div>
            <div style={{fontSize:16,fontWeight:700,color:'var(--t2)'}}>Select a note</div>
            <div style={{fontSize:12,color:'var(--t3)',textAlign:'center',lineHeight:1.6}}>
              or create a new one in<br/>
              <span style={{color:'var(--t2)'}}>{currentSection?.label || 'this section'}</span>
            </div>
            <button className="btn primary" onClick={newNote} style={{marginTop:6}}><Icon name="plus" size={14}/> New note</button>
          </div>
        )}
      </div>

      {/* ── Move to section modal ── */}
      {moveModal && (
        <div className="modal-overlay" onClick={()=>setMoveModal(null)}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:4}}>
              <div className="modal-title">Move to section</div>
              <button className="btn sm ghost" onClick={()=>setMoveModal(null)}><Icon name="x" size={14}/></button>
            </div>
            <div className="move-modal-sections">
              {notebooks.map(nb=>(
                <div key={nb.id}>
                  <div className="move-modal-nb">{nb.emoji} {nb.label}</div>
                  {nb.sections.map(sec=>(
                    <div key={sec.id} className="move-modal-sec" onClick={()=>moveNote(moveModal.noteId,nb.id,sec.id)}>
                      <span className="section-dot" style={{background:sec.id===activeSection?'var(--blue)':'var(--b3)'}}/>
                      {sec.label}
                      <span style={{marginLeft:'auto',fontSize:10,color:'var(--t3)',fontFamily:'var(--mono)'}}>{noteCountFor(sec.id, nb.id)}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── CALENDAR ────────────────────────────────────────────────────────────────
function Calendar({ initialDate }) {
  const now = new Date();
  const [year,       setYear]       = useState(initialDate ? initialDate.getFullYear() : now.getFullYear());
  const [month,      setMonth]      = useState(initialDate ? initialDate.getMonth()    : now.getMonth());
  const [events,     setEvents]     = useState([]);
  const [showAdd,    setShowAdd]    = useState(false);
  const [selectedDay,setSelectedDay]= useState(initialDate ? initialDate.getDate() : null);
  const [newEvent,   setNewEvent]   = useState({ title: "", category: "personal", time: "", notes: "" });
  const [viewMode,   setViewMode]   = useState("month");
  const [activeEvent,setActiveEvent]= useState(null);
  const [weekOffset, setWeekOffset] = useState(0);

  const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const DAYS_S  = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
  const CATS = [
    { id: "personal", label: "Personal", color: "#3b82f6", bg: "rgba(59,130,246,0.22)"  },
    { id: "career",   label: "Career",   color: "#f59e0b", bg: "rgba(245,158,11,0.22)"  },
    { id: "travel",   label: "Travel",   color: "#10b981", bg: "rgba(16,185,129,0.22)"  },
    { id: "study",    label: "Study",    color: "#8b5cf6", bg: "rgba(139,92,246,0.22)"  },
    { id: "family",   label: "Family",   color: "#ec4899", bg: "rgba(236,72,153,0.22)"  },
  ];
  const catOf = (ev) => CATS.find(c => c.id === ev.category) || CATS[0];

  useEffect(() => { loadEvents(); }, []);

  const loadEvents = async () => {
    try {
      const data = await sb.from("events").select("*");
      if (Array.isArray(data) && data.length) setEvents(data);
      else throw new Error();
    } catch {
      setEvents([
        { id: "e1", title: "PMP Application due",  date: "2026-04-15", category: "study",    color: "#8b5cf6" },
        { id: "e2", title: "Italy trip begins",     date: "2026-06-12", category: "travel",   color: "#10b981" },
        { id: "e3", title: "Scotland trip",         date: "2026-09-07", category: "travel",   color: "#10b981" },
        { id: "e4", title: "MSc starts — SETU",    date: "2026-09-14", category: "study",    color: "#8b5cf6" },
        { id: "e5", title: "Metallica Dublin",      date: "2026-06-20", category: "personal", color: "#3b82f6" },
      ]);
    }
  };

  const addEvent = async () => {
    if (!newEvent.title.trim() || !selectedDay) return;
    const ds  = `${year}-${String(month+1).padStart(2,"0")}-${String(selectedDay).padStart(2,"0")}`;
    const cat = catOf({ category: newEvent.category });
    const ev  = { title: newEvent.title, date: ds, category: newEvent.category, color: cat.color, time: newEvent.time, notes: newEvent.notes };
    try {
      const res     = await sb.from("events").insert(ev);
      const created = Array.isArray(res) && res[0] ? res[0] : { ...ev, id: Date.now().toString() };
      setEvents(prev => [...prev, created]);
    } catch { setEvents(prev => [...prev, { ...ev, id: Date.now().toString() }]); }
    setNewEvent({ title: "", category: "personal", time: "", notes: "" });
    setShowAdd(false);
  };

  const deleteEvent = async (id) => {
    setEvents(prev => prev.filter(e => e.id !== id));
    setActiveEvent(null);
    try { await sb.from("events").delete({ id }); } catch {}
  };

  // ── Monthly grid ──
  const firstDay    = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month+1, 0).getDate();
  const daysInPrev  = new Date(year, month,   0).getDate();
  const startOffset = firstDay === 0 ? 6 : firstDay - 1;
  const cells = [];
  for (let i = startOffset - 1; i >= 0; i--) cells.push({ day: daysInPrev - i, current: false });
  for (let i = 1; i <= daysInMonth; i++)      cells.push({ day: i, current: true });
  while (cells.length % 7 !== 0) cells.push({ day: cells.length - daysInMonth - startOffset + 1, current: false });

  const fmtDs       = (d) => `${year}-${String(month+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
  const eventsOnDay = (day) => day.current ? events.filter(e => e.date === fmtDs(day.day)) : [];
  const isTodayCell = (day) => day.current && year === now.getFullYear() && month === now.getMonth() && day.day === now.getDate();

  const prev = () => month === 0  ? (setMonth(11), setYear(y => y-1)) : setMonth(m => m-1);
  const next = () => month === 11 ? (setMonth(0),  setYear(y => y+1)) : setMonth(m => m+1);

  // ── Week view ──
  const weekStart = (() => {
    const d = new Date(now);
    const dow = d.getDay() === 0 ? 6 : d.getDay() - 1;
    d.setDate(d.getDate() - dow + weekOffset * 7);
    d.setHours(0,0,0,0);
    return d;
  })();
  const weekDays      = Array.from({ length: 7 }, (_, i) => { const d = new Date(weekStart); d.setDate(weekStart.getDate()+i); return d; });
  const evOnWeekDay   = (date) => {
    const ds = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
    return events.filter(e => e.date === ds).sort((a,b) => (a.time||"").localeCompare(b.time||""));
  };
  const isWToday      = (date) => date.toDateString() === now.toDateString();

  const monthEvents = events
    .filter(e => { const [ey,em] = e.date.split("-").map(Number); return ey===year && em===month+1; })
    .sort((a,b) => a.date.localeCompare(b.date));

  const badgeCls = (cat) =>
    cat==="travel" ? "green" : cat==="career" ? "amber" : cat==="study" ? "purple" : cat==="family" ? "pink" : "blue";

  return (
    <div className="page-body page-enter">

      {/* Add event modal */}
      {showAdd && (
        <Modal title={`Add event — ${selectedDay} ${MONTHS[month]} ${year}`} onClose={() => setShowAdd(false)} wide>
          <div className="form-row">
            <label className="form-label">Title</label>
            <input className="inp" value={newEvent.title}
              onChange={e => setNewEvent(n => ({ ...n, title: e.target.value }))}
              placeholder="Event title" autoFocus onKeyDown={e => e.key === "Enter" && addEvent()} />
          </div>
          <div className="form-row">
            <label className="form-label">Category</label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {CATS.map(c => (
                <button key={c.id}
                  onClick={() => setNewEvent(n => ({ ...n, category: c.id }))}
                  style={{
                    padding: "5px 13px", borderRadius: 20, fontSize: 12, fontWeight: 600,
                    background: newEvent.category === c.id ? c.bg : "transparent",
                    border: `1px solid ${newEvent.category === c.id ? c.color : "rgba(255,255,255,0.1)"}`,
                    color: newEvent.category === c.id ? c.color : "var(--t3)",
                    cursor: "pointer", transition: "all .15s",
                    display: "flex", alignItems: "center", gap: 6,
                  }}>
                  <div style={{ width: 7, height: 7, borderRadius: "50%", background: c.color, flexShrink: 0 }} />
                  {c.label}
                </button>
              ))}
            </div>
          </div>
          <div className="form-row">
            <label className="form-label">Time (optional)</label>
            <input className="inp" type="time" value={newEvent.time} onChange={e => setNewEvent(n => ({ ...n, time: e.target.value }))} />
          </div>
          <div className="form-row">
            <label className="form-label">Notes (optional)</label>
            <textarea className="inp" value={newEvent.notes}
              onChange={e => setNewEvent(n => ({ ...n, notes: e.target.value }))}
              placeholder="Add details..." style={{ minHeight: 60 }} />
          </div>
          <div className="modal-actions">
            <button className="btn" onClick={() => setShowAdd(false)}>Cancel</button>
            <button className="btn primary" onClick={addEvent}>Add event</button>
          </div>
        </Modal>
      )}

      {/* Event detail modal */}
      {activeEvent && (() => {
        const cat = catOf(activeEvent);
        return (
          <Modal title={activeEvent.title} onClose={() => setActiveEvent(null)}>
            {/* Category colour bar */}
            <div style={{ height: 3, borderRadius: 2, background: cat.color, marginBottom: 20, opacity: .8 }} />
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18, flexWrap: "wrap" }}>
              <span className={`badge ${badgeCls(activeEvent.category)}`}>{activeEvent.category}</span>
              <span style={{ fontSize: 12, color: "var(--t3)", fontFamily: "var(--mono)" }}>
                <Icon name="calendar" size={11} color="var(--t3)" style={{ marginRight: 4 }} />
                {activeEvent.date}{activeEvent.time ? ` · ${activeEvent.time}` : ""}
              </span>
            </div>
            {activeEvent.notes && (
              <div style={{ fontSize: 13, color: "var(--t2)", lineHeight: 1.65, marginBottom: 18, padding: "12px 14px", background: "rgba(255,255,255,0.03)", borderRadius: 10, border: "1px solid rgba(255,255,255,0.06)" }}>
                {activeEvent.notes}
              </div>
            )}
            <div className="modal-actions">
              <button className="btn" onClick={() => setActiveEvent(null)}>Close</button>
              <button className="btn danger" onClick={() => deleteEvent(activeEvent.id)}>
                <Icon name="trash" size={13} /> Delete
              </button>
            </div>
          </Modal>
        );
      })()}

      {/* Header */}
      <div className="cal-header">
        <div className="cal-month-nav">
          {viewMode === "month" ? (
            <>
              <button className="btn sm" onClick={prev}><Icon name="chevL" size={14} /></button>
              <div className="cal-month-title">{MONTHS[month]} {year}</div>
              <button className="btn sm" onClick={next}><Icon name="chevR" size={14} /></button>
            </>
          ) : (
            <>
              <button className="btn sm" onClick={() => setWeekOffset(w => w-1)}><Icon name="chevL" size={14} /></button>
              <div className="cal-month-title" style={{ minWidth: 280 }}>
                {weekDays[0].toLocaleDateString("en-IE",{day:"numeric",month:"short"})} – {weekDays[6].toLocaleDateString("en-IE",{day:"numeric",month:"short",year:"numeric"})}
              </div>
              <button className="btn sm" onClick={() => setWeekOffset(w => w+1)}><Icon name="chevR" size={14} /></button>
            </>
          )}
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button className="btn sm" onClick={() => { setYear(now.getFullYear()); setMonth(now.getMonth()); setWeekOffset(0); }}>Today</button>
          <div style={{ display: "flex", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 9, padding: 2, gap: 2 }}>
            <button className={`btn xs${viewMode==="month"?" primary":""}`} style={{ borderRadius: 7 }} onClick={() => setViewMode("month")}>Month</button>
            <button className={`btn xs${viewMode==="week" ?" primary":""}`} style={{ borderRadius: 7 }} onClick={() => setViewMode("week")}>Week</button>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: "flex", gap: 14, marginBottom: 18, flexWrap: "wrap" }}>
        {CATS.map(c => (
          <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "var(--t3)", fontWeight: 500 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: c.color }} />{c.label}
          </div>
        ))}
      </div>

      {/* ── Month view ── */}
      {viewMode === "month" && (
        <div className="card mb18">
          <div className="cal-grid-header">
            {DAYS_S.map(d => <div key={d} className="cal-day-header">{d}</div>)}
          </div>
          <div className="cal-grid">
            {cells.map((cell, i) => {
              const dayEvs = eventsOnDay(cell);
              return (
                <div key={i}
                  className={`cal-cell${!cell.current?" other-month":""}${isTodayCell(cell)?" today":""}`}
                  onClick={() => { if (cell.current) { setSelectedDay(cell.day); setShowAdd(true); } }}>
                  <div className="cal-day-num">{cell.day}</div>
                  <div className="cal-events">
                    {dayEvs.slice(0,3).map(ev => {
                      const c = catOf(ev);
                      return (
                        <div key={ev.id} className="cal-event"
                          style={{ background: c.bg, color: c.color }}
                          onClick={e => { e.stopPropagation(); setActiveEvent(ev); }}>
                          {ev.time ? `${ev.time} ` : ""}{ev.title}
                        </div>
                      );
                    })}
                    {dayEvs.length > 3 && <div className="cal-event-more">+{dayEvs.length-3}</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Week view ── */}
      {viewMode === "week" && (
        <div className="card mb18" style={{ padding: 14 }}>
          <div className="week-view">
            {weekDays.map((date, i) => {
              const dayEvs = evOnWeekDay(date);
              return (
                <div key={i} className={`week-col${isWToday(date)?" today":""}`}>
                  <div className="week-col-header">
                    <div className="week-col-day">{DAYS_S[i]}</div>
                    <div className="week-col-num">{date.getDate()}</div>
                  </div>
                  <div className="week-col-events">
                    {dayEvs.map(ev => {
                      const c = catOf(ev);
                      return (
                        <div key={ev.id} className="week-event" style={{ background: c.bg, color: c.color }}
                          onClick={() => setActiveEvent(ev)}>
                          {ev.time && <div style={{ fontSize: 8, opacity: .75, marginBottom: 1 }}>{ev.time}</div>}
                          {ev.title}
                        </div>
                      );
                    })}
                    <div className="week-add-btn" onClick={() => {
                      setYear(date.getFullYear()); setMonth(date.getMonth());
                      setSelectedDay(date.getDate()); setShowAdd(true);
                    }}><Icon name="plus" size={14} /></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Events list for current month */}
      {viewMode === "month" && (
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Events — {MONTHS[month]} {year}</div>
              <div className="card-sub">{monthEvents.length} event{monthEvents.length !== 1 ? "s" : ""} this month</div>
            </div>
            <button className="btn sm primary" onClick={() => { setSelectedDay(now.getMonth()===month&&now.getFullYear()===year?now.getDate():1); setShowAdd(true); }}>
              <Icon name="plus" size={12} /> Add
            </button>
          </div>
          {monthEvents.length === 0 ? (
            <div style={{ padding: "24px 0", textAlign: "center", color: "var(--t3)", fontSize: 13 }}>
              No events this month — click any day to add one
            </div>
          ) : (
            monthEvents.map(ev => {
              const c = catOf(ev);
              return (
                <div key={ev.id} className="fin-row" style={{ cursor: "pointer", borderLeft: `3px solid ${c.color}`, paddingLeft: 14, marginLeft: -1 }} onClick={() => setActiveEvent(ev)}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1 }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--t1)" }}>{ev.title}</div>
                      <div style={{ fontSize: 11, color: "var(--t3)", fontFamily: "var(--mono)", marginTop: 2 }}>{ev.date}{ev.time ? ` · ${ev.time}` : ""}</div>
                    </div>
                  </div>
                  <span className={`badge ${badgeCls(ev.category)}`}>{ev.category}</span>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

// ─── CAREER ──────────────────────────────────────────────────────────────────
function Career() {
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [newApp, setNewApp] = useState({ company: "", role: "", status: "submitted", applied_date: "", notes: "" });
  const STATUSES = ["submitted", "interview", "offer", "rejected", "withdrawn"];

  useEffect(() => { loadApps(); }, []);

  const loadApps = async () => {
    setLoading(true);
    try {
      const data = await sb.from("applications").select("*");
      if (Array.isArray(data) && data.length > 0) setApps(data);
      else setApps([]);
    } catch { setApps([]); }
    setLoading(false);
  };

  const addApp = async () => {
    if (!newApp.company || !newApp.role) return;
    try {
      const res = await sb.from("applications").insert(newApp);
      const created = Array.isArray(res) && res[0] ? res[0] : { ...newApp, id: Date.now().toString() };
      setApps(prev => [...prev, created]);
    } catch { setApps(prev => [...prev, { ...newApp, id: Date.now().toString() }]); }
    setNewApp({ company: "", role: "", status: "submitted", applied_date: "", notes: "" }); setShowAdd(false);
  };

  const updateStatus = async (id, status) => {
    setApps(prev => prev.map(a => a.id === id ? { ...a, status } : a));
    try { await sb.from("applications").update({ status }, { id }); } catch { }
  };

  const deleteApp = async (id) => {
    setApps(prev => prev.filter(a => a.id !== id));
    try { await sb.from("applications").delete({ id }); } catch { }
  };

  const activeApps = apps.filter(a => !["rejected", "withdrawn"].includes(a.status));
  const archivedApps = apps.filter(a => ["rejected", "withdrawn"].includes(a.status));
  const active = activeApps.length;
  const interviews = apps.filter(a => a.status === "interview").length;

  return (
    <div className="page-body animate-in">
      {showAdd && (
        <Modal title="Add application" onClose={() => setShowAdd(false)} wide>
          <div className="grid-2" style={{ gap: 12 }}>
            <div className="form-row"><label className="form-label">Company</label><input className="inp" value={newApp.company} onChange={e => setNewApp(n => ({ ...n, company: e.target.value }))} autoFocus /></div>
            <div className="form-row"><label className="form-label">Role</label><input className="inp" value={newApp.role} onChange={e => setNewApp(n => ({ ...n, role: e.target.value }))} /></div>
          </div>
          <div className="form-row"><label className="form-label">Applied date</label><input className="inp" type="date" value={newApp.applied_date} onChange={e => setNewApp(n => ({ ...n, applied_date: e.target.value }))} /></div>
          <div className="form-row"><label className="form-label">Notes</label><textarea className="inp" value={newApp.notes} onChange={e => setNewApp(n => ({ ...n, notes: e.target.value }))} placeholder="Key notes, contacts, tailoring..." /></div>
          <div className="modal-actions"><button className="btn" onClick={() => setShowAdd(false)}>Cancel</button><button className="btn primary" onClick={addApp}>Add application</button></div>
        </Modal>
      )}

      <div className="grid-3 mb18">
        <div className="stat"><div className="stat-icon" style={{ background: "rgba(59,130,246,0.15)" }}>📨</div><div className="stat-label">Active</div><div className="stat-value">{active}</div><div className="stat-sub">In progress</div><div className="stat-bar"><div className="stat-fill" style={{ width: `${(active / Math.max(apps.length, 1)) * 100}%` }} /></div></div>
        <div className="stat"><div className="stat-icon" style={{ background: "rgba(245,158,11,0.15)" }}>🎤</div><div className="stat-label">Interviews</div><div className="stat-value">{interviews}</div><div className="stat-sub">Scheduled or completed</div></div>
        <div className="stat"><div className="stat-icon" style={{ background: "rgba(16,185,129,0.15)" }}>📊</div><div className="stat-label">Total applied</div><div className="stat-value">{apps.length}</div><div className="stat-sub">All time</div></div>
      </div>

      <div className="card">
        <div className="card-header">
          <div><div className="card-title">Applications</div><div className="card-sub">Track every opportunity</div></div>
          <button className="btn sm primary" onClick={() => setShowAdd(true)}><Icon name="plus" size={13} /> Add</button>
        </div>
        {loading ? <div className="loading">Loading...</div> : (
          <>
            <table className="app-table">
              <thead><tr>
                <th>Company</th><th>Role</th><th>Status</th><th>Applied</th><th>Notes</th><th></th>
              </tr></thead>
              <tbody>
                {activeApps.map(a => (
                  <tr key={a.id}>
                    <td><div className="company-name">{a.company}</div></td>
                    <td><div style={{ fontSize: 13, color: "var(--t2)" }}>{a.role}</div></td>
                    <td>
                      <select className="inp" style={{ padding: "4px 10px", fontSize: 12, width: "auto" }}
                        value={a.status} onChange={e => updateStatus(a.id, e.target.value)}>
                        {STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                      </select>
                    </td>
                    <td><span style={{ fontSize: 12, color: "var(--t3)", fontFamily: "var(--mono)" }}>{a.applied_date}</span></td>
                    <td><span style={{ fontSize: 12, color: "var(--t2)", maxWidth: 200, display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.notes}</span></td>
                    <td><button className="btn xs danger" onClick={() => deleteApp(a.id)}><Icon name="trash" size={11} /></button></td>
                  </tr>
                ))}
                {activeApps.length === 0 && (
                  <tr><td colSpan={6} style={{ textAlign: "center", color: "var(--t3)", padding: "24px 0", fontSize: 13 }}>No active applications</td></tr>
                )}
              </tbody>
            </table>

            {archivedApps.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <button className="btn sm ghost" style={{ width: "100%", justifyContent: "center", color: "var(--t3)", fontSize: 11 }}
                  onClick={() => setShowArchived(s => !s)}>
                  {showArchived ? "▲ Hide" : "▼ Show"} {archivedApps.length} archived (rejected / withdrawn)
                </button>
                {showArchived && (
                  <table className="app-table" style={{ marginTop: 8, opacity: .5 }}>
                    <tbody>
                      {archivedApps.map(a => (
                        <tr key={a.id}>
                          <td><div className="company-name" style={{ textDecoration: "line-through" }}>{a.company}</div></td>
                          <td><div style={{ fontSize: 13, color: "var(--t3)" }}>{a.role}</div></td>
                          <td><span className={`badge ${STATUS_COLORS[a.status] || "muted"}`}>{a.status}</span></td>
                          <td><span style={{ fontSize: 12, color: "var(--t3)", fontFamily: "var(--mono)" }}>{a.applied_date}</span></td>
                          <td></td>
                          <td><button className="btn xs danger" onClick={() => deleteApp(a.id)}><Icon name="trash" size={11} /></button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─── FINANCE ─────────────────────────────────────────────────────────────────
function Finance() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newEntry, setNewEntry] = useState({ label: "", amount: "", category: "expense", month: "April 2026" });
  const CATS = ["expense", "income", "mortgage", "insurance", "subscription", "savings"];

  useEffect(() => { loadFinance(); }, []);

  const loadFinance = async () => {
    setLoading(true);
    try {
      const data = await sb.from("finance").select("*");
      if (Array.isArray(data) && data.length > 0) setEntries(data);
      else setEntries([]);
    } catch { setEntries([]); }
    setLoading(false);
  };

  const addEntry = async () => {
    if (!newEntry.label || !newEntry.amount) return;
    const entry = { ...newEntry, amount: parseFloat(newEntry.amount) };
    try {
      const res = await sb.from("finance").insert(entry);
      const created = Array.isArray(res) && res[0] ? res[0] : { ...entry, id: Date.now().toString() };
      setEntries(prev => [...prev, created]);
    } catch { setEntries(prev => [...prev, { ...entry, id: Date.now().toString() }]); }
    setNewEntry({ label: "", amount: "", category: "expense", month: "April 2026" }); setShowAdd(false);
  };

  const deleteEntry = async (id) => {
    setEntries(prev => prev.filter(e => e.id !== id));
    try { await sb.from("finance").delete({ id }); } catch { }
  };

  const income = entries.filter(e => e.category === "income").reduce((s, e) => s + Number(e.amount), 0);
  const expenses = entries.filter(e => e.category !== "income").reduce((s, e) => s + Number(e.amount), 0);
  const balance = income - expenses;

  // Group by category
  const grouped = CATS.filter(c => c !== "income").map(cat => ({
    cat, total: entries.filter(e => e.category === cat).reduce((s, e) => s + Number(e.amount), 0)
  })).filter(g => g.total > 0);

  return (
    <div className="page-body animate-in">
      {showAdd && (
        <Modal title="Add entry" onClose={() => setShowAdd(false)}>
          <div className="form-row"><label className="form-label">Label</label><input className="inp" value={newEntry.label} onChange={e => setNewEntry(n => ({ ...n, label: e.target.value }))} autoFocus /></div>
          <div className="form-row"><label className="form-label">Amount (€)</label><input className="inp" type="number" value={newEntry.amount} onChange={e => setNewEntry(n => ({ ...n, amount: e.target.value }))} /></div>
          <div className="form-row"><label className="form-label">Category</label>
            <select className="inp" value={newEntry.category} onChange={e => setNewEntry(n => ({ ...n, category: e.target.value }))}>
              {CATS.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
            </select></div>
          <div className="form-row"><label className="form-label">Month</label><input className="inp" value={newEntry.month} onChange={e => setNewEntry(n => ({ ...n, month: e.target.value }))} /></div>
          <div className="modal-actions"><button className="btn" onClick={() => setShowAdd(false)}>Cancel</button><button className="btn primary" onClick={addEntry}>Add</button></div>
        </Modal>
      )}

      {/* Top stats */}
      <div className="grid-3 mb18">
        <div className="stat"><div className="stat-icon" style={{ background: "rgba(16,185,129,0.15)" }}>💰</div><div className="stat-label">Income</div><div className="stat-value" style={{ color: "var(--grn)" }}>€{income.toLocaleString()}</div><div className="stat-sub">April 2026</div></div>
        <div className="stat"><div className="stat-icon" style={{ background: "rgba(239,68,68,0.15)" }}>💳</div><div className="stat-label">Expenses</div><div className="stat-value" style={{ color: "var(--red)" }}>€{expenses.toLocaleString()}</div><div className="stat-sub">All outgoings</div></div>
        <div className="stat">
          <div className="stat-icon" style={{ background: balance >= 0 ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)" }}>🏦</div>
          <div className="stat-label">Balance</div>
          <div className="stat-value" style={{ color: balance >= 0 ? "var(--grn)" : "var(--red)" }}>€{balance.toLocaleString()}</div>
          <div className="stat-sub">After all expenses</div>
          <div className="stat-bar"><div className={`stat-fill ${balance >= 0 ? "grn" : "red"}`} style={{ width: `${Math.min(Math.abs(balance / income) * 100, 100)}%` }} /></div>
        </div>
      </div>

      {/* Category cards */}
      {grouped.length > 0 && (
        <div className="mb18">
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--t1)", marginBottom: 14 }}>By category</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 12 }}>
            {grouped.map(g => {
              const info = CAT_ICONS[g.cat] || { emoji: "💳", color: "var(--blue)", bg: "var(--bluem)" };
              return (
                <div key={g.cat} className="fin-category-card">
                  <div className="fin-cat-icon" style={{ background: info.bg }}>{info.emoji}</div>
                  <div className="fin-cat-name">{g.cat.charAt(0).toUpperCase() + g.cat.slice(1)}</div>
                  <div className="fin-cat-amount" style={{ color: info.color }}>€{g.total.toLocaleString()}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Transactions list */}
      <div className="card">
        <div className="card-header">
          <div><div className="card-title">April 2026</div><div className="card-sub">All transactions</div></div>
          <button className="btn sm primary" onClick={() => setShowAdd(true)}><Icon name="plus" size={13} /> Add</button>
        </div>
        {loading ? <div className="loading">Loading...</div> : entries.map(e => {
          const info = CAT_ICONS[e.category] || { emoji: "💳", color: "var(--t1)", bg: "var(--bg3)" };
          return (
            <div key={e.id} className="fin-row">
              <div style={{ display: "flex", alignItems: "center", flex: 1 }}>
                <div className="fin-icon" style={{ background: info.bg }}>{info.emoji}</div>
                <div>
                  <div className="fin-label">{e.label}</div>
                  <div className="fin-cat-tag">{e.category}</div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div className="fin-amount" style={{ color: e.category === "income" ? "var(--grn)" : "var(--t1)" }}>
                  {e.category === "income" ? "+" : "-"}€{Number(e.amount).toLocaleString()}
                </div>
                <button className="btn xs danger" onClick={() => deleteEntry(e.id)}><Icon name="trash" size={11} /></button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Study() {
  const EXAM_DATE = new Date("2026-07-07T13:30");
  const today = new Date();
  const daysLeft = Math.ceil((EXAM_DATE - today) / (1000 * 60 * 60 * 24));
  const weeklyGoal = 10; // hours

  const [sessions, setSessions] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [newSession, setNewSession] = useState({ topic: "", hours: "", notes: "", date: today.toISOString().slice(0, 10) });

  const TOPICS = [
    { id: "integration", label: "Integration Management", icon: "🔗" },
    { id: "scope", label: "Scope Management", icon: "📐" },
    { id: "schedule", label: "Schedule Management", icon: "📅" },
    { id: "cost", label: "Cost Management", icon: "💰" },
    { id: "quality", label: "Quality Management", icon: "⭐" },
    { id: "resource", label: "Resource Management", icon: "👥" },
    { id: "communications", label: "Communications Management", icon: "📢" },
    { id: "risk", label: "Risk Management", icon: "⚠️" },
    { id: "procurement", label: "Procurement Management", icon: "📦" },
    { id: "stakeholder", label: "Stakeholder Management", icon: "🤝" },
    { id: "agile", label: "Agile & Hybrid", icon: "🔄" },
    { id: "ethics", label: "Ethics & Professional", icon: "🎯" },
  ];

  useEffect(() => {
    // Load from localStorage for now
    const saved = localStorage.getItem("sanctum_study_sessions");
    if (saved) setSessions(JSON.parse(saved));
  }, []);

  const saveSessions = (updated) => {
    setSessions(updated);
    localStorage.setItem("sanctum_study_sessions", JSON.stringify(updated));
  };

  const addSession = () => {
    if (!newSession.topic || !newSession.hours) return;
    const session = { ...newSession, id: Date.now().toString(), hours: parseFloat(newSession.hours) };
    saveSessions([session, ...sessions]);
    setNewSession({ topic: "", hours: "", notes: "", date: today.toISOString().slice(0, 10) });
    setShowAdd(false);
  };

  const deleteSession = (id) => saveSessions(sessions.filter(s => s.id !== id));

  const totalHours = sessions.reduce((s, x) => s + x.hours, 0);
  const targetHours = 150; // PMP recommended study hours

  // Hours this week
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay() + 1);
  const thisWeekHours = sessions
    .filter(s => new Date(s.date) >= weekStart)
    .reduce((s, x) => s + x.hours, 0);

  // Hours per topic
  const topicHours = TOPICS.map(t => ({
    ...t,
    hours: sessions.filter(s => s.topic === t.id).reduce((s, x) => s + x.hours, 0)
  }));

  const recentSessions = sessions.slice(0, 10);

  return (
    <div className="page-body animate-in">
      {showAdd && (
        <Modal title="Log study session" onClose={() => setShowAdd(false)} wide>
          <div className="grid-2" style={{ gap: 12 }}>
            <div className="form-row">
              <label className="form-label">Topic</label>
              <select className="inp" value={newSession.topic} onChange={e => setNewSession(n => ({ ...n, topic: e.target.value }))}>
                <option value="">Select topic...</option>
                {TOPICS.map(t => <option key={t.id} value={t.id}>{t.icon} {t.label}</option>)}
              </select>
            </div>
            <div className="form-row">
              <label className="form-label">Hours studied</label>
              <input className="inp" type="number" step="0.5" min="0.5" max="12"
                value={newSession.hours} onChange={e => setNewSession(n => ({ ...n, hours: e.target.value }))}
                placeholder="e.g. 1.5" />
            </div>
          </div>
          <div className="form-row">
            <label className="form-label">Date</label>
            <input className="inp" type="date" value={newSession.date} onChange={e => setNewSession(n => ({ ...n, date: e.target.value }))} />
          </div>
          <div className="form-row">
            <label className="form-label">Notes (optional)</label>
            <textarea className="inp" value={newSession.notes} onChange={e => setNewSession(n => ({ ...n, notes: e.target.value }))} placeholder="What did you cover? Key takeaways..." style={{ minHeight: 70 }} />
          </div>
          <div className="modal-actions">
            <button className="btn" onClick={() => setShowAdd(false)}>Cancel</button>
            <button className="btn primary" onClick={addSession}>Log session</button>
          </div>
        </Modal>
      )}

      {/* Top stats */}
      <div className="grid-4 mb18">
        <div className="stat">
          <div className="stat-icon" style={{ background: "rgba(239,68,68,0.15)" }}>⏰</div>
          <div className="stat-label">Days to exam</div>
          <div className="stat-value" style={{ color: daysLeft < 60 ? "var(--red)" : daysLeft < 120 ? "var(--amber)" : "var(--t1)" }}>{daysLeft}</div>
          <div className="stat-sub">PMP — Jul 7 2026</div>
          <div className="stat-bar"><div className="stat-fill red" style={{ width: `${Math.max(0, 100 - (daysLeft / 365) * 100)}%` }} /></div>
        </div>
        <div className="stat">
          <div className="stat-icon" style={{ background: "rgba(139,92,246,0.15)" }}>📚</div>
          <div className="stat-label">Total hours</div>
          <div className="stat-value">{totalHours.toFixed(1)}h</div>
          <div className="stat-sub">Target: {targetHours}h</div>
          <div className="stat-bar"><div className="stat-fill" style={{ width: `${Math.min((totalHours / targetHours) * 100, 100)}%` }} /></div>
        </div>
        <div className="stat">
          <div className="stat-icon" style={{ background: "rgba(16,185,129,0.15)" }}>📅</div>
          <div className="stat-label">This week</div>
          <div className="stat-value" style={{ color: thisWeekHours >= weeklyGoal ? "var(--grn)" : "var(--t1)" }}>{thisWeekHours.toFixed(1)}h</div>
          <div className="stat-sub">Goal: {weeklyGoal}h/week</div>
          <div className="stat-bar"><div className="stat-fill grn" style={{ width: `${Math.min((thisWeekHours / weeklyGoal) * 100, 100)}%` }} /></div>
        </div>
        <div className="stat">
          <div className="stat-icon" style={{ background: "rgba(245,158,11,0.15)" }}>🎯</div>
          <div className="stat-label">Sessions logged</div>
          <div className="stat-value">{sessions.length}</div>
          <div className="stat-sub">Keep the momentum</div>
        </div>
      </div>

      <div className="grid-2 mb18">
        {/* Topic breakdown */}
        <div className="card">
          <div className="card-header">
            <div><div className="card-title">PMBOK Topics</div><div className="card-sub">Hours per knowledge area</div></div>
          </div>
          {topicHours.map(t => (
            <div key={t.id} style={{ marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                <span style={{ fontSize: 12, color: "var(--t2)", display: "flex", alignItems: "center", gap: 6 }}>
                  <span>{t.icon}</span>{t.label}
                </span>
                <span style={{ fontSize: 11, fontFamily: "var(--mono)", color: t.hours > 0 ? "var(--blue)" : "var(--t3)" }}>{t.hours.toFixed(1)}h</span>
              </div>
              <div className="stat-bar" style={{ margin: 0 }}>
                <div className="stat-fill" style={{ width: `${Math.min((t.hours / Math.max(totalHours, 1)) * 100 * TOPICS.length / 2, 100)}%`, background: t.hours > 0 ? "var(--blue)" : "var(--b3)" }} />
              </div>
            </div>
          ))}
        </div>

        {/* Recent sessions */}
        <div className="card">
          <div className="card-header">
            <div><div className="card-title">Study log</div><div className="card-sub">Recent sessions</div></div>
            <button className="btn sm primary" onClick={() => setShowAdd(true)}><Icon name="plus" size={13} /> Log</button>
          </div>
          {sessions.length === 0 && (
            <div style={{ color: "var(--t3)", fontSize: 13, textAlign: "center", padding: "24px 0" }}>
              No sessions yet.<br />
              <button className="btn sm primary" style={{ marginTop: 12 }} onClick={() => setShowAdd(true)}>Log your first session</button>
            </div>
          )}
          {recentSessions.map(s => {
            const topic = TOPICS.find(t => t.id === s.topic);
            return (
              <div key={s.id} className="fin-row">
                <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1 }}>
                  <div style={{ fontSize: 20 }}>{topic?.icon || "📖"}</div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--t1)" }}>{topic?.label || s.topic}</div>
                    <div style={{ fontSize: 11, color: "var(--t3)", fontFamily: "var(--mono)" }}>{s.date}{s.notes ? ` · ${s.notes.slice(0, 40)}` : ""}</div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, fontFamily: "var(--mono)", color: "var(--blue)" }}>{s.hours}h</span>
                  <button className="btn xs danger" onClick={() => deleteSession(s.id)}><Icon name="trash" size={11} /></button>
                </div>
              </div>
            );
          })}
          {sessions.length > 10 && (
            <button className="btn sm ghost" style={{ width: "100%", justifyContent: "center", marginTop: 8, color: "var(--t3)", fontSize: 11 }}
              onClick={() => setShowArchived(s => !s)}>
              {showArchived ? "▲ Show less" : `▼ Show all ${sessions.length} sessions`}
            </button>
          )}
        </div>
      </div>

      {/* Study tip */}
      <div className="card" style={{ background: "rgba(139,92,246,0.08)", borderColor: "rgba(139,92,246,0.2)" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
          <div style={{ fontSize: 24, flexShrink: 0 }}>💡</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--t1)", marginBottom: 4 }}>Study plan to hit July 7</div>
            <div style={{ fontSize: 13, color: "var(--t2)", lineHeight: 1.6 }}>
              You need <strong style={{ color: "var(--purple)" }}>{Math.max(0, targetHours - totalHours).toFixed(0)}h</strong> more to reach the {targetHours}h target.
              With {daysLeft} days left, that's <strong style={{ color: "var(--purple)" }}>{((targetHours - totalHours) / (daysLeft / 7)).toFixed(1)}h/week</strong> —
              {((targetHours - totalHours) / (daysLeft / 7)) <= weeklyGoal ? " within your weekly goal. You're on track. 🎉" : " above your current goal. Consider increasing weekly hours."}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Ozzy() {
  const [showAdd, setShowAdd] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [vets, setVets] = useState(() => JSON.parse(localStorage.getItem("sanctum_ozzy_vets") || "[]"));
  const [newVet, setNewVet] = useState({ date: "", type: "", notes: "", next_due: "" });
  const [weight, setWeight] = useState(() => JSON.parse(localStorage.getItem("sanctum_ozzy_weight") || "[]"));
  const [newWeight, setNewWeight] = useState({ date: new Date().toISOString().slice(0, 10), kg: "" });
  const [showAddWeight, setShowAddWeight] = useState(false);

  const saveVets = (v) => { setVets(v); localStorage.setItem("sanctum_ozzy_vets", JSON.stringify(v)); };
  const saveWeight = (w) => { setWeight(w); localStorage.setItem("sanctum_ozzy_weight", JSON.stringify(w)); };

  const addVet = () => {
    if (!newVet.date || !newVet.type) return;
    saveVets([{ ...newVet, id: Date.now().toString() }, ...vets]);
    setNewVet({ date: "", type: "", notes: "", next_due: "" });
    setShowAdd(false);
  };

  const addWeight = () => {
    if (!newWeight.kg) return;
    saveWeight([{ ...newWeight, id: Date.now().toString() }, ...weight]);
    setNewWeight({ date: new Date().toISOString().slice(0, 10), kg: "" });
    setShowAddWeight(false);
  };

  const VET_TYPES = ["Annual checkup", "Vaccination", "Grooming", "Dental", "Emergency", "Medication", "Other"];

  const tabs = [
    { id: "overview", label: "Overview", emoji: "🐾" },
    { id: "health", label: "Health", emoji: "🏥" },
    { id: "diet", label: "Diet", emoji: "🍖" },
    { id: "documents", label: "Documents", emoji: "📋" },
  ];

  return (
    <div className="page-body animate-in">
      {showAdd && (
        <Modal title="Log vet visit" onClose={() => setShowAdd(false)} wide>
          <div className="grid-2" style={{ gap: 12 }}>
            <div className="form-row"><label className="form-label">Date</label><input className="inp" type="date" value={newVet.date} onChange={e => setNewVet(n => ({ ...n, date: e.target.value }))} autoFocus /></div>
            <div className="form-row"><label className="form-label">Type</label>
              <select className="inp" value={newVet.type} onChange={e => setNewVet(n => ({ ...n, type: e.target.value }))}>
                <option value="">Select type...</option>
                {VET_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div className="form-row"><label className="form-label">Next due</label><input className="inp" type="date" value={newVet.next_due} onChange={e => setNewVet(n => ({ ...n, next_due: e.target.value }))} /></div>
          <div className="form-row"><label className="form-label">Notes</label><textarea className="inp" value={newVet.notes} onChange={e => setNewVet(n => ({ ...n, notes: e.target.value }))} placeholder="What was discussed, medications prescribed..." style={{ minHeight: 70 }} /></div>
          <div className="modal-actions"><button className="btn" onClick={() => setShowAdd(false)}>Cancel</button><button className="btn primary" onClick={addVet}>Save</button></div>
        </Modal>
      )}

      {showAddWeight && (
        <Modal title="Log weight" onClose={() => setShowAddWeight(false)}>
          <div className="form-row"><label className="form-label">Date</label><input className="inp" type="date" value={newWeight.date} onChange={e => setNewWeight(n => ({ ...n, date: e.target.value }))} /></div>
          <div className="form-row"><label className="form-label">Weight (kg)</label><input className="inp" type="number" step="0.1" value={newWeight.kg} onChange={e => setNewWeight(n => ({ ...n, kg: e.target.value }))} placeholder="e.g. 28.5" autoFocus /></div>
          <div className="modal-actions"><button className="btn" onClick={() => setShowAddWeight(false)}>Cancel</button><button className="btn primary" onClick={addWeight}>Save</button></div>
        </Modal>
      )}

      {/* Ozzy profile card */}
      <div className="card mb18" style={{ background: "linear-gradient(135deg, rgba(245,158,11,0.1), rgba(16,185,129,0.08))", borderColor: "rgba(245,158,11,0.2)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ fontSize: 56, flexShrink: 0 }}>🐕</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: "var(--t1)", marginBottom: 4 }}>Ozzy</div>
            <div style={{ fontSize: 13, color: "var(--t2)", marginBottom: 12 }}>Golden Retriever · Born November 2025 · Dublin, Ireland</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <span className="badge amber">🏠 Belarmine</span>
              <span className="badge green">✅ Vaccinated</span>
              <span className="badge blue">🔖 Microchipped</span>
              <span className="badge muted">🍖 600 kcal/day</span>
              <span className="badge purple">💉 Insurance: €25/mo</span>
            </div>
          </div>
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <div style={{ fontSize: 11, color: "var(--t3)", fontFamily: "var(--mono)", marginBottom: 4 }}>Age</div>
            <div style={{ fontSize: 28, fontWeight: 700, fontFamily: "var(--mono)", color: "var(--amber)" }}>
              {Math.floor((new Date() - new Date("2025-11-01")) / (1000 * 60 * 60 * 24 * 30))}mo
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 18 }}>
        {tabs.map(t => (
          <button key={t.id} className={`btn${activeTab === t.id ? " primary" : ""}`}
            onClick={() => setActiveTab(t.id)}>
            {t.emoji} {t.label}
          </button>
        ))}
      </div>

      {activeTab === "overview" && (
        <div className="grid-2">
          <div className="card">
            <div className="card-header">
              <div><div className="card-title">Key info</div></div>
            </div>
            {[
              { label: "Breed", value: "Golden Retriever" },
              { label: "Born", value: "November 2025" },
              { label: "Chip number", value: "Check vet records" },
              { label: "Vet", value: "Local Dublin vet" },
              { label: "Insurance", value: "€25/month" },
              { label: "Daily calories", value: "600 kcal max" },
              { label: "Diet", value: "Dry kibble" },
            ].map(item => (
              <div key={item.label} className="fin-row">
                <span style={{ fontSize: 12, color: "var(--t3)", fontWeight: 600 }}>{item.label}</span>
                <span style={{ fontSize: 13, color: "var(--t1)", fontWeight: 500 }}>{item.value}</span>
              </div>
            ))}
          </div>

          <div className="card">
            <div className="card-header">
              <div><div className="card-title">Weight tracker</div></div>
              <button className="btn sm primary" onClick={() => setShowAddWeight(true)}><Icon name="plus" size={13} /> Log</button>
            </div>
            {weight.length === 0 && (
              <div style={{ color: "var(--t3)", fontSize: 13, textAlign: "center", padding: "20px 0" }}>No weight logs yet</div>
            )}
            {weight.slice(0, 8).map(w => (
              <div key={w.id} className="fin-row">
                <span style={{ fontSize: 12, color: "var(--t3)", fontFamily: "var(--mono)" }}>{w.date}</span>
                <span style={{ fontSize: 14, fontWeight: 700, fontFamily: "var(--mono)", color: "var(--amber)" }}>{w.kg} kg</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "health" && (
        <div className="card">
          <div className="card-header">
            <div><div className="card-title">Vet visits & health log</div></div>
            <button className="btn sm primary" onClick={() => setShowAdd(true)}><Icon name="plus" size={13} /> Log visit</button>
          </div>
          {vets.length === 0 && (
            <div style={{ color: "var(--t3)", fontSize: 13, textAlign: "center", padding: "24px 0" }}>
              No vet visits logged yet.<br />
              <button className="btn sm primary" style={{ marginTop: 12 }} onClick={() => setShowAdd(true)}>Log first visit</button>
            </div>
          )}
          {vets.map(v => (
            <div key={v.id} style={{ padding: "14px 0", borderBottom: "1px solid var(--b1)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--t1)", marginBottom: 4 }}>{v.type}</div>
                  {v.notes && <div style={{ fontSize: 12, color: "var(--t2)", marginBottom: 4 }}>{v.notes}</div>}
                  {v.next_due && <div style={{ fontSize: 11, color: "var(--amber)", fontFamily: "var(--mono)" }}>Next due: {v.next_due}</div>}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                  <span style={{ fontSize: 11, color: "var(--t3)", fontFamily: "var(--mono)" }}>{v.date}</span>
                  <button className="btn xs danger" onClick={() => saveVets(vets.filter(x => x.id !== v.id))}><Icon name="trash" size={11} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === "diet" && (
        <div className="grid-2">
          <div className="card">
            <div className="card-header"><div className="card-title">Daily diet plan</div></div>
            {[
              { meal: "Morning", food: "Dry kibble", amount: "200g", time: "7:00am" },
              { meal: "Evening", food: "Dry kibble", amount: "200g", time: "6:00pm" },
              { meal: "Treats", food: "Low calorie treats", amount: "Max 50g", time: "During training" },
            ].map(m => (
              <div key={m.meal} className="fin-row">
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--t1)" }}>{m.meal}</div>
                  <div style={{ fontSize: 11, color: "var(--t3)" }}>{m.food} · {m.time}</div>
                </div>
                <span style={{ fontSize: 13, fontWeight: 600, color: "var(--amber)", fontFamily: "var(--mono)" }}>{m.amount}</span>
              </div>
            ))}
            <div style={{ marginTop: 14, padding: 12, background: "rgba(245,158,11,0.08)", borderRadius: 10, border: "1px solid rgba(245,158,11,0.2)" }}>
              <div style={{ fontSize: 11, color: "var(--amber)", fontWeight: 600, marginBottom: 4 }}>⚠️ Daily limit</div>
              <div style={{ fontSize: 13, color: "var(--t2)" }}>Maximum 600 kcal per day. No human food. Fresh water always available.</div>
            </div>
          </div>
          <div className="card">
            <div className="card-header"><div className="card-title">Foods to avoid 🚫</div></div>
            {["Chocolate", "Grapes & raisins", "Onions & garlic", "Macadamia nuts", "Xylitol (sugar-free products)", "Alcohol", "Cooked bones", "Avocado"].map(food => (
              <div key={food} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid var(--b1)" }}>
                <span style={{ color: "var(--red)" }}>✕</span>
                <span style={{ fontSize: 13, color: "var(--t2)" }}>{food}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "documents" && (
        <div className="card">
          <div className="card-header"><div className="card-title">Documents & records</div></div>
          {[
            { label: "Vaccination certificate", status: "✅ Up to date", color: "var(--grn)" },
            { label: "Microchip registration", status: "✅ Registered", color: "var(--grn)" },
            { label: "Pet insurance", status: "✅ Active — €25/mo", color: "var(--grn)" },
            { label: "Vet registration", status: "✅ Registered", color: "var(--grn)" },
            { label: "Passport (if travelling)", status: "⏳ Check requirements", color: "var(--amber)" },
          ].map(doc => (
            <div key={doc.label} className="fin-row">
              <span style={{ fontSize: 13, color: "var(--t1)", fontWeight: 500 }}>📄 {doc.label}</span>
              <span style={{ fontSize: 12, color: doc.color, fontWeight: 600 }}>{doc.status}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Travel() {
  const [showAdd, setShowAdd] = useState(false);
  const [activeTrip, setActiveTrip] = useState(null);
  const [trips, setTrips] = useState(() => JSON.parse(localStorage.getItem("sanctum_trips") || JSON.stringify([
    {
      id: "scotland-2026", name: "Scotland Road Trip", emoji: "🏴󠁧󠁢󠁳󠁣󠁴󠁿",
      start: "2026-09-07", end: "2026-09-13",
      status: "planning", budget: 2000, spent: 0,
      travelers: "Michael, Tamara, Ozzy 🐾",
      notes: "Edinburgh → Highlands → Skye. Dog-friendly accommodation needed.",
      checklist: [
        { id: "c1", text: "Book accommodation", done: false },
        { id: "c2", text: "Book ferry/route", done: false },
        { id: "c3", text: "Dog-friendly hotels check", done: false },
        { id: "c4", text: "Travel insurance", done: false },
        { id: "c5", text: "Ozzy travel docs", done: false },
      ]
    },
    {
      id: "italy-2026", name: "Italy Trip", emoji: "🇮🇹",
      start: "2026-06-12", end: "2026-06-17",
      status: "booked", budget: 1500, spent: 344,
      travelers: "Michael, Tamara",
      notes: "Flights booked — €344. Accommodation TBC.",
      checklist: [
        { id: "c1", text: "Flights", done: true },
        { id: "c2", text: "Hotel/Airbnb", done: false },
        { id: "c3", text: "Travel insurance", done: false },
        { id: "c4", text: "Activities plan", done: false },
      ]
    },
  ])));

  const [newTrip, setNewTrip] = useState({ name: "", emoji: "✈️", start: "", end: "", budget: "", travelers: "", notes: "" });

  const saveTrips = (t) => { setTrips(t); localStorage.setItem("sanctum_trips", JSON.stringify(t)); };

  const addTrip = () => {
    if (!newTrip.name || !newTrip.start) return;
    const trip = { ...newTrip, id: Date.now().toString(), status: "planning", spent: 0, budget: parseFloat(newTrip.budget) || 0, checklist: [] };
    saveTrips([trip, ...trips]);
    setNewTrip({ name: "", emoji: "✈️", start: "", end: "", budget: "", travelers: "", notes: "" });
    setShowAdd(false);
  };

  const toggleCheck = (tripId, checkId) => {
    saveTrips(trips.map(t => t.id === tripId ? {
      ...t, checklist: t.checklist.map(c => c.id === checkId ? { ...c, done: !c.done } : c)
    } : t));
  };

  const deleteTrip = (id) => { saveTrips(trips.filter(t => t.id !== id)); if (activeTrip?.id === id) setActiveTrip(null); };

  const STATUS_STYLE = {
    planning: { color: "var(--amber)", bg: "rgba(245,158,11,0.12)", label: "Planning" },
    booked: { color: "var(--blue)", bg: "rgba(59,130,246,0.12)", label: "Booked" },
    ongoing: { color: "var(--grn)", bg: "rgba(16,185,129,0.12)", label: "Ongoing" },
    completed: { color: "var(--t3)", bg: "var(--bg3)", label: "Completed" },
  };

  const daysUntil = (dateStr) => {
    const diff = Math.ceil((new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24));
    return diff > 0 ? `${diff}d away` : diff === 0 ? "Today!" : "Past";
  };

  const selected = activeTrip ? trips.find(t => t.id === activeTrip) : null;

  return (
    <div className="page-body animate-in">
      {showAdd && (
        <Modal title="Add trip" onClose={() => setShowAdd(false)} wide>
          <div className="grid-2" style={{ gap: 12 }}>
            <div className="form-row"><label className="form-label">Trip name</label><input className="inp" value={newTrip.name} onChange={e => setNewTrip(n => ({ ...n, name: e.target.value }))} placeholder="Scotland Road Trip" autoFocus /></div>
            <div className="form-row"><label className="form-label">Emoji</label><input className="inp" value={newTrip.emoji} onChange={e => setNewTrip(n => ({ ...n, emoji: e.target.value }))} placeholder="✈️" /></div>
          </div>
          <div className="grid-2" style={{ gap: 12 }}>
            <div className="form-row"><label className="form-label">Start date</label><input className="inp" type="date" value={newTrip.start} onChange={e => setNewTrip(n => ({ ...n, start: e.target.value }))} /></div>
            <div className="form-row"><label className="form-label">End date</label><input className="inp" type="date" value={newTrip.end} onChange={e => setNewTrip(n => ({ ...n, end: e.target.value }))} /></div>
          </div>
          <div className="grid-2" style={{ gap: 12 }}>
            <div className="form-row"><label className="form-label">Budget (€)</label><input className="inp" type="number" value={newTrip.budget} onChange={e => setNewTrip(n => ({ ...n, budget: e.target.value }))} placeholder="2000" /></div>
            <div className="form-row"><label className="form-label">Travellers</label><input className="inp" value={newTrip.travelers} onChange={e => setNewTrip(n => ({ ...n, travelers: e.target.value }))} placeholder="Michael, Tamara..." /></div>
          </div>
          <div className="form-row"><label className="form-label">Notes</label><textarea className="inp" value={newTrip.notes} onChange={e => setNewTrip(n => ({ ...n, notes: e.target.value }))} placeholder="Route ideas, accommodation notes..." style={{ minHeight: 70 }} /></div>
          <div className="modal-actions"><button className="btn" onClick={() => setShowAdd(false)}>Cancel</button><button className="btn primary" onClick={addTrip}>Add trip</button></div>
        </Modal>
      )}

      {/* Header stats */}
      <div className="grid-3 mb18">
        <div className="stat">
          <div className="stat-icon" style={{ background: "rgba(59,130,246,0.15)" }}>✈️</div>
          <div className="stat-label">Upcoming trips</div>
          <div className="stat-value">{trips.filter(t => t.status !== "completed").length}</div>
          <div className="stat-sub">Planned & booked</div>
        </div>
        <div className="stat">
          <div className="stat-icon" style={{ background: "rgba(16,185,129,0.15)" }}>📅</div>
          <div className="stat-label">Next trip</div>
          <div className="stat-value" style={{ fontSize: 18 }}>{trips.filter(t => t.status !== "completed").sort((a, b) => a.start.localeCompare(b.start))[0]?.name || "None"}</div>
          <div className="stat-sub">{trips.filter(t => t.status !== "completed").sort((a, b) => a.start.localeCompare(b.start))[0] ? daysUntil(trips.filter(t => t.status !== "completed").sort((a, b) => a.start.localeCompare(b.start))[0].start) : ""}</div>
        </div>
        <div className="stat">
          <div className="stat-icon" style={{ background: "rgba(245,158,11,0.15)" }}>💶</div>
          <div className="stat-label">Total budget</div>
          <div className="stat-value">€{trips.reduce((s, t) => s + (t.budget || 0), 0).toLocaleString()}</div>
          <div className="stat-sub">Across all trips</div>
        </div>
      </div>

      <div className={selected ? "grid-2" : ""} style={{ gap: 18 }}>
        {/* Trip list */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--t1)" }}>All trips</div>
            <button className="btn sm primary" onClick={() => setShowAdd(true)}><Icon name="plus" size={13} /> Add trip</button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {trips.map(trip => {
              const st = STATUS_STYLE[trip.status] || STATUS_STYLE.planning;
              const isActive = activeTrip === trip.id;
              const doneChecks = trip.checklist.filter(c => c.done).length;
              return (
                <div key={trip.id}
                  onClick={() => setActiveTrip(isActive ? null : trip.id)}
                  style={{
                    background: isActive ? "rgba(59,130,246,0.08)" : "var(--bg1)",
                    border: `1px solid ${isActive ? "var(--blueb)" : "var(--b1)"}`,
                    borderRadius: 14, padding: 18, cursor: "pointer",
                    transition: "all .2s",
                  }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 14, flex: 1 }}>
                      <div style={{ fontSize: 32, flexShrink: 0 }}>{trip.emoji}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 15, fontWeight: 700, color: "var(--t1)", marginBottom: 4 }}>{trip.name}</div>
                        <div style={{ fontSize: 12, color: "var(--t3)", fontFamily: "var(--mono)", marginBottom: 6 }}>
                          {trip.start} → {trip.end} · {trip.travelers}
                        </div>
                        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                          <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, background: st.bg, color: st.color, fontWeight: 600 }}>{st.label}</span>
                          <span className="badge muted">💶 €{(trip.budget || 0).toLocaleString()}</span>
                          {trip.checklist.length > 0 && <span className="badge muted">✓ {doneChecks}/{trip.checklist.length}</span>}
                          <span style={{ fontSize: 11, color: "var(--blue)", fontFamily: "var(--mono)" }}>{daysUntil(trip.start)}</span>
                        </div>
                      </div>
                    </div>
                    <button className="btn xs danger" onClick={e => { e.stopPropagation(); deleteTrip(trip.id); }}><Icon name="trash" size={11} /></button>
                  </div>
                </div>
              );
            })}
            {trips.length === 0 && (
              <div style={{ color: "var(--t3)", fontSize: 13, textAlign: "center", padding: "32px 0" }}>No trips planned yet</div>
            )}
          </div>
        </div>

        {/* Trip detail */}
        {selected && (
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--t1)", marginBottom: 14 }}>{selected.emoji} {selected.name}</div>
            <div className="card mb18">
              <div className="card-header"><div className="card-title">Checklist</div>
                <span className="badge green">{selected.checklist.filter(c => c.done).length}/{selected.checklist.length}</span>
              </div>
              {selected.checklist.map(c => (
                <div key={c.id} className="task-item" onClick={() => toggleCheck(selected.id, c.id)} style={{ cursor: "pointer" }}>
                  <div className={`task-check${c.done ? " done" : ""}`}>
                    {c.done && <Icon name="check" size={10} color="#fff" />}
                  </div>
                  <span className={`task-text${c.done ? " done" : ""}`}>{c.text}</span>
                </div>
              ))}
            </div>

            <div className="card mb18">
              <div className="card-header"><div className="card-title">Budget</div></div>
              <div className="fin-row">
                <span style={{ fontSize: 13, color: "var(--t2)" }}>Total budget</span>
                <span style={{ fontSize: 14, fontWeight: 700, fontFamily: "var(--mono)", color: "var(--t1)" }}>€{(selected.budget || 0).toLocaleString()}</span>
              </div>
              <div className="fin-row">
                <span style={{ fontSize: 13, color: "var(--t2)" }}>Spent so far</span>
                <span style={{ fontSize: 14, fontWeight: 700, fontFamily: "var(--mono)", color: "var(--red)" }}>€{(selected.spent || 0).toLocaleString()}</span>
              </div>
              <div className="fin-row">
                <span style={{ fontSize: 13, color: "var(--t2)" }}>Remaining</span>
                <span style={{ fontSize: 14, fontWeight: 700, fontFamily: "var(--mono)", color: "var(--grn)" }}>€{((selected.budget || 0) - (selected.spent || 0)).toLocaleString()}</span>
              </div>
              <div className="stat-bar" style={{ marginTop: 12 }}>
                <div className="stat-fill red" style={{ width: `${Math.min(((selected.spent || 0) / (selected.budget || 1)) * 100, 100)}%` }} />
              </div>
            </div>

            {selected.notes && (
              <div className="card" style={{ background: "rgba(59,130,246,0.05)", borderColor: "rgba(59,130,246,0.15)" }}>
                <div className="card-title" style={{ marginBottom: 10 }}>Notes</div>
                <div style={{ fontSize: 13, color: "var(--t2)", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{selected.notes}</div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function PlaceholderPage({ label, emoji }) {
  return (
    <div className="page-body" style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", flexDirection: "column", gap: 16 }}>
      <div style={{ fontSize: 56, opacity: .2 }}>{emoji || "🚧"}</div>
      <div style={{ fontSize: 18, fontWeight: 700, color: "var(--t1)" }}>{label}</div>
      <div style={{ fontSize: 13, color: "var(--t3)" }}>Coming in the next build</div>
    </div>
  );
}

// ─── TRACKER BACK BAR ────────────────────────────────────────────────────────
function TrackerBackBar({ name, onBack }) {
  return (
    <div className="tracker-back-bar">
      <button className="tracker-back-btn" onClick={onBack}>
        <Icon name="chevL" size={13} /> Trackers
      </button>
      <span style={{ color: "var(--b3)", fontSize: 12 }}>/</span>
      <span className="tracker-section-label">{name}</span>
    </div>
  );
}

// ─── TRACKER HUB ─────────────────────────────────────────────────────────────
const TRACKERS = [
  { id: "study",   emoji: "📚", name: "Study",   sub: "PMP tracker — PMBOK knowledge areas, hours logged, progress toward July 7 exam" },
  { id: "career",  emoji: "💼", name: "Career",  sub: "Job applications — track every opportunity, status, interviews, and notes" },
  { id: "finance", emoji: "💰", name: "Finance", sub: "Income, expenses, balance — full picture of your monthly finances" },
  { id: "travel",  emoji: "✈️", name: "Travel",  sub: "Trips, checklists, budgets — Scotland, Italy, and beyond" },
  { id: "pet",     emoji: "🐾", name: "Ozzy",    sub: "Golden Retriever — vet visits, weight, diet, documents" },
];

function TrackerHub({ onNavigate }) {
  // Order: read from localStorage, keep only known ids, append any new ones at the end
  const [order, setOrder] = useState(() => {
    const known = TRACKERS.map(t => t.id);
    try {
      const saved = JSON.parse(localStorage.getItem("sanctum_tracker_order"));
      if (Array.isArray(saved)) {
        const valid  = saved.filter(id => known.includes(id));
        const newOnes = known.filter(id => !valid.includes(id));
        return [...valid, ...newOnes];
      }
    } catch {}
    return known;
  });

  const [dragOver, setDragOver]   = useState(null);
  const [dragging, setDragging]   = useState(null);
  const dragId = useRef(null);

  const onDragStart = (e, id) => {
    dragId.current = id; setDragging(id); e.dataTransfer.effectAllowed = "move";
  };
  const onDragOver = (e, id) => {
    e.preventDefault(); e.dataTransfer.dropEffect = "move";
    if (id !== dragId.current) setDragOver(id);
  };
  const onDragLeave = (e, id) => {
    if (!e.currentTarget.contains(e.relatedTarget)) setDragOver(prev => prev === id ? null : prev);
  };
  const onDrop = (e, id) => {
    e.preventDefault();
    if (!dragId.current || dragId.current === id) { setDragOver(null); return; }
    setOrder(prev => {
      const next = [...prev];
      const from = next.indexOf(dragId.current), to = next.indexOf(id);
      if (from === -1 || to === -1) return prev;
      next.splice(from, 1); next.splice(to, 0, dragId.current);
      localStorage.setItem("sanctum_tracker_order", JSON.stringify(next));
      return next;
    });
    setDragOver(null); setDragging(null); dragId.current = null;
  };
  const onDragEnd = () => { setDragOver(null); setDragging(null); dragId.current = null; };

  return (
    <div className="page-body page-enter">
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: "var(--t1)", marginBottom: 6, letterSpacing: "-.4px" }}>Your Trackers</div>
        <div style={{ fontSize: 13, color: "var(--t3)" }}>Select a tracker to view · drag to reorder</div>
      </div>
      <div className="tracker-hub">
        {order.map(id => {
          const t = TRACKERS.find(x => x.id === id);
          if (!t) return null;
          const cls = [
            "tracker-card",
            dragging === id ? "is-dragging" : "",
            dragOver === id ? "drag-over"   : "",
          ].filter(Boolean).join(" ");
          return (
            <div
              key={t.id}
              className={cls}
              draggable
              onDragStart={e => onDragStart(e, t.id)}
              onDragOver={e  => onDragOver(e, t.id)}
              onDragLeave={e => onDragLeave(e, t.id)}
              onDrop={e      => onDrop(e, t.id)}
              onDragEnd={onDragEnd}
              onClick={() => onNavigate(t.id)}
            >
              <div className="drag-handle" style={{ position:"absolute", top:12, left:14 }}>
                <Icon name="grab" size={12} />
              </div>
              <div className="tc-arrow"><Icon name="chevR" size={16} /></div>
              <div className="tc-emoji">{t.emoji}</div>
              <div className="tc-name">{t.name}</div>
              <div className="tc-sub">{t.sub}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── SETTINGS ────────────────────────────────────────────────────────────────
function Settings({ user, onLogout, theme, onThemeChange }) {
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

// ─── AI ASSISTANT ─────────────────────────────────────────────────────────────
function AIAssistant({ onAddTask, onNavigate }) {
  const [messages, setMessages] = useState([
    { role: "assistant", text: "Hi Michael! I'm your Sanctum AI. I can add tasks, log study sessions, or answer questions about your life. Try: \"add a task: call the vet\" or \"log 2 hours of PMP study on risk management\"." }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", text: userMsg }]);
    setLoading(true);

    try {
      const systemPrompt = `You are Sanctum AI, a personal life assistant embedded in a private life organiser app called Sanctum.
The user is Michael Rodrigues Marques, based in Dublin, Ireland. He has a wife named Tamara and a Golden Retriever named Ozzy (born Nov 2025).
He is pursuing PMP certification (July 7 2026 target) and starting an MSc in Cybersecurity at SETU in September 2026.
Active job applications: Anthropic (Copyright Ops PM), Google (Sr Analyst Trust & Safety), Google (TPM Analytics EU).
Upcoming trips: Italy Jun 12-17 2026, Scotland Sep 7-13 2026 (with Tamara and Ozzy).

When asked to add/create/log something, respond ONLY with JSON:
- Add task: {"action":"add_task","text":"task text","tag":"optional tag"}
- Log study: {"action":"log_study","topic":"topic_id","hours":1.5,"notes":"optional"}
- Navigate: {"action":"navigate","page":"dashboard|notes|calendar|career|finance|study|travel|pet|settings"}

Topic IDs for study: integration, scope, schedule, cost, quality, resource, communications, risk, procurement, stakeholder, agile, ethics

For everything else respond naturally in plain text. Be warm, concise, and personal. You know Michael well.`;

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system: systemPrompt,
          messages: [
            ...messages.map(m => ({ role: m.role, content: m.text })),
            { role: "user", content: userMsg }
          ]
        })
      });

      const data = await response.json();
      const reply = data.content?.[0]?.text || "Sorry, I couldn't process that.";

      // Clean up: extract JSON if wrapped in markdown code fences
      const jsonMatch = reply.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
      const cleanReply = jsonMatch ? jsonMatch[1] : reply;

      try {
        const action = JSON.parse(cleanReply);
        if (action.action === "add_task") {
          await onAddTask(action.text, action.tag || "");
          setMessages(prev => [...prev, { role: "assistant", text: `✓ Task added: "${action.text}"${action.tag ? ` [${action.tag}]` : ""} — check your Dashboard` }]);
        } else if (action.action === "log_study") {
          const sessions = JSON.parse(localStorage.getItem("sanctum_study_sessions") || "[]");
          const s = { id: Date.now().toString(), topic: action.topic, hours: action.hours, notes: action.notes || "", date: new Date().toISOString().slice(0, 10) };
          localStorage.setItem("sanctum_study_sessions", JSON.stringify([s, ...sessions]));
          setMessages(prev => [...prev, { role: "assistant", text: `✓ Logged ${action.hours}h of study — ${action.topic}.` }]);
        } else if (action.action === "navigate") {
          onNavigate(action.page);
          setMessages(prev => [...prev, { role: "assistant", text: `Opening ${action.page}...` }]);
        } else {
          setMessages(prev => [...prev, { role: "assistant", text: cleanReply }]);
        }
      } catch {
        setMessages(prev => [...prev, { role: "assistant", text: cleanReply }]);
      }
    } catch {
      setMessages(prev => [...prev, { role: "assistant", text: "Connection error. Try again." }]);
    }
    setLoading(false);
  };

  const SUGGESTIONS = [
    "Add a task: book Scotland accommodation",
    "Log 1.5h PMP study on risk management",
    "What should I focus on this week?",
    "What trips are coming up?",
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 56px)" }}>
      <div style={{ flex: 1, overflowY: "auto", padding: "24px 28px" }}>
        {messages.map((m, i) => (
          <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start", marginBottom: 16 }}>
            {m.role === "assistant" && (
              <div style={{ width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(135deg, var(--blue), var(--purple))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, marginRight: 10, flexShrink: 0, marginTop: 2 }}>✦</div>
            )}
            <div style={{
              maxWidth: "70%", padding: "12px 16px",
              borderRadius: m.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
              background: m.role === "user" ? "var(--blue)" : "var(--bg1)",
              border: m.role === "user" ? "none" : "1px solid var(--b1)",
              color: m.role === "user" ? "#fff" : "var(--t1)",
              fontSize: 14, lineHeight: 1.6,
            }}>{m.text}</div>
          </div>
        ))}
        {loading && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(135deg, var(--blue), var(--purple))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13 }}>✦</div>
            <div style={{ padding: "12px 16px", background: "var(--bg1)", border: "1px solid var(--b1)", borderRadius: "16px 16px 16px 4px", color: "var(--t3)", fontSize: 13 }}>Thinking...</div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {messages.length === 1 && (
        <div style={{ padding: "0 28px 16px", display: "flex", gap: 8, flexWrap: "wrap" }}>
          {SUGGESTIONS.map(s => (
            <button key={s} className="btn sm" style={{ fontSize: 11 }} onClick={() => setInput(s)}>{s}</button>
          ))}
        </div>
      )}

      <div style={{ padding: "16px 28px", borderTop: "1px solid var(--b1)", background: "var(--bg1)", display: "flex", gap: 10 }}>
        <input className="inp" value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && send()}
          placeholder="Tell me what to do, or ask me anything..."
          style={{ flex: 1 }} autoFocus />
        <button className="btn primary" onClick={send} disabled={loading || !input.trim()} style={{ padding: "8px 18px", flexShrink: 0 }}>
          {loading ? "..." : "Send"}
        </button>
      </div>
    </div>
  );
}

// ─── HOME ────────────────────────────────────────────────────────────────────
function Home({ user, onNavigate, onGoToCalendarDay }) {
  const [tasks, setTasks] = useState([]);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [showAddTask, setShowAddTask] = useState(false);
  const [newTask, setNewTask] = useState({ text: "", tag: "" });
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [events, setEvents] = useState([]);
  const [aiInput, setAiInput] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState(null);
  const aiInputRef = useRef(null);

  // Drag-and-drop card ordering
  const CARD_IDS = ["pmp", "scotland", "msc", "tasks"];
  const [cardOrder, setCardOrder] = useState(() => {
    try {
      const s = JSON.parse(localStorage.getItem("sanctum_home_card_order"));
      if (Array.isArray(s) && s.length === 4 && CARD_IDS.every(id => s.includes(id))) return s;
    } catch {}
    return CARD_IDS;
  });
  const [dragOver, setDragOver] = useState(null);
  const [dragging, setDragging] = useState(null);
  const dragId = useRef(null);

  const onCardDragStart = (e, id) => {
    dragId.current = id;
    setDragging(id);
    e.dataTransfer.effectAllowed = "move";
  };
  const onCardDragOver = (e, id) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (id !== dragId.current) setDragOver(id);
  };
  const onCardDragLeave = (e, id) => {
    if (!e.currentTarget.contains(e.relatedTarget)) setDragOver(prev => prev === id ? null : prev);
  };
  const onCardDrop = (e, id) => {
    e.preventDefault();
    if (!dragId.current || dragId.current === id) { setDragOver(null); return; }
    setCardOrder(prev => {
      const next = [...prev];
      const from = next.indexOf(dragId.current);
      const to   = next.indexOf(id);
      if (from === -1 || to === -1) return prev;
      next.splice(from, 1);
      next.splice(to, 0, dragId.current);
      localStorage.setItem("sanctum_home_card_order", JSON.stringify(next));
      return next;
    });
    setDragOver(null);
    setDragging(null);
    dragId.current = null;
  };
  const onCardDragEnd = () => { setDragOver(null); setDragging(null); dragId.current = null; };

  // Touch drag for stat cards (mobile)
  const touchDragCardId = useRef(null);
  const onCardTouchStart = (e, id) => {
    touchDragCardId.current = id;
    setDragging(id);
  };
  const onCardTouchMove = (e) => {
    e.preventDefault();
    if (!touchDragCardId.current) return;
    const touch = e.touches[0];
    const el = document.elementFromPoint(touch.clientX, touch.clientY);
    const card = el?.closest('[data-card-id]');
    const tid = card?.dataset.cardId;
    if (tid && tid !== touchDragCardId.current) setDragOver(tid);
    else setDragOver(null);
  };
  const onCardTouchEnd = (e) => {
    if (!touchDragCardId.current) return;
    const touch = e.changedTouches[0];
    const el = document.elementFromPoint(touch.clientX, touch.clientY);
    const card = el?.closest('[data-card-id]');
    const tid = card?.dataset.cardId;
    if (tid && tid !== touchDragCardId.current) {
      setCardOrder(prev => {
        const next = [...prev];
        const from = next.indexOf(touchDragCardId.current);
        const to = next.indexOf(tid);
        if (from !== -1 && to !== -1) { next.splice(from, 1); next.splice(to, 0, touchDragCardId.current); localStorage.setItem("sanctum_home_card_order", JSON.stringify(next)); }
        return next;
      });
    }
    touchDragCardId.current = null;
    setDragging(null);
    setDragOver(null);
  };

  // Widget (card) ordering
  const WIDGET_IDS = ["tasks", "week", "trackers"];
  const [widgetOrder, setWidgetOrder] = useState(() => {
    try {
      const s = JSON.parse(localStorage.getItem("sanctum_home_widget_order"));
      if (Array.isArray(s) && s.length === 3 && WIDGET_IDS.every(id => s.includes(id))) return s;
    } catch {}
    return WIDGET_IDS;
  });
  const [wDragOver, setWDragOver] = useState(null);
  const [wDragging, setWDragging] = useState(null);
  const wDragId = useRef(null);

  const onWidgetDragStart = (e, id) => {
    wDragId.current = id; setWDragging(id); e.dataTransfer.effectAllowed = "move";
  };
  const onWidgetDragOver = (e, id) => {
    e.preventDefault(); e.dataTransfer.dropEffect = "move";
    if (id !== wDragId.current) setWDragOver(id);
  };
  const onWidgetDragLeave = (e, id) => {
    if (!e.currentTarget.contains(e.relatedTarget)) setWDragOver(prev => prev === id ? null : prev);
  };
  const onWidgetDrop = (e, id) => {
    e.preventDefault();
    if (!wDragId.current || wDragId.current === id) { setWDragOver(null); return; }
    setWidgetOrder(prev => {
      const next = [...prev];
      const from = next.indexOf(wDragId.current), to = next.indexOf(id);
      if (from === -1 || to === -1) return prev;
      next.splice(from, 1); next.splice(to, 0, wDragId.current);
      localStorage.setItem("sanctum_home_widget_order", JSON.stringify(next));
      return next;
    });
    setWDragOver(null); setWDragging(null); wDragId.current = null;
  };
  const onWidgetDragEnd = () => { setWDragOver(null); setWDragging(null); wDragId.current = null; };

  // Touch drag for widget cards (mobile)
  const touchDragWidgetId = useRef(null);
  const onWidgetTouchStart = (e, id) => { touchDragWidgetId.current = id; setWDragging(id); };
  const onWidgetTouchMove = (e) => {
    e.preventDefault();
    if (!touchDragWidgetId.current) return;
    const touch = e.touches[0];
    const el = document.elementFromPoint(touch.clientX, touch.clientY);
    const widget = el?.closest('[data-widget-id]');
    const tid = widget?.dataset.widgetId;
    if (tid && tid !== touchDragWidgetId.current) setWDragOver(tid); else setWDragOver(null);
  };
  const onWidgetTouchEnd = (e) => {
    if (!touchDragWidgetId.current) return;
    const touch = e.changedTouches[0];
    const el = document.elementFromPoint(touch.clientX, touch.clientY);
    const widget = el?.closest('[data-widget-id]');
    const tid = widget?.dataset.widgetId;
    if (tid && tid !== touchDragWidgetId.current) {
      setWidgetOrder(prev => {
        const next = [...prev];
        const from = next.indexOf(touchDragWidgetId.current), to = next.indexOf(tid);
        if (from !== -1 && to !== -1) { next.splice(from, 1); next.splice(to, 0, touchDragWidgetId.current); localStorage.setItem("sanctum_home_widget_order", JSON.stringify(next)); }
        return next;
      });
    }
    touchDragWidgetId.current = null; setWDragging(null); setWDragOver(null);
  };

  const wDrag = (id) => ({
    'data-widget-id': id,
    draggable: true,
    onDragStart:    e => onWidgetDragStart(e, id),
    onDragOver:     e => onWidgetDragOver(e, id),
    onDragLeave:    e => onWidgetDragLeave(e, id),
    onDrop:         e => onWidgetDrop(e, id),
    onDragEnd:      onWidgetDragEnd,
    onTouchStart:   e => onWidgetTouchStart(e, id),
    onTouchMove:    onWidgetTouchMove,
    onTouchEnd:     onWidgetTouchEnd,
  });

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const homeUserKey = user?.id ? `sanctum_display_name_${user.id}` : "sanctum_display_name";
  const displayName = localStorage.getItem(homeUserKey) || localStorage.getItem("sanctum_display_name") || (user?.email?.split("@")[0] || "");
  const dateStr = now.toLocaleDateString("en-IE", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  const EXAM_DATE = new Date("2026-07-07T13:30");
  const SCOTLAND_DATE = new Date("2026-09-07");
  const MSC_DATE = new Date("2026-09-14");
  const daysTo = (d) => Math.ceil((d - now) / 864e5);

  const DAYS = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
  const todayDow = now.getDay() === 0 ? 6 : now.getDay() - 1;
  const weekDates = DAYS.map((_, i) => { const d = new Date(now); d.setDate(now.getDate() - todayDow + i); return d; });

  useEffect(() => { loadTasks(); loadEvents(); }, []);

  const loadTasks = async () => {
    setTasksLoading(true);
    try { const d = await sb.from("tasks").select("*"); setTasks(Array.isArray(d) ? d : []); }
    catch { setTasks([]); }
    setTasksLoading(false);
  };

  const loadEvents = async () => {
    try { const d = await sb.from("events").select("*"); if (Array.isArray(d)) setEvents(d); }
    catch {}
  };

  const toggleTask = async (t) => {
    setTasks(prev => prev.map(x => x.id === t.id ? { ...x, done: !x.done } : x));
    try { await sb.from("tasks").update({ done: !t.done }, { id: t.id }); } catch {}
  };

  const deleteTask = async (id) => {
    setTasks(prev => prev.filter(t => t.id !== id));
    try { await sb.from("tasks").delete({ id }); } catch {}
  };

  const startEdit = (t) => { setEditingId(t.id); setEditText(t.text); };

  const saveEdit = async (id) => {
    if (!editText.trim()) return;
    setTasks(prev => prev.map(t => t.id === id ? { ...t, text: editText } : t));
    setEditingId(null);
    try { await sb.from("tasks").update({ text: editText }, { id }); } catch {}
  };

  const addTask = async (textOverride, tagOverride) => {
    const text = textOverride ?? newTask.text;
    const tag  = tagOverride  ?? newTask.tag;
    if (!text.trim()) return;
    const task = { text, tag, done: false };
    try {
      const res = await sb.from("tasks").insert(task);
      const created = Array.isArray(res) && res[0] ? res[0] : { ...task, id: Date.now().toString() };
      setTasks(t => [created, ...t]);
    } catch { setTasks(t => [{ ...task, id: Date.now().toString() }, ...t]); }
    if (textOverride === undefined) { setNewTask({ text: "", tag: "" }); setShowAddTask(false); }
  };

  const eventsOnDate = (date) => {
    const ds = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
    return events.filter(e => e.date === ds);
  };

  const activeTasks   = tasks.filter(t => !t.done);
  const archivedTasks = tasks.filter(t =>  t.done);

  // ── AI bar ──
  const sendAI = async () => {
    if (!aiInput.trim() || aiLoading) return;
    const userMsg = aiInput.trim();
    setAiInput("");
    setAiLoading(true);
    setAiResponse({ text: "Thinking...", type: "loading" });

    try {
      const todayISO = now.toISOString().slice(0, 10);
      const sys = `You are Sanctum AI, a personal assistant embedded in a private life organiser app.
Today is ${todayISO}. User: ${displayName}, Dublin, Ireland.
Personal: Wife Tamara. Dog Ozzy (Golden Retriever, born Nov 2025).
Career: Applications open at Anthropic (Copyright Ops PM), Google (Sr Analyst T&S), Google (TPM Analytics EU).
Study: PMP exam target July 7 2026. MSc Cybersecurity at SETU starts Sep 14 2026.
Travel: Italy Jun 12-17 2026. Scotland Sep 7-13 2026 (with Tamara + Ozzy).
Active tasks: ${activeTasks.length} open, ${archivedTasks.length} completed.
IMPORTANT: You CANNOT read note content — notes are private and encrypted on-device.
RESPONSE RULES — choose one format only:
- Add task → reply ONLY with valid JSON, no markdown: {"action":"add_task","text":"task text","tag":"optional tag"}
- Navigate  → reply ONLY with valid JSON, no markdown: {"action":"navigate","page":"home|notes|calendar|trackers|career|study|finance|travel|pet|settings"}
- All other queries → plain conversational text, warm but concise, max 2 sentences. No JSON.`;

      const res  = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ system: sys, messages: [{ role: "user", content: userMsg }] }) });
      const data = await res.json();
      const reply = (data.content?.[0]?.text || "").trim();

      try {
        const action = JSON.parse(reply.replace(/```(?:json)?|```/g, "").trim());
        if (action.action === "add_task") {
          await addTask(action.text, action.tag || "");
          setAiResponse({ text: `Added: "${action.text}"${action.tag ? ` [${action.tag}]` : ""}`, type: "success" });
        } else if (action.action === "navigate") {
          setAiResponse({ text: `Opening ${action.page}...`, type: "success" });
          setTimeout(() => onNavigate(action.page), 400);
        } else {
          setAiResponse({ text: reply, type: "text" });
        }
      } catch {
        setAiResponse({ text: reply || "Got it.", type: "text" });
      }
    } catch {
      setAiResponse({ text: "Connection error. Check your network.", type: "error" });
    }
    setAiLoading(false);
  };

  const AI_SUGGESTIONS = [
    "How many days until the PMP exam?",
    "Add task: book Scotland accommodation",
    "Open the finance tracker",
    "What should I focus on today?",
  ];

  const daysToExam     = daysTo(EXAM_DATE);
  const daysToScotland = daysTo(SCOTLAND_DATE);
  const daysToMSc      = daysTo(MSC_DATE);

  return (
    <div className="page-body page-enter">
      {showAddTask && (
        <Modal title="Add task" onClose={() => setShowAddTask(false)}>
          <div className="form-row">
            <label className="form-label">Task</label>
            <input className="inp" value={newTask.text}
              onChange={e => setNewTask(n => ({ ...n, text: e.target.value }))}
              placeholder="What needs doing?" onKeyDown={e => e.key === "Enter" && addTask()} autoFocus />
          </div>
          <div className="form-row">
            <label className="form-label">Tag (optional)</label>
            <input className="inp" value={newTask.tag}
              onChange={e => setNewTask(n => ({ ...n, tag: e.target.value }))}
              placeholder="Career, PMP, Travel..." />
          </div>
          <div className="modal-actions">
            <button className="btn" onClick={() => setShowAddTask(false)}>Cancel</button>
            <button className="btn primary" onClick={() => addTask()}>Add task</button>
          </div>
        </Modal>
      )}

      {/* Greeting */}
      <div style={{ marginBottom: 28 }}>
        <div className="home-greeting-name">{greeting}, {displayName}</div>
        <div className="home-greeting-date">{dateStr}</div>
      </div>

      {/* AI assistant bar */}
      <div style={{ marginBottom: 28 }}>
        <div className="ai-bar">
          <div className="ai-avatar">
            <Icon name="ai" size={15} color="#fff" />
          </div>
          <input
            ref={aiInputRef}
            className="ai-bar-input"
            value={aiInput}
            onChange={e => setAiInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendAI()}
            placeholder="Ask anything, add a task, or navigate…"
            disabled={aiLoading}
          />
          <button
            className="ai-bar-btn"
            onClick={sendAI}
            disabled={aiLoading || !aiInput.trim()}
            title="Send (Enter)"
          >
            {aiLoading
              ? <><span className="ai-dot"/><span className="ai-dot"/><span className="ai-dot"/></>
              : <Icon name="chevR" size={16} color="#fff" />
            }
          </button>
        </div>

        {aiResponse ? (
          <div className={`ai-response${aiResponse.type === "error" ? " ai-response-err" : aiResponse.type === "success" ? " ai-response-ok" : ""}`}>
            <div className="ai-response-body">
              <div className="ai-response-icon">
                {aiResponse.type === "success" && <Icon name="check" size={14} color="var(--grn)" />}
                {aiResponse.type === "error"   && <Icon name="x"     size={14} color="var(--red)" />}
                {aiResponse.type === "loading" && <span style={{ display:"flex", gap:3 }}><span className="ai-dot"/><span className="ai-dot"/><span className="ai-dot"/></span>}
                {aiResponse.type === "text"    && <Icon name="ai"    size={14} color="var(--blue)" />}
              </div>
              <span>{aiResponse.text}</span>
            </div>
            {aiResponse.type !== "loading" && (
              <button className="ai-response-close" onClick={() => setAiResponse(null)} title="Dismiss">
                <Icon name="x" size={13} />
              </button>
            )}
          </div>
        ) : (
          <div className="ai-suggestions">
            {AI_SUGGESTIONS.map(s => (
              <button
                key={s}
                className="ai-suggestion-chip"
                onClick={() => { setAiInput(s); aiInputRef.current?.focus(); }}
              >{s}</button>
            ))}
          </div>
        )}
      </div>

      {/* Quick stats — draggable */}
      <div className="grid-4 mb18">
        {cardOrder.map(id => {
          const cls = `stat${dragging === id ? " is-dragging" : ""}${dragOver === id ? " drag-over" : ""}`;
          const drag = {
            'data-card-id': id,
            draggable: true,
            onDragStart:  e => onCardDragStart(e, id),
            onDragOver:   e => onCardDragOver(e, id),
            onDragLeave:  e => onCardDragLeave(e, id),
            onDrop:       e => onCardDrop(e, id),
            onDragEnd:    onCardDragEnd,
            onTouchStart: e => onCardTouchStart(e, id),
            onTouchMove:  onCardTouchMove,
            onTouchEnd:   onCardTouchEnd,
          };
          if (id === "pmp") return (
            <div key="pmp" className={cls} {...drag}>
              <div className="drag-handle" style={{ position:"absolute", top:8, right:8 }}><Icon name="grab" size={12} /></div>
              <div className="stat-icon" style={{ background: "rgba(139,92,246,0.15)" }}><Icon name="study" size={18} color="var(--purple)" /></div>
              <div className="stat-label">PMP Exam</div>
              <div className="stat-value" style={{ color: daysToExam < 60 ? "var(--red)" : daysToExam < 120 ? "var(--amber)" : "var(--t1)" }}>{daysToExam}d</div>
              <div className="stat-sub">Jul 7 2026</div>
              <div className="stat-bar"><div className="stat-fill" style={{ width: `${Math.min(Math.max(0, 100 - (daysToExam / 420) * 100), 100)}%` }} /></div>
            </div>
          );
          if (id === "scotland") return (
            <div key="scotland" className={cls} {...drag}>
              <div className="drag-handle" style={{ position:"absolute", top:8, right:8 }}><Icon name="grab" size={12} /></div>
              <div className="stat-icon" style={{ background: "rgba(59,130,246,0.15)" }}><Icon name="travel" size={18} color="var(--blue)" /></div>
              <div className="stat-label">Scotland trip</div>
              <div className="stat-value">{daysToScotland}d</div>
              <div className="stat-sub">Sep 7 · Tamara + Ozzy</div>
              <div className="stat-bar"><div className="stat-fill amber" style={{ width: `${Math.min(Math.max(0, 100 - (daysToScotland / 420) * 100), 100)}%` }} /></div>
            </div>
          );
          if (id === "msc") return (
            <div key="msc" className={cls} {...drag}>
              <div className="drag-handle" style={{ position:"absolute", top:8, right:8 }}><Icon name="grab" size={12} /></div>
              <div className="stat-icon" style={{ background: "rgba(16,185,129,0.15)" }}><Icon name="lock" size={18} color="var(--grn)" /></div>
              <div className="stat-label">MSc Cybersecurity</div>
              <div className="stat-value">{daysToMSc}d</div>
              <div className="stat-sub">SETU — Sep 14 2026</div>
              <div className="stat-bar"><div className="stat-fill grn" style={{ width: `${Math.min(Math.max(0, 100 - (daysToMSc / 420) * 100), 100)}%` }} /></div>
            </div>
          );
          if (id === "tasks") return (
            <div key="tasks" className={cls} {...drag} onClick={() => setShowAddTask(true)}>
              <div className="drag-handle" style={{ position:"absolute", top:8, right:8 }}><Icon name="grab" size={12} /></div>
              <div className="stat-icon" style={{ background: "rgba(245,158,11,0.15)" }}><Icon name="check" size={18} color="var(--amber)" /></div>
              <div className="stat-label">Active tasks</div>
              <div className="stat-value">{activeTasks.length}</div>
              <div className="stat-sub">{archivedTasks.length} completed · click to add</div>
              <div className="stat-bar"><div className="stat-fill amber" style={{ width: tasks.length ? `${(activeTasks.length / tasks.length) * 100}%` : "0%" }} /></div>
            </div>
          );
          return null;
        })}
      </div>

      {/* Tasks + Week + Trackers (drag to reorder) */}
      {(() => {
        const tasksCls  = `card${wDragging==="tasks"    ? " is-dragging" : ""}${wDragOver==="tasks"    ? " drag-over" : ""}`;
        const weekCls   = `card${wDragging==="week"     ? " is-dragging" : ""}${wDragOver==="week"     ? " drag-over" : ""}`;
        const trackersCls=`card${wDragging==="trackers" ? " is-dragging" : ""}${wDragOver==="trackers" ? " drag-over" : ""}`;

        const tasksCard = (
          <div key="tasks" className={tasksCls} {...wDrag("tasks")}>
            <div className="card-header">
              <div>
                <div className="card-title">Tasks</div>
                <div className="card-sub">{activeTasks.length} active · {archivedTasks.length} done</div>
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <div className="drag-handle"><Icon name="grab" size={14} /></div>
                <button className="btn sm primary" onMouseDown={e=>e.stopPropagation()} onClick={() => setShowAddTask(true)}><Icon name="plus" size={13} /> Add</button>
              </div>
            </div>
            {tasksLoading ? <div className="loading">Loading...</div> : (
              <div>
                {activeTasks.length === 0 && (
                  <div style={{ color:"var(--t3)", fontSize:13, textAlign:"center", padding:"20px 0" }}>No active tasks yet</div>
                )}
                {activeTasks.map(t => (
                  <div key={t.id} className="task-item">
                    <div className="task-check" onClick={() => toggleTask(t)} />
                    <div className="task-content">
                      {editingId === t.id ? (
                        <input className="task-edit-input" value={editText}
                          onChange={e => setEditText(e.target.value)}
                          onBlur={() => saveEdit(t.id)}
                          onMouseDown={e => e.stopPropagation()}
                          onKeyDown={e => { if (e.key==="Enter") saveEdit(t.id); if (e.key==="Escape") setEditingId(null); }}
                          autoFocus />
                      ) : (
                        <div className="task-text">{t.text}</div>
                      )}
                      {t.tag && <div className="task-meta"><span className="task-tag">{t.tag}</span></div>}
                    </div>
                    <div className="task-actions">
                      <button className="btn xs ghost" onMouseDown={e=>e.stopPropagation()} onClick={() => startEdit(t)}><Icon name="edit" size={12} /></button>
                      <button className="btn xs danger" onMouseDown={e=>e.stopPropagation()} onClick={() => deleteTask(t.id)}><Icon name="trash" size={12} /></button>
                    </div>
                  </div>
                ))}
                {archivedTasks.length > 0 && (
                  <div style={{ marginTop:12 }}>
                    <button className="btn sm ghost" style={{ width:"100%", justifyContent:"center", color:"var(--t3)", fontSize:11 }}
                      onMouseDown={e=>e.stopPropagation()} onClick={() => setShowArchived(s => !s)}>
                      {showArchived ? "▲ Hide" : "▼ Show"} {archivedTasks.length} completed
                    </button>
                    {showArchived && archivedTasks.map(t => (
                      <div key={t.id} className="task-item" style={{ opacity:.5 }}>
                        <div className="task-check done" onClick={() => toggleTask(t)}><Icon name="check" size={10} color="#fff" /></div>
                        <div className="task-content">
                          <div className="task-text done">{t.text}</div>
                          {t.tag && <div className="task-meta"><span className="task-tag">{t.tag}</span></div>}
                        </div>
                        <div className="task-actions">
                          <button className="btn xs danger" onMouseDown={e=>e.stopPropagation()} onClick={() => deleteTask(t.id)}><Icon name="trash" size={12} /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        );

        const weekCard = (
          <div key="week" className={weekCls} {...wDrag("week")}>
            <div className="card-header">
              <div>
                <div className="card-title">This week</div>
                <div className="card-sub">{now.toLocaleDateString("en-IE", { month:"long", year:"numeric" })}</div>
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <div className="drag-handle"><Icon name="grab" size={14} /></div>
                <button className="btn sm" onMouseDown={e=>e.stopPropagation()} onClick={() => onNavigate("calendar")}>Full calendar</button>
              </div>
            </div>
            <div className="week-strip">
              {weekDates.map((date, i) => {
                const dayEvents = eventsOnDate(date);
                const isToday = i === todayDow;
                return (
                  <div key={i} className={`day-cell${isToday ? " today" : ""}${dayEvents.length > 0 ? " has-event" : ""}`}
                    onMouseDown={e=>e.stopPropagation()} onClick={() => onGoToCalendarDay(date)}>
                    <div className="day-name">{DAYS[i]}</div>
                    <div className="day-num">{date.getDate()}</div>
                    <div className="day-dots">
                      {dayEvents.slice(0,3).map((ev,j) => (
                        <div key={j} className="day-dot" style={{ background: EVENT_COLORS[ev.category]?.color || "var(--blue)" }} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );

        const trackersCard = (
          <div key="trackers" className={trackersCls} {...wDrag("trackers")}>
            <div className="card-header">
              <div className="card-title">Trackers</div>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <div className="drag-handle"><Icon name="grab" size={14} /></div>
                <button className="btn sm" onMouseDown={e=>e.stopPropagation()} onClick={() => onNavigate("trackers")}>See all</button>
              </div>
            </div>
            <div className="grid-2" style={{ gap:10 }}>
              {[
                { id:"study",   icon:"study",   color:"var(--purple)", label:"Study",   sub:"PMP progress" },
                { id:"career",  icon:"career",  color:"var(--amber)",  label:"Career",  sub:"Applications" },
                { id:"finance", icon:"finance", color:"var(--grn)",    label:"Finance", sub:"Monthly budget" },
                { id:"pet",     icon:"pet",     color:"var(--pink)",   label:"Ozzy",    sub:"Golden Retriever" },
              ].map(item => (
                <div key={item.id} onMouseDown={e=>e.stopPropagation()} onClick={() => onNavigate(item.id)}
                  style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.06)", borderRadius:12, padding:"14px 16px", cursor:"pointer", transition:"all .2s" }}
                  onMouseEnter={e=>{ e.currentTarget.style.borderColor="rgba(59,130,246,0.4)"; e.currentTarget.style.background="rgba(59,130,246,0.06)"; }}
                  onMouseLeave={e=>{ e.currentTarget.style.borderColor="rgba(255,255,255,0.06)"; e.currentTarget.style.background="rgba(255,255,255,0.03)"; }}>
                  <div style={{ marginBottom:8 }}><Icon name={item.icon} size={20} color={item.color} /></div>
                  <div style={{ fontSize:13, fontWeight:600, color:"var(--t1)", marginBottom:2 }}>{item.label}</div>
                  <div style={{ fontSize:11, color:"var(--t3)" }}>{item.sub}</div>
                </div>
              ))}
            </div>
          </div>
        );

        const widgetMap = { tasks: tasksCard, week: weekCard, trackers: trackersCard };
        return (
          <div className="grid-2">
            {widgetMap[widgetOrder[0]]}
            <div style={{ display:"flex", flexDirection:"column", gap:18 }}>
              {widgetMap[widgetOrder[1]]}
              {widgetMap[widgetOrder[2]]}
            </div>
          </div>
        );
      })()}
    </div>
  );
}

// ─── NAV ─────────────────────────────────────────────────────────────────────
const NAV = [
  { id: "home",     label: "Home",     icon: "home" },
  { id: "notes",    label: "Notes",    icon: "notes" },
  { id: "calendar", label: "Calendar", icon: "calendar" },
  { id: "trackers", label: "Trackers", icon: "trackers" },
  { id: "settings", label: "Settings", icon: "settings" },
];
const TRACKER_PAGES = ["career", "study", "finance", "travel", "pet"];
const TITLES = {
  home: "Home", notes: "Notes", calendar: "Calendar", trackers: "Trackers",
  career: "Career", study: "Study & PMP", finance: "Finance", travel: "Travel", pet: "Ozzy",
  settings: "Settings"
};

// ─── APP ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);
  const [calDate, setCalDate] = useState(null);

  const [theme, setTheme] = useState(() => localStorage.getItem("sanctum_theme") || "dark");

  const applyTheme = (t) => {
    localStorage.setItem("sanctum_theme", t);
    document.documentElement.setAttribute("data-theme", t);
    setTheme(t);
  };

  // Page & tracker state — map legacy page names on restore
  const [page, setPage] = useState(() => {
    const saved = localStorage.getItem("sanctum_page");
    if (!saved || ["dashboard", "ai"].includes(saved)) return "home";
    if (TRACKER_PAGES.includes(saved)) return "trackers";
    if (["home","notes","calendar","trackers","settings"].includes(saved)) return saved;
    return "home";
  });
  const [trackerPage, setTrackerPage] = useState(() => {
    const saved = localStorage.getItem("sanctum_page");
    return TRACKER_PAGES.includes(saved) ? saved : null;
  });

  // Sidebar nav ordering
  const NAV_IDS = NAV.map(n => n.id);
  const [navOrder, setNavOrder] = useState(() => {
    try {
      const s = JSON.parse(localStorage.getItem("sanctum_nav_order"));
      if (Array.isArray(s) && s.length === NAV_IDS.length && NAV_IDS.every(id => s.includes(id))) return s;
    } catch {}
    return NAV_IDS;
  });
  const [navDragOver, setNavDragOver] = useState(null);
  const [navDragging, setNavDragging] = useState(null);
  const navDragId = useRef(null);

  const onNavDragStart = (e, id) => {
    navDragId.current = id; setNavDragging(id); e.dataTransfer.effectAllowed = "move";
  };
  const onNavDragOver = (e, id) => {
    e.preventDefault(); e.dataTransfer.dropEffect = "move";
    if (id !== navDragId.current) setNavDragOver(id);
  };
  const onNavDragLeave = (e, id) => {
    if (!e.currentTarget.contains(e.relatedTarget)) setNavDragOver(prev => prev === id ? null : prev);
  };
  const onNavDrop = (e, id) => {
    e.preventDefault();
    if (!navDragId.current || navDragId.current === id) { setNavDragOver(null); return; }
    setNavOrder(prev => {
      const next = [...prev];
      const from = next.indexOf(navDragId.current), to = next.indexOf(id);
      if (from === -1 || to === -1) return prev;
      next.splice(from, 1); next.splice(to, 0, navDragId.current);
      localStorage.setItem("sanctum_nav_order", JSON.stringify(next));
      return next;
    });
    setNavDragOver(null); setNavDragging(null); navDragId.current = null;
  };
  const onNavDragEnd = () => { setNavDragOver(null); setNavDragging(null); navDragId.current = null; };

  const navigate = (p) => {
    if (TRACKER_PAGES.includes(p)) {
      setPage("trackers");
      setTrackerPage(p);
      localStorage.setItem("sanctum_page", p);
    } else {
      setPage(p);
      setTrackerPage(null);
      localStorage.setItem("sanctum_page", p);
    }
  };

  const goToCalendarDay = (date) => {
    setCalDate(date);
    navigate("calendar");
  };

  useEffect(() => {
    const init = async () => {
      let session = auth.getSession();
      if (!session) {
        const refreshed = await auth.refreshSession();
        if (refreshed) session = auth.getSession();
      }
      if (session) setUser(session.user);
      setChecking(false);
    };
    init();
    // Auto-refresh every 45 minutes
    const interval = setInterval(async () => {
      const session = auth.getSession();
      const expiry = parseInt(localStorage.getItem("sanctum_expiry") || "0");
      if (session && Date.now() > expiry - 300000) await auth.refreshSession();
    }, 45 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const handleLogin = (u) => setUser(u);
  const handleLogout = () => { auth.signOut(); setUser(null); setPage("home"); setTrackerPage(null); localStorage.removeItem("sanctum_page"); };

  if (checking) return <style>{CSS}</style>;
  if (!user) return <><style>{CSS}</style><Login onLogin={handleLogin} /></>;

  const email = user?.email || "";
  const username = email.split("@")[0];
  const initials = username.slice(0, 2).toUpperCase();

  const addTaskFromAI = async (text, tag) => {
    const task = { text, tag, done: false };
    try {
      const res = await sb.from("tasks").insert(task);
      const created = Array.isArray(res) && res[0] ? res[0] : { ...task, id: Date.now().toString() };
      // This won't update Dashboard state since AI is on a different page
      // Task will appear on next Dashboard visit — this is expected
    } catch { }
  };

  const renderPage = () => {
    if (page === "home") return <Home user={user} onNavigate={navigate} onGoToCalendarDay={goToCalendarDay} />;
    if (page === "notes") return <Notes />;
    if (page === "calendar") return <Calendar initialDate={calDate} />;
    if (page === "trackers") {
      if (trackerPage === "career")  return <><TrackerBackBar name="Career" onBack={() => { setTrackerPage(null); localStorage.setItem("sanctum_page","trackers"); }} /><Career /></>;
      if (trackerPage === "study")   return <><TrackerBackBar name="Study & PMP" onBack={() => { setTrackerPage(null); localStorage.setItem("sanctum_page","trackers"); }} /><Study /></>;
      if (trackerPage === "finance") return <><TrackerBackBar name="Finance" onBack={() => { setTrackerPage(null); localStorage.setItem("sanctum_page","trackers"); }} /><Finance /></>;
      if (trackerPage === "travel")  return <><TrackerBackBar name="Travel" onBack={() => { setTrackerPage(null); localStorage.setItem("sanctum_page","trackers"); }} /><Travel /></>;
      if (trackerPage === "pet")     return <><TrackerBackBar name="Ozzy" onBack={() => { setTrackerPage(null); localStorage.setItem("sanctum_page","trackers"); }} /><Ozzy /></>;
      return <TrackerHub onNavigate={navigate} />;
    }
    if (page === "settings") return <Settings user={user} onLogout={handleLogout} theme={theme} onThemeChange={applyTheme} />;
  };

  const today = new Date().toLocaleDateString("en-IE", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
  const pageTitle = page === "trackers" && trackerPage ? TITLES[trackerPage] : TITLES[page];

  const BOTTOM_NAV = [
    { id: "home",     label: "Home",     icon: "home" },
    { id: "notes",    label: "Notes",    icon: "notes" },
    { id: "calendar", label: "Calendar", icon: "calendar" },
    { id: "trackers", label: "Trackers", icon: "trackers" },
    { id: "settings", label: "Settings", icon: "settings" },
  ];

  const userDisplayKey = user?.id ? `sanctum_display_name_${user.id}` : "sanctum_display_name";
  const displayName = localStorage.getItem(userDisplayKey) || localStorage.getItem("sanctum_display_name") || username;

  return (
    <>
      <style>{CSS}</style>
      <div className="shell">

        {/* ── Sidebar (desktop) ── */}
        <aside className="sidebar">
          <div className="sidebar-logo">
            <div className="logo-mark">S</div>
            <div>
              <div className="logo-name">Sanctum</div>
              <div className="logo-sub">{displayName} · Dublin</div>
            </div>
          </div>

          <div className="nav-section">
            {navOrder.map(id => {
              const n = NAV.find(x => x.id === id);
              if (!n) return null;
              const cls = [
                "nav-item",
                n.id === page      ? "active"       : "",
                navDragging === id ? "is-dragging"   : "",
                navDragOver === id ? "nav-drag-over" : "",
              ].filter(Boolean).join(" ");
              return (
                <div
                  key={n.id}
                  className={cls}
                  draggable
                  onDragStart={e => onNavDragStart(e, n.id)}
                  onDragOver={e  => onNavDragOver(e, n.id)}
                  onDragLeave={e => onNavDragLeave(e, n.id)}
                  onDrop={e      => onNavDrop(e, n.id)}
                  onDragEnd={onNavDragEnd}
                  onClick={() => navigate(n.id)}
                >
                  <div className="nav-icon"><Icon name={n.icon} size={16} /></div>
                  {n.label}
                  <div className="drag-handle" style={{ marginLeft:"auto" }}><Icon name="grab" size={12} /></div>
                </div>
              );
            })}
          </div>

          <div className="sidebar-footer">
            <div className="nav-item" style={{ cursor: "default" }}>
              <div className="nav-icon"><Icon name="lock" size={14} color="var(--grn)" /></div>
              <span style={{ color: "var(--grn)", fontSize: 12 }}>End-to-end encrypted</span>
            </div>
            <div className="nav-item" onClick={handleLogout}>
              <div className="nav-icon"><Icon name="logout" size={14} /></div>
              <span style={{ fontSize: 12 }}>Sign out</span>
            </div>
          </div>
        </aside>

        {/* ── Main content ── */}
        <div className="main main-bg">
          <div className="topbar">
            <div className="topbar-left">
              <div className="topbar-title">{pageTitle}</div>
            </div>
            <div className="topbar-right">
              <span className="topbar-sub">{today}</span>
              <div className="user-avatar" title={email}>{initials}</div>
            </div>
          </div>
          {renderPage()}
        </div>

      </div>

      {/* ── Bottom nav (mobile) ── */}
      <nav className="bottom-nav">
        <div className="bottom-nav-inner">
          {BOTTOM_NAV.map(n => (
            <div
              key={n.id}
              className={`bottom-nav-item${n.id === page ? " active" : ""}`}
              onClick={() => navigate(n.id)}
            >
              <Icon name={n.icon} size={22} />
              <span>{n.label}</span>
            </div>
          ))}
        </div>
      </nav>
    </>
  );
}
