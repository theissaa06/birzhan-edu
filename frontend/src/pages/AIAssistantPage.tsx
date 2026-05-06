import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { sendAIMessage, type AIMessage } from "../services/ai";
import "./AIAssistantPage.css";

type ChatMessage = {
  id: number;
  role: "user" | "assistant" | "error";
  text: string;
};

const quickQuestions = [
  "Привет",
  "Сколько будет 2+2?",
  "Напиши поздравление с днем рождения",
  "Помоги придумать идею для видео",
  "Как сделать монтаж под бит в CapCut?",
];

export default function AIAssistantPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 1,
      role: "assistant",
      text: "Привет! Я Birzhan AI. Можешь задать мне любой вопрос: про учебу, код, тексты, идеи, монтаж, сайт или обычные темы. Чем помочь?",
    },
  ]);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const chatEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const historyForApi: AIMessage[] = useMemo(() => {
    return messages
      .filter((msg) => msg.role === "user" || msg.role === "assistant")
      .map((msg) => ({
        role: msg.role === "user" ? "user" : "assistant",
        text: msg.text,
      }));
  }, [messages]);

  async function handleSend(customText?: string) {
    const text = (customText ?? input).trim();
    if (!text || loading) return;

    setError("");

    const userMessage: ChatMessage = {
      id: Date.now(),
      role: "user",
      text,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const response = await sendAIMessage(text, historyForApi);

      const aiAnswer =
        response?.success && typeof response.answer === "string"
          ? response.answer.trim()
          : "";

      if (!aiAnswer) {
        const failText =
          response?.message || "AI временно недоступен. Попробуй ещё раз.";

        setMessages((prev) => [
          ...prev,
          {
            id: Date.now() + 1,
            role: "assistant",
            text: failText,
          },
        ]);

        setError(failText);
        return;
      }

      const finalAnswer =
        response.demo || response.source === "demo"
          ? `${aiAnswer}\n\n⚠️ AI временно работает в резервном режиме.`
          : aiAnswer;

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 2,
          role: "assistant",
          text: finalAnswer,
        },
      ]);
    } catch (err: any) {
      const failText =
        err?.response?.data?.message ||
        err?.message ||
        "AI временно недоступен. Попробуй ещё раз.";

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 3,
          role: "assistant",
          text: failText,
        },
      ]);

      setError(failText);
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    handleSend();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <main className="ai-page">
      <section className="ai-hero">
        <div className="ai-hero-left">
          <div className="ai-badges">
            <Link to="/courses" className="ai-back-link">
              ← Назад к курсам
            </Link>

            <span className="ai-mini-badge">BIRZHAN AI ASSISTANT</span>
          </div>

          <h1 className="ai-title">
            Универсальный <span>AI-помощник</span>
          </h1>

          <p className="ai-subtitle">
            Задавайте любые вопросы: учеба, тексты, идеи, код, сайт,
            видеомонтаж, CapCut, Premiere Pro, портфолио или обычные темы.
          </p>
        </div>

        <div className="ai-hero-card">
          <div className="ai-hero-tag ai-hero-tag--top">Учёба</div>

          <div className="ai-hero-center">
            <div className="ai-bot-avatar">🤖</div>
          </div>

          <div className="ai-hero-tag ai-hero-tag--left">Код</div>
          <div className="ai-hero-tag ai-hero-tag--right">Идеи</div>
        </div>
      </section>

      <section className="ai-layout">
        <aside className="ai-sidebar">
          <div className="ai-sidebar-card">
            <p className="ai-sidebar-label">БЫСТРЫЕ ВОПРОСЫ</p>

            <h2>Попробуйте спросить</h2>

            <div className="ai-quick-list">
              {quickQuestions.map((question) => (
                <button
                  key={question}
                  type="button"
                  className="ai-quick-btn"
                  onClick={() => handleSend(question)}
                  disabled={loading}
                >
                  {question}
                </button>
              ))}
            </div>

            <div className="ai-sidebar-note">
              <strong>Birzhan AI</strong>
              <p>
                Помощник отвечает на разные темы, но особенно хорошо помогает с
                обучением, сайтом, кодом и видеомонтажом.
              </p>
            </div>
          </div>
        </aside>

        <section className="ai-chat-card">
          <div className="ai-chat-header">
            <div>
              <span className="ai-online">ONLINE</span>
              <h3>Birzhan AI</h3>
            </div>

            <div className="ai-premium-chip">💎 Premium PRO</div>
          </div>

          <div className="ai-chat-body">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`ai-message ai-message--${message.role}`}
              >
                <div className="ai-message-label">
                  {message.role === "user"
                    ? "Вы"
                    : message.role === "error"
                      ? "Ошибка"
                      : "BIRZHAN AI"}
                </div>

                <div className="ai-message-text">{message.text}</div>
              </div>
            ))}

            {loading && (
              <div className="ai-message ai-message--assistant">
                <div className="ai-message-label">BIRZHAN AI</div>

                <div className="ai-message-text ai-typing">
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {error && <div className="ai-error-banner">{error}</div>}

          <form className="ai-input-row" onSubmit={handleSubmit}>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Напишите любой вопрос..."
              className="ai-input"
              rows={2}
              disabled={loading}
            />

            <button
              type="submit"
              className="ai-send-btn"
              disabled={loading || !input.trim()}
            >
              {loading ? "..." : "Отправить"}
            </button>
          </form>
        </section>
      </section>
    </main>
  );
}
