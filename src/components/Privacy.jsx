// Copyright © 2026 Michael FR Marques & Tamara Lechner. All rights reserved.
// Sanctum — Private and confidential. Unauthorised use prohibited.
// https://sanctum.app

// Standalone GDPR privacy policy page. No auth required — rendered before the
// login gate in App.jsx. Linked from Settings and the Login screen.

const headingStyle = { fontWeight: 600, color: "var(--t1)", fontSize: 15, marginTop: 28, marginBottom: 6 };
const bodyStyle = { color: "var(--t2)", fontSize: 14, lineHeight: 1.7, margin: 0 };
const listStyle = { ...bodyStyle, paddingLeft: 20, margin: "4px 0 0" };

function Section({ title, children }) {
  return (
    <section>
      <h2 style={headingStyle}>{title}</h2>
      {children}
    </section>
  );
}

export default function Privacy({ onBack }) {
  const back = onBack || (() => window.history.back());

  const cell = { padding: "10px 12px", fontSize: 13, color: "var(--t2)", borderBottom: "1px solid var(--b2)", textAlign: "left" };
  const headCell = { ...cell, color: "var(--t1)", fontWeight: 600, background: "var(--bg2)" };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <div style={{ maxWidth: 680, margin: "0 auto", padding: "32px 20px" }}>

        <button className="btn xs ghost" onClick={back} style={{ marginBottom: 20 }}>← Back</button>

        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
          <img src="/icon.svg" width={32} height={32} alt="Sanctum" style={{ borderRadius: "50%" }} />
          <span style={{ fontSize: 16, fontWeight: 700, color: "var(--t1)", letterSpacing: ".5px" }}>Sanctum</span>
        </div>

        <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--t1)", letterSpacing: "-.5px", margin: "0 0 4px" }}>Privacy Policy</h1>
        <div style={{ fontSize: 13, color: "var(--t3)", marginBottom: 8 }}>Last updated: 7 June 2026</div>

        <Section title="Who we are">
          <p style={bodyStyle}>Sanctum is operated by Michael FR Marques and Tamara Lechner, Dublin, Ireland. Contact: hello@trysanctum.app</p>
        </Section>

        <Section title="What we collect">
          <ul style={listStyle}>
            <li>Your email address and display name (used to identify your account)</li>
            <li>Notes (stored end-to-end encrypted — we cannot read them)</li>
            <li>Calendar events, tracker entries, tasks, and roadmap data you create</li>
            <li>Basic usage metrics via Vercel Speed Insights (no cookies, no personal data, aggregated only)</li>
          </ul>
        </Section>

        <Section title="Your notes are private by design">
          <p style={bodyStyle}>Notes are end-to-end encrypted with a key derived from your password. We cannot access your notes. They are never sent to any AI system. This is an architectural guarantee, not just a policy.</p>
        </Section>

        <Section title="How we use your data">
          <ul style={listStyle}>
            <li>To provide and operate the Sanctum service</li>
            <li>To authenticate you and maintain your session</li>
            <li>To power AI features (only non-encrypted data is processed)</li>
          </ul>
        </Section>

        <Section title="AI and your data">
          <p style={bodyStyle}>Sanctum uses Anthropic's Claude API to power AI features. When you use the AI assistant, relevant non-encrypted data (calendar events, tracker entries, tasks) may be sent to Anthropic for processing. Your notes are never included. Anthropic's privacy policy applies to this processing.</p>
        </Section>

        <Section title="Sub-processors">
          <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid var(--b2)", borderRadius: 8, overflow: "hidden", marginTop: 8 }}>
            <thead>
              <tr>
                <th style={headCell}>Provider</th>
                <th style={headCell}>Purpose</th>
                <th style={headCell}>Location</th>
              </tr>
            </thead>
            <tbody>
              <tr><td style={cell}>Supabase</td><td style={cell}>Database and auth</td><td style={cell}>EU (Stockholm)</td></tr>
              <tr><td style={cell}>Anthropic</td><td style={cell}>AI features</td><td style={cell}>USA</td></tr>
              <tr><td style={{ ...cell, borderBottom: "none" }}>Vercel</td><td style={{ ...cell, borderBottom: "none" }}>Hosting and delivery</td><td style={{ ...cell, borderBottom: "none" }}>USA</td></tr>
            </tbody>
          </table>
          <p style={{ ...bodyStyle, marginTop: 10 }}>For transfers to the USA, we rely on the sub-processors' standard contractual clauses and data processing agreements.</p>
        </Section>

        <Section title="Cookies and local storage">
          <p style={bodyStyle}>Sanctum does not use tracking cookies. We use your browser's local storage to keep you signed in and save your preferences. This data stays on your device and is never transmitted to us.</p>
        </Section>

        <Section title="Your rights">
          <p style={bodyStyle}>Under GDPR you have the right to:</p>
          <ul style={listStyle}>
            <li>Access your data — email hello@trysanctum.app</li>
            <li>Correct your data — update your profile in Settings</li>
            <li>Delete your data — use Settings → Delete Account (removes all your data and your account immediately)</li>
            <li>Data portability — email hello@trysanctum.app</li>
            <li>Lodge a complaint with the Data Protection Commission (Ireland): www.dataprotection.ie</li>
          </ul>
        </Section>

        <Section title="Data retention">
          <p style={bodyStyle}>We retain your data until you delete your account. Deletion is permanent and immediate.</p>
        </Section>

        <Section title="Security">
          <p style={bodyStyle}>All data is transmitted over HTTPS. Your database is hosted in the EU. Notes are end-to-end encrypted. We use Supabase's built-in security and Vercel's infrastructure security.</p>
        </Section>

        <Section title="Contact">
          <p style={bodyStyle}>For privacy questions: hello@trysanctum.app</p>
        </Section>

      </div>
    </div>
  );
}
