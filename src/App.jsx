import { useState, useEffect, useRef, useCallback } from "react";

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
  signOut: () => { localStorage.removeItem("sanctum_token"); localStorage.removeItem("sanctum_user"); },
  getSession: () => {
    const token = localStorage.getItem("sanctum_token");
    const user  = localStorage.getItem("sanctum_user");
    if (token && user) return { token, user: JSON.parse(user) };
    return null;
  },
  saveSession: (data) => {
    localStorage.setItem("sanctum_token", data.access_token);
    localStorage.setItem("sanctum_user", JSON.stringify(data.user));
  }
};

const sb = {
  from: (table) => ({
    select: async (cols = "*", filters = "") => {
      const session = auth.getSession();
      const headers = { apikey: SUPABASE_KEY, "Content-Type": "application/json" };
      if (session) headers.Authorization = `Bearer ${session.token}`;
      const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=${cols}${filters}`, { headers });
      return res.json();
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
      const params = Object.entries(match).map(([k,v]) => `${k}=eq.${v}`).join("&");
      const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${params}`, { method: "PATCH", headers, body: JSON.stringify(data) });
      return res.json();
    },
    delete: async (match) => {
      const session = auth.getSession();
      const headers = { apikey: SUPABASE_KEY, "Content-Type": "application/json" };
      if (session) headers.Authorization = `Bearer ${session.token}`;
      const params = Object.entries(match).map(([k,v]) => `${k}=eq.${v}`).join("&");
      const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${params}`, { method: "DELETE", headers });
      return res.ok;
    }
  })
};

// ─── CSS ─────────────────────────────────────────────────────────────────────
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg:    #0a0e14;
    --bg1:   #111827;
    --bg2:   #1a2235;
    --bg3:   #1e2a40;
    --b1:    #1e2a40;
    --b2:    #2a3a52;
    --b3:    #3a4f6e;
    --t1:    #f0f4f8;
    --t2:    #94a3b8;
    --t3:    #4a5568;
    --blue:  #3b82f6;
    --blue2: #2563eb;
    --bluem: rgba(59,130,246,0.12);
    --blueb: rgba(59,130,246,0.3);
    --grn:   #10b981;
    --grnm:  rgba(16,185,129,0.12);
    --red:   #ef4444;
    --amber: #f59e0b;
    --purple:#8b5cf6;
    --pink:  #ec4899;
    --mono:  'JetBrains Mono', monospace;
    --sans:  'Inter', sans-serif;
    --r:     12px;
    --r2:    16px;
    --shadow: 0 4px 24px rgba(0,0,0,0.4);
    --shadow2: 0 8px 40px rgba(0,0,0,0.5);
  }

  html, body, #root {
    height: 100%; background: var(--bg);
    color: var(--t1); font-family: var(--sans);
    font-size: 14px; -webkit-font-smoothing: antialiased;
  }

  .shell { display: flex; height: 100vh; overflow: hidden; }

  /* ── Sidebar ── */
  .sidebar {
    width: 240px; min-width: 240px;
    background: var(--bg1);
    border-right: 1px solid var(--b1);
    display: flex; flex-direction: column;
    overflow-y: auto;
    box-shadow: 4px 0 24px rgba(0,0,0,0.3);
  }
  .sidebar-logo {
    display: flex; align-items: center; gap: 12px;
    padding: 24px 20px 20px;
    border-bottom: 1px solid var(--b1);
  }
  .logo-mark {
    width: 36px; height: 36px; border-radius: 10px;
    background: #2563eb;
    display: flex; align-items: center; justify-content: center;
    font-family: var(--mono); font-size: 14px; font-weight: 700;
    color: #fff; flex-shrink: 0;
    box-shadow: 0 4px 12px rgba(59,130,246,0.4);
  }
  .logo-name { font-size: 16px; font-weight: 700; color: var(--t1); letter-spacing: -.3px; }
  .logo-sub  { font-size: 11px; color: var(--t3); font-family: var(--mono); margin-top: 1px; }

  .nav-section { padding: 16px 12px 4px; }
  .nav-label {
    font-size: 9px; letter-spacing: 2px; text-transform: uppercase;
    color: var(--t3); padding: 0 8px; margin-bottom: 6px; font-weight: 600;
  }
  .nav-item {
    display: flex; align-items: center; gap: 10px;
    padding: 9px 12px; border-radius: 10px; cursor: pointer;
    color: var(--t2); font-size: 13px; font-weight: 500;
    transition: all .15s; border: 1px solid transparent;
    user-select: none; margin-bottom: 2px;
  }
  .nav-item:hover { background: var(--bg2); color: var(--t1); }
  .nav-item.active {
    background: var(--bluem); color: var(--blue);
    border-color: var(--blueb); font-weight: 600;
  }
  .nav-icon { width: 18px; height: 18px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
  .nav-badge {
    margin-left: auto; font-size: 10px; font-family: var(--mono);
    background: var(--bg3); color: var(--t3);
    padding: 1px 6px; border-radius: 10px;
  }
  .nav-item.active .nav-badge { background: var(--blueb); color: var(--blue); }
  .sidebar-footer { margin-top: auto; padding: 12px; border-top: 1px solid var(--b1); }

  /* ── Main ── */
  .main { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
  .topbar {
    height: 56px; background: var(--bg1);
    border-bottom: 1px solid var(--b1);
    display: flex; align-items: center; justify-content: space-between;
    padding: 0 28px; flex-shrink: 0;
    box-shadow: 0 2px 12px rgba(0,0,0,0.2);
  }
  .topbar-left { display: flex; align-items: center; gap: 12px; }
  .topbar-title { font-size: 16px; font-weight: 700; color: var(--t1); letter-spacing: -.3px; }
  .topbar-sub   { font-size: 12px; color: var(--t3); font-family: var(--mono); }
  .topbar-right { display: flex; align-items: center; gap: 10px; }
  .page-body { flex: 1; overflow-y: auto; padding: 28px; }

  /* ── Cards ── */
  .card {
    background: var(--bg1); border: 1px solid var(--b1);
    border-radius: var(--r2); padding: 22px;
    box-shadow: var(--shadow);
    transition: border-color .2s;
  }
  .card:hover { border-color: var(--b2); }
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
    background: var(--bg2); border: 1px solid var(--b1);
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
    background: var(--bg2); border: 1px solid var(--b1);
    border-radius: var(--r2); padding: 20px; cursor: pointer;
    transition: all .2s; position: relative; overflow: hidden;
  }
  .dash-widget:hover { border-color: var(--b3); transform: translateY(-2px); box-shadow: var(--shadow); }
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
  .notes-shell { display: flex; height: calc(100vh - 56px); overflow: hidden; }
  .notes-sidebar {
    width: 220px; min-width: 220px; border-right: 1px solid var(--b1);
    background: var(--bg1); overflow-y: auto; display: flex; flex-direction: column;
  }
  .notes-sidebar-header {
    padding: 16px 16px 12px; border-bottom: 1px solid var(--b1);
    display: flex; align-items: center; justify-content: space-between;
    flex-shrink: 0;
  }
  .notebook-item {
    display: flex; align-items: center; gap: 10px;
    padding: 8px 14px; cursor: pointer; color: var(--t2);
    font-size: 13px; font-weight: 500; transition: all .15s;
    border-left: 2px solid transparent;
  }
  .notebook-item:hover { background: var(--bg2); color: var(--t1); }
  .notebook-item.active { background: var(--bluem); color: var(--blue); border-left-color: var(--blue); }
  .notebook-icon { width: 28px; height: 28px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 14px; flex-shrink: 0; }
  .section-item {
    display: flex; align-items: center; gap: 8px;
    padding: 6px 14px 6px 28px; cursor: pointer; color: var(--t3);
    font-size: 12px; font-weight: 500; transition: all .15s;
    border-left: 2px solid transparent;
  }
  .section-item:hover { background: var(--bg2); color: var(--t2); }
  .section-item.active { color: var(--blue); border-left-color: var(--blue); background: var(--bluem); }
  .section-dot { width: 5px; height: 5px; border-radius: 50%; background: var(--b3); flex-shrink: 0; }
  .section-item.active .section-dot { background: var(--blue); }

  .notes-list {
    width: 260px; min-width: 260px; border-right: 1px solid var(--b1);
    background: var(--bg); overflow-y: auto; display: flex; flex-direction: column;
  }
  .notes-list-header {
    padding: 12px 14px; border-bottom: 1px solid var(--b1);
    display: flex; align-items: center; justify-content: space-between;
    flex-shrink: 0; background: var(--bg1);
  }
  .note-list-item {
    padding: 14px 16px; cursor: pointer;
    border-bottom: 1px solid var(--b1); transition: background .15s;
    border-left: 2px solid transparent;
  }
  .note-list-item:hover { background: var(--bg2); }
  .note-list-item.active { background: var(--bluem); border-left-color: var(--blue); }
  .nli-title   { font-size: 13px; font-weight: 600; color: var(--t1); margin-bottom: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .nli-preview { font-size: 11px; color: var(--t3); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 1.4; }
  .nli-date    { font-size: 10px; color: var(--t3); font-family: var(--mono); margin-top: 6px; }
  .nli-tags    { display: flex; gap: 4px; margin-top: 5px; flex-wrap: wrap; }
  .nli-tag     { font-size: 9px; padding: 1px 5px; border-radius: 4px; background: var(--bg3); color: var(--t3); font-weight: 500; }

  .note-editor { flex: 1; display: flex; flex-direction: column; overflow: hidden; background: var(--bg); }
  .note-toolbar {
    padding: 12px 24px; border-bottom: 1px solid var(--b1);
    display: flex; align-items: center; gap: 8px;
    background: var(--bg1); flex-shrink: 0;
  }
  .note-toolbar-sep { width: 1px; height: 20px; background: var(--b2); margin: 0 4px; }
  .note-title-input {
    width: 100%; padding: 20px 28px 12px;
    background: transparent; border: none; color: var(--t1);
    font-size: 24px; font-weight: 700; font-family: var(--sans);
    outline: none; border-bottom: 1px solid var(--b1); letter-spacing: -.3px;
  }
  .note-title-input::placeholder { color: var(--t3); }
  .note-meta { padding: 8px 28px; display: flex; align-items: center; gap: 12px; border-bottom: 1px solid var(--b1); }
  .note-meta-item { font-size: 11px; color: var(--t3); font-family: var(--mono); display: flex; align-items: center; gap: 4px; }
  .note-body-input {
    flex: 1; padding: 20px 28px;
    background: transparent; border: none; color: var(--t2);
    font-size: 14px; line-height: 1.8; font-family: var(--sans);
    outline: none; resize: none;
  }
  .note-body-input::placeholder { color: var(--t3); }
  .note-empty {
    flex: 1; display: flex; align-items: center; justify-content: center;
    flex-direction: column; gap: 12px; color: var(--t3);
  }
  .note-empty-icon { font-size: 48px; opacity: .15; }
  .enc-badge {
    display: inline-flex; align-items: center; gap: 4px;
    padding: 3px 10px; border-radius: 20px;
    background: rgba(16,185,129,.10); color: var(--grn);
    font-size: 10px; font-weight: 600;
  }

  /* ── Calendar ── */
  .cal-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; }
  .cal-month-nav { display: flex; align-items: center; gap: 16px; }
  .cal-month-title { font-size: 20px; font-weight: 700; color: var(--t1); letter-spacing: -.5px; min-width: 200px; text-align: center; }
  .cal-legend { display: flex; gap: 16px; }
  .cal-legend-item { display: flex; align-items: center; gap: 6px; font-size: 11px; color: var(--t3); font-weight: 500; }
  .cal-legend-dot { width: 8px; height: 8px; border-radius: 50%; }
  .cal-grid-header { display: grid; grid-template-columns: repeat(7,1fr); gap: 6px; margin-bottom: 6px; }
  .cal-day-header { text-align: center; font-size: 10px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; color: var(--t3); padding: 8px 0; }
  .cal-grid { display: grid; grid-template-columns: repeat(7,1fr); gap: 6px; }
  .cal-cell {
    min-height: 90px; background: var(--bg2); border: 1px solid var(--b1);
    border-radius: 12px; padding: 8px; cursor: pointer; transition: all .2s;
    display: flex; flex-direction: column;
  }
  .cal-cell:hover { border-color: var(--b3); background: var(--bg3); }
  .cal-cell.today { border-color: var(--blue); background: rgba(59,130,246,0.08); }
  .cal-cell.other-month { opacity: .3; cursor: default; }
  .cal-day-num {
    font-size: 13px; font-family: var(--mono); font-weight: 600;
    color: var(--t2); margin-bottom: 6px; width: 24px; height: 24px;
    display: flex; align-items: center; justify-content: center;
    border-radius: 6px;
  }
  .cal-cell.today .cal-day-num {
    background: var(--blue); color: #fff; font-weight: 700;
  }
  .cal-events { display: flex; flex-direction: column; gap: 3px; flex: 1; overflow: hidden; }
  .cal-event {
    font-size: 10px; font-weight: 600; padding: 3px 7px;
    border-radius: 6px; white-space: nowrap; overflow: hidden;
    text-overflow: ellipsis; line-height: 1.3;
  }
  .cal-event-more { font-size: 9px; color: var(--t3); padding: 2px 4px; font-weight: 500; }

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

  /* ── Scrollbar ── */
  ::-webkit-scrollbar { width: 5px; height: 5px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: var(--b2); border-radius: 3px; }
  ::-webkit-scrollbar-thumb:hover { background: var(--b3); }

  /* ── Animations ── */
  @keyframes fadeInUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
  .animate-in { animation: fadeInUp .3s ease both; }
`;

// ─── ICONS ───────────────────────────────────────────────────────────────────
const Icon = ({ name, size = 16, color = "currentColor" }) => {
  const s = { width: size, height: size, stroke: color, fill: "none", strokeWidth: 1.6, strokeLinecap: "round", strokeLinejoin: "round", flexShrink: 0 };
  const p = {
    home:     <><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></>,
    notes:    <><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></>,
    calendar: <><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></>,
    career:   <><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/></>,
    finance:  <><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></>,
    study:    <><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/></>,
    travel:   <><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></>,
    pet:      <><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></>,
    plus:     <><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>,
    trash:    <><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></>,
    lock:     <><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></>,
    check:    <><polyline points="20 6 9 17 4 12"/></>,
    x:        <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>,
    chevL:    <><polyline points="15 18 9 12 15 6"/></>,
    chevR:    <><polyline points="9 18 15 12 9 6"/></>,
    logout:   <><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></>,
    edit:     <><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></>,
    tag:      <><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></>,
    search:   <><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></>,
    star:     <><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></>,
  };
  return <svg viewBox="0 0 24 24" style={s}>{p[name]}</svg>;
};

// ─── NOTEBOOKS CONFIG ────────────────────────────────────────────────────────
const NOTEBOOKS = [
  {
    id: "finance", label: "Finance", emoji: "💰", color: "#10b981", bg: "rgba(16,185,129,0.15)",
    sections: [
      { id: "mortgage", label: "Mortgage & House" },
      { id: "expenses", label: "Monthly Expenses" },
      { id: "goals",    label: "Financial Goals" },
      { id: "investments", label: "Investments" },
    ]
  },
  {
    id: "travel", label: "Travel", emoji: "✈️", color: "#3b82f6", bg: "rgba(59,130,246,0.15)",
    sections: [
      { id: "scotland", label: "Scotland Sep 2026" },
      { id: "italy",    label: "Italy Jun 2026" },
      { id: "wishlist", label: "Wish List" },
      { id: "packing",  label: "Packing Lists" },
    ]
  },
  {
    id: "career", label: "Career", emoji: "💼", color: "#f59e0b", bg: "rgba(245,158,11,0.15)",
    sections: [
      { id: "applications", label: "Applications" },
      { id: "pmp",          label: "PMP Study" },
      { id: "networking",   label: "Networking" },
      { id: "interview",    label: "Interview Prep" },
    ]
  },
  {
    id: "personal", label: "Personal", emoji: "🌿", color: "#ec4899", bg: "rgba(236,72,153,0.15)",
    sections: [
      { id: "health",  label: "Health & Fitness" },
      { id: "reading", label: "Reading List" },
      { id: "home",    label: "Home & House" },
      { id: "ozzy",    label: "Ozzy 🐾" },
    ]
  },
  {
    id: "ideas", label: "Ideas", emoji: "💡", color: "#8b5cf6", bg: "rgba(139,92,246,0.15)",
    sections: [
      { id: "sanctum", label: "Sanctum App" },
      { id: "projects", label: "Projects" },
      { id: "random",  label: "Random" },
    ]
  },
];

const STATUS_COLORS = { submitted: "blue", interview: "amber", offer: "green", rejected: "red", withdrawn: "muted" };
const CAT_ICONS = {
  expense: { emoji: "💳", color: "#ef4444", bg: "rgba(239,68,68,0.15)" },
  income:  { emoji: "💰", color: "#10b981", bg: "rgba(16,185,129,0.15)" },
  mortgage:{ emoji: "🏠", color: "#3b82f6", bg: "rgba(59,130,246,0.15)" },
  insurance:{ emoji: "🛡️", color: "#f59e0b", bg: "rgba(245,158,11,0.15)" },
  subscription:{ emoji: "📱", color: "#8b5cf6", bg: "rgba(139,92,246,0.15)" },
  savings: { emoji: "🏦", color: "#10b981", bg: "rgba(16,185,129,0.15)" },
};
const EVENT_COLORS = {
  personal: { color: "#3b82f6", bg: "rgba(59,130,246,0.2)" },
  career:   { color: "#f59e0b", bg: "rgba(245,158,11,0.2)" },
  travel:   { color: "#10b981", bg: "rgba(16,185,129,0.2)" },
  study:    { color: "#8b5cf6", bg: "rgba(139,92,246,0.2)" },
  family:   { color: "#ec4899", bg: "rgba(236,72,153,0.2)" },
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
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [mode, setMode]         = useState("login");

  const handle = async () => {
    if (!email || !password) return setError("Please enter your email and password.");
    setLoading(true); setError("");
    try {
      const data = mode === "login" ? await auth.signIn(email, password) : await auth.signUp(email, password);
      if (data.access_token) { auth.saveSession(data); onLogin(data.user); }
      else if (data.id && mode === "signup") { setError("Account created. Check your email to confirm, then sign in."); setMode("login"); }
      else setError(data.error_description || data.message || "Something went wrong.");
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
          {mode === "login" ? "No account? " : "Already have one? "}
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
  const [tasks, setTasks]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText]   = useState("");
  const [newTask, setNewTask]     = useState({ text: "", tag: "" });
  const [events, setEvents]       = useState([]);
  const [showArchived, setShowArchived] = useState(false);

  const today = new Date();
  const DAYS  = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
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
      if (Array.isArray(data)) setTasks(data);
      else throw new Error();
    } catch {
      setTasks([
        { id: "t1", text: "Submit PMP application", tag: "PMP",    done: false },
        { id: "t2", text: "Follow up — Google app",  tag: "Career", done: false },
        { id: "t3", text: "Book Scotland Airbnb",    tag: "Travel", done: false },
        { id: "t4", text: "Ozzy vet checkup",         tag: "Ozzy",   done: true  },
      ]);
    }
    setLoading(false);
  };

  const loadEvents = async () => {
    try {
      const data = await sb.from("events").select("*");
      if (Array.isArray(data)) setEvents(data);
    } catch {}
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
    const ds = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
    return events.filter(e => e.date === ds);
  };

  const done = tasks.filter(t => t.done).length;
  const activeTasks   = tasks.filter(t => !t.done);
  const archivedTasks = tasks.filter(t => t.done);

  return (
    <div className="page-body animate-in">
      {showAdd && (
        <Modal title="Add task" onClose={() => setShowAdd(false)}>
          <div className="form-row"><label className="form-label">Task</label>
            <input className="inp" value={newTask.text} onChange={e => setNewTask(n => ({...n, text: e.target.value}))}
              placeholder="What needs doing?" onKeyDown={e => e.key === "Enter" && addTask()} autoFocus /></div>
          <div className="form-row"><label className="form-label">Tag</label>
            <input className="inp" value={newTask.tag} onChange={e => setNewTask(n => ({...n, tag: e.target.value}))}
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
                  {dayEvents.slice(0,3).map((ev, j) => (
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
          <div className="dw-arrow">→</div>
          <div className="dw-icon" style={{ background: "rgba(245,158,11,0.15)" }}>💼</div>
          <div className="dw-label">Applications</div>
          <div className="dw-value">3</div>
          <div className="dw-sub">Anthropic, Google ×2</div>
        </div>
        <div className="dash-widget" onClick={() => onNavigate("study")}>
          <div className="dw-arrow">→</div>
          <div className="dw-icon" style={{ background: "rgba(139,92,246,0.15)" }}>📚</div>
          <div className="dw-label">PMP Exam</div>
          <div className="dw-value">Aug</div>
          <div className="dw-sub">2026 target</div>
        </div>
        <div className="dash-widget" onClick={() => onNavigate("finance")}>
          <div className="dw-arrow">→</div>
          <div className="dw-icon" style={{ background: "rgba(16,185,129,0.15)" }}>💶</div>
          <div className="dw-label">Monthly spend</div>
          <div className="dw-value">€685</div>
          <div className="dw-sub">Apr 2026</div>
        </div>
        <div className="dash-widget" onClick={() => onNavigate("travel")}>
          <div className="dw-arrow">→</div>
          <div className="dw-icon" style={{ background: "rgba(59,130,246,0.15)" }}>✈️</div>
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
          <div className="stat-sub">Target: Aug 2026 exam</div>
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

// ─── NOTES ───────────────────────────────────────────────────────────────────
function Notes() {
  const [activeNB, setActiveNB]     = useState("finance");
  const [activeSection, setSection] = useState("mortgage");
  const [notes, setNotes]           = useState([]);
  const [activeNote, setActiveNote] = useState(null);
  const [editTitle, setEditTitle]   = useState("");
  const [editBody, setEditBody]     = useState("");
  const [editTags, setEditTags]     = useState("");
  const [loading, setLoading]       = useState(false);
  const [search, setSearch]         = useState("");
  const saveTimer = useRef(null);

  const notebook = NOTEBOOKS.find(n => n.id === activeNB);
  const section  = notebook?.sections.find(s => s.id === activeSection);

  useEffect(() => { loadNotes(); }, [activeSection]);

  const loadNotes = async () => {
    setLoading(true);
    try {
      const data = await sb.from("notes").select("*");
      if (Array.isArray(data)) {
        const filtered = data.filter(n => n.section === activeSection);
        setNotes(filtered);
        if (filtered[0]) { setActiveNote(filtered[0].id); setEditTitle(filtered[0].title || ""); setEditBody(filtered[0].body || ""); setEditTags(filtered[0].tags || ""); }
        else { setActiveNote(null); setEditTitle(""); setEditBody(""); setEditTags(""); }
      }
    } catch { setNotes([]); }
    setLoading(false);
  };

  const selectNote = (n) => {
    setActiveNote(n.id); setEditTitle(n.title || ""); setEditBody(n.body || ""); setEditTags(n.tags || "");
  };

  const autoSave = useCallback((id, title, body, tags) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      const updated = new Date().toISOString().slice(0,10);
      setNotes(prev => prev.map(n => n.id === id ? { ...n, title, body, tags, updated_at: updated } : n));
      try { await sb.from("notes").update({ title, body, tags, updated_at: updated }, { id }); } catch {}
    }, 800);
  }, []);

  const onTitleChange = (v) => { setEditTitle(v); if (activeNote) autoSave(activeNote, v, editBody, editTags); };
  const onBodyChange  = (v) => { setEditBody(v);  if (activeNote) autoSave(activeNote, editTitle, v, editTags); };
  const onTagsChange  = (v) => { setEditTags(v);  if (activeNote) autoSave(activeNote, editTitle, editBody, v); };

  const newNote = async () => {
    const note = { notebook: activeNB, section: activeSection, title: "Untitled", body: "", tags: "", updated_at: new Date().toISOString().slice(0,10) };
    try {
      const res = await sb.from("notes").insert(note);
      const created = Array.isArray(res) && res[0] ? res[0] : { ...note, id: Date.now().toString() };
      setNotes(prev => [created, ...prev]);
      setActiveNote(created.id); setEditTitle("Untitled"); setEditBody(""); setEditTags("");
    } catch { const n = { ...note, id: Date.now().toString() }; setNotes(prev => [n, ...prev]); setActiveNote(n.id); }
  };

  const deleteNote = async () => {
    if (!activeNote) return;
    const remaining = notes.filter(n => n.id !== activeNote);
    setNotes(remaining);
    if (remaining[0]) { setActiveNote(remaining[0].id); setEditTitle(remaining[0].title || ""); setEditBody(remaining[0].body || ""); setEditTags(remaining[0].tags || ""); }
    else { setActiveNote(null); setEditTitle(""); setEditBody(""); setEditTags(""); }
    try { await sb.from("notes").delete({ id: activeNote }); } catch {}
  };

  const selectSection = (sid, nbid) => {
    if (nbid !== activeNB) setActiveNB(nbid);
    setSection(sid); setActiveNote(null); setEditTitle(""); setEditBody(""); setEditTags("");
  };

  const currentNote = notes.find(n => n.id === activeNote);
  const filteredNotes = notes.filter(n =>
    !search || n.title?.toLowerCase().includes(search.toLowerCase()) || n.body?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="notes-shell">
      {/* Notebooks sidebar */}
      <div className="notes-sidebar">
        <div className="notes-sidebar-header">
          <span style={{ fontSize: 10, color: "var(--t3)", letterSpacing: 1.5, textTransform: "uppercase", fontWeight: 700 }}>Notebooks</span>
          <span className="enc-badge"><Icon name="lock" size={9} color="var(--grn)" /> enc</span>
        </div>
        {NOTEBOOKS.map(nb => (
          <div key={nb.id}>
            <div className={`notebook-item${activeNB === nb.id ? " active" : ""}`}
              onClick={() => selectSection(nb.sections[0].id, nb.id)}>
              <div className="notebook-icon" style={{ background: nb.bg, fontSize: 15 }}>{nb.emoji}</div>
              <span style={{ flex: 1 }}>{nb.label}</span>
              <span style={{ fontSize: 10, color: "var(--t3)", fontFamily: "var(--mono)" }}>{nb.sections.length}</span>
            </div>
            {activeNB === nb.id && nb.sections.map(sec => (
              <div key={sec.id} className={`section-item${activeSection === sec.id ? " active" : ""}`}
                onClick={() => selectSection(sec.id, nb.id)}>
                <span className="section-dot" />
                {sec.label}
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Notes list */}
      <div className="notes-list">
        <div className="notes-list-header">
          <span style={{ fontSize: 12, fontWeight: 700, color: "var(--t1)" }}>{section?.label}</span>
          <button className="btn sm primary" onClick={newNote}><Icon name="plus" size={12} /></button>
        </div>
        <div style={{ padding: "10px 12px", borderBottom: "1px solid var(--b1)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--bg2)", border: "1px solid var(--b2)", borderRadius: 8, padding: "6px 10px" }}>
            <Icon name="search" size={13} color="var(--t3)" />
            <input style={{ background: "transparent", border: "none", outline: "none", color: "var(--t1)", fontSize: 12, fontFamily: "var(--sans)", width: "100%" }}
              placeholder="Search notes..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
        {loading && <div className="loading">Loading...</div>}
        {!loading && filteredNotes.length === 0 && (
          <div style={{ padding: 24, color: "var(--t3)", fontSize: 12, textAlign: "center" }}>
            {search ? "No results" : "No notes yet"}<br />
            <button className="btn sm primary" style={{ marginTop: 12 }} onClick={newNote}><Icon name="plus" size={12} /> New note</button>
          </div>
        )}
        {filteredNotes.map(n => (
          <div key={n.id} className={`note-list-item${activeNote === n.id ? " active" : ""}`} onClick={() => selectNote(n)}>
            <div className="nli-title">{n.title || "Untitled"}</div>
            <div className="nli-preview">{(n.body || "").replace(/\n/g," ").slice(0,60) || "No content"}</div>
            {n.tags && (
              <div className="nli-tags">
                {n.tags.split(",").filter(Boolean).map(tag => (
                  <span key={tag} className="nli-tag">{tag.trim()}</span>
                ))}
              </div>
            )}
            <div className="nli-date">{n.updated_at}</div>
          </div>
        ))}
      </div>

      {/* Editor */}
      <div className="note-editor">
        {currentNote ? (
          <>
            <div className="note-toolbar">
              <span className="enc-badge"><Icon name="lock" size={10} color="var(--grn)" /> Auto-saving</span>
              <div className="note-toolbar-sep" />
              <button className="btn sm danger" onClick={deleteNote}><Icon name="trash" size={12} /> Delete</button>
            </div>
            <input className="note-title-input" value={editTitle}
              onChange={e => onTitleChange(e.target.value)} placeholder="Note title" />
            <div className="note-meta">
              <span className="note-meta-item">📅 {currentNote.updated_at}</span>
              <span className="note-meta-item">📁 {notebook?.label} / {section?.label}</span>
              <div style={{ flex: 1 }} />
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Icon name="tag" size={12} color="var(--t3)" />
                <input style={{ background: "transparent", border: "none", outline: "none", color: "var(--t3)", fontSize: 11, fontFamily: "var(--mono)", width: 160 }}
                  placeholder="tag1, tag2, tag3"
                  value={editTags} onChange={e => onTagsChange(e.target.value)} />
              </div>
            </div>
            <textarea className="note-body-input" value={editBody}
              onChange={e => onBodyChange(e.target.value)}
              placeholder="Start writing... (supports plain text, lists with - or •, and markdown-style formatting)" />
          </>
        ) : (
          <div className="note-empty">
            <div className="note-empty-icon">📝</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: "var(--t2)" }}>Select a note</div>
            <div style={{ fontSize: 13, color: "var(--t3)" }}>or create a new one in {section?.label}</div>
            <button className="btn primary" onClick={newNote} style={{ marginTop: 8 }}><Icon name="plus" size={14} /> New note</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── CALENDAR ────────────────────────────────────────────────────────────────
function Calendar({ initialDate }) {
  const now = new Date();
  const [year, setYear]   = useState(initialDate ? initialDate.getFullYear() : now.getFullYear());
  const [month, setMonth] = useState(initialDate ? initialDate.getMonth() : now.getMonth());
  const [events, setEvents] = useState([]);
  const [showAdd, setShowAdd]     = useState(false);
  const [selectedDay, setSelectedDay] = useState(initialDate ? initialDate.getDate() : null);
  const [newEvent, setNewEvent]   = useState({ title: "", category: "personal", time: "" });
  const [viewMode, setViewMode]   = useState("month");

  const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const CATS   = [
    { id: "personal", label: "Personal", color: "#3b82f6" },
    { id: "career",   label: "Career",   color: "#f59e0b" },
    { id: "travel",   label: "Travel",   color: "#10b981" },
    { id: "study",    label: "Study",    color: "#8b5cf6" },
    { id: "family",   label: "Family",   color: "#ec4899" },
  ];

  useEffect(() => { loadEvents(); }, []);

  const loadEvents = async () => {
    try {
      const data = await sb.from("events").select("*");
      if (Array.isArray(data) && data.length) setEvents(data);
      else throw new Error();
    } catch {
      setEvents([
        { id: "e1", title: "PMP Application due", date: "2026-04-15", category: "study",   color: "#8b5cf6" },
        { id: "e2", title: "Italy trip begins",    date: "2026-06-12", category: "travel",  color: "#10b981" },
        { id: "e3", title: "Scotland trip",        date: "2026-09-07", category: "travel",  color: "#10b981" },
        { id: "e4", title: "MSc starts — SETU",    date: "2026-09-14", category: "study",   color: "#8b5cf6" },
        { id: "e5", title: "Metallica Dublin",     date: "2026-06-20", category: "personal",color: "#3b82f6" },
      ]);
    }
  };

  const addEvent = async () => {
    if (!newEvent.title.trim() || !selectedDay) return;
    const dateStr = `${year}-${String(month+1).padStart(2,"0")}-${String(selectedDay).padStart(2,"0")}`;
    const cat = CATS.find(c => c.id === newEvent.category);
    const ev = { title: newEvent.title, date: dateStr, category: newEvent.category, color: cat?.color || "#3b82f6", time: newEvent.time };
    try {
      const res = await sb.from("events").insert(ev);
      const created = Array.isArray(res) && res[0] ? res[0] : { ...ev, id: Date.now().toString() };
      setEvents(prev => [...prev, created]);
    } catch { setEvents(prev => [...prev, { ...ev, id: Date.now().toString() }]); }
    setNewEvent({ title: "", category: "personal", time: "" }); setShowAdd(false);
  };

  const deleteEvent = async (id) => {
    setEvents(prev => prev.filter(e => e.id !== id));
    try { await sb.from("events").delete({ id }); } catch {}
  };

  // Build grid
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrev  = new Date(year, month, 0).getDate();
  const startOffset = firstDay === 0 ? 6 : firstDay - 1;
  const cells = [];
  for (let i = startOffset - 1; i >= 0; i--) cells.push({ day: daysInPrev - i, current: false });
  for (let i = 1; i <= daysInMonth; i++) cells.push({ day: i, current: true });
  while (cells.length % 7 !== 0) cells.push({ day: cells.length - daysInMonth - startOffset + 1, current: false });

  const eventsOnDay = (day) => {
    if (!day.current) return [];
    const ds = `${year}-${String(month+1).padStart(2,"0")}-${String(day.day).padStart(2,"0")}`;
    return events.filter(e => e.date === ds);
  };
  const isToday = (day) => {
    const t = new Date();
    return day.current && year === t.getFullYear() && month === t.getMonth() && day.day === t.getDate();
  };

  const prev = () => { if (month === 0) { setMonth(11); setYear(y => y-1); } else setMonth(m => m-1); };
  const next = () => { if (month === 11) { setMonth(0); setYear(y => y+1); } else setMonth(m => m+1); };

  const monthEvents = events.filter(e => {
    const [ey, em] = e.date.split("-").map(Number);
    return ey === year && em === month + 1;
  }).sort((a,b) => a.date.localeCompare(b.date));

  return (
    <div className="page-body animate-in">
      {showAdd && (
        <Modal title={`Add event — ${selectedDay} ${MONTHS[month]}`} onClose={() => setShowAdd(false)}>
          <div className="form-row"><label className="form-label">Title</label>
            <input className="inp" value={newEvent.title} onChange={e => setNewEvent(n => ({...n, title: e.target.value}))}
              placeholder="Event title" autoFocus onKeyDown={e => e.key === "Enter" && addEvent()} /></div>
          <div className="form-row"><label className="form-label">Category</label>
            <select className="inp" value={newEvent.category} onChange={e => setNewEvent(n => ({...n, category: e.target.value}))}>
              {CATS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select></div>
          <div className="form-row"><label className="form-label">Time (optional)</label>
            <input className="inp" type="time" value={newEvent.time} onChange={e => setNewEvent(n => ({...n, time: e.target.value}))} /></div>
          <div className="modal-actions">
            <button className="btn" onClick={() => setShowAdd(false)}>Cancel</button>
            <button className="btn primary" onClick={addEvent}>Add event</button>
          </div>
        </Modal>
      )}

      <div className="card mb18">
        <div className="cal-header">
          <div className="cal-month-nav">
            <button className="btn sm" onClick={prev}><Icon name="chevL" size={14} /></button>
            <div className="cal-month-title">{MONTHS[month]} {year}</div>
            <button className="btn sm" onClick={next}><Icon name="chevR" size={14} /></button>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button className="btn sm" onClick={() => { setYear(now.getFullYear()); setMonth(now.getMonth()); }}>Today</button>
            <div className="cal-legend">
              {CATS.map(c => (
                <div key={c.id} className="cal-legend-item">
                  <div className="cal-legend-dot" style={{ background: c.color }} />{c.label}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="cal-grid-header">
          {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map(d => <div key={d} className="cal-day-header">{d}</div>)}
        </div>
        <div className="cal-grid">
          {cells.map((cell, i) => {
            const dayEvents = eventsOnDay(cell);
            return (
              <div key={i} className={`cal-cell${!cell.current ? " other-month" : ""}${isToday(cell) ? " today" : ""}`}
                onClick={() => { if (cell.current) { setSelectedDay(cell.day); setShowAdd(true); } }}>
                <div className="cal-day-num">{cell.day}</div>
                <div className="cal-events">
                  {dayEvents.slice(0,3).map(ev => (
                    <div key={ev.id} className="cal-event"
                      style={{ background: EVENT_COLORS[ev.category]?.bg || "rgba(59,130,246,0.2)", color: EVENT_COLORS[ev.category]?.color || "#3b82f6" }}
                      onClick={e => { e.stopPropagation(); if (window.confirm(`Delete "${ev.title}"?`)) deleteEvent(ev.id); }}>
                      {ev.time ? `${ev.time} ` : ""}{ev.title}
                    </div>
                  ))}
                  {dayEvents.length > 3 && <div className="cal-event-more">+{dayEvents.length - 3} more</div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Month events list */}
      {monthEvents.length > 0 && (
        <div className="card">
          <div className="card-header"><div className="card-title">Events this month</div><span className="badge blue">{monthEvents.length}</span></div>
          {monthEvents.map(ev => (
            <div key={ev.id} className="fin-row">
              <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1 }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: ev.color, flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--t1)" }}>{ev.title}</div>
                  <div style={{ fontSize: 11, color: "var(--t3)", fontFamily: "var(--mono)" }}>{ev.date}{ev.time ? ` · ${ev.time}` : ""}</div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span className={`badge ${ev.category === "travel" ? "green" : ev.category === "career" ? "amber" : ev.category === "study" ? "purple" : "blue"}`}>{ev.category}</span>
                <button className="btn xs danger" onClick={() => deleteEvent(ev.id)}><Icon name="trash" size={11} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── CAREER ──────────────────────────────────────────────────────────────────
function Career() {
  const [apps, setApps]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [newApp, setNewApp]   = useState({ company: "", role: "", status: "submitted", applied_date: "", notes: "" });
  const STATUSES = ["submitted","interview","offer","rejected","withdrawn"];

  useEffect(() => { loadApps(); }, []);

  const loadApps = async () => {
    setLoading(true);
    try {
      const data = await sb.from("applications").select("*");
      if (Array.isArray(data) && data.length) setApps(data);
      else throw new Error();
    } catch {
      setApps([
        { id: "a1", company: "Anthropic", role: "Copyright Ops PM",          status: "submitted", applied_date: "2026-03-10", notes: "Cover letter tailored — LEON migration" },
        { id: "a2", company: "Google",    role: "Sr Analyst Trust & Safety",  status: "submitted", applied_date: "2026-03-15", notes: "EU HQ Dublin" },
        { id: "a3", company: "Google",    role: "TPM Analytics EU",           status: "submitted", applied_date: "2026-03-18", notes: "TPM track" },
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
    try { await sb.from("applications").update({ status }, { id }); } catch {}
  };

  const deleteApp = async (id) => {
    setApps(prev => prev.filter(a => a.id !== id));
    try { await sb.from("applications").delete({ id }); } catch {}
  };

  const activeApps   = apps.filter(a => !["rejected","withdrawn"].includes(a.status));
  const archivedApps = apps.filter(a => ["rejected","withdrawn"].includes(a.status));
  const active    = activeApps.length;
  const interviews = apps.filter(a => a.status === "interview").length;

  return (
    <div className="page-body animate-in">
      {showAdd && (
        <Modal title="Add application" onClose={() => setShowAdd(false)} wide>
          <div className="grid-2" style={{ gap: 12 }}>
            <div className="form-row"><label className="form-label">Company</label><input className="inp" value={newApp.company} onChange={e => setNewApp(n => ({...n, company: e.target.value}))} autoFocus /></div>
            <div className="form-row"><label className="form-label">Role</label><input className="inp" value={newApp.role} onChange={e => setNewApp(n => ({...n, role: e.target.value}))} /></div>
          </div>
          <div className="form-row"><label className="form-label">Applied date</label><input className="inp" type="date" value={newApp.applied_date} onChange={e => setNewApp(n => ({...n, applied_date: e.target.value}))} /></div>
          <div className="form-row"><label className="form-label">Notes</label><textarea className="inp" value={newApp.notes} onChange={e => setNewApp(n => ({...n, notes: e.target.value}))} placeholder="Key notes, contacts, tailoring..." /></div>
          <div className="modal-actions"><button className="btn" onClick={() => setShowAdd(false)}>Cancel</button><button className="btn primary" onClick={addApp}>Add application</button></div>
        </Modal>
      )}

      <div className="grid-3 mb18">
        <div className="stat"><div className="stat-icon" style={{ background: "rgba(59,130,246,0.15)" }}>📨</div><div className="stat-label">Active</div><div className="stat-value">{active}</div><div className="stat-sub">In progress</div><div className="stat-bar"><div className="stat-fill" style={{ width: `${(active/Math.max(apps.length,1))*100}%` }} /></div></div>
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
  const CATS = ["expense","income","mortgage","insurance","subscription","savings"];

  useEffect(() => { loadFinance(); }, []);

  const loadFinance = async () => {
    setLoading(true);
    try {
      const data = await sb.from("finance").select("*");
      if (Array.isArray(data) && data.length) setEntries(data);
      else throw new Error();
    } catch {
      setEntries([
        { id: "f1", label: "BOI Mortgage",     amount: 1450, category: "mortgage",     month: "April 2026" },
        { id: "f2", label: "Groceries",         amount: 320,  category: "expense",      month: "April 2026" },
        { id: "f3", label: "Utilities",         amount: 180,  category: "expense",      month: "April 2026" },
        { id: "f4", label: "Ozzy expenses",     amount: 120,  category: "expense",      month: "April 2026" },
        { id: "f5", label: "Subscriptions",     amount: 65,   category: "subscription", month: "April 2026" },
        { id: "f6", label: "AXA Car Insurance", amount: 121,  category: "insurance",    month: "April 2026" },
        { id: "f7", label: "Salary",            amount: 5800, category: "income",       month: "April 2026" },
        { id: "f8", label: "Savings",           amount: 500,  category: "savings",      month: "April 2026" },
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

  const deleteEntry = async (id) => {
    setEntries(prev => prev.filter(e => e.id !== id));
    try { await sb.from("finance").delete({ id }); } catch {}
  };

  const income   = entries.filter(e => e.category === "income").reduce((s, e) => s + Number(e.amount), 0);
  const expenses = entries.filter(e => e.category !== "income").reduce((s, e) => s + Number(e.amount), 0);
  const balance  = income - expenses;

  // Group by category
  const grouped = CATS.filter(c => c !== "income").map(cat => ({
    cat, total: entries.filter(e => e.category === cat).reduce((s, e) => s + Number(e.amount), 0)
  })).filter(g => g.total > 0);

  return (
    <div className="page-body animate-in">
      {showAdd && (
        <Modal title="Add entry" onClose={() => setShowAdd(false)}>
          <div className="form-row"><label className="form-label">Label</label><input className="inp" value={newEntry.label} onChange={e => setNewEntry(n => ({...n, label: e.target.value}))} autoFocus /></div>
          <div className="form-row"><label className="form-label">Amount (€)</label><input className="inp" type="number" value={newEntry.amount} onChange={e => setNewEntry(n => ({...n, amount: e.target.value}))} /></div>
          <div className="form-row"><label className="form-label">Category</label>
            <select className="inp" value={newEntry.category} onChange={e => setNewEntry(n => ({...n, category: e.target.value}))}>
              {CATS.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
            </select></div>
          <div className="form-row"><label className="form-label">Month</label><input className="inp" value={newEntry.month} onChange={e => setNewEntry(n => ({...n, month: e.target.value}))} /></div>
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
          <div className="stat-bar"><div className={`stat-fill ${balance >= 0 ? "grn" : "red"}`} style={{ width: `${Math.min(Math.abs(balance/income)*100,100)}%` }} /></div>
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

function PlaceholderPage({ label, emoji }) {
  return (
    <div className="page-body" style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", flexDirection: "column", gap: 16 }}>
      <div style={{ fontSize: 56, opacity: .2 }}>{emoji || "🚧"}</div>
      <div style={{ fontSize: 18, fontWeight: 700, color: "var(--t1)" }}>{label}</div>
      <div style={{ fontSize: 13, color: "var(--t3)" }}>Coming in the next build</div>
    </div>
  );
}

// ─── NAV ─────────────────────────────────────────────────────────────────────
const NAV = [
  { id: "dashboard", label: "Dashboard", icon: "home",     group: "main", emoji: "🏠" },
  { id: "notes",     label: "Notes",     icon: "notes",    group: "main", emoji: "📝" },
  { id: "calendar",  label: "Calendar",  icon: "calendar", group: "main", emoji: "📅" },
  { id: "career",    label: "Career",    icon: "career",   group: "work", emoji: "💼" },
  { id: "study",     label: "Study",     icon: "study",    group: "work", emoji: "📚" },
  { id: "finance",   label: "Finance",   icon: "finance",  group: "life", emoji: "💰" },
  { id: "travel",    label: "Travel",    icon: "travel",   group: "life", emoji: "✈️" },
  { id: "pet",       label: "Ozzy 🐾",   icon: "pet",      group: "life", emoji: "🐾" },
  { id: "settings",  label: "Settings",  icon: "settings", group: "system", emoji: "⚙️" },
];
const GROUPS = [{ key:"main", label:"Main" }, { key:"work", label:"Work" }, { key:"life", label:"Life" }, { key:"system", label:"System" }];
const TITLES = { dashboard:"Dashboard", notes:"Notes", calendar:"Calendar", career:"Career", study:"Study & PMP", finance:"Finance", travel:"Travel", pet:"Ozzy", settings:"Settings" };

// ─── APP ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser]         = useState(null);
  const [checking, setChecking] = useState(true);
  const [calDate, setCalDate]   = useState(null);

  // Page persistence — save/restore from localStorage
  const [page, setPage] = useState(() => {
    return localStorage.getItem("sanctum_page") || "dashboard";
  });

  const navigate = (p) => {
    setPage(p);
    localStorage.setItem("sanctum_page", p);
  };

  const goToCalendarDay = (date) => {
    setCalDate(date);
    navigate("calendar");
  };

  useEffect(() => {
    const session = auth.getSession();
    if (session) setUser(session.user);
    setChecking(false);
  }, []);

  const handleLogin  = (u) => setUser(u);
  const handleLogout = () => { auth.signOut(); setUser(null); navigate("dashboard"); };

  if (checking) return null;
  if (!user) return <><style>{CSS}</style><Login onLogin={handleLogin} /></>;

  const email    = user?.email || "";
  const username = email.split("@")[0];
  const initials = username.slice(0,2).toUpperCase();

  const renderPage = () => {
    if (page === "dashboard") return <Dashboard onNavigate={navigate} onGoToCalendarDay={goToCalendarDay} />;
    if (page === "notes")     return <Notes />;
    if (page === "calendar")  return <Calendar initialDate={calDate} />;
    if (page === "career")    return <Career />;
    if (page === "finance")   return <Finance />;
    if (page === "study")     return <PlaceholderPage label="Study & PMP" emoji="📚" />;
    if (page === "travel")    return <PlaceholderPage label="Travel" emoji="✈️" />;
    if (page === "pet")       return <PlaceholderPage label="Ozzy" emoji="🐾" />;
    if (page === "settings")  return <PlaceholderPage label="Settings" emoji="⚙️" />;
  };

  const today = new Date().toLocaleDateString("en-IE", { weekday: "short", day: "numeric", month: "short", year: "numeric" });

  return (
    <>
      <style>{CSS}</style>
      <div className="shell">
        <aside className="sidebar">
          <div className="sidebar-logo">
            <div className="logo-mark">S</div>
            <div>
              <div className="logo-name">Sanctum</div>
              <div className="logo-sub">{username} · Dublin</div>
            </div>
          </div>

          {GROUPS.map(g => (
            <div key={g.key} className="nav-section">
              <div className="nav-label">{g.label}</div>
              {NAV.filter(n => n.group === g.key).map(n => (
                <div key={n.id} className={`nav-item${page === n.id ? " active" : ""}`} onClick={() => navigate(n.id)}>
                  <div className="nav-icon"><Icon name={n.icon} size={16} /></div>
                  {n.label}
                </div>
              ))}
            </div>
          ))}

          <div className="sidebar-footer">
            <div className="nav-item" style={{ fontSize: 12 }}>
              <div className="nav-icon"><Icon name="lock" size={14} color="var(--grn)" /></div>
              <span style={{ color: "var(--grn)", fontSize: 12 }}>Encrypted</span>
            </div>
            <div className="nav-item" onClick={handleLogout}>
              <div className="nav-icon"><Icon name="logout" size={14} /></div>
              <span style={{ fontSize: 12 }}>Sign out</span>
            </div>
          </div>
        </aside>

        <div className="main">
          <div className="topbar">
            <div className="topbar-left">
              <div className="topbar-title">{TITLES[page]}</div>
            </div>
            <div className="topbar-right">
              <span className="topbar-sub">{today}</span>
              <div className="user-avatar" title={email}>{initials}</div>
            </div>
          </div>
          {renderPage()}
        </div>
      </div>
    </>
  );
}
