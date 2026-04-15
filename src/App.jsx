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
    /* Base surfaces */
    --bg:    #0a0e14;
    --bg1:   #0f1520;
    --bg2:   #161e2d;
    --bg3:   #1c2638;
    /* Borders */
    --b1:    #1e2a3d;
    --b2:    #273548;
    --b3:    #364d6a;
    /* Text */
    --t1:    #eef2f7;
    --t2:    #8fa3be;
    --t3:    #475569;
    /* Accent */
    --blue:  #3b82f6;
    --blue2: #2563eb;
    --bluem: rgba(59,130,246,0.10);
    --blueb: rgba(59,130,246,0.28);
    --grn:   #10b981;
    --grnm:  rgba(16,185,129,0.10);
    --red:   #ef4444;
    --amber: #f59e0b;
    --purple:#8b5cf6;
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
    --glass-bg:     rgba(13,19,30,0.68);
    --glass-border: rgba(255,255,255,0.065);
    --glass-blur:   blur(20px) saturate(160%);
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
      radial-gradient(ellipse at 12% 20%, rgba(59,130,246,0.08) 0%, transparent 52%),
      radial-gradient(ellipse at 88% 80%, rgba(139,92,246,0.06) 0%, transparent 52%),
      radial-gradient(ellipse at 50% 50%, rgba(16,185,129,0.02) 0%, transparent 60%);
  }

  /* ── Sidebar ── */
  .sidebar {
    width: 224px; min-width: 224px;
    background: rgba(8,12,18,0.96);
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
    background: linear-gradient(135deg, #3b82f6, #2563eb);
    display: flex; align-items: center; justify-content: center;
    font-family: var(--mono); font-size: 14px; font-weight: 700;
    color: #fff; flex-shrink: 0;
    box-shadow: 0 4px 16px rgba(59,130,246,0.45), 0 0 0 1px rgba(59,130,246,0.2);
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
    background: rgba(8,12,18,0.82);
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
  .notes-shell { display: flex; flex: 1; overflow: hidden; }
  .notes-sidebar {
    width: 200px; min-width: 200px; border-right: 1px solid var(--glass-border);
    background: rgba(8,12,18,0.92); overflow-y: auto; display: flex; flex-direction: column;
  }
  .notes-sidebar-header {
    padding: 14px 14px 10px; border-bottom: 1px solid rgba(255,255,255,0.06);
    display: flex; align-items: center; justify-content: space-between; flex-shrink: 0;
  }
  .notebook-item {
    display: flex; align-items: center; gap: 9px;
    padding: 8px 14px; cursor: pointer; color: var(--t2);
    font-size: 13px; font-weight: 500; transition: all .15s;
    border-left: 2px solid transparent;
  }
  .notebook-item:hover { background: rgba(255,255,255,0.04); color: var(--t1); }
  .notebook-item.active { background: var(--bluem); color: var(--blue); border-left-color: var(--blue); }
  .notebook-icon { width: 26px; height: 26px; border-radius: 7px; display: flex; align-items: center; justify-content: center; font-size: 13px; flex-shrink: 0; }
  .section-item {
    display: flex; align-items: center; gap: 8px;
    padding: 5px 14px 5px 26px; cursor: pointer; color: var(--t3);
    font-size: 11px; font-weight: 500; transition: all .15s;
    border-left: 2px solid transparent;
  }
  .section-item:hover { background: rgba(255,255,255,0.03); color: var(--t2); }
  .section-item.active { color: var(--blue); border-left-color: var(--blue); background: var(--bluem); }
  .section-dot { width: 4px; height: 4px; border-radius: 50%; background: var(--b3); flex-shrink: 0; }
  .section-item.active .section-dot { background: var(--blue); }

  .notes-list {
    width: 255px; min-width: 255px; border-right: 1px solid rgba(255,255,255,0.06);
    background: rgba(17,24,39,0.55); overflow-y: auto; display: flex; flex-direction: column;
  }
  .notes-list-header {
    padding: 10px 12px; border-bottom: 1px solid rgba(255,255,255,0.06);
    display: flex; align-items: center; justify-content: space-between;
    flex-shrink: 0; background: rgba(10,14,20,0.6);
  }
  .note-list-item {
    padding: 13px 14px; cursor: pointer;
    border-bottom: 1px solid rgba(255,255,255,0.05); transition: background .15s;
    border-left: 2px solid transparent;
  }
  .note-list-item:hover { background: rgba(255,255,255,0.04); }
  .note-list-item.active { background: var(--bluem); border-left-color: var(--blue); }
  .nli-title   { font-size: 13px; font-weight: 600; color: var(--t1); margin-bottom: 3px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .nli-preview { font-size: 11px; color: var(--t3); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 1.4; }
  .nli-date    { font-size: 10px; color: var(--t3); font-family: var(--mono); margin-top: 5px; }
  .nli-tags    { display: flex; gap: 4px; margin-top: 4px; flex-wrap: wrap; }
  .nli-tag     { font-size: 9px; padding: 1px 5px; border-radius: 4px; background: var(--bg3); color: var(--t3); font-weight: 500; }
  .nli-location { font-size: 9px; color: var(--t3); font-family: var(--mono); margin-top: 3px; opacity: .7; }

  .note-editor { flex: 1; display: flex; flex-direction: column; overflow: hidden; background: rgba(8,12,18,0.80); }
  .note-toolbar {
    padding: 8px 18px; border-bottom: 1px solid rgba(255,255,255,0.06);
    display: flex; align-items: center; gap: 4px; flex-wrap: wrap;
    background: rgba(10,14,20,0.65); flex-shrink: 0;
  }
  .note-toolbar-sep { width: 1px; height: 18px; background: rgba(255,255,255,0.08); margin: 0 4px; }
  .note-tool-btn {
    width: 26px; height: 26px; border-radius: 6px;
    display: flex; align-items: center; justify-content: center;
    background: transparent; border: 1px solid transparent;
    color: var(--t3); cursor: pointer; font-size: 11px; font-weight: 700;
    font-family: var(--mono); transition: all .12s; flex-shrink: 0; line-height: 1;
  }
  .note-tool-btn:hover { background: rgba(255,255,255,0.06); border-color: rgba(255,255,255,0.1); color: var(--t1); }
  .note-tool-btn.on { background: var(--bluem); border-color: var(--blueb); color: var(--blue); }
  .note-title-input {
    width: 100%; padding: 20px 28px 12px;
    background: transparent; border: none; color: var(--t1);
    font-size: 22px; font-weight: 700; font-family: var(--sans);
    outline: none; border-bottom: 1px solid rgba(255,255,255,0.06); letter-spacing: -.3px;
  }
  .note-title-input::placeholder { color: var(--t3); }
  .note-meta { padding: 7px 28px; display: flex; align-items: center; gap: 12px; border-bottom: 1px solid rgba(255,255,255,0.06); flex-wrap: wrap; }
  .note-meta-item { font-size: 10px; color: var(--t3); font-family: var(--mono); display: flex; align-items: center; gap: 4px; }
  .note-body-input {
    flex: 1; padding: 20px 28px;
    background: transparent; border: none; color: var(--t2);
    font-size: 14px; line-height: 1.85; font-family: var(--sans);
    outline: none; resize: none;
  }
  .note-body-input::placeholder { color: var(--t3); }
  .note-empty {
    flex: 1; display: flex; align-items: center; justify-content: center;
    flex-direction: column; gap: 12px; color: var(--t3);
  }
  .note-empty-icon { font-size: 44px; opacity: .12; }
  .enc-badge {
    display: inline-flex; align-items: center; gap: 4px;
    padding: 3px 9px; border-radius: 20px;
    background: rgba(16,185,129,.10); color: var(--grn);
    font-size: 10px; font-weight: 600;
  }
  .save-ind { font-size: 10px; font-family: var(--mono); padding: 2px 8px; border-radius: 6px; transition: all .3s; }
  .save-ind.saving { color: var(--amber); background: rgba(245,158,11,0.1); }
  .save-ind.saved  { color: var(--grn);   background: rgba(16,185,129,0.1); }

  /* ── Markdown preview ── */
  .preview-body {
    flex: 1; overflow-y: auto; padding: 20px 32px;
    color: var(--t2); line-height: 1.85; font-size: 14px;
  }
  .preview-body h1 { font-size: 22px; font-weight: 700; color: var(--t1); margin: 24px 0 10px; letter-spacing: -.3px; border-bottom: 1px solid rgba(255,255,255,0.06); padding-bottom: 8px; }
  .preview-body h2 { font-size: 17px; font-weight: 700; color: var(--t1); margin: 20px 0 8px; }
  .preview-body h3 { font-size: 14px; font-weight: 600; color: var(--t1); margin: 16px 0 6px; }
  .preview-body p  { margin-bottom: 10px; }
  .preview-body ul { margin: 6px 0 10px 20px; }
  .preview-body li { margin-bottom: 4px; }
  .preview-body strong { color: var(--t1); font-weight: 700; }
  .preview-body em { font-style: italic; }
  .preview-body code { background: rgba(59,130,246,0.1); border: 1px solid rgba(59,130,246,0.2); padding: 1px 5px; border-radius: 4px; font-family: var(--mono); font-size: 12px; color: var(--blue); }
  .preview-body pre { background: var(--bg3); border: 1px solid rgba(255,255,255,0.07); border-radius: 10px; padding: 14px 18px; margin: 12px 0; overflow-x: auto; }
  .preview-body pre code { background: none; border: none; padding: 0; color: var(--t2); font-size: 13px; }

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
  .cal-cell:hover { border-color: rgba(255,255,255,0.13); background: rgba(17,24,39,0.75); }
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
    border-radius: 16px; padding: 6px 6px 6px 20px;
    display: flex; align-items: center; gap: 12px;
    transition: border-color .2s, box-shadow .2s;
  }
  .ai-bar:focus-within {
    border-color: var(--blueb);
    box-shadow: 0 0 0 3px rgba(59,130,246,0.1), 0 8px 32px rgba(0,0,0,0.25);
  }
  .ai-bar-input {
    flex: 1; background: transparent; border: none; outline: none;
    color: var(--t1); font-size: 14px; font-family: var(--sans); padding: 10px 0;
  }
  .ai-bar-input::placeholder { color: var(--t3); }
  .ai-bar-btn {
    width: 42px; height: 42px; background: var(--blue); border: none;
    border-radius: 12px; display: flex; align-items: center; justify-content: center;
    cursor: pointer; transition: all .15s; flex-shrink: 0;
  }
  .ai-bar-btn:hover:not(:disabled) { background: var(--blue2); transform: translateY(-1px); box-shadow: 0 4px 12px rgba(59,130,246,0.4); }
  .ai-bar-btn:disabled { opacity: .35; cursor: default; }
  .ai-response {
    margin-top: 10px; padding: 12px 16px;
    background: rgba(17,24,39,0.6);
    border: 1px solid rgba(255,255,255,0.07);
    border-radius: 12px; font-size: 13px; color: var(--t2); line-height: 1.6;
    display: flex; align-items: flex-start; justify-content: space-between; gap: 12px;
    animation: fadeInUp .2s ease both;
  }
  .ai-response-ok { border-color: rgba(16,185,129,0.25); }
  .ai-response-err { border-color: rgba(239,68,68,0.25); color: var(--red); }
  .ai-suggestions { display: flex; gap: 7px; margin-top: 10px; flex-wrap: wrap; }

  /* ── Tracker back bar ── */
  .tracker-back-bar {
    display: flex; align-items: center; gap: 10px;
    padding: 10px 32px;
    background: rgba(8,12,18,0.72);
    backdrop-filter: var(--glass-blur); -webkit-backdrop-filter: var(--glass-blur);
    border-bottom: 1px solid var(--glass-border);
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
    background: rgba(8,12,18,0.92);
    backdrop-filter: blur(24px) saturate(180%); -webkit-backdrop-filter: blur(24px) saturate(180%);
    border-top: 1px solid var(--glass-border);
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

  @media (max-width: 768px) {
    .sidebar { display: none; }
    .bottom-nav { display: block; }
    .page-body { padding: 18px; padding-bottom: 84px; }
    .grid-4 { grid-template-columns: 1fr 1fr; }
    .grid-3 { grid-template-columns: 1fr 1fr; }
    .grid-2 { grid-template-columns: 1fr; }
    .notes-shell { flex-direction: column; height: auto; }
    .notes-sidebar { width: 100%; min-width: unset; border-right: none; border-bottom: 1px solid rgba(255,255,255,0.06); max-height: 180px; overflow-x: auto; overflow-y: hidden; flex-direction: row; flex-wrap: nowrap; display: flex; }
    .notes-list { width: 100%; min-width: unset; border-right: none; border-bottom: 1px solid rgba(255,255,255,0.06); max-height: 200px; }
    .note-editor { min-height: 300px; }
    .app-table th:nth-child(4), .app-table td:nth-child(4),
    .app-table th:nth-child(5), .app-table td:nth-child(5) { display: none; }
    .topbar { padding: 0 16px; }
    .cal-cell { min-height: 55px; }
    .week-view { grid-template-columns: repeat(7,1fr); gap: 4px; }
    .week-col-num { font-size: 13px; }
    .week-event { font-size: 9px; padding: 3px 5px; }
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
          <div className="dw-value">Aug</div>
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
  const [activeNB, setActiveNB]       = useState("finance");
  const [activeSection, setSection]   = useState("mortgage");
  const [allNotes, setAllNotes]       = useState([]);
  const [activeNote, setActiveNote]   = useState(null);
  const [editTitle, setEditTitle]     = useState("");
  const [editBody, setEditBody]       = useState("");
  const [editTags, setEditTags]       = useState("");
  const [loading, setLoading]         = useState(false);
  const [search, setSearch]           = useState("");
  const [saveStatus, setSaveStatus]   = useState("idle"); // idle | saving | saved
  const [viewMode, setViewMode]       = useState("edit"); // edit | preview
  const saveTimer = useRef(null);
  const bodyRef   = useRef(null);

  const notebook = NOTEBOOKS.find(n => n.id === activeNB);
  const section  = notebook?.sections.find(s => s.id === activeSection);

  // ── Load ──
  useEffect(() => { loadNotes(); }, []);

  const loadNotes = async () => {
    setLoading(true);
    try {
      const data = await sb.from("notes").select("*");
      if (Array.isArray(data)) {
        setAllNotes(data);
        const forSection = data.filter(n => n.section === activeSection);
        if (forSection[0]) openNote(forSection[0]);
      }
    } catch { setAllNotes([]); }
    setLoading(false);
  };

  const openNote = (n) => {
    setActiveNote(n.id); setEditTitle(n.title || ""); setEditBody(n.body || ""); setEditTags(n.tags || "");
    setViewMode("edit");
  };

  // Notes visible in list panel
  const isGlobalSearch = search.length > 1;
  const sectionNotes   = allNotes.filter(n => n.section === activeSection);
  const displayedNotes = isGlobalSearch
    ? allNotes.filter(n =>
        n.title?.toLowerCase().includes(search.toLowerCase()) ||
        n.body?.toLowerCase().includes(search.toLowerCase()) ||
        n.tags?.toLowerCase().includes(search.toLowerCase()))
    : sectionNotes;

  const currentNote = allNotes.find(n => n.id === activeNote);

  // ── Auto-save ──
  const autoSave = useCallback((id, title, body, tags) => {
    setSaveStatus("saving");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      const updated = new Date().toISOString().slice(0, 10);
      setAllNotes(prev => prev.map(n => n.id === id ? { ...n, title, body, tags, updated_at: updated } : n));
      try { await sb.from("notes").update({ title, body, tags, updated_at: updated }, { id }); } catch {}
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
    }, 700);
  }, []);

  const onTitleChange = (v) => { setEditTitle(v); if (activeNote) autoSave(activeNote, v, editBody, editTags); };
  const onBodyChange  = (v) => { setEditBody(v);  if (activeNote) autoSave(activeNote, editTitle, v, editTags); };
  const onTagsChange  = (v) => { setEditTags(v);  if (activeNote) autoSave(activeNote, editTitle, editBody, v); };

  // ── CRUD ──
  const newNote = async () => {
    const note = { notebook: activeNB, section: activeSection, title: "Untitled", body: "", tags: "", updated_at: new Date().toISOString().slice(0, 10) };
    try {
      const res     = await sb.from("notes").insert(note);
      const created = Array.isArray(res) && res[0] ? res[0] : { ...note, id: Date.now().toString() };
      setAllNotes(prev => [created, ...prev]);
      openNote(created);
    } catch {
      const n = { ...note, id: Date.now().toString() };
      setAllNotes(prev => [n, ...prev]);
      openNote(n);
    }
  };

  const deleteNote = async () => {
    if (!activeNote) return;
    const remaining = allNotes.filter(n => n.id !== activeNote);
    setAllNotes(remaining);
    const next = remaining.find(n => n.section === activeSection);
    if (next) openNote(next);
    else { setActiveNote(null); setEditTitle(""); setEditBody(""); setEditTags(""); }
    try { await sb.from("notes").delete({ id: activeNote }); } catch {}
  };

  const selectSection = (sid, nbid) => {
    if (nbid !== activeNB) setActiveNB(nbid);
    setSection(sid);
    setSearch("");
    const first = allNotes.find(n => n.section === sid);
    if (first) openNote(first);
    else { setActiveNote(null); setEditTitle(""); setEditBody(""); setEditTags(""); }
  };

  // ── Rich-text formatting ──
  const applyFormat = (fmt) => {
    const ta = bodyRef.current;
    if (!ta) return;
    const s = ta.selectionStart, e = ta.selectionEnd;
    const sel  = editBody.slice(s, e);
    const pre  = editBody.slice(0, s);
    const post = editBody.slice(e);

    const lineStart = (str) => str.lastIndexOf('\n') + 1;

    if (fmt === 'h1' || fmt === 'h2' || fmt === 'ul') {
      const prefix = fmt === 'h1' ? '# ' : fmt === 'h2' ? '## ' : '- ';
      const li = lineStart(pre);
      const newBody = editBody.slice(0, li) + prefix + editBody.slice(li);
      onBodyChange(newBody);
      setTimeout(() => { ta.focus(); ta.setSelectionRange(s + prefix.length, e + prefix.length); }, 0);
      return;
    }

    let insert = '', ns = s, ne = e;
    if (fmt === 'bold')      { insert = `**${sel||'bold'}**`;   ns = s+2; ne = ns+(sel.length||4); }
    else if (fmt === 'italic')   { insert = `_${sel||'italic'}_`;  ns = s+1; ne = ns+(sel.length||6); }
    else if (fmt === 'code')     { insert = `\`${sel||'code'}\``;   ns = s+1; ne = ns+(sel.length||4); }
    else if (fmt === 'codeblock'){ insert = `\`\`\`\n${sel||'code'}\n\`\`\``; ns = s+4; ne = ns+(sel.length||4); }

    onBodyChange(pre + insert + post);
    setTimeout(() => { ta.focus(); ta.setSelectionRange(ns, ne); }, 0);
  };

  // ── Markdown renderer ──
  const renderMarkdown = (text) => {
    if (!text) return '<p style="color:var(--t3);font-style:italic">Nothing to preview yet.</p>';
    const esc   = (s) => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    const inline = (s) => s
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g,     '<em>$1</em>')
      .replace(/_(.+?)_/g,       '<em>$1</em>')
      .replace(/`(.+?)`/g,       '<code>$1</code>');

    const lines = text.split('\n');
    let html = '', inList = false, inCode = false, codeBuf = [];

    for (const line of lines) {
      if (line.trim().startsWith('```')) {
        if (inCode) { html += `<pre><code>${esc(codeBuf.join('\n'))}</code></pre>`; codeBuf = []; inCode = false; }
        else { if (inList) { html += '</ul>'; inList = false; } inCode = true; }
        continue;
      }
      if (inCode) { codeBuf.push(line); continue; }
      const isList = /^[-•*] /.test(line);
      if (!isList && inList) { html += '</ul>'; inList = false; }
      if      (line.startsWith('# '))  html += `<h1>${inline(line.slice(2))}</h1>`;
      else if (line.startsWith('## ')) html += `<h2>${inline(line.slice(3))}</h2>`;
      else if (line.startsWith('### '))html += `<h3>${inline(line.slice(4))}</h3>`;
      else if (isList)  { if (!inList) { html += '<ul>'; inList = true; } html += `<li>${inline(line.slice(2))}</li>`; }
      else if (line.trim() === '') html += '<br>';
      else html += `<p>${inline(line)}</p>`;
    }
    if (inList) html += '</ul>';
    if (inCode) html += `<pre><code>${esc(codeBuf.join('\n'))}</code></pre>`;
    return html;
  };

  const noteNB      = currentNote ? NOTEBOOKS.find(nb => nb.id === currentNote.notebook) : null;
  const noteSec     = noteNB?.sections.find(s => s.id === currentNote?.section);

  return (
    <div className="notes-shell">

      {/* ── Panel 1: Notebooks sidebar ── */}
      <div className="notes-sidebar">
        <div className="notes-sidebar-header">
          <span style={{ fontSize: 9, color: "var(--t3)", letterSpacing: 1.5, textTransform: "uppercase", fontWeight: 700 }}>Notebooks</span>
          <span className="enc-badge"><Icon name="lock" size={8} color="var(--grn)" /> enc</span>
        </div>
        {NOTEBOOKS.map(nb => (
          <div key={nb.id}>
            <div className={`notebook-item${activeNB === nb.id ? " active" : ""}`}
              onClick={() => selectSection(nb.sections[0].id, nb.id)}>
              <div className="notebook-icon" style={{ background: nb.bg }}>{nb.emoji}</div>
              <span style={{ flex: 1, fontSize: 12 }}>{nb.label}</span>
              <span style={{ fontSize: 9, color: "var(--t3)", fontFamily: "var(--mono)" }}>{nb.sections.length}</span>
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

      {/* ── Panel 2: Notes list ── */}
      <div className="notes-list">
        <div className="notes-list-header">
          <span style={{ fontSize: 11, fontWeight: 700, color: "var(--t1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 140 }}>
            {isGlobalSearch ? "Search results" : section?.label}
          </span>
          <button className="btn sm primary" onClick={newNote}><Icon name="plus" size={12} /></button>
        </div>

        {/* Search */}
        <div style={{ padding: "8px 10px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 8, padding: "5px 10px" }}>
            <Icon name="search" size={12} color="var(--t3)" />
            <input
              style={{ background: "transparent", border: "none", outline: "none", color: "var(--t1)", fontSize: 11, fontFamily: "var(--sans)", width: "100%" }}
              placeholder={isGlobalSearch ? "Searching all notes..." : "Search..."}
              value={search} onChange={e => setSearch(e.target.value)} />
            {search && (
              <button onClick={() => setSearch("")} style={{ background: "none", border: "none", color: "var(--t3)", cursor: "pointer", fontSize: 12, padding: 0, lineHeight: 1 }}>✕</button>
            )}
          </div>
          {isGlobalSearch && (
            <div style={{ fontSize: 9, color: "var(--t3)", marginTop: 5, textAlign: "center", letterSpacing: .5 }}>
              {displayedNotes.length} result{displayedNotes.length !== 1 ? "s" : ""} across all notebooks
            </div>
          )}
        </div>

        {loading && <div className="loading">Loading...</div>}
        {!loading && displayedNotes.length === 0 && (
          <div style={{ padding: 20, color: "var(--t3)", fontSize: 12, textAlign: "center" }}>
            {search ? "No results" : "No notes yet"}<br />
            {!isGlobalSearch && <button className="btn sm primary" style={{ marginTop: 10 }} onClick={newNote}><Icon name="plus" size={12} /> New note</button>}
          </div>
        )}
        {displayedNotes.map(n => {
          const nNB  = isGlobalSearch ? NOTEBOOKS.find(nb => nb.id === n.notebook) : null;
          const nSec = isGlobalSearch ? nNB?.sections.find(s => s.id === n.section) : null;
          return (
            <div key={n.id} className={`note-list-item${activeNote === n.id ? " active" : ""}`} onClick={() => { openNote(n); if (isGlobalSearch) { setActiveNB(n.notebook); setSection(n.section); } }}>
              <div className="nli-title">{n.title || "Untitled"}</div>
              <div className="nli-preview">{(n.body || "").replace(/[#*_`]/g, "").replace(/\n/g, " ").slice(0, 55) || "No content"}</div>
              {isGlobalSearch && nNB && (
                <div className="nli-location">{nNB.emoji} {nNB.label} / {nSec?.label}</div>
              )}
              {n.tags && (
                <div className="nli-tags">
                  {n.tags.split(",").filter(Boolean).slice(0,3).map(tag => (
                    <span key={tag} className="nli-tag">{tag.trim()}</span>
                  ))}
                </div>
              )}
              <div className="nli-date">{n.updated_at}</div>
            </div>
          );
        })}
      </div>

      {/* ── Panel 3: Editor ── */}
      <div className="note-editor">
        {currentNote ? (
          <>
            {/* Toolbar */}
            <div className="note-toolbar">
              <span className="enc-badge"><Icon name="lock" size={8} color="var(--grn)" /> encrypted</span>
              {saveStatus === "saving" && <span className="save-ind saving">Saving...</span>}
              {saveStatus === "saved"  && <span className="save-ind saved">Saved</span>}
              <div style={{ flex: 1 }} />

              {/* Format buttons */}
              {viewMode === "edit" && <>
                <button className="note-tool-btn" title="Bold (Ctrl+B)" onClick={() => applyFormat('bold')}><strong>B</strong></button>
                <button className="note-tool-btn" title="Italic" onClick={() => applyFormat('italic')}><em>I</em></button>
                <div className="note-toolbar-sep" />
                <button className="note-tool-btn" title="Heading 1" onClick={() => applyFormat('h1')}>H1</button>
                <button className="note-tool-btn" title="Heading 2" onClick={() => applyFormat('h2')}>H2</button>
                <div className="note-toolbar-sep" />
                <button className="note-tool-btn" title="Bullet list" onClick={() => applyFormat('ul')}>≡</button>
                <button className="note-tool-btn" title="Inline code" onClick={() => applyFormat('code')}>&lt;/&gt;</button>
                <button className="note-tool-btn" title="Code block" onClick={() => applyFormat('codeblock')} style={{ width: 34, fontSize: 9 }}>block</button>
                <div className="note-toolbar-sep" />
              </>}

              <button className={`note-tool-btn${viewMode === "preview" ? " on" : ""}`}
                title="Toggle preview" style={{ width: 46, fontSize: 9 }}
                onClick={() => setViewMode(v => v === "edit" ? "preview" : "edit")}>
                {viewMode === "edit" ? "preview" : "edit"}
              </button>
              <div className="note-toolbar-sep" />
              <button className="btn xs danger" onClick={deleteNote}><Icon name="trash" size={11} /></button>
            </div>

            {/* Title */}
            <input className="note-title-input" value={editTitle}
              onChange={e => onTitleChange(e.target.value)} placeholder="Note title" />

            {/* Meta row */}
            <div className="note-meta">
              <span className="note-meta-item">📅 {currentNote.updated_at}</span>
              <span className="note-meta-item">📁 {noteNB?.label} / {noteSec?.label}</span>
              <div style={{ flex: 1 }} />
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <Icon name="tag" size={11} color="var(--t3)" />
                <input
                  style={{ background: "transparent", border: "none", outline: "none", color: "var(--t3)", fontSize: 10, fontFamily: "var(--mono)", width: 150 }}
                  placeholder="tag1, tag2"
                  value={editTags} onChange={e => onTagsChange(e.target.value)} />
              </div>
            </div>

            {/* Body — edit or preview */}
            {viewMode === "edit" ? (
              <textarea
                ref={bodyRef}
                className="note-body-input"
                value={editBody}
                onChange={e => onBodyChange(e.target.value)}
                placeholder={"Start writing...\n\nFormatting tips:\n# Heading 1   ## Heading 2\n**bold**   _italic_   `code`\n- bullet item\n```\ncode block\n```"} />
            ) : (
              <div
                className="preview-body"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(editBody) }} />
            )}
          </>
        ) : (
          <div className="note-empty">
            <div className="note-empty-icon">📝</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--t2)" }}>Select a note</div>
            <div style={{ fontSize: 12, color: "var(--t3)" }}>or create a new one in {section?.label}</div>
            <button className="btn primary" onClick={newNote} style={{ marginTop: 12 }}>
              <Icon name="plus" size={14} /> New note
            </button>
          </div>
        )}
      </div>
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
    cat==="travel" ? "green" : cat==="career" ? "amber" : cat==="study" ? "purple" : cat==="family" ? "muted" : "blue";

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
          <div className="grid-2" style={{ gap: 12 }}>
            <div className="form-row">
              <label className="form-label">Category</label>
              <select className="inp" value={newEvent.category} onChange={e => setNewEvent(n => ({ ...n, category: e.target.value }))}>
                {CATS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </div>
            <div className="form-row">
              <label className="form-label">Time (optional)</label>
              <input className="inp" type="time" value={newEvent.time} onChange={e => setNewEvent(n => ({ ...n, time: e.target.value }))} />
            </div>
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
          <Modal title="Event details" onClose={() => setActiveEvent(null)}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 18 }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: cat.color, flexShrink: 0, marginTop: 5 }} />
              <div>
                <div style={{ fontSize: 17, fontWeight: 700, color: "var(--t1)", marginBottom: 4 }}>{activeEvent.title}</div>
                <div style={{ fontSize: 12, color: "var(--t3)", fontFamily: "var(--mono)" }}>
                  {activeEvent.date}{activeEvent.time ? ` · ${activeEvent.time}` : ""}
                </div>
              </div>
            </div>
            {activeEvent.notes && (
              <div style={{ fontSize: 13, color: "var(--t2)", lineHeight: 1.65, marginBottom: 18, padding: "12px 14px", background: "rgba(255,255,255,0.03)", borderRadius: 10, border: "1px solid rgba(255,255,255,0.06)" }}>
                {activeEvent.notes}
              </div>
            )}
            <span className={`badge ${badgeCls(activeEvent.category)}`}>{activeEvent.category}</span>
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
                    }}>+</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Events list for current month */}
      {monthEvents.length > 0 && viewMode === "month" && (
        <div className="card">
          <div className="card-header">
            <div className="card-title">Events — {MONTHS[month]} {year}</div>
            <span className="badge blue">{monthEvents.length}</span>
          </div>
          {monthEvents.map(ev => {
            const c = catOf(ev);
            return (
              <div key={ev.id} className="fin-row" style={{ cursor: "pointer" }} onClick={() => setActiveEvent(ev)}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1 }}>
                  <div style={{ width: 9, height: 9, borderRadius: "50%", background: c.color, flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--t1)" }}>{ev.title}</div>
                    <div style={{ fontSize: 11, color: "var(--t3)", fontFamily: "var(--mono)" }}>{ev.date}{ev.time?` · ${ev.time}`:""}</div>
                  </div>
                </div>
                <span className={`badge ${badgeCls(ev.category)}`}>{ev.category}</span>
              </div>
            );
          })}
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
  { id: "study",   emoji: "📚", name: "Study",   sub: "PMP tracker — PMBOK knowledge areas, hours logged, progress toward August exam" },
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
function Home({ onNavigate, onGoToCalendarDay }) {
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

  const wDrag = (id) => ({
    draggable: true,
    onDragStart: e => onWidgetDragStart(e, id),
    onDragOver:  e => onWidgetDragOver(e, id),
    onDragLeave: e => onWidgetDragLeave(e, id),
    onDrop:      e => onWidgetDrop(e, id),
    onDragEnd:   onWidgetDragEnd,
  });

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const displayName = localStorage.getItem("sanctum_display_name") || "Michael";
  const dateStr = now.toLocaleDateString("en-IE", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  const EXAM_DATE = new Date("2026-08-31");
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
      const sys = `You are Sanctum AI, a personal assistant embedded in a private life organiser.
User: ${displayName}, Dublin, Ireland. Wife: Tamara. Dog: Ozzy (Golden Retriever, born Nov 2025).
PMP exam target: August 2026. MSc Cybersecurity at SETU starts Sep 2026.
Applications: Anthropic (Copyright Ops PM), Google (Sr Analyst T&S), Google (TPM Analytics EU).
Trips: Italy Jun 12-17 2026, Scotland Sep 7-13 2026 (with Tamara + Ozzy).
IMPORTANT: You CANNOT read note content. Notes are private and encrypted.
When the user asks to add/create something, reply ONLY with valid JSON (no markdown):
- Add task: {"action":"add_task","text":"task text","tag":"optional tag"}
- Navigate: {"action":"navigate","page":"home|notes|calendar|trackers|career|study|finance|travel|pet|settings"}
For everything else: plain text reply, warm and concise, max 2 sentences.`;

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
    "Add a task: book Scotland accommodation",
    "How many days until the PMP exam?",
    "Open study tracker",
    "What's on this week?",
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

      {/* AI bar */}
      <div style={{ marginBottom: 28 }}>
        <div className="ai-bar">
          <div style={{ width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(135deg, var(--blue), var(--purple))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, flexShrink: 0 }}>✦</div>
          <input ref={aiInputRef} className="ai-bar-input" value={aiInput}
            onChange={e => setAiInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && sendAI()}
            placeholder="Ask me anything or tell me what to do..." />
          <button className="ai-bar-btn" onClick={sendAI} disabled={aiLoading || !aiInput.trim()}>
            <Icon name="chevR" size={16} color="#fff" />
          </button>
        </div>
        {aiResponse ? (
          <div className={`ai-response${aiResponse.type === "error" ? " ai-response-err" : aiResponse.type === "success" ? " ai-response-ok" : ""}`}>
            <span>
              {aiResponse.type === "success" && <span style={{ color: "var(--grn)", marginRight: 6 }}>✓</span>}
              {aiResponse.type === "loading" && <span style={{ color: "var(--t3)", marginRight: 6 }}>...</span>}
              {aiResponse.text}
            </span>
            {aiResponse.type !== "loading" && (
              <button onClick={() => setAiResponse(null)}
                style={{ background: "none", border: "none", color: "var(--t3)", cursor: "pointer", fontSize: 14, padding: 0, flexShrink: 0, lineHeight: 1 }}>✕</button>
            )}
          </div>
        ) : (
          <div className="ai-suggestions">
            {AI_SUGGESTIONS.map(s => (
              <button key={s} className="btn xs" style={{ borderRadius: 20, fontSize: 11 }}
                onClick={() => { setAiInput(s); aiInputRef.current?.focus(); }}>{s}</button>
            ))}
          </div>
        )}
      </div>

      {/* Quick stats — draggable */}
      <div className="grid-4 mb18">
        {cardOrder.map(id => {
          const cls = `stat${dragging === id ? " is-dragging" : ""}${dragOver === id ? " drag-over" : ""}`;
          const drag = {
            draggable: true,
            onDragStart: e => onCardDragStart(e, id),
            onDragOver:  e => onCardDragOver(e, id),
            onDragLeave: e => onCardDragLeave(e, id),
            onDrop:      e => onCardDrop(e, id),
            onDragEnd:   onCardDragEnd,
          };
          if (id === "pmp") return (
            <div key="pmp" className={cls} {...drag}>
              <div className="drag-handle" style={{ position:"absolute", top:8, right:8 }}><Icon name="grab" size={12} /></div>
              <div className="stat-icon" style={{ background: "rgba(139,92,246,0.15)" }}><Icon name="study" size={18} color="var(--purple)" /></div>
              <div className="stat-label">PMP Exam</div>
              <div className="stat-value" style={{ color: daysToExam < 60 ? "var(--red)" : daysToExam < 120 ? "var(--amber)" : "var(--t1)" }}>{daysToExam}d</div>
              <div className="stat-sub">Aug 31 2026</div>
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

  if (checking) return null;
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
    if (page === "home") return <Home onNavigate={navigate} onGoToCalendarDay={goToCalendarDay} />;
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
    if (page === "settings") return <Settings user={user} onLogout={handleLogout} />;
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

  const displayName = localStorage.getItem("sanctum_display_name") || username;

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
