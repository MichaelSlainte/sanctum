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
    const user = localStorage.getItem("sanctum_user");
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

  /* ── Mobile responsive ── */
  .bottom-nav {
    display: none;
    position: fixed; bottom: 0; left: 0; right: 0;
    background: var(--bg1); border-top: 1px solid var(--b1);
    padding: 8px 0 max(8px, env(safe-area-inset-bottom));
    z-index: 100;
    box-shadow: 0 -4px 24px rgba(0,0,0,0.3);
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

  @media (max-width: 768px) {
    .sidebar { display: none; }
    .bottom-nav { display: block; }
    .page-body { padding: 16px; padding-bottom: 80px; }
    .grid-4 { grid-template-columns: 1fr 1fr; }
    .grid-3 { grid-template-columns: 1fr 1fr; }
    .grid-2 { grid-template-columns: 1fr; }
    .notes-shell { flex-direction: column; height: auto; min-height: calc(100vh - 56px - 70px); }
    .notes-sidebar { width: 100%; min-width: unset; border-right: none; border-bottom: 1px solid var(--b1); max-height: 200px; overflow-x: auto; overflow-y: hidden; flex-direction: row; flex-wrap: nowrap; display: flex; }
    .notes-list { width: 100%; min-width: unset; border-right: none; border-bottom: 1px solid var(--b1); max-height: 200px; }
    .note-editor { min-height: 300px; }
    .app-table th:nth-child(4), .app-table td:nth-child(4),
    .app-table th:nth-child(5), .app-table td:nth-child(5) { display: none; }
    .topbar { padding: 0 16px; }
    .cal-cell { min-height: 60px; }
    .cal-event { font-size: 9px; }
    .modal { margin: 16px; max-width: calc(100vw - 32px); }
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

  /* ── Animations ── */
  @keyframes fadeInUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
  .animate-in { animation: fadeInUp .3s ease both; }
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
  const [activeNB, setActiveNB] = useState("finance");
  const [activeSection, setSection] = useState("mortgage");
  const [notes, setNotes] = useState([]);
  const [activeNote, setActiveNote] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");
  const [editTags, setEditTags] = useState("");
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const saveTimer = useRef(null);

  const notebook = NOTEBOOKS.find(n => n.id === activeNB);
  const section = notebook?.sections.find(s => s.id === activeSection);

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
      const updated = new Date().toISOString().slice(0, 10);
      setNotes(prev => prev.map(n => n.id === id ? { ...n, title, body, tags, updated_at: updated } : n));
      try { await sb.from("notes").update({ title, body, tags, updated_at: updated }, { id }); } catch { }
    }, 800);
  }, []);

  const onTitleChange = (v) => { setEditTitle(v); if (activeNote) autoSave(activeNote, v, editBody, editTags); };
  const onBodyChange = (v) => { setEditBody(v); if (activeNote) autoSave(activeNote, editTitle, v, editTags); };
  const onTagsChange = (v) => { setEditTags(v); if (activeNote) autoSave(activeNote, editTitle, editBody, v); };

  const newNote = async () => {
    const note = { notebook: activeNB, section: activeSection, title: "Untitled", body: "", tags: "", updated_at: new Date().toISOString().slice(0, 10) };
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
    try { await sb.from("notes").delete({ id: activeNote }); } catch { }
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
            <div className="nli-preview">{(n.body || "").replace(/\n/g, " ").slice(0, 60) || "No content"}</div>
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
  const [year, setYear] = useState(initialDate ? initialDate.getFullYear() : now.getFullYear());
  const [month, setMonth] = useState(initialDate ? initialDate.getMonth() : now.getMonth());
  const [events, setEvents] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [selectedDay, setSelectedDay] = useState(initialDate ? initialDate.getDate() : null);
  const [newEvent, setNewEvent] = useState({ title: "", category: "personal", time: "" });
  const [viewMode, setViewMode] = useState("month");

  const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const CATS = [
    { id: "personal", label: "Personal", color: "#3b82f6" },
    { id: "career", label: "Career", color: "#f59e0b" },
    { id: "travel", label: "Travel", color: "#10b981" },
    { id: "study", label: "Study", color: "#8b5cf6" },
    { id: "family", label: "Family", color: "#ec4899" },
  ];

  useEffect(() => { loadEvents(); }, []);

  const loadEvents = async () => {
    try {
      const data = await sb.from("events").select("*");
      if (Array.isArray(data) && data.length) setEvents(data);
      else throw new Error();
    } catch {
      setEvents([
        { id: "e1", title: "PMP Application due", date: "2026-04-15", category: "study", color: "#8b5cf6" },
        { id: "e2", title: "Italy trip begins", date: "2026-06-12", category: "travel", color: "#10b981" },
        { id: "e3", title: "Scotland trip", date: "2026-09-07", category: "travel", color: "#10b981" },
        { id: "e4", title: "MSc starts — SETU", date: "2026-09-14", category: "study", color: "#8b5cf6" },
        { id: "e5", title: "Metallica Dublin", date: "2026-06-20", category: "personal", color: "#3b82f6" },
      ]);
    }
  };

  const addEvent = async () => {
    if (!newEvent.title.trim() || !selectedDay) return;
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(selectedDay).padStart(2, "0")}`;
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
    try { await sb.from("events").delete({ id }); } catch { }
  };

  // Build grid
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
    const ds = `${year}-${String(month + 1).padStart(2, "0")}-${String(day.day).padStart(2, "0")}`;
    return events.filter(e => e.date === ds);
  };
  const isToday = (day) => {
    const t = new Date();
    return day.current && year === t.getFullYear() && month === t.getMonth() && day.day === t.getDate();
  };

  const prev = () => { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const next = () => { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); };

  const monthEvents = events.filter(e => {
    const [ey, em] = e.date.split("-").map(Number);
    return ey === year && em === month + 1;
  }).sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div className="page-body animate-in">
      {showAdd && (
        <Modal title={`Add event — ${selectedDay} ${MONTHS[month]}`} onClose={() => setShowAdd(false)}>
          <div className="form-row"><label className="form-label">Title</label>
            <input className="inp" value={newEvent.title} onChange={e => setNewEvent(n => ({ ...n, title: e.target.value }))}
              placeholder="Event title" autoFocus onKeyDown={e => e.key === "Enter" && addEvent()} /></div>
          <div className="form-row"><label className="form-label">Category</label>
            <select className="inp" value={newEvent.category} onChange={e => setNewEvent(n => ({ ...n, category: e.target.value }))}>
              {CATS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select></div>
          <div className="form-row"><label className="form-label">Time (optional)</label>
            <input className="inp" type="time" value={newEvent.time} onChange={e => setNewEvent(n => ({ ...n, time: e.target.value }))} /></div>
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
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(d => <div key={d} className="cal-day-header">{d}</div>)}
        </div>
        <div className="cal-grid">
          {cells.map((cell, i) => {
            const dayEvents = eventsOnDay(cell);
            return (
              <div key={i} className={`cal-cell${!cell.current ? " other-month" : ""}${isToday(cell) ? " today" : ""}`}
                onClick={() => { if (cell.current) { setSelectedDay(cell.day); setShowAdd(true); } }}>
                <div className="cal-day-num">{cell.day}</div>
                <div className="cal-events">
                  {dayEvents.slice(0, 3).map(ev => (
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
  const EXAM_DATE = new Date("2026-08-31");
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
          <div className="stat-sub">PMP — Aug 2026</div>
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
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--t1)", marginBottom: 4 }}>Study plan to hit August</div>
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

// ─── SETTINGS ────────────────────────────────────────────────────────────────
function Settings({ user, onLogout }) {
  const [displayName, setDisplayName] = useState(() => localStorage.getItem("sanctum_display_name") || "");
  const [weeklyGoal, setWeeklyGoal] = useState(() => localStorage.getItem("sanctum_weekly_goal") || "10");
  const [saved, setSaved] = useState(false);

  const save = () => {
    localStorage.setItem("sanctum_display_name", displayName);
    localStorage.setItem("sanctum_weekly_goal", weeklyGoal);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="page-body animate-in">
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
            <input className="inp" value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Michael" />
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
            { label: "Data location", value: "EU — Frankfurt" },
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
            { icon: "🇪🇺", title: "EU data residency", body: "All data stored in Frankfurt, Germany. Fully GDPR compliant." },
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
He is pursuing PMP certification (August 2026 target) and starting an MSc in Cybersecurity at SETU in September 2026.
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

      try {
        const action = JSON.parse(reply);
        if (action.action === "add_task") {
          await onAddTask(action.text, action.tag || "");
          setMessages(prev => [...prev, { role: "assistant", text: `✓ Task added: "${action.text}"${action.tag ? ` [${action.tag}]` : ""}` }]);
        } else if (action.action === "log_study") {
          const sessions = JSON.parse(localStorage.getItem("sanctum_study_sessions") || "[]");
          const s = { id: Date.now().toString(), topic: action.topic, hours: action.hours, notes: action.notes || "", date: new Date().toISOString().slice(0, 10) };
          localStorage.setItem("sanctum_study_sessions", JSON.stringify([s, ...sessions]));
          setMessages(prev => [...prev, { role: "assistant", text: `✓ Logged ${action.hours}h of study — ${action.topic}.` }]);
        } else if (action.action === "navigate") {
          onNavigate(action.page);
          setMessages(prev => [...prev, { role: "assistant", text: `Opening ${action.page}...` }]);
        } else {
          setMessages(prev => [...prev, { role: "assistant", text: reply }]);
        }
      } catch {
        setMessages(prev => [...prev, { role: "assistant", text: reply }]);
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

// ─── NAV ─────────────────────────────────────────────────────────────────────
const NAV = [
  { id: "dashboard", label: "Dashboard", icon: "home", group: "main" },
  { id: "notes", label: "Notes", icon: "notes", group: "main" },
  { id: "calendar", label: "Calendar", icon: "calendar", group: "main" },
  { id: "ai", label: "AI", icon: "ai", group: "main" },
  { id: "career", label: "Career", icon: "career", group: "work" },
  { id: "study", label: "Study", icon: "study", group: "work" },
  { id: "finance", label: "Finance", icon: "finance", group: "life" },
  { id: "travel", label: "Travel", icon: "travel", group: "life" },
  { id: "pet", label: "Ozzy 🐾", icon: "pet", group: "life" },
  { id: "settings", label: "Settings", icon: "settings", group: "system" },
];
const GROUPS = [{ key: "main", label: "Main" }, { key: "work", label: "Work" }, { key: "life", label: "Life" }, { key: "system", label: "System" }];
const TITLES = { dashboard: "Dashboard", notes: "Notes", calendar: "Calendar", ai: "AI Assistant", career: "Career", study: "Study & PMP", finance: "Finance", travel: "Travel", pet: "Ozzy", settings: "Settings" };

// ─── APP ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);
  const [calDate, setCalDate] = useState(null);

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

  const handleLogin = (u) => setUser(u);
  const handleLogout = () => { auth.signOut(); setUser(null); navigate("dashboard"); };

  if (checking) return null;
  if (!user) return <><style>{CSS}</style><Login onLogin={handleLogin} /></>;

  const email = user?.email || "";
  const username = email.split("@")[0];
  const initials = username.slice(0, 2).toUpperCase();

  const addTaskFromAI = async (text, tag) => {
    const task = { text, tag, done: false };
    try {
      await sb.from("tasks").insert(task);
    } catch { }
  };

  const renderPage = () => {
    if (page === "dashboard") return <Dashboard onNavigate={navigate} onGoToCalendarDay={goToCalendarDay} />;
    if (page === "notes") return <Notes />;
    if (page === "calendar") return <Calendar initialDate={calDate} />;
    if (page === "ai") return <AIAssistant onAddTask={addTaskFromAI} onNavigate={navigate} />;
    if (page === "career") return <Career />;
    if (page === "finance") return <Finance />;
    if (page === "study") return <Study />;
    if (page === "travel") return <Travel />;
    if (page === "pet") return <Ozzy />;
    if (page === "settings") return <Settings user={user} onLogout={handleLogout} />;
  };

  const today = new Date().toLocaleDateString("en-IE", { weekday: "short", day: "numeric", month: "short", year: "numeric" });

  const BOTTOM_NAV = [
    { id: "dashboard", label: "Home", icon: "home" },
    { id: "notes", label: "Notes", icon: "notes" },
    { id: "ai", label: "AI", icon: "ai" },
    { id: "calendar", label: "Calendar", icon: "calendar" },
    { id: "settings", label: "Settings", icon: "settings" },
  ];

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

      {/* Mobile bottom nav */}
      <nav className="bottom-nav">
        <div className="bottom-nav-inner">
          {BOTTOM_NAV.map(n => (
            <div key={n.id} className={`bottom-nav-item${page === n.id ? " active" : ""}`} onClick={() => navigate(n.id)}>
              <Icon name={n.icon} size={22} />
              <span>{n.label}</span>
            </div>
          ))}
        </div>
      </nav>
    </>
  );
}
