const SUPABASE_URL = "https://hqlgwisfkkosgekotojz.supabase.co";
const SUPABASE_KEY = "sb_publishable_Eky9AvrbiYjejxogwxwJ6Q_x7eoySQ4";

export const auth = {
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
  },
  updateUser: async (metadata) => {
    const session = auth.getSession();
    if (!session) return null;
    try {
      const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
        method: "PUT",
        headers: { apikey: SUPABASE_KEY, "Content-Type": "application/json", Authorization: `Bearer ${session.token}` },
        body: JSON.stringify({ data: metadata })
      });
      const updated = await res.json();
      if (updated.id) {
        const current = JSON.parse(localStorage.getItem("sanctum_user") || "{}");
        localStorage.setItem("sanctum_user", JSON.stringify({ ...current, user_metadata: updated.user_metadata }));
      } else {
        console.error('[auth.updateUser] Failed — response:', updated);
      }
      return updated;
    } catch (err) { console.error('[auth.updateUser] Network error:', err); return null; }
  }
};

export const sb = {
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
    },
    upsert: async (data, conflictCol = "key") => {
      const session = auth.getSession();
      const headers = { apikey: SUPABASE_KEY, "Content-Type": "application/json", Prefer: "resolution=merge-duplicates,return=representation" };
      if (session) headers.Authorization = `Bearer ${session.token}`;
      const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?on_conflict=${conflictCol}`, { method: "POST", headers, body: JSON.stringify(data) });
      return res.json();
    }
  })
};
