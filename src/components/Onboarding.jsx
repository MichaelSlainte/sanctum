// Copyright © 2026 Michael FR Marques & Tamara Lechner. All rights reserved.
// Sanctum — Private and confidential. Unauthorised use prohibited.
// https://sanctum.app
import { useState } from "react";

// Three-step welcome flow shown once to new (non-owner) users. Props:
//   onComplete(openTracker: boolean) — true if the user chose to create a
//   tracker (App opens TrackerCreator), false if they skipped.
const FEATURES = [
  { icon: "🔒", label: "Notes",    desc: "End-to-end encrypted" },
  { icon: "📅", label: "Calendar", desc: "AI-powered scheduling" },
  { icon: "📊", label: "Trackers", desc: "Track anything you want" },
  { icon: "✅", label: "Tasks",    desc: "Stay on top of your day" },
];

export default function Onboarding({ onComplete }) {
  const [step, setStep] = useState(1);

  const overlay = {
    position: "fixed", inset: 0, zIndex: 1000,
    background: "var(--bg)",
    display: "flex", alignItems: "center", justifyContent: "center",
    padding: 20,
  };
  const card = {
    width: "100%", maxWidth: 480, padding: 40,
    background: "var(--bg1)", border: "1px solid var(--b2)", borderRadius: 20,
    textAlign: "center",
  };
  const heading = { fontSize: 26, fontWeight: 700, color: "var(--t1)", letterSpacing: "-.5px", margin: "0 0 8px" };
  const subHeading = { fontSize: 14, color: "var(--t3)", margin: "0 0 16px" };
  const bodyText = { fontSize: 14, color: "var(--t2)", lineHeight: 1.6, margin: "0 0 28px" };
  const primaryBtn = { width: "100%", justifyContent: "center", padding: "12px" };
  const ghostBtn = { ...primaryBtn, marginTop: 10 };

  return (
    <div style={overlay}>
      <div style={card} className="animate-in">

        {step === 1 && (
          <>
            <img src="/icon.svg" width={56} height={56} alt="Sanctum" style={{ borderRadius: "50%", marginBottom: 20 }} />
            <h1 style={heading}>Welcome to Sanctum</h1>
            <div style={subHeading}>Private. Personal. Yours.</div>
            <p style={bodyText}>One private space for everything that matters — notes, habits, goals, and a life assistant that actually knows your context.</p>
            <button className="btn primary" style={primaryBtn} onClick={() => setStep(2)}>Get started →</button>
          </>
        )}

        {step === 2 && (
          <>
            <h1 style={heading}>Everything in one place</h1>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, margin: "24px 0 28px" }}>
              {FEATURES.map(f => (
                <div key={f.label} style={{ minHeight: 120, padding: 16, background: "var(--bg2)", border: "1px solid var(--b2)", borderRadius: 14, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6 }}>
                  <div style={{ fontSize: 28, lineHeight: 1 }}>{f.icon}</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "var(--t1)" }}>{f.label}</div>
                  <div style={{ fontSize: 11, color: "var(--t3)" }}>{f.desc}</div>
                </div>
              ))}
            </div>
            <button className="btn primary" style={primaryBtn} onClick={() => setStep(3)}>Next →</button>
            <button className="btn ghost" style={ghostBtn} onClick={() => setStep(1)}>← Back</button>
          </>
        )}

        {step === 3 && (
          <>
            <h1 style={heading}>Let's set up your first tracker</h1>
            <p style={bodyText}>Trackers let you log anything — workouts, mood, habits, reading. Describe what you want to track and AI will build it for you.</p>
            <button className="btn primary" style={primaryBtn} onClick={() => onComplete(true)}>Create my first tracker</button>
            <button className="btn ghost" style={ghostBtn} onClick={() => onComplete(false)}>Skip for now</button>
            <button className="btn ghost" style={ghostBtn} onClick={() => setStep(2)}>← Back</button>
          </>
        )}

        {/* Progress dots */}
        <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 28 }}>
          {[1, 2, 3].map(n => (
            <div key={n} style={{ width: 8, height: 8, borderRadius: "50%", background: step === n ? "var(--blue)" : "var(--b2)", transition: "background .2s" }} />
          ))}
        </div>

      </div>
    </div>
  );
}
