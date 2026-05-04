import { useEffect, useState } from "react";
import {
  getSupportMessages,
  sendSupportMessage,
  SupportMessage,
} from "../services/support";

export default function FloatingActionButton() {
  const [open, setOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [text, setText] = useState("");
  const [messages, setMessages] = useState<SupportMessage[]>([]);

  async function loadMessages() {
    const data = await getSupportMessages();
    setMessages(data);
  }

  useEffect(() => {
    loadMessages();

    const interval = setInterval(() => {
      loadMessages();
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  async function handleSend() {
    if (!text.trim()) return;

    const newMessage = await sendSupportMessage({
      text,
      from: "user",
    });

    setMessages((prev) => [...prev, newMessage]);
    setText("");
  }

  return (
    <>
      {chatOpen && (
        <div style={styles.chat}>
          <div style={styles.header}>
            <strong>Техподдержка</strong>
            <button type="button" onClick={() => setChatOpen(false)}>
              ×
            </button>
          </div>

          <div style={styles.body}>
            {messages.map((m) => (
              <div
                key={m.id}
                style={
                  m.from === "admin" ? styles.adminMessage : styles.userMessage
                }
              >
                <p style={styles.messageText}>{m.text}</p>
              </div>
            ))}
          </div>

          <div style={styles.footer}>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Сообщение..."
              style={styles.textarea}
            />

            <button
              type="button"
              style={styles.sendButton}
              onClick={handleSend}
            >
              →
            </button>
          </div>
        </div>
      )}

      <div style={styles.fabContainer}>
        {open && (
          <button
            type="button"
            style={styles.fab}
            onClick={() => setChatOpen(true)}
          >
            💬
          </button>
        )}

        <button type="button" style={styles.fab} onClick={() => setOpen(!open)}>
          {open ? "×" : "+"}
        </button>
      </div>
    </>
  );
}

const styles: Record<string, React.CSSProperties> = {
  fabContainer: {
    position: "fixed",
    bottom: 20,
    right: 20,
    display: "flex",
    flexDirection: "column",
    gap: 10,
    zIndex: 9999,
  },
  fab: {
    width: 54,
    height: 54,
    borderRadius: "50%",
    border: "none",
    background: "#7c3aed",
    color: "#fff",
    fontSize: 20,
    cursor: "pointer",
    boxShadow: "0 12px 30px rgba(124, 58, 237, 0.35)",
  },
  chat: {
    position: "fixed",
    bottom: 20,
    right: 90,
    width: 320,
    height: 430,
    background: "#fff",
    borderRadius: 18,
    boxShadow: "0 18px 50px rgba(15, 23, 42, 0.22)",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    zIndex: 9999,
  },
  header: {
    padding: 14,
    borderBottom: "1px solid #eee",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    fontWeight: 800,
  },
  body: {
    flex: 1,
    padding: 12,
    overflowY: "auto",
    background: "#f8f7ff",
  },
  footer: {
    display: "flex",
    borderTop: "1px solid #eee",
    padding: 10,
    gap: 8,
    alignItems: "center",
  },
  textarea: {
    flex: 1,
    borderRadius: 10,
    border: "1px solid #ddd",
    padding: 10,
    resize: "none",
    outline: "none",
    minHeight: 40,
    maxHeight: 100,
    fontSize: 14,
    fontFamily: "inherit",
  },
  sendButton: {
    width: 42,
    height: 42,
    borderRadius: "50%",
    border: "none",
    background: "#7c3aed",
    color: "#fff",
    fontSize: 18,
    cursor: "pointer",
  },
  messageText: {
    margin: 0,
    whiteSpace: "pre-wrap",
  },
  userMessage: {
    background: "#e5e7eb",
    padding: 10,
    borderRadius: 12,
    marginBottom: 8,
    color: "#111827",
    maxWidth: "85%",
  },
  adminMessage: {
    background: "#dbeafe",
    padding: 10,
    borderRadius: 12,
    marginBottom: 8,
    color: "#111827",
    maxWidth: "85%",
    marginLeft: "auto",
  },
};
