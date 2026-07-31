// Copyright © 2026 Michael FR Marques & Tamara Lechner. All rights reserved.
// Sanctum — Private and confidential. Unauthorised use prohibited.
// https://sanctum.app
import { useState } from "react";

const SUPABASE_URL = "https://hqlgwisfkkosgekotojz.supabase.co";
// Supabase publishable/anon key — safe to expose in frontend. Security enforced by RLS policies.
const SUPABASE_KEY = "sb_publishable_Eky9AvrbiYjejxogwxwJ6Q_x7eoySQ4";

// ─── SET PASSWORD ──────────────────────────────────────────────────────────────
// Landing screen for Supabase invite / recovery links. The email link redirects to
// trysanctum.app/#access_token=...&type=invite|recovery. App.jsx parses that hash and
// renders this component with the parsed tokens. We finish the flow by calling
// PUT /auth/v1/user with the hash's access_token to set the account password, then
// hand the resulting session back up to App so it lands in the normal auth state.
export default function SetPassword({ callback, betaEmails = [], onComplete, onCancel, onPrivacy }) {
  const isRecovery = callback?.type === "recovery";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState(callback?.error || "");
  const [loading, setLoading] = useState(false);

  // Expired/invalid link — Supabase returns an error in the hash instead of a token.
  const linkBroken = !!callback?.error || !callback?.access_token;

  const handle = async () => {
    if (linkBroken) return;
    if (!password || !confirm) return setError("Please enter and confirm your new password.");
    if (password.length < 8) return setError("Password must be at least 8 characters.");
    if (password !== confirm) return setError("Passwords don't match.");
    setLoading(true); setError("");
    try {
      // Hand-rolled JWT client pattern (see sb helper): PUT /auth/v1/user with the
      // invite/recovery access_token as the Bearer, body { password }.
      const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
        method: "PUT",
        headers: {
          apikey: SUPABASE_KEY,
          "Content-Type": "application/json",
          Authorization: `Bearer ${callback.access_token}`,
        },
        body: JSON.stringify({ password }),
      });
      const updated = await res.json();
      if (!res.ok || !updated?.id) {
        setError(updated?.msg || updated?.error_description || "This link has expired or is invalid. Ask for a new invite.");
        setLoading(false);
        return;
      }
      // Invite-based account creation bypasses the BETA_EMAILS gate entirely (it never
      // goes through the signup form). Surface a clear log if the invited address isn't
      // allowlisted — account creation via invite is a separate concern from beta gating.
      const invitedEmail = (updated.email || "").trim().toLowerCase();
      if (!betaEmails.includes(invitedEmail)) {
        console.error(`[SetPassword] Invited email "${invitedEmail}" is NOT in BETA_EMAILS. Account was created via invite (bypasses beta gating); add it to BETA_EMAILS in App.jsx if this user should also be able to sign in via the normal form.`);
      }
      // Build a session from the hash tokens + the freshly-updated user, matching the
      // shape auth.saveSession expects. App persists it to the four localStorage keys.
      onComplete(
        {
          access_token: callback.access_token,
          refresh_token: callback.refresh_token,
          expires_in: callback.expires_in,
          user: updated,
        },
        password,
      );
    } catch {
      setError("Connection error. Try again.");
      setLoading(false);
    }
  };

  return (
    <div className="login-wrap">
      <div className="login-box animate-in">
        <div className="login-logo">
          <img src="/icon.svg?v=3" alt="Sanctum" style={{ width: 64, height: 64, borderRadius: "50%" }} />
          <div className="login-name">Sanctum</div>
        </div>
        <div className="login-title">{isRecovery ? "Reset your password" : "Welcome to Sanctum"}</div>
        <div className="login-sub">
          {linkBroken
            ? "This link is no longer valid."
            : isRecovery
              ? "Choose a new password for your account"
              : "Set a password to finish creating your account"}
        </div>
        {error && <div className="login-error">{error}</div>}
        {!linkBroken && (
          <>
            <div className="form-row">
              <label className="form-label">New password</label>
              <input className="inp" type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••" onKeyDown={e => e.key === "Enter" && handle()} autoFocus />
            </div>
            <div className="form-row">
              <label className="form-label">Confirm password</label>
              <input className="inp" type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
                placeholder="••••••••" onKeyDown={e => e.key === "Enter" && handle()} />
            </div>
            <button className="btn primary" style={{ width: "100%", justifyContent: "center", padding: "12px", marginTop: 8 }}
              onClick={handle} disabled={loading}>
              {loading ? "Please wait..." : isRecovery ? "Update password" : "Create account"}
            </button>
          </>
        )}
        <div style={{ textAlign: "center", marginTop: 18, fontSize: 12, color: "var(--t3)" }}>
          <span style={{ color: "var(--blue)", cursor: "pointer", fontWeight: 600 }} onClick={onCancel}>
            Back to sign in
          </span>
        </div>
        {onPrivacy && (
          <div style={{ textAlign: "center", marginTop: 16 }}>
            <button className="btn ghost" onClick={onPrivacy}
              style={{ fontSize: 11, color: "var(--t3)", background: "none", border: "none", cursor: "pointer" }}>
              Privacy Policy
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
