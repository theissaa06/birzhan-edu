import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import FrameIcon from "../components/FrameIcon";
import UserAvatar from "../components/UserAvatar";
import { useAuthSession } from "../components/AuthSessionProvider";
import {
  deleteAIConversation,
  getAIConversation,
  getAIConversations,
  getAIOptions,
  getAIStatus,
  sendAIMessage,
  type AIConversation,
  type AIMessage,
  type AIOption,
  type AIStatus,
} from "../services/ai";
import "./AIAssistantPage.css";

type ChatMessage = {
  id: number | string;
  role: "user" | "assistant" | "error";
  text: string;
};

const DEFAULT_GREETING: ChatMessage = {
  id: "frame-ai-greeting",
  role: "assistant",
  text: "Привет! Я Frame AI.\n\nВыберите режим или просто задайте вопрос. Я помогу разобрать тему, подготовить конспект, план ролика, мини-тест или улучшить текст.",
};

const fallbackModes: AIOption[] = [
  { id: "assistant", label: "Помощник", description: "Практичные ответы" },
  { id: "mentor", label: "Наставник", description: "Обучение по шагам" },
  { id: "ideas", label: "Идеи", description: "Концепции и хуки" },
  { id: "reviewer", label: "Разбор", description: "Конструктивная проверка" },
];

const fallbackActions: AIOption[] = [
  { id: "answer", label: "Ответ", description: "Обычный ответ" },
  { id: "summary", label: "Конспект", description: "Структурировать материал" },
  { id: "video_plan", label: "План ролика", description: "Сценарий и монтаж" },
  { id: "quiz", label: "Мини-тест", description: "Проверить знания" },
  { id: "rewrite", label: "Улучшить текст", description: "Отредактировать текст" },
];

const quickQuestions = [
  "Составь план монтажа для TikTok-ролика на 30 секунд",
  "Помоги улучшить описание моего видео",
  "Придумай 5 хуков для Reels про обучение монтажу",
  "Как сделать монтаж под бит в CapCut?",
  "Разбери мой сценарий и предложи структуру",
];

export default function AIAssistantPage() {
  const { user, isAuthenticated } = useAuthSession();
  const [messages, setMessages] = useState<ChatMessage[]>([DEFAULT_GREETING]);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [aiStatus, setAIStatus] = useState<AIStatus | null>(null);
  const [modes, setModes] = useState<AIOption[]>(fallbackModes);
  const [actions, setActions] = useState<AIOption[]>(fallbackActions);
  const [mode, setMode] = useState("assistant");
  const [action, setAction] = useState("answer");
  const [conversations, setConversations] = useState<AIConversation[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const loadingRef = useRef(false);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    let active = true;

    async function loadAIConfiguration() {
      try {
        const [status, options] = await Promise.all([getAIStatus(), getAIOptions()]);
        if (active) {
          setAIStatus(status);
          if (options.modes.length) setModes(options.modes);
          if (options.actions.length) setActions(options.actions);
        }
      } catch (statusError) {
        console.error("[Frame AI] Не удалось проверить статус Gemini.", statusError);
      }
    }

    void loadAIConfiguration();
    return () => {
      active = false;
    };
  }, []);

  const loadConversationList = async () => {
    if (!isAuthenticated) return;
    try {
      const items = await getAIConversations();
      setConversations(items);
    } catch (historyError) {
      console.error("[Frame AI] Не удалось загрузить историю.", historyError);
      setError("Не удалось загрузить сохранённые диалоги.");
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      void loadConversationList();
    } else {
      setConversations([]);
      setConversationId(null);
    }
  }, [isAuthenticated]);

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
    if (!text || loadingRef.current || aiUnavailable) return;

    setError("");
    setStatusMessage("");

    const userMessage: ChatMessage = {
      id: Date.now(),
      role: "user",
      text,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    loadingRef.current = true;
    setLoading(true);

    try {
      const response = await sendAIMessage(text, isAuthenticated ? [] : historyForApi, {
        conversationId,
        mode,
        action,
      });

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

      if (response.conversation) {
        setConversationId(response.conversation.id);
        setConversations((prev) => [
          response.conversation as AIConversation,
          ...prev.filter((item) => item.id !== response.conversation?.id),
        ]);
      }

      setAction("answer");

      if (response.demo || response.source === "demo") {
        setStatusMessage(
          response.message ||
            "Frame AI ответил в резервном режиме без обращения к модели.",
        );
      }
    } catch (err: unknown) {
      const apiError = err as { response?: { data?: { message?: string }; status?: number }; code?: string };
      const backendMessage = apiError.response?.data?.message;
      const responseStatus = Number(apiError.response?.status || 0);
      const failText =
        (typeof backendMessage === "string" && backendMessage.trim()
          ? backendMessage.trim()
          : "") ||
        (apiError.code === "ECONNABORTED"
          ? "Не получилось получить ответ вовремя. Попробуй ещё раз."
          : responseStatus === 503
            ? "Frame AI временно недоступен. Мы уже восстанавливаем подключение к Gemini."
            : "") ||
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
      loadingRef.current = false;
      setLoading(false);
    }
  }

  function startNewConversation() {
    if (loadingRef.current) return;
    setConversationId(null);
    setMessages([DEFAULT_GREETING]);
    setInput("");
    setError("");
    setStatusMessage("");
    setAction("answer");
    setPendingDeleteId(null);
    inputRef.current?.focus();
  }

  async function openConversation(id: string) {
    if (loadingRef.current || historyLoading || id === conversationId) return;
    setHistoryLoading(true);
    setError("");
    try {
      const data = await getAIConversation(id);
      setConversationId(data.conversation.id);
      setMode(data.conversation.mode || "assistant");
      setMessages(data.messages.length ? data.messages.map((item) => ({ id: item.id, role: item.role === "user" ? "user" : "assistant", text: item.text })) : [DEFAULT_GREETING]);
      setPendingDeleteId(null);
    } catch (historyError) {
      console.error("[Frame AI] Не удалось открыть диалог.", historyError);
      setError("Не удалось открыть этот диалог.");
    } finally {
      setHistoryLoading(false);
    }
  }

  async function removeConversation(id: string) {
    if (pendingDeleteId !== id) {
      setPendingDeleteId(id);
      return;
    }
    try {
      await deleteAIConversation(id);
      setConversations((prev) => prev.filter((item) => item.id !== id));
      if (conversationId === id) startNewConversation();
      setPendingDeleteId(null);
      setStatusMessage("Диалог удалён.");
    } catch (historyError) {
      console.error("[Frame AI] Не удалось удалить диалог.", historyError);
      setError("Не удалось удалить диалог.");
    }
  }

  function chooseAction(nextAction: string) {
    setAction(nextAction);
    inputRef.current?.focus();
  }

  function handleQuickQuestion(question: string) {
    setInput(question);
    void handleSend(question);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    void handleSend();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
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
            <div className="ai-history-heading">
              <div>
                <p className="ai-sidebar-label">ПАМЯТЬ ДИАЛОГОВ</p>
                <h2>История</h2>
              </div>
              <button type="button" className="ai-new-chat-btn" onClick={startNewConversation} disabled={loading}>Новый</button>
            </div>

            {isAuthenticated ? (
              <div className="ai-history-list" aria-label="Сохранённые диалоги" aria-busy={historyLoading}>
                {conversations.length ? conversations.map((conversation) => (
                  <div key={conversation.id} className={`ai-history-item${conversation.id === conversationId ? " is-active" : ""}`}>
                    <button type="button" className="ai-history-open" onClick={() => void openConversation(conversation.id)} disabled={historyLoading || loading}>
                      <strong>{conversation.title}</strong>
                      <span>{conversation.preview || "Пустой диалог"}</span>
                    </button>
                    <button type="button" className="ai-history-delete" onClick={() => void removeConversation(conversation.id)} aria-label={`${pendingDeleteId === conversation.id ? "Подтвердить удаление" : "Удалить"}: ${conversation.title}`}>
                      {pendingDeleteId === conversation.id ? "Да" : "×"}
                    </button>
                  </div>
                )) : <p className="ai-history-empty">Первый диалог появится после ответа Frame AI.</p>}
              </div>
            ) : (
              <p className="ai-history-empty">Войдите в аккаунт, чтобы диалоги сохранялись и были доступны на других устройствах.</p>
            )}

            <div className="ai-sidebar-divider" />
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

          <div className="ai-mode-toolbar" aria-label="Режим Frame AI">
            {modes.map((item) => (
              <button key={item.id} type="button" className={`ai-mode-btn${mode === item.id ? " is-active" : ""}`} onClick={() => setMode(item.id)} disabled={loading} title={item.description} aria-pressed={mode === item.id}>
                {item.label}
              </button>
            ))}
          </div>

          <div className="ai-chat-body">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`ai-message ai-message--${message.role}`}
              >
                {message.role === "user" ? (
                  <UserAvatar name={user?.username} avatarUrl={typeof user?.avatarUrl === "string" ? user.avatarUrl : null} size="small" decorative />
                ) : (
                  <span className="ai-message-avatar" aria-hidden="true"><FrameIcon name={message.role === "error" ? "warning" : "lens"} /></span>
                )}
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
                <span className="ai-message-avatar" aria-hidden="true"><FrameIcon name="lens" /></span>
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
              Frame AI временно недоступен. Настройка подключения проверяется командой платформы.
            </div>
          )}
          {!error && statusMessage && (
            <div className="ai-status-banner">{statusMessage}</div>
          )}

          <div className="ai-action-toolbar" aria-label="Генерация контента">
            {actions.map((item) => (
              <button key={item.id} type="button" className={`ai-action-btn${action === item.id ? " is-active" : ""}`} onClick={() => chooseAction(item.id)} disabled={loading || aiUnavailable} title={item.description} aria-pressed={action === item.id}>
                {item.label}
              </button>
            ))}
          </div>

          <form className="ai-input-row" onSubmit={handleSubmit}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={action === "answer" ? "Напишите любой вопрос..." : `Добавьте материал для действия «${actions.find((item) => item.id === action)?.label || "Генерация"}»...`}
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
