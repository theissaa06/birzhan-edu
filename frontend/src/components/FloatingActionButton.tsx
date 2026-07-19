import { type KeyboardEvent, useCallback, useEffect, useRef, useState } from "react";
import FrameIcon from "./FrameIcon";
import UserAvatar from "./UserAvatar";
import { useAuthSession } from "./AuthSessionProvider";
import {
  getMySupportMessages,
  sendSupportMessage,
  type SupportMessage,
} from "../services/support";
import "./FloatingActionButton.css";

function apiErrorMessage(error: unknown) {
  return (
    (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
    (error instanceof Error ? error.message : "Не удалось связаться со службой поддержки.")
  );
}

function createRequestId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `support:${Date.now().toString(36)}:${Math.random().toString(36).slice(2, 12)}`;
}

function sortMessages(messages: SupportMessage[]) {
  return [...messages].sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
}

export default function FloatingActionButton() {
  const { user } = useAuthSession();
  const [open, setOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [text, setText] = useState("");
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const requestIdRef = useRef<string | null>(null);
  const sendingRef = useRef(false);
  const historyPromiseRef = useRef<Promise<SupportMessage[] | null> | null>(null);

  const hasAuthToken = useCallback(() => Boolean(localStorage.getItem("token")), []);

  const loadMessages = useCallback(async (showLoading = false, quiet = false) => {
    if (!hasAuthToken()) {
      setMessages([]);
      if (!quiet) setError("Войдите в аккаунт, чтобы написать в поддержку и видеть ответы.");
      return [];
    }

    if (historyPromiseRef.current) return historyPromiseRef.current;

    if (showLoading) setLoading(true);
    const request = (async () => {
      try {
        const data = sortMessages(await getMySupportMessages());
        setMessages(data);
        if (!quiet) setError("");
        return data;
      } catch (loadError) {
        if (!quiet) setError(apiErrorMessage(loadError));
        return null;
      } finally {
        historyPromiseRef.current = null;
        if (showLoading) setLoading(false);
      }
    })();
    historyPromiseRef.current = request;
    return request;
  }, [hasAuthToken]);

  useEffect(() => {
    if (!chatOpen) return undefined;
    void loadMessages(true);
    const interval = window.setInterval(() => void loadMessages(false, true), 10000);
    return () => window.clearInterval(interval);
  }, [chatOpen, loadMessages]);

  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [messages, chatOpen, loading]);

  async function handleSend() {
    const trimmed = text.trim();
    if (sendingRef.current) return;
    if (trimmed.length < 5) {
      setError("Введите не менее 5 символов.");
      return;
    }
    if (!hasAuthToken()) {
      setError("Войдите в аккаунт, чтобы написать в поддержку и видеть ответы.");
      return;
    }

    sendingRef.current = true;
    setSending(true);
    setError("");
    setStatus("");
    const clientRequestId = requestIdRef.current || createRequestId();
    requestIdRef.current = clientRequestId;
    let accepted: SupportMessage | null = null;

    try {
      accepted = await sendSupportMessage({ text: trimmed, clientRequestId });
      const stored = await loadMessages(false, true);
      if (!stored?.some((message) => message.id === accepted?.id)) {
        setError("Сервер ответил, но подтверждение сохранения не получено. Повторите отправку — дубликат не создастся.");
        return;
      }

      setText("");
      requestIdRef.current = null;
      setStatus("Сообщение сохранено и передано в поддержку.");
    } catch (sendError) {
      setError(apiErrorMessage(sendError));
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  }

  function handleMessageKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (!sending) void handleSend();
    }
  }

  function openChat() {
    setChatOpen(true);
    setOpen(false);
    setError("");
    setStatus("");
  }

  return (
    <>
      {chatOpen && (
        <section className="support-chat-window" aria-label="Чат поддержки" aria-busy={loading || sending}>
          <header className="support-chat-header">
            <span className="support-chat-header__icon"><FrameIcon name="support" /></span>
            <div>
              <strong>Техподдержка</strong>
              <span>Сообщения сохраняются в вашем аккаунте</span>
            </div>
            <button
              type="button"
              className="support-chat-close"
              onClick={() => setChatOpen(false)}
              aria-label="Закрыть чат"
            >
              <FrameIcon name="close" />
            </button>
          </header>

          <div className="support-chat-body" ref={bodyRef}>
            {loading ? (
              <div className="support-chat-loading" role="status">Загружаем историю…</div>
            ) : messages.length === 0 ? (
              <div className="support-chat-empty">
                <span><FrameIcon name="support" /></span>
                <strong>Напишите нам</strong>
                <p>Задайте вопрос по курсам, урокам, бонусам или аккаунту.</p>
              </div>
            ) : (
              messages.map((message) => (
                <article
                  key={message.id}
                  className={message.from === "admin" ? "support-message support-message--admin" : "support-message support-message--user"}
                >
                  {message.from === "admin" ? <span className="support-message-avatar" aria-hidden="true"><FrameIcon name="support" /></span> : <UserAvatar name={user?.username} avatarUrl={typeof user?.avatarUrl === "string" ? user.avatarUrl : null} size="small" decorative />}
                  <div><span>{message.from === "admin" ? "Поддержка" : "Вы"}</span><p>{message.text}</p></div>
                </article>
              ))
            )}
          </div>

          <div className="support-chat-feedback" aria-live="polite" aria-atomic="true">
            {error && <p className="support-chat-error" role="alert"><FrameIcon name="warning" />{error}</p>}
            {!error && status && <p className="support-chat-status" role="status"><FrameIcon name="check" />{status}</p>}
          </div>

          <div className="support-chat-footer">
            <label className="sr-only" htmlFor="support-widget-message">Сообщение в поддержку</label>
            <textarea
              id="support-widget-message"
              value={text}
              onChange={(event) => {
                setText(event.target.value);
                setError("");
                setStatus("");
              }}
              onKeyDown={handleMessageKeyDown}
              placeholder="Сообщение…"
              maxLength={4000}
              disabled={sending}
            />
            <button
              type="button"
              className="support-chat-send"
              onClick={() => void handleSend()}
              disabled={sending || text.trim().length < 5}
              aria-label={sending ? "Сообщение отправляется" : "Отправить сообщение"}
            >
              <FrameIcon name="send" />
            </button>
            <small>Enter — отправить · Shift+Enter — новая строка</small>
          </div>
        </section>
      )}

      <div className="support-fab-container">
        {open && (
          <button
            type="button"
            className="support-fab support-fab--chat"
            onClick={openChat}
            aria-label="Открыть чат поддержки"
          >
            <FrameIcon name="support" />
          </button>
        )}

        <button
          type="button"
          className="support-fab"
          onClick={() => setOpen((value) => !value)}
          aria-label={open ? "Закрыть меню поддержки" : "Открыть меню поддержки"}
          aria-expanded={open}
        >
          <FrameIcon name={open ? "close" : "support"} />
        </button>
      </div>
    </>
  );
}
