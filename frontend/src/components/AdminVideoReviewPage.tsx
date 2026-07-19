import { type FormEvent, useCallback, useEffect, useState } from "react";
import api from "../services/api";
import { showToast } from "../services/appToast";
import FrameIcon from "./FrameIcon";
import "./AdminVideoReviewPage.css";

type Criterion = {
  id?: number;
  key: string;
  title: string;
  description: string;
  kind: string;
  required: boolean;
  minValue?: number | string | null;
  maxValue?: number | string | null;
  expectedValue?: string | null;
  weight?: number;
};

type LessonConfig = {
  id: number;
  title: string;
  type: string;
  autoReviewEnabled: boolean;
  course: { id: number; title: string };
  reviewCriteria: Criterion[];
};

type ReviewLog = {
  id: number;
  status: string;
  result?: { score?: number; summary?: string; criteria?: Array<{ key: string; title: string; passed: boolean; feedback: string; timecode?: string | null }> } | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  createdAt: string;
  completedAt?: string | null;
  submission: {
    id: number;
    attemptNumber?: number;
    url?: string | null;
    user: { id: number; username: string; email: string };
    lesson: { id: number; title: string; course: { id: number; title: string } };
    appeal?: { id: number; reason: string; status: string; resolution?: string | null } | null;
  };
};

const kinds = [
  ["DURATION", "Длительность"],
  ["RESOLUTION", "Разрешение"],
  ["FORMAT", "Формат"],
  ["FILE_SIZE", "Размер файла"],
  ["AUDIO_PRESENT", "Наличие аудио"],
  ["SOUND_SYNC", "Синхронизация звука"],
  ["TRANSITIONS", "Склейки и переходы"],
  ["COLOR", "Цветокоррекция"],
  ["CUSTOM", "Пользовательский критерий"],
] as const;

function getError(error: unknown) {
  return (error as { response?: { data?: { message?: string } } })?.response?.data?.message || (error instanceof Error ? error.message : "Операция не выполнена.");
}

function blankCriterion(index: number): Criterion {
  return { key: `criterion-${index}`, title: "", description: "", kind: "CUSTOM", required: true, minValue: "", maxValue: "", expectedValue: "", weight: 1 };
}

export default function AdminVideoReviewPage() {
  const [lessons, setLessons] = useState<LessonConfig[]>([]);
  const [reviews, setReviews] = useState<ReviewLog[]>([]);
  const [selectedLesson, setSelectedLesson] = useState<LessonConfig | null>(null);
  const [criteria, setCriteria] = useState<Criterion[]>([]);
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [appealReview, setAppealReview] = useState<ReviewLog | null>(null);
  const [resolution, setResolution] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [lessonsResponse, reviewsResponse] = await Promise.all([
        api.get("/submissions/admin/lessons"),
        api.get("/submissions/admin/reviews"),
      ]);
      setLessons(lessonsResponse.data.data || []);
      setReviews(reviewsResponse.data.data || []);
    } catch (error) {
      showToast({ tone: "error", title: "Автопроверка", message: getError(error) });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  function editLesson(lesson: LessonConfig) {
    setSelectedLesson(lesson);
    setEnabled(lesson.autoReviewEnabled);
    setCriteria(lesson.reviewCriteria.map((criterion) => ({ ...criterion, minValue: criterion.minValue ?? "", maxValue: criterion.maxValue ?? "", expectedValue: criterion.expectedValue ?? "" })));
  }

  function updateCriterion(index: number, patch: Partial<Criterion>) {
    setCriteria((current) => current.map((criterion, criterionIndex) => criterionIndex === index ? { ...criterion, ...patch } : criterion));
  }

  async function saveCriteria(event: FormEvent) {
    event.preventDefault();
    if (!selectedLesson) return;
    setSaving(true);
    try {
      const { data } = await api.put(`/submissions/admin/lessons/${selectedLesson.id}/criteria`, {
        autoReviewEnabled: enabled,
        criteria: criteria.map(({ id: _id, ...criterion }) => criterion),
      });
      showToast({ tone: "success", title: "Критерии сохранены", message: data.message });
      setSelectedLesson(null);
      await load();
    } catch (error) {
      showToast({ tone: "error", title: "Критерии не сохранены", message: getError(error) });
    } finally {
      setSaving(false);
    }
  }

  async function resolveAppeal(decision: "APPROVED" | "NEEDS_CHANGES") {
    if (!appealReview?.submission.appeal) return;
    if (resolution.trim().length < 5) {
      showToast({ tone: "error", title: "Добавьте пояснение", message: "Ручное решение должно содержать минимум 5 символов." });
      return;
    }
    setSaving(true);
    try {
      const { data } = await api.post(`/submissions/admin/appeals/${appealReview.submission.appeal.id}/resolve`, { decision, resolution: resolution.trim() });
      showToast({ tone: "success", title: "Пересмотр завершён", message: data.message });
      setAppealReview(null);
      setResolution("");
      await load();
    } catch (error) {
      showToast({ tone: "error", title: "Решение не сохранено", message: getError(error) });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="admin-video-review">
      <section className="admin-video-review-intro">
        <FrameIcon name="spark" />
        <div><span className="timecode">VIDEO / CONTROLLED ROLLOUT</span><h3>Автопроверка монтажных работ</h3><p>Автоматический анализ включается отдельно для каждого урока и только после добавления структурированных критериев. Технический сбой не отклоняет работу.</p></div>
      </section>

      {loading && <div className="admin-loading" aria-live="polite">Загружаем критерии и журнал решений…</div>}
      {!loading && <div className="admin-video-review-grid">
        <section>
          <header><h3>Настройка уроков</h3><span>{lessons.filter((lesson) => lesson.autoReviewEnabled).length} включено</span></header>
          <div className="admin-video-lessons">{lessons.map((lesson) => <button type="button" key={lesson.id} onClick={() => editLesson(lesson)}><div><strong>{lesson.title}</strong><span>{lesson.course.title}</span></div><span className={lesson.autoReviewEnabled ? "enabled" : ""}>{lesson.autoReviewEnabled ? `${lesson.reviewCriteria.length} критериев` : "ручная проверка"}</span></button>)}</div>
        </section>
        <section>
          <header><h3>Журнал решений</h3><span>{reviews.length} записей</span></header>
          <div className="admin-video-log">{reviews.map((review) => <article key={review.id}><header><div><strong>{review.submission.user.username}</strong><span>{review.submission.lesson.title} · попытка {review.submission.attemptNumber || 1}</span></div><span>{review.status}</span></header><p>{review.result?.summary || review.errorMessage || "Результат пока не сформирован."}</p>{review.result?.criteria?.length ? <ul>{review.result.criteria.map((criterion) => <li key={criterion.key} className={criterion.passed ? "passed" : "failed"}><strong>{criterion.title}</strong><span>{criterion.feedback}{criterion.timecode ? ` · ${criterion.timecode}` : ""}</span></li>)}</ul> : null}{review.submission.appeal?.status === "PENDING" && <button type="button" onClick={() => { setAppealReview(review); setResolution(""); }}>Рассмотреть апелляцию</button>}</article>)}{!reviews.length && <p className="admin-empty">Решений пока нет. Журнал заполнится после первых отправок.</p>}</div>
        </section>
      </div>}

      {selectedLesson && <form className="admin-video-editor" onSubmit={saveCriteria} aria-label="Критерии проверки монтажа">
        <header><div><span className="timecode">LESSON / {selectedLesson.id}</span><h3>{selectedLesson.title}</h3><p>{selectedLesson.course.title}</p></div><button type="button" onClick={() => setSelectedLesson(null)}>Закрыть</button></header>
        <label className="admin-video-toggle"><input type="checkbox" checked={enabled} onChange={(event) => setEnabled(event.target.checked)} /><span><strong>Включить автопроверку</strong>Нельзя включить без хотя бы одного критерия.</span></label>
        <div className="admin-video-criteria">{criteria.map((criterion, index) => <fieldset key={`${criterion.key}-${index}`}><legend>Критерий {index + 1}</legend><label>Ключ<input value={criterion.key} onChange={(event) => updateCriterion(index, { key: event.target.value })} required pattern="[a-z0-9][a-z0-9_-]{1,63}" /></label><label>Название<input value={criterion.title} onChange={(event) => updateCriterion(index, { title: event.target.value })} required minLength={3} /></label><label className="wide">Описание<textarea value={criterion.description} onChange={(event) => updateCriterion(index, { description: event.target.value })} required minLength={5} rows={3} /></label><label>Тип<select value={criterion.kind} onChange={(event) => updateCriterion(index, { kind: event.target.value })}>{kinds.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label>Ожидаемое значение<input value={criterion.expectedValue || ""} onChange={(event) => updateCriterion(index, { expectedValue: event.target.value })} placeholder="например 1920x1080" /></label><label>Минимум<input type="number" value={criterion.minValue ?? ""} onChange={(event) => updateCriterion(index, { minValue: event.target.value })} /></label><label>Максимум<input type="number" value={criterion.maxValue ?? ""} onChange={(event) => updateCriterion(index, { maxValue: event.target.value })} /></label><label className="criterion-required"><input type="checkbox" checked={criterion.required} onChange={(event) => updateCriterion(index, { required: event.target.checked })} />Обязательный</label><button type="button" className="criterion-remove" onClick={() => setCriteria((current) => current.filter((_, criterionIndex) => criterionIndex !== index))}>Удалить критерий</button></fieldset>)}</div>
        <div className="admin-video-editor-actions"><button type="button" onClick={() => setCriteria((current) => [...current, blankCriterion(current.length + 1)])}>Добавить критерий</button><button type="submit" disabled={saving || (enabled && !criteria.length)}>{saving ? "Сохраняем…" : "Сохранить конфигурацию"}</button></div>
      </form>}

      {appealReview && <section className="admin-video-editor" aria-label="Ручной пересмотр работы"><header><div><span className="timecode">APPEAL / {appealReview.submission.appeal?.id}</span><h3>Ручной пересмотр</h3><p>{appealReview.submission.user.username} · {appealReview.submission.lesson.title}</p></div><button type="button" onClick={() => setAppealReview(null)}>Закрыть</button></header><blockquote>{appealReview.submission.appeal?.reason}</blockquote>{appealReview.submission.url && <a href={appealReview.submission.url} target="_blank" rel="noreferrer">Открыть загруженное видео</a>}<label>Пояснение решения<textarea value={resolution} onChange={(event) => setResolution(event.target.value)} rows={4} minLength={5} required /></label><div className="admin-video-editor-actions"><button type="button" disabled={saving} onClick={() => void resolveAppeal("APPROVED")}>Принять работу</button><button type="button" disabled={saving} onClick={() => void resolveAppeal("NEEDS_CHANGES")}>Подтвердить доработку</button></div></section>}
    </div>
  );
}
