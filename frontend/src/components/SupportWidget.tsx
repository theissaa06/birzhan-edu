import { useState } from "react";
import { sendSupportMessage } from "../services/support";
import { getUser } from "../services/auth";

export default function SupportWidget() {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [messages, setMessages] = useState<{ from: string; text: string }[]>([
    { from: "bot", text: "👋 Привет! Чем могу помочь?" },
  ]);
  const [loading, setLoading] = useState(false);
  const user = getUser();

  const send = async () => {
    if (!text.trim()) return;
    const msg = text;
    setText("");
    setMessages((prev) => [...prev, { from: "user", text: msg }]);
    setLoading(true);
    try {
      await sendSupportMessage({
        text,
        from: "user",
      });
    } catch {
      setMessages((prev) => [
        ...prev,
        { from: "bot", text: "❌ Ошибка. Попробуй ещё раз." },
      ]);
    }
    setLoading(false);
  };

  return (
    <>
      {/* Chat Window */}
      {open && (
        <div
          style={{
            position: "fixed",
            bottom: 80,
            right: 24,
            width: 340,
            background: "#fff",
            borderRadius: 20,
            boxShadow: "0 8px 40px rgba(0,0,0,0.18)",
            zIndex: 9998,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            border: "1px solid var(--gray-border)",
          }}
        >
          <div
            style={{
              background: "var(--gradient)",
              color: "#fff",
              padding: "16px 20px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <div style={{ fontWeight: 700 }}>💬 Техподдержка</div>
              <div style={{ fontSize: 12, opacity: 0.85 }}>
                Онлайн · Отвечаем быстро
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              style={{
                background: "rgba(255,255,255,0.2)",
                border: "none",
                color: "#fff",
                borderRadius: 8,
                padding: "4px 10px",
                cursor: "pointer",
                fontSize: 16,
              }}
            >
              ✕
            </button>
          </div>

          <div
            style={{
              flex: 1,
              padding: 16,
              overflowY: "auto",
              maxHeight: 280,
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            {messages.map((m, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  justifyContent: m.from === "user" ? "flex-end" : "flex-start",
                }}
              >
                <div
                  style={{
                    maxWidth: "80%",
                    padding: "10px 14px",
                    borderRadius:
                      m.from === "user"
                        ? "16px 16px 4px 16px"
                        : "16px 16px 16px 4px",
                    background:
                      m.from === "user"
                        ? "var(--gradient)"
                        : "var(--gray-light)",
                    color: m.from === "user" ? "#fff" : "var(--black)",
                    fontSize: 14,
                    lineHeight: 1.5,
                  }}
                >
                  {m.text}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ fontSize: 13, color: "var(--gray)" }}>
                Печатает...
              </div>
            )}
          </div>

          <div
            style={{
              padding: 12,
              borderTop: "1px solid var(--gray-border)",
              display: "flex",
              gap: 8,
            }}
          >
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="Напиши сообщение..."
              className="input-field"
              style={{ flex: 1, padding: "10px 14px", fontSize: 14 }}
            />
            <button
              onClick={send}
              style={{
                background: "var(--gradient)",
                color: "#fff",
                border: "none",
                borderRadius: 10,
                padding: "10px 16px",
                fontWeight: 700,
                cursor: "pointer",
                fontSize: 16,
              }}
            >
              ➤
            </button>
          </div>
        </div>
      )}

      {/* Toggle Button */}
      <button
        onClick={() => setOpen(!open)}
        style={{
          position: "fixed",
          bottom: 24,
          right: 24,
          zIndex: 9999,
          width: 56,
          height: 56,
          borderRadius: "50%",
          background: "var(--gradient)",
          color: "#fff",
          fontSize: 24,
          boxShadow: "0 4px 24px rgba(124,58,237,0.4)",
          border: "none",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "transform 0.3s",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.1)")}
        onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
      >
        {open ? "✕" : "💬"}
      </button>
    </>
  );
}
