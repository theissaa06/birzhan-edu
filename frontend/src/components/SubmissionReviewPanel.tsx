import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  appealSubmissionReview,
  getMySubmissions,
  retrySubmissionReview,
  type AssignmentSubmission,
} from "../services/submissions";
import FrameIcon from "./FrameIcon";

type Props = {
  lessonId: number;
  refreshKey: number;
  onApproved?: () => void;
};

const statusCopy: Record<string, { label: string; description: string }> = {
  MANUAL_REQUIRED: { label: "Ручная проверка", description: "Автопроверка для этой попытки не включена. Работа сохранена для проверки командой." },
  QUEUED: { label: "В очереди", description: "Видео загружено и ожидает автоматического анализа." },
  PROCESSING: { label: "Проверяется", description: "Анализируем технические параметры, изображение, монтаж и звук." },
  APPROVED: { label: "Принято автоматически", description: "Все обязательные критерии выполнены, прогресс урока обновлён." },
  NEEDS_CHANGES: { label: "Нужна доработка", description: "Исправьте отмеченные пункты и отправьте новую версию. Число попыток не ограничено." },
  FAILED: { label: "Проверка прервана", description: "Это технический сбой, а не отклонение работы. Запустите анализ повторно." },
  APPEALED: { label: "На ручном пересмотре", description: "Команда проверит спорное решение и пришлёт уведомление." },
  MANUAL_APPROVED: { label: "Принято после пересмотра", description: "Ручная проверка подтвердила выполнение задания." },
  MANUAL_NEEDS_CHANGES: { label: "Доработку подтвердили", description: "Ручная проверка подтвердила, что работу нужно исправить." },
};

function errorText(error: unknown) {
  return (error as { response?: { data?: { message?: string } } })?.response?.data?.message || (error instanceof Error ? error.message : "Операция не выполнена.");
}

export default function SubmissionReviewPanel({ lessonId, refreshKey, onApproved }: Props) {
  const [submissions, setSubmissions] = useState<AssignmentSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [appealId, setAppealId] = useState<number | null>(null);
  const [appealReason, setAppealReason] = useState("");
  const [actionId, setActionId] = useState<number | null>(null);

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      setSubmissions(await getMySubmissions(lessonId));
      setError("");
    } catch (loadError) {
      setError(errorText(loadError));
    } finally {
      if (!quiet) setLoading(false);
    }
  }, [lessonId]);

  useEffect(() => { void load(); }, [load, refreshKey]);

  const hasPending = useMemo(() => submissions.some((item) => ["QUEUED", "PROCESSING"].includes(item.autoReview?.status || "")), [submissions]);
  const hasApproved = useMemo(() => submissions.some((item) => ["APPROVED", "MANUAL_APPROVED"].includes(item.autoReview?.status || "")), [submissions]);
  useEffect(() => { if (hasApproved) onApproved?.(); }, [hasApproved, onApproved]);
  useEffect(() => {
    if (!hasPending) return undefined;
    const timer = window.setInterval(() => { void load(true); }, 6000);
    return () => window.clearInterval(timer);
  }, [hasPending, load]);

  async function retry(id: number) {
    setActionId(id);
    try {
      await retrySubmissionReview(id);
      await load(true);
    } catch (retryError) {
      setError(errorText(retryError));
    } finally {
      setActionId(null);
    }
  }

  async function appeal(event: FormEvent) {
    event.preventDefault();
    if (!appealId) return;
    if (appealReason.trim().length < 10) {
      setError("Опишите причину пересмотра минимум в 10 символах.");
      return;
    }
    setActionId(appealId);
    try {
      await appealSubmissionReview(appealId, appealReason.trim());
      setAppealId(null);
      setAppealReason("");
      await load(true);
    } catch (appealError) {
      setError(errorText(appealError));
    } finally {
      setActionId(null);
    }
  }

  if (loading) return <section className="submission-review-panel" aria-live="polite"><p>Загружаем историю проверок…</p></section>;
  if (!submissions.length && !error) return null;

  return (
    <section className="submission-review-panel" aria-labelledby="submission-review-title">
      <header>
        <span className="timecode">AUTO REVIEW / HISTORY</span>
        <h2 id="submission-review-title">История проверок</h2>
        <p>Каждая отправка хранится отдельно. Технический сбой никогда не считается неправильным монтажом.</p>
      </header>
      {error && <div className="lesson-submission-error" role="alert">{error}</div>}
      <div className="submission-review-list">
        {submissions.map((submission) => {
          const status = submission.autoReview?.status || "MANUAL_REQUIRED";
          const copy = statusCopy[status] || statusCopy.MANUAL_REQUIRED;
          const criteria = submission.autoReview?.result?.criteria || [];
          return (
            <article key={submission.id} className={`submission-review submission-review--${status.toLowerCase()}`}>
              <div className="submission-review-head">
                <FrameIcon name={status.includes("APPROVED") ? "check" : status === "FAILED" ? "warning" : "spark"} />
                <div><strong>Попытка {submission.attemptNumber || 1}</strong><span>{new Date(submission.createdAt).toLocaleString("ru-RU")}</span></div>
                <span className="submission-review-status">{copy.label}</span>
              </div>
              <p>{submission.autoReview?.result?.summary || submission.feedback || copy.description}</p>
              {criteria.length > 0 && <ul className="submission-review-criteria">{criteria.map((criterion) => <li key={criterion.key} className={criterion.passed ? "passed" : "failed"}><span>{criterion.passed ? "Пройдено" : "Исправить"}</span><div><strong>{criterion.title}</strong><p>{criterion.feedback}</p>{criterion.timecode && <code>{criterion.timecode}</code>}</div></li>)}</ul>}
              {status === "FAILED" && <button type="button" disabled={actionId === submission.id} onClick={() => void retry(submission.id)}>{actionId === submission.id ? "Запускаем…" : "Повторить проверку"}</button>}
              {status === "NEEDS_CHANGES" && !submission.appeal && <button type="button" onClick={() => { setAppealId(submission.id); setAppealReason(""); }}>Не согласен с оценкой</button>}
              {submission.appeal && <div className="submission-review-appeal"><strong>Ручной пересмотр: {submission.appeal.status}</strong><p>{submission.appeal.resolution || "Решение ещё не принято."}</p></div>}
              {appealId === submission.id && <form className="submission-review-appeal-form" onSubmit={appeal}><label htmlFor={`appeal-${submission.id}`}>Почему решение нужно пересмотреть<textarea id={`appeal-${submission.id}`} value={appealReason} onChange={(event) => setAppealReason(event.target.value)} rows={3} maxLength={2000} required /></label><div><button type="submit" disabled={actionId === submission.id}>Передать на пересмотр</button><button type="button" onClick={() => setAppealId(null)}>Отмена</button></div></form>}
            </article>
          );
        })}
      </div>
    </section>
  );
}
