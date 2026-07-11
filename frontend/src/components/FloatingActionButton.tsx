import { useEffect, useRef, useState } from "react";
import {
  getSupportMessages,
  sendSupportMessage,
  SupportMessage,
} from "../services/support";
import "./FloatingActionButton.css";

export default function FloatingActionButton() {
  const [open, setOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [text, setText] = useState("");
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const bodyRef = useRef<HTMLDivElement | null>(null);

  function hasAuthToken() {
    return Boolean(localStorage.getItem("token"));
  }

  async function loadMessages() {
    if (!hasAuthToken()) {
      setMessages([]);
      return;
    }

    try {
      const data = await getSupportMessages();
      setMessages(data);
    } catch (error) {
      console.error("Ошибка загрузки сообщений поддержки:", error);
    }
  }

  useEffect(() => {
    if (!hasAuthToken()) {
      setMessages([]);
      return;
    }

    loadMessages();

    const interval = setInterval(() => {
      loadMessages();
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
  }, [messages, chatOpen]);

  async function handleSend() {
    if (!text.trim()) return;

    if (!hasAuthToken()) {
      setMessages([
        {
          id: Date.now(),
          text: "Чтобы написать в поддержку, войдите в аккаунт.",
          from: "admin",
          createdAt: new Date().toISOString(),
        },
      ]);
      return;
    }

    try {
      const newMessage = await sendSupportMessage({
        text,
        from: "user",
      });

      setMessages((prev) => [...prev, newMessage]);
      setText("");
    } catch (error) {
      console.error("Ошибка отправки сообщения поддержки:", error);
    }
  }

  return (
    <>
      {chatOpen && (
        <div className="support-chat-window">
          <div className="support-chat-header">
            <div>
              <strong>Техподдержка</strong>
              <span>Обычно отвечаем во время работы платформы</span>
            </div>

            <button
              type="button"
              className="support-chat-close"
              onClick={() => setChatOpen(false)}
              aria-label="Закрыть чат"
            >
              ×
            </button>
          </div>

          <div className="support-chat-body" ref={bodyRef}>
            {messages.length === 0 ? (
              <div className="support-chat-empty">
                <div>💬</div>
                <strong>Напишите нам</strong>
                <p>Задайте вопрос по курсам, урокам, бонусам или аккаунту.</p>
              </div>
            ) : (
              messages.map((m) => (
                <div
                  key={m.id}
                  className={
                    m.from === "admin"
                      ? "support-message support-message--admin"
                      : "support-message support-message--user"
                  }
                >
                  <span>{m.from === "admin" ? "Админ" : "Вы"}</span>
                  <p>{m.text}</p>
                </div>
              ))
            )}
          </div>

          <div className="support-chat-footer">
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
            />

            <button
              type="button"
              className="support-chat-send"
              onClick={handleSend}
              disabled={!text.trim()}
              aria-label="Отправить сообщение"
            >
              →
            </button>
          </div>
        </div>
      )}

      <div className="support-fab-container">
        {open && (
          <button
            type="button"
            className="support-fab support-fab--chat"
            onClick={() => setChatOpen(true)}
            aria-label="Открыть чат поддержки"
          >
            💬
            {messages.length > 0 && <span className="support-fab-dot" />}
          </button>
        )}

        <button
          type="button"
          className="support-fab"
          onClick={() => setOpen(!open)}
          aria-label="Открыть меню поддержки"
        >
          {open ? "×" : "+"}
        </button>
      </div>
    </>
  );
}
