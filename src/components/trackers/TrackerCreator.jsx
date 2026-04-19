import { useState, useRef, useEffect } from "react";
import { Icon, Modal } from "../shared";
import { sb } from "../../lib/supabase";

const SYSTEM_PROMPT = `You are a tracker creation assistant for Sanctum, a personal life organiser app.
Help the user create a custom tracker by asking concise questions ONE AT A TIME.

Ask in this order:
1. What they want to track (required)
2. How often per week — their goal (required)
3. Specific session types or subtypes (optional — give 3 examples relevant to their activity, accept "skip" or "no")

After question 3 (or if user skips session types), output ONLY this JSON with no other text whatsoever:
{"action":"preview_tracker","name":"<Tracker Name>","icon":"<single emoji>","description":"<one concise sentence>","weekly_goal":<number>,"color":"<hex color>","session_types":["<type1>","<type2>","<type3>"]}

Color guide: workout/fitness=#ef4444, sleep/rest=#6366f1, reading/learning=#8b5cf6, meditation/mindfulness=#10b981, running/cardio=#f97316, diet/nutrition=#06b6d4, general=#3b82f6, social=#ec4899

Rules:
- ONE question per response, max 2 sentences
- Be warm and brief
- Pick a single relevant emoji for the icon
- session_types can be empty array [] if user skipped`;

const INITIAL_MSG = {
  role: "assistant",
  content: "What do you want to track? (e.g. workout, sleep, reading, meditation)",
};

export default function TrackerCreator({ onCreated, user }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([INITIAL_MSG]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef(null);
  const scrollRef = useRef(null);

  const close = () => {
    setOpen(false);
    setTimeout(() => {
      setMessages([INITIAL_MSG]);
      setPreview(null);
      setInput("");
    }, 200);
  };

  const send = async () => {
    if (!input.trim() || loading || preview) return;
    const userMsg = input.trim();
    setInput("");
    const updated = [...messages, { role: "user", content: userMsg }];
    setMessages(updated);
    setLoading(true);

    try {
      const apiMsgs = updated.map((m) => ({ role: m.role, content: m.content }));
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ system: SYSTEM_PROMPT, messages: apiMsgs }),
      });
      const data = await res.json();
      const reply = (data.content?.[0]?.text || "").trim();

      try {
        const cleaned = reply.replace(/```(?:json)?|```/g, "").trim();
        const parsed = JSON.parse(cleaned);
        if (parsed.action === "preview_tracker") {
          setPreview(parsed);
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: `Perfect — I'll create a **${parsed.name}** tracker with a goal of ${parsed.weekly_goal} session${parsed.weekly_goal === 1 ? "" : "s"}/week. Here's your preview:`,
            },
          ]);
          setLoading(false);
          return;
        }
      } catch {}

      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Connection error. Please try again." },
      ]);
    }
    setLoading(false);
  };

  const changeSomething = () => {
    setPreview(null);
    setMessages((prev) => [
      ...prev,
      { role: "user", content: "I want to change something." },
      { role: "assistant", content: "Of course! What would you like to change?" },
    ]);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const createTracker = async () => {
    if (!preview || saving) return;
    setSaving(true);
    const id = "ct_" + Date.now();
    const tracker = {
      id,
      label: preview.name,
      icon: preview.icon,
      description: preview.description,
      weekly_goal: preview.weekly_goal || 3,
      color: preview.color || "#10b981",
      session_types: preview.session_types || [],
      created_at: new Date().toISOString(),
    };
    const local = JSON.parse(localStorage.getItem("sanctum_custom_trackers") || "[]");
    localStorage.setItem("sanctum_custom_trackers", JSON.stringify([...local, tracker]));
    try {
      await sb.from("custom_trackers").insert({
        id,
        label: tracker.label,
        icon: tracker.icon,
        description: tracker.description,
        weekly_goal: tracker.weekly_goal,
        color: tracker.color,
        user_id: user?.id,
      });
    } catch {}
    setSaving(false);
    onCreated?.(tracker);
    close();
  };

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 150);
  }, [open]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, loading, preview]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{
          display: "flex", alignItems: "center", gap: 7,
          padding: "9px 16px", borderRadius: 12,
          background: "var(--blue)", color: "#fff",
          border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600,
          boxShadow: "0 2px 8px rgba(56,139,253,0.3)",
          transition: "opacity .15s",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.85")}
        onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
      >
        <Icon name="ai" size={14} color="#fff" />
        Create with AI
      </button>

      {open && (
        <Modal title="Create tracker with AI" onClose={close} wide>
          {/* Chat */}
          <div
            ref={scrollRef}
            style={{
              height: 260, overflowY: "auto", display: "flex",
              flexDirection: "column", gap: 10, padding: "2px 0 6px",
              marginBottom: 12,
            }}
          >
            {messages.map((m, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  justifyContent: m.role === "user" ? "flex-end" : "flex-start",
                  gap: 8, alignItems: "flex-end",
                }}
              >
                {m.role === "assistant" && (
                  <div style={{
                    width: 26, height: 26, borderRadius: "50%", background: "#080808",
                    border: "1px solid var(--b2)", display: "flex", alignItems: "center",
                    justifyContent: "center", flexShrink: 0, marginBottom: 2,
                  }}>
                    <Icon name="ai" size={13} color="var(--blue)" />
                  </div>
                )}
                <div style={{
                  maxWidth: "76%", padding: "8px 12px",
                  borderRadius: m.role === "user" ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                  background: m.role === "user" ? "var(--blue)" : "var(--bg2)",
                  color: m.role === "user" ? "#fff" : "var(--t1)",
                  fontSize: 13, lineHeight: 1.55,
                }}>
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
                <div style={{
                  width: 26, height: 26, borderRadius: "50%", background: "#080808",
                  border: "1px solid var(--b2)", display: "flex", alignItems: "center",
                  justifyContent: "center", flexShrink: 0, marginBottom: 2,
                }}>
                  <Icon name="ai" size={13} color="var(--blue)" />
                </div>
                <div style={{
                  padding: "10px 14px", borderRadius: "14px 14px 14px 4px",
                  background: "var(--bg2)", display: "flex", gap: 4, alignItems: "center",
                }}>
                  <span className="ai-dot" />
                  <span className="ai-dot" />
                  <span className="ai-dot" />
                </div>
              </div>
            )}
          </div>

          {/* Preview card */}
          {preview && (
            <div style={{
              background: "var(--bg1)", border: `2px solid ${preview.color || "var(--blue)"}`,
              borderRadius: 14, padding: "14px 16px", marginBottom: 14,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                <div style={{
                  width: 46, height: 46, borderRadius: 12, fontSize: 22,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: (preview.color || "#10b981") + "22", flexShrink: 0,
                }}>
                  {preview.icon}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "var(--t1)", marginBottom: 2 }}>
                    {preview.name}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--t3)", lineHeight: 1.4 }}>
                    {preview.description}
                  </div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: preview.color, lineHeight: 1 }}>
                    {preview.weekly_goal}
                  </div>
                  <div style={{ fontSize: 10, color: "var(--t3)" }}>/ week</div>
                </div>
              </div>
              {preview.session_types?.length > 0 && (
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {preview.session_types.map((t) => (
                    <span key={t} style={{
                      fontSize: 11, padding: "3px 9px", borderRadius: 20,
                      background: (preview.color || "#10b981") + "22",
                      color: preview.color || "#10b981",
                    }}>
                      {t}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Input or action buttons */}
          {!preview ? (
            <div style={{ display: "flex", gap: 8 }}>
              <input
                ref={inputRef}
                className="inp"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
                placeholder="Type your answer…"
                disabled={loading}
                style={{ flex: 1 }}
              />
              <button
                className="btn primary"
                onClick={send}
                disabled={loading || !input.trim()}
                style={{ flexShrink: 0, padding: "0 14px" }}
              >
                <Icon name="chevR" size={15} color="#fff" />
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", gap: 10 }}>
              <button className="btn" onClick={changeSomething} style={{ flex: 1 }}>
                Change something
              </button>
              <button
                className="btn primary"
                onClick={createTracker}
                disabled={saving}
                style={{ flex: 2, justifyContent: "center", gap: 6, display: "flex", alignItems: "center" }}
              >
                {saving ? "Creating…" : (
                  <><Icon name="check" size={14} color="#fff" /> Create it</>
                )}
              </button>
            </div>
          )}
        </Modal>
      )}
    </>
  );
}
