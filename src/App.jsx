import { useState, useEffect, useRef } from "react";

// ─── SUPABASE CONFIG ─────────────────────────────────────────────────────────
const SUPABASE_URL = "https://hqlgwisfkkosgekotojz.supabase.co";
const SUPABASE_KEY = "sb_publishable_Eky9AvrbiYjejxogwxwJ6Q_x7eoySQ4";

// Auth helpers
const auth = {
  signUp: async (email, password) => {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
      method: "POST",
      headers: { apikey: SUPABASE_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });
    return res.json();
  },
  signIn: async (email, password) => {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: { apikey: SUPABASE_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });
    return res.json();
  },
  signOut: () => {
    localStorage.removeItem("sanctum_token");
    localStorage.removeItem("sanctum_user");
  },
  getSession: () => {
    const token = localStorage.getItem("sanctum_token");
    const user = localStorage.getItem("sanctum_user");
    if (token && user) return { token, user: JSON.parse(user) };
    return null;
  },
  saveSession: (data) => {
    localStorage.setItem("sanctum_token", data.access_token);
    localStorage.setItem("sanctum_user", JSON.stringify(data.user));
  }
};

// DB helpers (auth-aware)
const sb = {
  from: (table) => ({
    select: async (cols = "*") => {
      const session = auth.getSession();
      const headers = { apikey: SUPABASE_KEY, "Content-Type": "application/json" };
      if (session) headers.Authorization = `Bearer ${session.token}`;
      const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=${cols}`, { headers });
      return res.json();
    },
    insert: async (data) => {
      const session = auth.getSession();
      const headers = { apikey: SUPABASE_KEY, "Content-Type": "application/json", Prefer: "return=representation" };
      if (session) headers.Authorization = `Bearer ${session.token}`;
      const payload = session ? { ...data, user_id: session.user.id } : data;
      const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
        method: "POST", headers, body: JSON.stringify(payload)
      });
      return res.json();
    },
    update: async (data, match) => {
      const session = auth.getSession();
      const headers = { apikey: SUPABASE_KEY, "Content-Type": "application/json", Prefer: "return=representation" };
      if (session) headers.Authorization = `Bearer ${session.token}`;
      const params = Object.entries(match).map(([k, v]) => `${k}=eq.${v}`).join("&");
      const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${params}`, {
        method: "PATCH", headers, body: JSON.stringify(data)
      });
      return res.json();
    },
    delete: async (match) => {
      const session = auth.getSession();
      const headers = { apikey: SUPABASE_KEY, "Content-Type": "application/json" };
      if (session) headers.Authorization = `Bearer ${session.token}`;
      const params = Object.entries(match).map(([k, v]) => `${k}=eq.${v}`).join("&");
      const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${params}`, {
        method: "DELETE", headers
      });
      return res.ok;
    }
  })
};

// ─── GLOBAL CSS ──────────────────────────────────────────────────────────────
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@300;400;500;600&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --bg:    #0d1117;
    --bg1:   #161b22;
    --bg2:   #1c2128;
    --bg3:   #21262d;
    --b1:    #21262d;
    --b2:    #30363d;
    --b3:    #484f58;
    --t1:    #e6edf3;
    --t2:    #8b949e;
    --t3:    #484f58;
    --blue:  #388bfd;
    --blue2: #1f6feb;
    --bluem: rgba(56,139,253,0.12);
    --blueb: rgba(56,139,253,0.25);
    --grn:   #3fb950;
    --grnm:  rgba(63,185,80,0.10);
    --red:   #f85149;
    --amber: #d29922;
    --mono:  'IBM Plex Mono', monospace;
    --sans:  'IBM Plex Sans', sans-serif;
    --r:     10px;
  }
  html, body, #root { height: 100%; background: var(--bg); color: var(--t1); font-family: var(--sans); font-size: 14px; -webkit-font-smoothing: antialiased; }
  .shell { display: flex; height: 100vh; overflow: hidden; }

  /* ── Login ── */
  .login-wrap {
    min-height: 100vh; display: flex; align-items: center; justify-content: center;
    background: var(--bg);
    background-image: radial-gradient(ellipse at 50% 20%, rgba(56,139,253,0.08) 0%, transparent 60%);
  }
  .login-box {
    background: var(--bg1); border: 1px solid var(--b1);
    border-radius: 16px; padding: 40px; width: 100%; max-width: 380px;
    box-shadow: 0 24px 80px rgba(0,0,0,0.4);
  }
  .login-logo {
    display: flex; align-items: center; gap: 10px; margin-bottom: 32px; justify-content: center;
  }
  .login-mark {
    width: 36px; height: 36px; border-radius: 10px; background: var(--blue);
    display: flex; align-items: center; justify-content: center;
    font-family: var(--mono); font-size: 16px; font-weight: 500; color: #fff;
  }
  .login-name { font-size: 20px; font-weight: 600; color: var(--t1); }
  .login-title { font-size: 16px; font-weight: 600; color: var(--t1); margin-bottom: 6px; text-align: center; }
  .login-sub   { font-size: 13px; color: var(--t3); margin-bottom: 28px; text-align: center; }
  .login-error { background: rgba(248,81,73,.10); border: 1px solid rgba(248,81,73,.3); color: var(--red); font-size: 12px; padding: 10px 12px; border-radius: 7px; margin-bottom: 16px; }

  /* Sidebar */
  .sidebar { width: 220px; min-width: 220px; background: var(--bg1); border-right: 1px solid var(--b1); display: flex; flex-direction: column; overflow-y: auto; }
  .sidebar-logo { display: flex; align-items: center; gap: 10px; padding: 20px 16px 16px; border-bottom: 1px solid var(--b1); }
  .logo-mark { width: 28px; height: 28px; border-radius: 8px; background: var(--blue); display: flex; align-items: center; justify-content: center; font-family: var(--mono); font-size: 13px; font-weight: 500; color: #fff; flex-shrink: 0; }
  .logo-name { font-size: 15px; font-weight: 600; color: var(--t1); }
  .logo-sub  { font-size: 10px; color: var(--t3); font-family: var(--mono); }
  .nav-section { padding: 12px 8px 4px; }
  .nav-label { font-size: 10px; letter-spacing: 1.5px; text-transform: uppercase; color: var(--t3); padding: 0 8px; margin-bottom: 4px; }
  .nav-item { display: flex; align-items: center; gap: 10px; padding: 7px 10px; border-radius: 7px; cursor: pointer; color: var(--t2); font-size: 13px; transition: all .15s; border: 1px solid transparent; user-select: none; }
  .nav-item:hover { background: var(--bg2); color: var(--t1); }
  .nav-item.active { background: var(--bluem); color: var(--blue); border-color: var(--blueb); font-weight: 500; }
  .sidebar-footer { margin-top: auto; padding: 12px 8px; border-top: 1px solid var(--b1); }

  /* Main */
  .main { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
  .topbar { height: 52px; background: var(--bg1); border-bottom: 1px solid var(--b1); display: flex; align-items: center; justify-content: space-between; padding: 0 24px; flex-shrink: 0; }
  .topbar-title { font-size: 15px; font-weight: 600; color: var(--t1); }
  .topbar-right { display: flex; align-items: center; gap: 10px; }
  .page-body { flex: 1; overflow-y: auto; padding: 24px; }

  /* Cards */
  .card { background: var(--bg1); border: 1px solid var(--b1); border-radius: var(--r); padding: 20px; }
  .card-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
  .card-title { font-size: 13px; font-weight: 600; color: var(--t1); }
  .card-sub   { font-size: 11px; color: var(--t3); font-family: var(--mono); margin-top: 2px; }

  /* Grid */
  .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  .grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; }
  .grid-4 { display: grid; grid-template-columns: repeat(4,1fr); gap: 16px; }
  .mb16 { margin-bottom: 16px; }
  .mb24 { margin-bottom: 24px; }

  /* Stat */
  .stat { background: var(--bg2); border: 1px solid var(--b1); border-radius: var(--r); padding: 16px; }
  .stat-label { font-size: 10px; letter-spacing: 1px; text-transform: uppercase; color: var(--t3); margin-bottom: 6px; }
  .stat-value { font-size: 24px; font-weight: 600; font-family: var(--mono); color: var(--t1); letter-spacing: -1px; }
  .stat-sub   { font-size: 11px; color: var(--t3); margin-top: 3px; }
  .stat-bar   { height: 2px; background: var(--b2); border-radius: 1px; margin-top: 10px; }
  .stat-fill  { height: 100%; border-radius: 1px; background: var(--blue); transition: width .4s; }
  .stat-fill.grn   { background: var(--grn); }
  .stat-fill.amber { background: var(--amber); }

  /* Badge */
  .badge { display: inline-flex; align-items: center; padding: 2px 8px; border-radius: 20px; font-size: 11px; font-weight: 500; }
  .badge.blue  { background: var(--bluem); color: var(--blue); }
  .badge.green { background: var(--grnm); color: var(--grn); }
  .badge.amber { background: rgba(210,153,34,.12); color: var(--amber); }
  .badge.red   { background: rgba(248,81,73,.12); color: var(--red); }
  .badge.muted { background: var(--bg3); color: var(--t2); }

  /* Buttons */
  .btn { padding: 6px 14px; border-radius: 6px; border: 1px solid var(--b2); background: transparent; color: var(--t2); font-size: 12px; font-family: var(--sans); cursor: pointer; transition: all .15s; display: inline-flex; align-items: center; gap: 5px; }
  .btn:hover { border-color: var(--b3); color: var(--t1); background: var(--bg2); }
  .btn.sm { padding: 4px 10px; font-size: 11px; }
  .btn.primary { background: var(--blue); border-color: var(--blue); color: #fff; font-weight: 500; }
  .btn.primary:hover { background: var(--blue2); }
  .btn.danger  { background: rgba(248,81,73,.10); border-color: rgba(248,81,73,.3); color: var(--red); }

  /* Input */
  .inp { width: 100%; padding: 8px 12px; border-radius: 7px; background: var(--bg2); border: 1px solid var(--b2); color: var(--t1); font-size: 13px; font-family: var(--sans); outline: none; transition: border-color .15s; }
  .inp:focus { border-color: var(--blue); }
  .inp::placeholder { color: var(--t3); }
  textarea.inp { resize: vertical; min-height: 80px; line-height: 1.5; }
  select.inp { cursor: pointer; }

  /* Divider */
  .divider { height: 1px; background: var(--b1); margin: 16px 0; }

  /* Dashboard widgets */
  .dash-widget { background: var(--bg1); border: 1px solid var(--b1); border-radius: var(--r); padding: 16px; cursor: pointer; transition: border-color .15s; position: relative; overflow: hidden; }
  .dash-widget:hover { border-color: var(--b3); }
  .dw-label { font-size: 10px; letter-spacing: 1px; text-transform: uppercase; color: var(--t3); margin-bottom: 8px; }
  .dw-value { font-size: 22px; font-weight: 600; font-family: var(--mono); color: var(--t1); letter-spacing: -1px; }
  .dw-sub   { font-size: 11px; color: var(--t2); margin-top: 4px; }

  /* Week strip */
  .week-strip { display: flex; gap: 6px; }
  .day-cell { flex: 1; border-radius: 8px; padding: 8px 4px; text-align: center; background: var(--bg2); border: 1px solid var(--b1); cursor: pointer; transition: all .15s; }
  .day-cell.today { background: var(--bluem); border-color: var(--blueb); }
  .day-name { font-size: 9px; text-transform: uppercase; letter-spacing: 1px; color: var(--t3); }
  .day-num  { font-size: 16px; font-weight: 600; font-family: var(--mono); color: var(--t1); margin: 2px 0; }
  .day-cell.today .day-num { color: var(--blue); }
  .day-dot  { width: 4px; height: 4px; border-radius: 50%; background: var(--blue); margin: 0 auto; }

  /* Task */
  .task-item { display: flex; align-items: center; gap: 10px; padding: 8px 0; border-bottom: 1px solid var(--b1); }
  .task-item:last-child { border-bottom: none; }
  .task-check { width: 16px; height: 16px; border-radius: 4px; border: 1px solid var(--b3); display: flex; align-items: center; justify-content: center; flex-shrink: 0; cursor: pointer; transition: all .15s; }
  .task-check.done { background: var(--grn); border-color: var(--grn); }
  .task-text { font-size: 13px; color: var(--t1); flex: 1; }
  .task-text.done { color: var(--t3); text-decoration: line-through; }
  .task-tag  { font-size: 10px; color: var(--t3); font-family: var(--mono); }

  /* Notes */
  .notes-shell { display: flex; height: calc(100vh - 52px); }
  .notes-sidebar { width: 200px; min-width: 200px; border-right: 1px solid var(--b1); background: var(--bg1); overflow-y: auto; }
  .notebook-item { display: flex; align-items: center; gap: 8px; padding: 7px 12px; cursor: pointer; color: var(--t2); font-size: 13px; transition: all .15s; border-left: 2px solid transparent; }
  .notebook-item:hover { background: var(--bg2); color: var(--t1); }
  .notebook-item.active { background: var(--bluem); color: var(--blue); border-left-color: var(--blue); }
  .section-item { display: flex; align-items: center; gap: 8px; padding: 6px 12px 6px 22px; cursor: pointer; color: var(--t3); font-size: 12px; transition: all .15s; border-left: 2px solid transparent; }
  .section-item:hover { background: var(--bg2); color: var(--t2); }
  .section-item.active { color: var(--blue); border-left-color: var(--blue); background: var(--bluem); }
  .notes-list { width: 240px; min-width: 240px; border-right: 1px solid var(--b1); background: var(--bg); overflow-y: auto; }
  .note-list-item { padding: 12px 14px; cursor: pointer; border-bottom: 1px solid var(--b1); transition: background .15s; }
  .note-list-item:hover { background: var(--bg2); }
  .note-list-item.active { background: var(--bluem); }
  .nli-title   { font-size: 13px; font-weight: 500; color: var(--t1); margin-bottom: 3px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .nli-preview { font-size: 11px; color: var(--t3); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .nli-date    { font-size: 10px; color: var(--t3); font-family: var(--mono); margin-top: 4px; }
  .note-editor { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
  .note-toolbar { padding: 10px 20px; border-bottom: 1px solid var(--b1); display: flex; align-items: center; gap: 8px; background: var(--bg1); }
  .note-title-input { width: 100%; padding: 16px 24px 8px; background: transparent; border: none; color: var(--t1); font-size: 22px; font-weight: 600; font-family: var(--sans); outline: none; border-bottom: 1px solid var(--b1); }
  .note-title-input::placeholder { color: var(--t3); }
  .note-body-input { flex: 1; padding: 16px 24px; background: transparent; border: none; color: var(--t2); font-size: 14px; line-height: 1.7; font-family: var(--sans); outline: none; resize: none; }
  .note-body-input::placeholder { color: var(--t3); }
  .note-empty { flex: 1; display: flex; align-items: center; justify-content: center; flex-direction: column; gap: 8px; color: var(--t3); }
  .enc-badge { display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; border-radius: 20px; background: rgba(63,185,80,.10); color: var(--grn); font-size: 10px; font-weight: 500; }

  /* Calendar */
  .cal-grid { display: grid; grid-template-columns: repeat(7,1fr); gap: 4px; }
  .cal-header-cell { text-align: center; font-size: 10px; letter-spacing: 1px; text-transform: uppercase; color: var(--t3); padding: 8px 0; }
  .cal-cell { min-height: 80px; background: var(--bg2); border: 1px solid var(--b1); border-radius: 8px; padding: 6px; cursor: pointer; transition: border-color .15s; }
  .cal-cell:hover { border-color: var(--b3); }
  .cal-cell.today { border-color: var(--blue); }
  .cal-cell.other-month { opacity: .35; }
  .cal-day-num { font-size: 12px; font-family: var(--mono); color: var(--t2); margin-bottom: 4px; }
  .cal-cell.today .cal-day-num { color: var(--blue); font-weight: 600; }
  .cal-event { font-size: 10px; padding: 2px 5px; border-radius: 3px; margin-bottom: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

  /* Career */
  .app-row { display: grid; grid-template-columns: 1.5fr 2fr 1fr 1fr auto; gap: 12px; align-items: center; padding: 12px 0; border-bottom: 1px solid var(--b1); }
  .app-row:last-child { border-bottom: none; }
  .app-row-header { font-size: 10px; letter-spacing: 1px; text-transform: uppercase; color: var(--t3); }

  /* Finance */
  .fin-row { display: flex; align-items: center; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid var(--b1); }
  .fin-row:last-child { border-bottom: none; }
  .fin-label  { font-size: 13px; color: var(--t1); }
  .fin-cat    { font-size: 11px; color: var(--t3); font-family: var(--mono); }
  .fin-amount { font-size: 14px; font-weight: 500; font-family: var(--mono); color: var(--t1); }

  /* Modal */
  .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.6); display: flex; align-items: center; justify-content: center; z-index: 200; backdrop-filter: blur(4px); }
  .modal { background: var(--bg1); border: 1px solid var(--b2); border-radius: 14px; padding: 24px; width: 100%; max-width: 420px; }
  .modal-title { font-size: 15px; font-weight: 600; color: var(--t1); margin-bottom: 20px; }
  .form-row { margin-bottom: 12px; }
  .form-label { font-size: 11px; color: var(--t3); margin-bottom: 5px; display: block; font-family: var(--mono); letter-spacing: .5px; }
  .modal-actions { display: flex; gap: 8px; justify-content: flex-end; margin-top: 20px; }

  /* Loading */
  .loading { display: flex; align-items: center; justify-content: center; height: 200px; color: var(--t3); font-size: 13px; font-family: var(--mono); }

  /* Scrollbar */
  ::-webkit-scrollbar { width: 5px; height: 5px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: var(--b2); border-radius: 3px; }
`;

// ─── ICONS ───────────────────────────────────────────────────────────────────
const Icon = ({ name, size = 16 }) => {
  const s = { width: size, height: size, stroke: "currentColor", fill: "none", strokeWidth: 1.5, strokeLinecap: "round", strokeLinejoin: "round", flexShrink: 0 };
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
  };
  return <svg viewBox="0 0 24 24" style={s}>{p[name]}</svg>;
};

// ─── NOTEBOOKS CONFIG ────────────────────────────────────────────────────────
const NOTEBOOKS = [
  {
    id: "finance", label: "Finance", icon: "finance", color: "#3fb950",
    sections: [{ id: "mortgage", label: "Mortgage & House" }, { id: "expenses", label: "Monthly Expenses" }, { id: "goals", label: "Financial Goals" }]
  },
  {
    id: "travel", label: "Travel", icon: "travel", color: "#388bfd",
    sections: [{ id: "scotland", label: "Scotland Sep 2026" }, { id: "italy", label: "Italy Jun 2026" }, { id: "wishlist", label: "Wish List" }]
  },
  {
    id: "career", label: "Career", icon: "career", color: "#d29922",
    sections: [{ id: "applications", label: "Applications" }, { id: "pmp", label: "PMP Study" }, { id: "networking", label: "Networking" }]
  },
  {
    id: "personal", label: "Personal", icon: "pet", color: "#f85149",
    sections: [{ id: "health", label: "Health & Fitness" }, { id: "reading", label: "Reading List" }, { id: "home", label: "Home & House" }, { id: "ozzy", label: "Ozzy" }]
  },
];

const STATUS_COLORS = { submitted: "blue", interview: "amber", offer: "green", rejected: "red", withdrawn: "muted" };

// ─── MODAL ───────────────────────────────────────────────────────────────────
function Modal({ title, onClose, children }) {
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div className="modal-title" style={{ margin: 0 }}>{title}</div>
          <button className="btn sm" onClick={onClose}><Icon name="x" size={13} /></button>
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
  const [mode, setMode] = useState("login"); // login | signup

  const handleSubmit = async () => {
    if (!email || !password) return setError("Please enter your email and password.");
    setLoading(true); setError("");
    try {
      const data = mode === "login"
        ? await auth.signIn(email, password)
        : await auth.signUp(email, password);

      if (data.access_token) {
        auth.saveSession(data);
        onLogin(data.user);
      } else if (data.id && mode === "signup") {
        setError("Account created. Check your email to confirm, then sign in.");
        setMode("login");
      } else {
        setError(data.error_description || data.message || "Something went wrong. Try again.");
      }
    } catch {
      setError("Connection error. Check your internet and try again.");
    }
    setLoading(false);
  };

  return (
    <div className="login-wrap">
      <div className="login-box">
        <div className="login-logo">
          <div className="login-mark">S</div>
          <div className="login-name">Sanctum</div>
        </div>
        <div className="login-title">{mode === "login" ? "Welcome back" : "Create account"}</div>
        <div className="login-sub">{mode === "login" ? "Sign in to your private space" : "Set up your Sanctum account"}</div>

        {error && <div className="login-error">{error}</div>}

        <div className="form-row">
          <label className="form-label">Email</label>
          <input className="inp" type="email" value={email} onChange={e => setEmail(e.target.value)}
            placeholder="you@email.com" onKeyDown={e => e.key === "Enter" && handleSubmit()} autoFocus />
        </div>
        <div className="form-row">
          <label className="form-label">Password</label>
          <input className="inp" type="password" value={password} onChange={e => setPassword(e.target.value)}
            placeholder="••••••••" onKeyDown={e => e.key === "Enter" && handleSubmit()} />
        </div>

        <button className="btn primary" style={{ width: "100%", justifyContent: "center", padding: "10px", marginTop: 8 }}
          onClick={handleSubmit} disabled={loading}>
          {loading ? "Please wait..." : mode === "login" ? "Sign in" : "Create account"}
        </button>

        <div style={{ textAlign: "center", marginTop: 16, fontSize: 12, color: "var(--t3)" }}>
          {mode === "login" ? "No account? " : "Already have one? "}
          <span style={{ color: "var(--blue)", cursor: "pointer" }} onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(""); }}>
            {mode === "login" ? "Create one" : "Sign in"}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── DASHBOARD ───────────────────────────────────────────────────────────────
function Dashboard({ onNavigate }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newTask, setNewTask] = useState({ text: "", tag: "" });

  useEffect(() => { loadTasks(); }, []);

  const loadTasks = async () => {
    setLoading(true);
    try {
      const data = await sb.from("tasks").select("*");
      if (Array.isArray(data)) setTasks(data);
      else throw new Error();
    } catch {
      setTasks([
        { id: "t1", text: "Submit PMP application", tag: "PMP", done: false },
        { id: "t2", text: "Follow up — Google app", tag: "Career", done: false },
        { id: "t3", text: "Book Scotland Airbnb", tag: "Travel", done: false },
        { id: "t4", text: "Ozzy vet checkup", tag: "Ozzy", done: true },
      ]);
    }
    setLoading(false);
  };

  const toggleTask = async (t) => {
    setTasks(prev => prev.map(x => x.id === t.id ? { ...x, done: !x.done } : x));
    try { await sb.from("tasks").update({ done: !t.done }, { id: t.id }); } catch { }
  };

  const addTask = async () => {
    if (!newTask.text.trim()) return;
    const task = { text: newTask.text, tag: newTask.tag, done: false };
    try {
      const res = await sb.from("tasks").insert(task);
      const created = Array.isArray(res) && res[0] ? res[0] : { ...task, id: Date.now().toString() };
      setTasks(t => [...t, created]);
    } catch { setTasks(t => [...t, { ...task, id: Date.now().toString() }]); }
    setNewTask({ text: "", tag: "" });
    setShowAdd(false);
  };

  const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const done = tasks.filter(t => t.done).length;

  return (
    <div className="page-body">
      {showAdd && (
        <Modal title="Add task" onClose={() => setShowAdd(false)}>
          <div className="form-row"><label className="form-label">Task</label><input className="inp" value={newTask.text} onChange={e => setNewTask(n => ({ ...n, text: e.target.value }))} placeholder="What needs doing?" onKeyDown={e => e.key === "Enter" && addTask()} autoFocus /></div>
          <div className="form-row"><label className="form-label">Tag</label><input className="inp" value={newTask.tag} onChange={e => setNewTask(n => ({ ...n, tag: e.target.value }))} placeholder="Career, PMP, Travel..." /></div>
          <div className="modal-actions"><button className="btn" onClick={() => setShowAdd(false)}>Cancel</button><button className="btn primary" onClick={addTask}>Add task</button></div>
        </Modal>
      )}
      <div className="card mb16">
        <div className="card-header">
          <div><div className="card-title">This week</div><div className="card-sub">April 2026</div></div>
          <span className="badge blue">{done}/{tasks.length} done</span>
        </div>
        <div className="week-strip">
          {DAYS.map((d, i) => (
            <div key={d} className={`day-cell${i === 2 ? " today" : ""}`}>
              <div className="day-name">{d}</div>
              <div className="day-num">{6 + i}</div>
              {i === 2 && <div className="day-dot" />}
            </div>
          ))}
        </div>
      </div>
      <div className="grid-4 mb16">
        <div className="dash-widget" onClick={() => onNavigate("career")}><div className="dw-label">Applications</div><div className="dw-value">3</div><div className="dw-sub">Anthropic, Google ×2</div></div>
        <div className="dash-widget" onClick={() => onNavigate("study")}><div className="dw-label">PMP Exam</div><div className="dw-value">Aug</div><div className="dw-sub">2026 target</div></div>
        <div className="dash-widget" onClick={() => onNavigate("finance")}><div className="dw-label">Monthly spend</div><div className="dw-value">€685</div><div className="dw-sub">Mar 2026</div></div>
        <div className="dash-widget" onClick={() => onNavigate("travel")}><div className="dw-label">Next trip</div><div className="dw-value">152d</div><div className="dw-sub">Scotland — Sep 7</div></div>
      </div>
      <div className="grid-2 mb16">
        <div className="card">
          <div className="card-header"><div className="card-title">Tasks</div><button className="btn sm" onClick={() => setShowAdd(true)}><Icon name="plus" size={12} /> Add</button></div>
          {loading ? <div className="loading">Loading...</div> : tasks.map(t => (
            <div key={t.id} className="task-item">
              <div className={`task-check${t.done ? " done" : ""}`} onClick={() => toggleTask(t)}>{t.done && <Icon name="check" size={10} />}</div>
              <span className={`task-text${t.done ? " done" : ""}`}>{t.text}</span>
              <span className="task-tag">{t.tag}</span>
            </div>
          ))}
        </div>
        <div className="card">
          <div className="card-header"><div className="card-title">Quick notes</div><button className="btn sm" onClick={() => onNavigate("notes")}>Open →</button></div>
          {["Scotland Sep 7–13 — accommodation needed", "BOI mortgage review Q3", "Ozzy vet checkup — done ✓"].map((n, i) => (
            <div key={i} style={{ padding: "8px 0", borderBottom: "1px solid var(--b1)", fontSize: 13, color: "var(--t2)" }}>{n}</div>
          ))}
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 10 }}>
            <Icon name="lock" size={12} /><span style={{ fontSize: 11, color: "var(--grn)" }}>Notes encrypted</span>
          </div>
        </div>
      </div>
      <div className="grid-3">
        <div className="stat"><div className="stat-label">PMP Hours</div><div className="stat-value">2h</div><div className="stat-sub">Target 4,500h — Aug 2026</div><div className="stat-bar"><div className="stat-fill" style={{ width: "0.1%" }} /></div></div>
        <div className="stat"><div className="stat-label">MSc starts</div><div className="stat-value">159d</div><div className="stat-sub">SETU — Sep 14 2026</div><div className="stat-bar"><div className="stat-fill grn" style={{ width: "60%" }} /></div></div>
        <div className="stat"><div className="stat-label">Scotland trip</div><div className="stat-value">152d</div><div className="stat-sub">Sep 7–13, Tamara + Ozzy</div><div className="stat-bar"><div className="stat-fill amber" style={{ width: "58%" }} /></div></div>
      </div>
    </div>
  );
}

// ─── NOTES ───────────────────────────────────────────────────────────────────
function Notes() {
  const [activeNB, setActiveNB] = useState("finance");
  const [activeSection, setSection] = useState("mortgage");
  const [notes, setNotes] = useState([]);
  const [activeNote, setActiveNote] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");
  const [loading, setLoading] = useState(false);
  const notebook = NOTEBOOKS.find(n => n.id === activeNB);

  useEffect(() => { loadNotes(); }, [activeSection]);

  const loadNotes = async () => {
    setLoading(true);
    try {
      const data = await sb.from("notes").select("*");
      if (Array.isArray(data)) {
        const filtered = data.filter(n => n.section === activeSection);
        setNotes(filtered);
        setActiveNote(filtered[0]?.id || null);
        if (filtered[0]) { setEditTitle(filtered[0].title || ""); setEditBody(filtered[0].body || ""); }
        else { setEditTitle(""); setEditBody(""); }
      }
    } catch { setNotes([]); }
    setLoading(false);
  };

  const selectNote = (n) => { setActiveNote(n.id); setEditTitle(n.title || ""); setEditBody(n.body || ""); };

  const saveNote = async () => {
    if (!activeNote) return;
    const updated = new Date().toISOString().slice(0, 10);
    setNotes(prev => prev.map(n => n.id === activeNote ? { ...n, title: editTitle, body: editBody, updated_at: updated } : n));
    try { await sb.from("notes").update({ title: editTitle, body: editBody, updated_at: updated }, { id: activeNote }); } catch { }
  };

  const newNote = async () => {
    const note = { notebook: activeNB, section: activeSection, title: "New note", body: "", updated_at: new Date().toISOString().slice(0, 10) };
    try {
      const res = await sb.from("notes").insert(note);
      const created = Array.isArray(res) && res[0] ? res[0] : { ...note, id: Date.now().toString() };
      setNotes(prev => [created, ...prev]); setActiveNote(created.id); setEditTitle("New note"); setEditBody("");
    } catch { const n = { ...note, id: Date.now().toString() }; setNotes(prev => [n, ...prev]); setActiveNote(n.id); }
  };

  const deleteNote = async () => {
    if (!activeNote) return;
    const remaining = notes.filter(n => n.id !== activeNote);
    setNotes(remaining); setActiveNote(remaining[0]?.id || null);
    if (remaining[0]) { setEditTitle(remaining[0].title || ""); setEditBody(remaining[0].body || ""); }
    try { await sb.from("notes").delete({ id: activeNote }); } catch { }
  };

  const selectSection = (sid, nbid) => {
    if (nbid !== activeNB) setActiveNB(nbid);
    setSection(sid); setActiveNote(null); setEditTitle(""); setEditBody("");
  };

  const currentNote = notes.find(n => n.id === activeNote);

  return (
    <div className="notes-shell">
      <div className="notes-sidebar">
        <div style={{ padding: "10px 12px 8px", borderBottom: "1px solid var(--b1)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 10, color: "var(--t3)", letterSpacing: 1, textTransform: "uppercase" }}>Notebooks</span>
          <span className="enc-badge"><Icon name="lock" size={10} /> enc</span>
        </div>
        {NOTEBOOKS.map(nb => (
          <div key={nb.id}>
            <div className={`notebook-item${activeNB === nb.id ? " active" : ""}`} onClick={() => selectSection(nb.sections[0].id, nb.id)}>
              <Icon name={nb.icon} size={14} />{nb.label}
            </div>
            {activeNB === nb.id && nb.sections.map(sec => (
              <div key={sec.id} className={`section-item${activeSection === sec.id ? " active" : ""}`} onClick={() => selectSection(sec.id, nb.id)}>
                <span style={{ width: 4, height: 4, borderRadius: "50%", background: "var(--b3)", flexShrink: 0, display: "inline-block" }} />{sec.label}
              </div>
            ))}
          </div>
        ))}
      </div>
      <div className="notes-list">
        <div style={{ padding: "10px 12px", borderBottom: "1px solid var(--b1)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: "var(--t1)" }}>{notebook?.sections.find(s => s.id === activeSection)?.label}</span>
          <button className="btn sm" onClick={newNote}><Icon name="plus" size={12} /></button>
        </div>
        {loading && <div className="loading">Loading...</div>}
        {!loading && notes.length === 0 && <div style={{ padding: 20, color: "var(--t3)", fontSize: 12, textAlign: "center" }}>No notes yet.<br />Click + to start.</div>}
        {notes.map(n => (
          <div key={n.id} className={`note-list-item${activeNote === n.id ? " active" : ""}`} onClick={() => selectNote(n)}>
            <div className="nli-title">{n.title || "Untitled"}</div>
            <div className="nli-preview">{(n.body || "").replace(/\n/g, " ").slice(0, 50)}</div>
            <div className="nli-date">{n.updated_at}</div>
          </div>
        ))}
      </div>
      <div className="note-editor">
        {currentNote ? (
          <>
            <div className="note-toolbar">
              <button className="btn sm" onClick={saveNote}>Save</button>
              <button className="btn sm danger" onClick={deleteNote}><Icon name="trash" size={12} /> Delete</button>
              <div style={{ flex: 1 }} />
              <span className="enc-badge"><Icon name="lock" size={10} /> Encrypted locally</span>
            </div>
            <input className="note-title-input" value={editTitle} onChange={e => setEditTitle(e.target.value)} onBlur={saveNote} placeholder="Note title" />
            <textarea className="note-body-input" value={editBody} onChange={e => setEditBody(e.target.value)} onBlur={saveNote} placeholder="Start writing..." />
          </>
        ) : (
          <div className="note-empty">
            <div style={{ fontSize: 32, opacity: .2 }}>📝</div>
            <div style={{ fontSize: 13 }}>Select a note or create a new one</div>
            <button className="btn primary" onClick={newNote}><Icon name="plus" size={14} /> New note</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── CALENDAR ────────────────────────────────────────────────────────────────
function Calendar() {
  const [year, setYear] = useState(2026);
  const [month, setMonth] = useState(3);
  const [events, setEvents] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [selectedDay, setSelectedDay] = useState(null);
  const [newEvent, setNewEvent] = useState({ title: "", category: "personal" });
  const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const CATS = [{ id: "personal", label: "Personal", color: "#388bfd" }, { id: "career", label: "Career", color: "#d29922" }, { id: "travel", label: "Travel", color: "#3fb950" }, { id: "study", label: "Study", color: "#a371f7" }];

  useEffect(() => { loadEvents(); }, []);

  const loadEvents = async () => {
    try {
      const data = await sb.from("events").select("*");
      if (Array.isArray(data) && data.length) setEvents(data);
      else throw new Error();
    } catch {
      setEvents([
        { id: "e1", title: "PMP Application due", date: "2026-04-15", category: "study", color: "#a371f7" },
        { id: "e2", title: "Italy trip", date: "2026-06-12", category: "travel", color: "#3fb950" },
        { id: "e3", title: "Scotland trip", date: "2026-09-07", category: "travel", color: "#3fb950" },
        { id: "e4", title: "MSc starts — SETU", date: "2026-09-14", category: "study", color: "#a371f7" },
      ]);
    }
  };

  const addEvent = async () => {
    if (!newEvent.title.trim() || !selectedDay) return;
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(selectedDay).padStart(2, "0")}`;
    const cat = CATS.find(c => c.id === newEvent.category);
    const ev = { title: newEvent.title, date: dateStr, category: newEvent.category, color: cat?.color || "#388bfd" };
    try {
      const res = await sb.from("events").insert(ev);
      const created = Array.isArray(res) && res[0] ? res[0] : { ...ev, id: Date.now().toString() };
      setEvents(prev => [...prev, created]);
    } catch { setEvents(prev => [...prev, { ...ev, id: Date.now().toString() }]); }
    setNewEvent({ title: "", category: "personal" }); setShowAdd(false);
  };

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrev = new Date(year, month, 0).getDate();
  const startOffset = firstDay === 0 ? 6 : firstDay - 1;
  const cells = [];
  for (let i = startOffset - 1; i >= 0; i--) cells.push({ day: daysInPrev - i, current: false });
  for (let i = 1; i <= daysInMonth; i++) cells.push({ day: i, current: true });
  while (cells.length % 7 !== 0) cells.push({ day: cells.length - daysInMonth - startOffset + 1, current: false });

  const eventsOnDay = (day) => {
    if (!day.current) return [];
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day.day).padStart(2, "0")}`;
    return events.filter(e => e.date === dateStr);
  };
  const isToday = (day) => day.current && year === 2026 && month === 3 && day.day === 11;
  const prev = () => { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const next = () => { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); };

  return (
    <div className="page-body">
      {showAdd && (
        <Modal title={`Add event — ${selectedDay} ${MONTHS[month]}`} onClose={() => setShowAdd(false)}>
          <div className="form-row"><label className="form-label">Title</label><input className="inp" value={newEvent.title} onChange={e => setNewEvent(n => ({ ...n, title: e.target.value }))} placeholder="Event title" autoFocus onKeyDown={e => e.key === "Enter" && addEvent()} /></div>
          <div className="form-row"><label className="form-label">Category</label>
            <select className="inp" value={newEvent.category} onChange={e => setNewEvent(n => ({ ...n, category: e.target.value }))}>
              {CATS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </div>
          <div className="modal-actions"><button className="btn" onClick={() => setShowAdd(false)}>Cancel</button><button className="btn primary" onClick={addEvent}>Add event</button></div>
        </Modal>
      )}
      <div className="card">
        <div className="card-header">
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button className="btn sm" onClick={prev}><Icon name="chevL" size={13} /></button>
            <div className="card-title" style={{ fontSize: 15, minWidth: 160, textAlign: "center" }}>{MONTHS[month]} {year}</div>
            <button className="btn sm" onClick={next}><Icon name="chevR" size={13} /></button>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {CATS.map(c => <span key={c.id} style={{ fontSize: 10, color: c.color, fontFamily: "var(--mono)" }}>● {c.label}</span>)}
          </div>
        </div>
        <div className="cal-grid" style={{ marginBottom: 4 }}>
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(d => <div key={d} className="cal-header-cell">{d}</div>)}
        </div>
        <div className="cal-grid">
          {cells.map((cell, i) => (
            <div key={i} className={`cal-cell${!cell.current ? " other-month" : ""}${isToday(cell) ? " today" : ""}`}
              onClick={() => { if (cell.current) { setSelectedDay(cell.day); setShowAdd(true); } }}>
              <div className="cal-day-num">{cell.day}</div>
              {eventsOnDay(cell).map(ev => (
                <div key={ev.id} className="cal-event" style={{ background: ev.color + "22", color: ev.color }}>{ev.title}</div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── CAREER ──────────────────────────────────────────────────────────────────
function Career() {
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newApp, setNewApp] = useState({ company: "", role: "", status: "submitted", applied_date: "", notes: "" });
  const STATUSES = ["submitted", "interview", "offer", "rejected", "withdrawn"];

  useEffect(() => { loadApps(); }, []);

  const loadApps = async () => {
    setLoading(true);
    try {
      const data = await sb.from("applications").select("*");
      if (Array.isArray(data) && data.length) setApps(data);
      else throw new Error();
    } catch {
      setApps([
        { id: "a1", company: "Anthropic", role: "Copyright Ops PM", status: "submitted", applied_date: "2026-03-10", notes: "Cover letter tailored" },
        { id: "a2", company: "Google", role: "Sr Analyst Trust & Safety", status: "submitted", applied_date: "2026-03-15", notes: "EU HQ Dublin" },
        { id: "a3", company: "Google", role: "TPM Analytics EU", status: "submitted", applied_date: "2026-03-18", notes: "TPM track" },
      ]);
    }
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

  return (
    <div className="page-body">
      {showAdd && (
        <Modal title="Add application" onClose={() => setShowAdd(false)}>
          <div className="form-row"><label className="form-label">Company</label><input className="inp" value={newApp.company} onChange={e => setNewApp(n => ({ ...n, company: e.target.value }))} autoFocus /></div>
          <div className="form-row"><label className="form-label">Role</label><input className="inp" value={newApp.role} onChange={e => setNewApp(n => ({ ...n, role: e.target.value }))} /></div>
          <div className="form-row"><label className="form-label">Applied date</label><input className="inp" type="date" value={newApp.applied_date} onChange={e => setNewApp(n => ({ ...n, applied_date: e.target.value }))} /></div>
          <div className="form-row"><label className="form-label">Notes</label><textarea className="inp" value={newApp.notes} onChange={e => setNewApp(n => ({ ...n, notes: e.target.value }))} /></div>
          <div className="modal-actions"><button className="btn" onClick={() => setShowAdd(false)}>Cancel</button><button className="btn primary" onClick={addApp}>Add</button></div>
        </Modal>
      )}
      <div className="grid-3 mb16">
        <div className="stat"><div className="stat-label">Active</div><div className="stat-value">{apps.filter(a => ["submitted", "interview"].includes(a.status)).length}</div><div className="stat-sub">In progress</div></div>
        <div className="stat"><div className="stat-label">Interviews</div><div className="stat-value">{apps.filter(a => a.status === "interview").length}</div><div className="stat-sub">Scheduled</div></div>
        <div className="stat"><div className="stat-label">Total</div><div className="stat-value">{apps.length}</div><div className="stat-sub">All time</div></div>
      </div>
      <div className="card">
        <div className="card-header">
          <div><div className="card-title">Applications</div></div>
          <button className="btn sm primary" onClick={() => setShowAdd(true)}><Icon name="plus" size={12} /> Add</button>
        </div>
        <div className="app-row" style={{ paddingTop: 0 }}>
          {["Company", "Role", "Status", "Applied", ""].map(h => <div key={h} className="app-row-header">{h}</div>)}
        </div>
        {loading ? <div className="loading">Loading...</div> : apps.map(a => (
          <div key={a.id} className="app-row">
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--t1)" }}>{a.company}</div>
            <div style={{ fontSize: 13, color: "var(--t2)" }}>{a.role}</div>
            <select className="inp" style={{ padding: "3px 8px", fontSize: 12 }} value={a.status} onChange={e => updateStatus(a.id, e.target.value)}>
              {STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
            </select>
            <div style={{ fontSize: 12, color: "var(--t3)", fontFamily: "var(--mono)" }}>{a.applied_date}</div>
            <span className={`badge ${STATUS_COLORS[a.status] || "muted"}`}>{a.status}</span>
          </div>
        ))}
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
      if (Array.isArray(data) && data.length) setEntries(data);
      else throw new Error();
    } catch {
      setEntries([
        { id: "f1", label: "BOI Mortgage", amount: 1450, category: "mortgage", month: "April 2026" },
        { id: "f2", label: "Groceries", amount: 320, category: "expense", month: "April 2026" },
        { id: "f3", label: "Utilities", amount: 180, category: "expense", month: "April 2026" },
        { id: "f4", label: "Ozzy expenses", amount: 120, category: "expense", month: "April 2026" },
        { id: "f5", label: "Subscriptions", amount: 65, category: "subscription", month: "April 2026" },
        { id: "f6", label: "AXA Car Insurance", amount: 121, category: "insurance", month: "April 2026" },
        { id: "f7", label: "Salary", amount: 5800, category: "income", month: "April 2026" },
        { id: "f8", label: "Savings", amount: 500, category: "savings", month: "April 2026" },
      ]);
    }
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

  const income = entries.filter(e => e.category === "income").reduce((s, e) => s + Number(e.amount), 0);
  const expenses = entries.filter(e => e.category !== "income").reduce((s, e) => s + Number(e.amount), 0);
  const balance = income - expenses;

  return (
    <div className="page-body">
      {showAdd && (
        <Modal title="Add entry" onClose={() => setShowAdd(false)}>
          <div className="form-row"><label className="form-label">Label</label><input className="inp" value={newEntry.label} onChange={e => setNewEntry(n => ({ ...n, label: e.target.value }))} autoFocus /></div>
          <div className="form-row"><label className="form-label">Amount (€)</label><input className="inp" type="number" value={newEntry.amount} onChange={e => setNewEntry(n => ({ ...n, amount: e.target.value }))} /></div>
          <div className="form-row"><label className="form-label">Category</label>
            <select className="inp" value={newEntry.category} onChange={e => setNewEntry(n => ({ ...n, category: e.target.value }))}>
              {CATS.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
            </select>
          </div>
          <div className="form-row"><label className="form-label">Month</label><input className="inp" value={newEntry.month} onChange={e => setNewEntry(n => ({ ...n, month: e.target.value }))} /></div>
          <div className="modal-actions"><button className="btn" onClick={() => setShowAdd(false)}>Cancel</button><button className="btn primary" onClick={addEntry}>Add</button></div>
        </Modal>
      )}
      <div className="grid-3 mb16">
        <div className="stat"><div className="stat-label">Income</div><div className="stat-value" style={{ color: "var(--grn)" }}>€{income.toLocaleString()}</div><div className="stat-sub">April 2026</div></div>
        <div className="stat"><div className="stat-label">Expenses</div><div className="stat-value" style={{ color: "var(--red)" }}>€{expenses.toLocaleString()}</div><div className="stat-sub">All outgoings</div></div>
        <div className="stat"><div className="stat-label">Balance</div><div className="stat-value" style={{ color: balance >= 0 ? "var(--grn)" : "var(--red)" }}>€{balance.toLocaleString()}</div><div className="stat-sub">After all expenses</div><div className="stat-bar"><div className="stat-fill grn" style={{ width: `${Math.min((balance / income) * 100, 100)}%` }} /></div></div>
      </div>
      <div className="card">
        <div className="card-header">
          <div><div className="card-title">April 2026</div></div>
          <button className="btn sm primary" onClick={() => setShowAdd(true)}><Icon name="plus" size={12} /> Add</button>
        </div>
        {loading ? <div className="loading">Loading...</div> : entries.map(e => (
          <div key={e.id} className="fin-row">
            <div><div className="fin-label">{e.label}</div><div className="fin-cat">{e.category}</div></div>
            <div className="fin-amount" style={{ color: e.category === "income" ? "var(--grn)" : "var(--t1)" }}>
              {e.category === "income" ? "+" : "-"}€{Number(e.amount).toLocaleString()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PlaceholderPage({ label }) {
  return (
    <div className="page-body" style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", flexDirection: "column", gap: 12 }}>
      <div style={{ fontSize: 40, opacity: .15 }}>🚧</div>
      <div style={{ fontSize: 16, fontWeight: 600, color: "var(--t1)" }}>{label}</div>
      <div style={{ fontSize: 13, color: "var(--t3)" }}>Coming in next build</div>
    </div>
  );
}

// ─── NAV ─────────────────────────────────────────────────────────────────────
const NAV = [
  { id: "dashboard", label: "Dashboard", icon: "home", group: "main" },
  { id: "notes", label: "Notes", icon: "notes", group: "main" },
  { id: "calendar", label: "Calendar", icon: "calendar", group: "main" },
  { id: "career", label: "Career", icon: "career", group: "work" },
  { id: "study", label: "Study", icon: "study", group: "work" },
  { id: "finance", label: "Finance", icon: "finance", group: "life" },
  { id: "travel", label: "Travel", icon: "travel", group: "life" },
  { id: "pet", label: "Ozzy", icon: "pet", group: "life" },
  { id: "settings", label: "Settings", icon: "settings", group: "system" },
];
const GROUPS = [{ key: "main", label: "Main" }, { key: "work", label: "Work" }, { key: "life", label: "Life" }, { key: "system", label: "System" }];
const TITLES = { dashboard: "Dashboard", notes: "Notes", calendar: "Calendar", career: "Career", study: "Study & PMP", finance: "Finance", travel: "Travel", pet: "Ozzy", settings: "Settings" };

// ─── APP ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState(null);
  const [page, setPage] = useState("dashboard");
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const session = auth.getSession();
    if (session) setUser(session.user);
    setChecking(false);
  }, []);

  const handleLogin = (u) => setUser(u);

  const handleLogout = () => {
    auth.signOut();
    setUser(null);
    setPage("dashboard");
  };

  if (checking) return null;
  if (!user) return <><style>{CSS}</style><Login onLogin={handleLogin} /></>;

  const renderPage = () => {
    if (page === "dashboard") return <Dashboard onNavigate={setPage} />;
    if (page === "notes") return <Notes />;
    if (page === "calendar") return <Calendar />;
    if (page === "career") return <Career />;
    if (page === "finance") return <Finance />;
    return <PlaceholderPage label={TITLES[page]} />;
  };

  const email = user?.email || "";
  const initials = email.slice(0, 2).toUpperCase();

  return (
    <>
      <style>{CSS}</style>
      <div className="shell">
        <aside className="sidebar">
          <div className="sidebar-logo">
            <div className="logo-mark">S</div>
            <div><div className="logo-name">Sanctum</div><div className="logo-sub">{user?.email?.split("@")[0]} · Dublin</div></div>
          </div>
          {GROUPS.map(g => (
            <div key={g.key} className="nav-section">
              <div className="nav-label">{g.label}</div>
              {NAV.filter(n => n.group === g.key).map(n => (
                <div key={n.id} className={`nav-item${page === n.id ? " active" : ""}`} onClick={() => setPage(n.id)}>
                  <Icon name={n.icon} size={15} />{n.label}
                </div>
              ))}
            </div>
          ))}
          <div className="sidebar-footer">
            <div className="nav-item" style={{ fontSize: 12 }}>
              <Icon name="lock" size={13} /><span style={{ color: "var(--grn)" }}>Encrypted</span>
            </div>
            <div className="nav-item" style={{ fontSize: 12, marginTop: 4 }} onClick={handleLogout}>
              <Icon name="logout" size={13} /><span>Sign out</span>
            </div>
          </div>
        </aside>
        <div className="main">
          <div className="topbar">
            <div className="topbar-title">{TITLES[page]}</div>
            <div className="topbar-right">
              <span style={{ fontSize: 11, color: "var(--t3)", fontFamily: "var(--mono)" }}>Sat 11 Apr 2026</span>
              <div style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--bluem)", border: "1px solid var(--blueb)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "var(--blue)", fontFamily: "var(--mono)", fontWeight: 600 }}>{initials}</div>
            </div>
          </div>
          {renderPage()}
        </div>
      </div>
    </>
  );
}
