import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import FrameIcon from "../components/FrameIcon";
import {
  getAIStatus,
  sendAIMessage,
  type AIMessage,
  type AIStatus,
} from "../services/ai";
import "./AIAssistantPage.css";

type ChatMessage = {
  id: number;
  role: "user" | "assistant" | "error";
  text: string;
};

const quickQuestions = [
  "Составь план монтажа для TikTok-ролика на 30 секунд",
  "Помоги улучшить описание моего видео",
  "Придумай 5 хуков для Reels про обучение монтажу",
  "Как сделать монтаж под бит в CapCut?",
  "Разбери мой сценарий и предложи структуру",
];

export default function AIAssistantPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 1,
      role: "assistant",
      text: "Привет! Я Frame AI, помощник Frame School по монтажу, идеям, сценариям, портфолио и обучению. Напиши задачу обычным текстом: помогу придумать хук, собрать структуру ролика, разобрать ошибку в монтаже или подготовить текст для клиента.",
    },
  ]);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [aiStatus, setAIStatus] = useState<AIStatus | null>(null);

  const chatEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    let active = true;

    async function loadAIStatus() {
      try {
        const status = await getAIStatus();
        if (active) setAIStatus(status);
      } catch (statusError) {
        console.error("[Frame AI] Не удалось проверить статус Gemini.", statusError);
      }
    }

    void loadAIStatus();
    return () => {
      active = false;
    };
  }, []);

  const aiUnavailable = aiStatus?.mode === "unavailable";

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
    if (!text || loading || aiUnavailable) return;

    setError("");
    setStatusMessage("");

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

      const finalAnswer = aiAnswer;

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 2,
          role: "assistant",
          text: finalAnswer,
        },
      ]);

      if (response.demo || response.source === "demo") {
        setStatusMessage(
          response.message ||
            "Frame AI ответил в резервном режиме без обращения к модели.",
        );
      }
    } catch (err: any) {
      const failText =
        err?.response?.data?.message ||
        (err?.code === "ECONNABORTED"
          ? "Не получилось получить ответ вовремя. Попробуй ещё раз."
          : err?.message) ||
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

  function handleQuickQuestion(question: string) {
    setInput(question);
    handleSend(question);
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

            <span className="ai-mini-badge">FRAME AI ASSISTANT</span>
          </div>

          <h1 className="ai-title">
            Универсальный <span>AI-помощник</span>
          </h1>

          <p className="ai-subtitle">
            Задавайте свободные вопросы про видеомонтаж, CapCut, Premiere Pro,
            сценарии, портфолио, первые заказы и обучение. Ключ Gemini остаётся
            только на backend.
          </p>
        </div>

        <div className="ai-hero-card">
          <div className="ai-hero-tag ai-hero-tag--top">Учёба</div>

          <div className="ai-hero-center">
            <div className="ai-bot-avatar">
              <FrameIcon name="lens" />
            </div>
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
                  onClick={() => handleQuickQuestion(question)}
                  disabled={loading || aiUnavailable}
                >
                  {question}
                </button>
              ))}
            </div>

            <div className="ai-sidebar-note">
              <strong>Frame AI</strong>
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
              <span className="ai-online">
                {aiStatus?.mode === "gemini"
                  ? "GEMINI ONLINE"
                  : aiStatus?.mode === "demo"
                    ? "DEMO"
                    : aiStatus?.mode === "unavailable"
                      ? "НЕ НАСТРОЕН"
                      : "ПРОВЕРЯЕМ"}
              </span>
              <h3>Frame AI</h3>
            </div>

            <Link
              to="/premium"
              className="ai-premium-chip"
              aria-label="Перейти к Premium PRO"
            >
              <span className="ai-premium-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" focusable="false">
                  <path d="M12 2L22 12L12 22L2 12Z" />
                </svg>
              </span>
              Premium PRO
            </Link>
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
                      : "FRAME AI"}
                </div>

                <div className="ai-message-text">{message.text}</div>
              </div>
            ))}

            {loading && (
              <div className="ai-message ai-message--assistant">
                <div className="ai-message-label">FRAME AI</div>

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
          {!error && aiUnavailable && (
            <div className="ai-error-banner" role="alert">
              Gemini не настроен на сервере. Добавьте `GEMINI_API_KEY` в
              Layero, чтобы включить реальные ответы.
            </div>
          )}
          {!error && statusMessage && (
            <div className="ai-status-banner">{statusMessage}</div>
          )}

          <form className="ai-input-row" onSubmit={handleSubmit}>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Напишите любой вопрос..."
              className="ai-input"
              rows={2}
              disabled={loading || aiUnavailable}
            />

            <button
              type="submit"
              className="ai-send-btn"
              disabled={loading || aiUnavailable || !input.trim()}
            >
              {loading ? "..." : "Отправить"}
            </button>
          </form>
        </section>
      </section>
    </main>
  );
}
