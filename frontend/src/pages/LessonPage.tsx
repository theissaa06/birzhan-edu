import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import FrameIcon from "../components/FrameIcon";
import SubmissionReviewPanel from "../components/SubmissionReviewPanel";
import api from "../services/api";
import { createSubmission, createUploadUrl } from "../services/submissions";
import "./LessonPage.css";

type LessonType = "VIDEO" | "TEXT" | "PRACTICE" | "QUIZ";

type Lesson = {
  id: number;
  title: string;
  content?: string | null;
  description?: string | null;
  videoUrl?: string | null;
  whatYouLearn?: string[] | null;
  steps?: string[] | null;
  taskText?: string | null;
  beginnerHelp?: string | null;
  hints?: string[] | null;
  orderNumber: number;
  type: LessonType;
  autoReviewEnabled?: boolean;
  reviewCriteria?: Array<{
    id: number;
    key: string;
    title: string;
    description: string;
    kind: string;
    required: boolean;
  }>;
};

type Course = {
  id: number;
  title: string;
  category: string;
  level: string;
  duration: string;
  description: string;
  lessons: Lesson[];
};

function getCurrentUserKey() {
  try {
    const storedUser =
      localStorage.getItem("user") || localStorage.getItem("currentUser");

    if (!storedUser) return "guest";

    const user = JSON.parse(storedUser);

    return String(user.id || user.email || user.username || "guest");
  } catch {
    return "guest";
  }
}

function getUserStorageKey(key: string) {
  return `${key}:user:${getCurrentUserKey()}`;
}

function normalizeList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map(String).filter(Boolean);
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean);
    } catch {
      return value
        .split("\n")
        .map((item) => item.trim())
        .filter(Boolean);
    }
  }

  return [];
}

async function readVideoMetadata(file: File) {
  return new Promise<{ durationSeconds: number | null; width: number | null; height: number | null; hasAudio: boolean | null }>((resolve) => {
    const video = document.createElement("video") as HTMLVideoElement & { mozHasAudio?: boolean; audioTracks?: { length: number } };
    const objectUrl = URL.createObjectURL(file);
    let settled = false;
    const finish = (value: { durationSeconds: number | null; width: number | null; height: number | null; hasAudio: boolean | null }) => {
      if (settled) return;
      settled = true;
      URL.revokeObjectURL(objectUrl);
      resolve(value);
    };
    const timer = window.setTimeout(() => finish({ durationSeconds: null, width: null, height: null, hasAudio: null }), 10000);
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      window.clearTimeout(timer);
      const hasAudio = typeof video.mozHasAudio === "boolean" ? video.mozHasAudio : video.audioTracks ? video.audioTracks.length > 0 : null;
      finish({
        durationSeconds: Number.isFinite(video.duration) ? video.duration : null,
        width: video.videoWidth || null,
        height: video.videoHeight || null,
        hasAudio,
      });
    };
    video.onerror = () => {
      window.clearTimeout(timer);
      finish({ durationSeconds: null, width: null, height: null, hasAudio: null });
    };
    video.src = objectUrl;
  });
}

export default function LessonPage() {
  const { courseId, lessonId } = useParams();

  const [course, setCourse] = useState<Course | null>(null);
  const [completed, setCompleted] = useState(false);
  const [serverCompletedIds, setServerCompletedIds] = useState<number[]>([]);
  const [showCongrats, setShowCongrats] = useState(false);
  const [showCourseToast, setShowCourseToast] = useState(false);
  const [hintIndex, setHintIndex] = useState(0);
  const [, setVisibleHintCount] = useState(1);
  const [showHelper, setShowHelper] = useState(true);
  const [isSaved, setIsSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submissionType, setSubmissionType] = useState<"link" | "video">("link");
  const [submissionUrl, setSubmissionUrl] = useState("");
  const [submissionNotes, setSubmissionNotes] = useState("");
  const [submissionPublic, setSubmissionPublic] = useState(false);
  const [submissionFile, setSubmissionFile] = useState<File | null>(null);
  const [submissionLoading, setSubmissionLoading] = useState(false);
  const [submissionMessage, setSubmissionMessage] = useState("");
  const [submissionError, setSubmissionError] = useState("");
  const [submissionRefreshKey, setSubmissionRefreshKey] = useState(0);

  const currentLesson = useMemo(() => {
    if (!course || !lessonId) return null;

    return (
      course.lessons.find((lesson) => lesson.id === Number(lessonId)) || null
    );
  }, [course, lessonId]);

  const sortedLessons = useMemo(() => {
    return [...(course?.lessons || [])].sort(
      (a, b) => a.orderNumber - b.orderNumber,
    );
  }, [course]);

  const currentIndex = useMemo(() => {
    if (!currentLesson) return -1;
    return sortedLessons.findIndex((lesson) => lesson.id === currentLesson.id);
  }, [sortedLessons, currentLesson]);

  const completedLessonsCount = useMemo(() => {
    return sortedLessons.filter((lesson) => serverCompletedIds.includes(lesson.id)).length;
  }, [sortedLessons, serverCompletedIds]);

  const progressPercent = Math.round(
    (completedLessonsCount / Math.max(sortedLessons.length, 1)) * 100,
  );

  const nextLesson = currentIndex >= 0 ? sortedLessons[currentIndex + 1] : null;
  const prevLesson = currentIndex > 0 ? sortedLessons[currentIndex - 1] : null;

  const whatYouLearn = normalizeList(currentLesson?.whatYouLearn);
  const lessonSteps = normalizeList(currentLesson?.steps);
  const hints = normalizeList(currentLesson?.hints);
  const currentHint = hints[hintIndex] || "Подсказок для этого урока пока нет.";
  const embedUrl = convertYouTubeToEmbed(currentLesson?.videoUrl || "");
  const automaticReviewRequired = Boolean(currentLesson?.autoReviewEnabled && currentLesson.reviewCriteria?.length);

  const handleReviewApproved = useCallback(() => {
    if (!lessonId) return;
    setCompleted(true);
    setServerCompletedIds((current) => [...new Set([...current, Number(lessonId)])]);
  }, [lessonId]);

  useEffect(() => {
    if (courseId && lessonId) {
      localStorage.setItem(
        getUserStorageKey(`course-last-lesson-${courseId}`),
        lessonId,
      );
    }
  }, [courseId, lessonId]);

  useEffect(() => {
    async function loadCourse() {
      try {
        setLoading(true);
        setError("");

        const response = await api.get(`/courses/${courseId}`);
        const data =
          response.data.data?.course ||
          response.data.data ||
          response.data.course ||
          response.data;

        setCourse(data);
      } catch (err) {
        console.error("Ошибка загрузки урока:", err);
        setError("Не удалось загрузить урок. Проверь backend.");
      } finally {
        setLoading(false);
      }
    }

    if (courseId) {
      loadCourse();
    }
  }, [courseId]);

  useEffect(() => {
    async function markStarted() {
      if (!lessonId) return;

      try {
        await api.post(`/lessons/${lessonId}/start`);
      } catch {
        // Гость или старый backend: страница всё равно должна работать.
      }
    }

    markStarted();
  }, [lessonId]);

  useEffect(() => {
    if (automaticReviewRequired) setSubmissionType("video");
  }, [automaticReviewRequired]);

  useEffect(() => {
    async function loadProgress() {
      try {
        const res = await api.get("/users/me");
        const progress =
          res.data.data?.lessonProgress ||
          res.data.user?.lessonProgress ||
          res.data.lessonProgress ||
          [];

        const isDone = progress.some(
          (p: any) => p.lessonId === Number(lessonId) && p.completed,
        );

        setServerCompletedIds(progress.filter((p: any) => p.completed).map((p: any) => Number(p.lessonId)));
        setCompleted(isDone);
      } catch {
        setServerCompletedIds([]);
      }
    }

    if (lessonId) {
      loadProgress();
    }
  }, [lessonId]);

  useEffect(() => {
    if (!lessonId) return;

    const savedLesson = localStorage.getItem(`saved-lesson-${lessonId}`);

    setIsSaved(savedLesson === "true");
    setShowCongrats(false);
    setShowCourseToast(false);
    setHintIndex(0);
    setVisibleHintCount(1);
  }, [lessonId]);

  function showNextHint() {
    if (hints.length === 0) {
      setHintIndex(0);
      return;
    }

    if (hints.length === 1) {
      return;
    }

    setHintIndex((prev) => (prev + 1) % hints.length);
    setVisibleHintCount((prev) => Math.min(prev + 1, hints.length));
  }

  function toggleSaveLesson() {
    if (!lessonId) return;

    const newSavedState = !isSaved;
    setIsSaved(newSavedState);

    if (newSavedState) {
      localStorage.setItem(`saved-lesson-${lessonId}`, "true");
    } else {
      localStorage.removeItem(`saved-lesson-${lessonId}`);
    }
  }

  async function handleCompleteLesson() {
    if (!lessonId) return;
    if (automaticReviewRequired) {
      setSubmissionError("Этот практический урок завершится автоматически после успешной проверки видео.");
      return;
    }

    try {
      await api.post(`/lessons/${lessonId}/complete`);
      setServerCompletedIds((current) => [...new Set([...current, Number(lessonId)])]);
      setCompleted(true);
      setShowCongrats(true);
    } catch (err) {
      console.error("Backend не сохранил урок:", err);
      setSubmissionError("Не удалось сохранить завершение урока. Войдите в аккаунт и повторите попытку.");
    }
  }

  async function handleSubmitWork(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!lessonId) return;

    try {
      setSubmissionLoading(true);
      setSubmissionError("");
      setSubmissionMessage("");

      let finalUrl = submissionUrl.trim();
      let technicalMetadata: {
        uploadKey?: string;
        fileName?: string;
        contentType?: string;
        size?: number;
        durationSeconds?: number | null;
        width?: number | null;
        height?: number | null;
        hasAudio?: boolean | null;
      } | undefined;

      if (submissionType === "video") {
        if (!submissionFile) {
          setSubmissionError("Выберите видеофайл для загрузки.");
          return;
        }

        const videoMetadata = await readVideoMetadata(submissionFile);

        const upload = await createUploadUrl({
          lessonId: Number(lessonId),
          fileName: submissionFile.name,
          contentType: submissionFile.type,
          size: submissionFile.size,
        });

        const uploadResponse = await fetch(upload.uploadUrl, {
          method: "PUT",
          headers: {
            "Content-Type": submissionFile.type,
          },
          body: submissionFile,
        });

        if (!uploadResponse.ok) {
          throw new Error("R2 не принял видеофайл. Попробуйте ещё раз.");
        }

        finalUrl = upload.publicUrl;
        technicalMetadata = {
          uploadKey: upload.key,
          fileName: submissionFile.name,
          contentType: submissionFile.type,
          size: submissionFile.size,
          ...videoMetadata,
        };
      }

      if (!finalUrl) {
        setSubmissionError("Добавьте ссылку или загрузите видео.");
        return;
      }

      const created = await createSubmission({
        lessonId: Number(lessonId),
        type: submissionType,
        url: finalUrl,
        notes: submissionNotes,
        isPublic: submissionPublic,
        technicalMetadata,
      });

      setSubmissionMessage(created.message);
      setSubmissionRefreshKey((value) => value + 1);
      setSubmissionUrl("");
      setSubmissionNotes("");
      setSubmissionFile(null);
      setSubmissionPublic(false);
    } catch (err: any) {
      console.error("Ошибка отправки работы:", err);
      setSubmissionError(
        err?.response?.data?.message ||
          err?.message ||
          "Не удалось отправить работу. Попробуйте ещё раз.",
      );
    } finally {
      setSubmissionLoading(false);
    }
  }

  async function handleCompleteCourse() {
    if (!course) return;

    try {
      if (lessonId) {
        await api.post(`/lessons/${lessonId}/complete`);
        setServerCompletedIds((current) => [...new Set([...current, Number(lessonId)])]);
      }
    } catch (err) {
      console.error("Backend не сохранил последний урок:", err);
      setSubmissionError("Не удалось завершить курс. Повторите попытку после входа.");
      return;
    }

    setCompleted(true);
    setShowCongrats(true);
    setShowCourseToast(true);

    setTimeout(() => {
      window.location.href = "/certificates";
    }, 2200);
  }

  if (loading) {
    return (
      <main className="lesson-page">
        <section className="lesson-status">
          <div className="lesson-loader"></div>
          <p>Загружаем урок...</p>
        </section>
      </main>
    );
  }

  if (error || !course || !currentLesson) {
    return (
      <main className="lesson-page">
        <section className="lesson-error">
          <h1>Урок не найден</h1>
          <p>{error || "Такого урока нет в этом курсе."}</p>
          <Link to={`/courses/${courseId}`}>← Вернуться к курсу</Link>
        </section>
      </main>
    );
  }

  return (
    <main className="lesson-page">
      {showCourseToast && (
        <div className="course-toast">
          <div className="course-toast-icon"><FrameIcon name="certificate" /></div>

          <div className="course-toast-text">
            <span>Курс завершён</span>
            <strong>Сертификат уже готов!</strong>
            <p>Сейчас откроется страница с твоим сертификатом.</p>
          </div>

          <div className="course-toast-loader"></div>
        </div>
      )}

      <section className="lesson-layout">
        <aside className="lesson-sidebar">
          <Link to={`/courses/${course.id}`} className="lesson-back">
            ← Назад к курсу
          </Link>

          <div className="lesson-course-header">
            <span>Курс</span>
            <h2>{course.title}</h2>
            <p>
              Урок {currentIndex + 1} из {sortedLessons.length}
            </p>
          </div>

          <div className="lesson-progress-box">
            <div className="lesson-progress-head">
              <span>Прогресс курса</span>
              <strong>{progressPercent}%</strong>
            </div>

            <div className="lesson-progress-bar">
              <div style={{ width: `${progressPercent}%` }} />
            </div>
          </div>

          <div className="lesson-lessons-box">
            <h3>Уроки курса</h3>
            <div className="lesson-list">
              {sortedLessons.map((lesson, index) => {
                const isActive = lesson.id === currentLesson.id;
                const isDone = serverCompletedIds.includes(lesson.id);

                return (
                  <Link
                    key={lesson.id}
                    to={`/courses/${course.id}/lessons/${lesson.id}`}
                    className={
                      isActive ? "lesson-list-item active" : "lesson-list-item"
                    }
                  >
                    <strong>{String(index + 1).padStart(2, "0")}</strong>
                    <span>{lesson.title}</span>
                    <em>{isDone ? <FrameIcon name="check" /> : "○"}</em>
                  </Link>
                );
              })}
            </div>
          </div>
        </aside>

        <section className="lesson-content">
          <div className="lesson-top">
            <p className="lesson-label">
              {getLessonTypeName(currentLesson.type)} • Урок {currentIndex + 1}
            </p>
            <h1>{currentLesson.title}</h1>
            <p>
              {currentLesson.description ||
                currentLesson.content ||
                "Описание урока скоро появится."}
            </p>
            <button
              type="button"
              className={`lesson-save-btn ${isSaved ? 'saved' : ''}`}
              onClick={toggleSaveLesson}
            >
              {isSaved ? "Сохранён" : "Сохранить урок"}
            </button>
          </div>

          <div className="lesson-instruction-box">
            <div className="lesson-instruction-icon">📌</div>
            <div className="lesson-instruction-content">
              <h3>Как пройти урок</h3>
              <ol>
                <li><FrameIcon name="frame" />Сначала посмотри видео полностью</li>
                <li>📝 Прочитай раздел "Что ты узнаешь"</li>
                <li>👆 Следуй инструкциям в разделе "Пошагово"</li>
                <li><FrameIcon name="check" />Выполни практическое задание</li>
                <li><FrameIcon name="spark" />Нажми кнопку "Я выполнил задание"</li>
              </ol>
            </div>
          </div>

          <div className="lesson-video-box">
            {currentLesson.videoUrl && embedUrl ? (
              <iframe
                src={embedUrl}
                title={currentLesson.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              ></iframe>
            ) : currentLesson.videoUrl ? (
              <div className="lesson-video-placeholder lesson-video-link-fallback">
                <div>▶</div>
                <h3>Видео доступно по ссылке</h3>
                <p>Эту ссылку нельзя встроить, но её можно открыть отдельно.</p>
                <a href={currentLesson.videoUrl} target="_blank" rel="noreferrer">
                  Открыть видео →
                </a>
              </div>
            ) : (
              <div className="lesson-video-placeholder">
                <div>▶</div>
                <h3>Видео для этого урока пока не добавлено</h3>
                <p>Администратор сможет вставить YouTube-ссылку в урок.</p>
              </div>
            )}
          </div>

          <div className="lesson-real-grid">
            <div className="lesson-learn-card">
              <h2>Что ты узнаешь</h2>
              <ul>
                {(whatYouLearn.length > 0
                  ? whatYouLearn
                  : getDefaultLearnList(course.category)
                ).map((item, index) => (
                  <li key={`${item}-${index}`}>{item}</li>
                ))}
              </ul>
            </div>

            {showHelper && (
              <div className="lesson-helper-card">
                <div className="lesson-helper-header">
                  <h2>💡 Помощник новичка</h2>
                  <button
                    type="button"
                    className="lesson-helper-close"
                    onClick={() => setShowHelper(false)}
                  >
                    ✕
                  </button>
                </div>
                <p>
                  {currentLesson.beginnerHelp ||
                    "Сначала посмотри видео, затем повтори действия у себя в редакторе. Не спеши: цель урока — понять логику и выполнить маленькую практику."}
                </p>

                <div className="lesson-hint-box">
                  <span>Подсказка</span>
                  <strong>
                    {hints.length > 0
                      ? currentHint
                      : "Следуй инструкциям в разделе 'Пошагово' ниже"}
                  </strong>
                </div>

                {hints.length > 1 && (
                  <button type="button" onClick={showNextHint}>
                    Показать следующую подсказку ({hintIndex + 1}/{hints.length})
                  </button>
                )}
              </div>
            )}

            {!showHelper && (
              <button
                type="button"
                className="lesson-helper-toggle"
                onClick={() => setShowHelper(true)}
              >
                💡 Показать помощника новичка
              </button>
            )}
          </div>

          <div className="lesson-steps-card">
            <h2>Пошагово</h2>
            <div className="lesson-steps-list">
              {(lessonSteps.length > 0
                ? lessonSteps
                : getDefaultSteps(currentLesson.type, course.category)
              ).map((step, index) => (
                <div key={`${step}-${index}`}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <p>{step}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="lesson-task">
            <h2>Практическое задание</h2>
            <p>
              {currentLesson.taskText ||
                getPracticeText(currentLesson.type, course.category)}
            </p>
          </div>

          <form className="lesson-submission-card" onSubmit={handleSubmitWork}>
            <div className="lesson-submission-head">
              <span>Портфолио</span>
              <h2>Сдать практическую работу</h2>
              <p>
                Отправьте ссылку на работу или загрузите видео. Работа
                сохранится в профиле и будет доступна для проверки.
              </p>
            </div>

            {submissionMessage && (
              <div className="lesson-submission-success">{submissionMessage}</div>
            )}

            {submissionError && (
              <div className="lesson-submission-error">{submissionError}</div>
            )}

            {automaticReviewRequired && <div className="lesson-auto-review-note"><FrameIcon name="spark" /><div><strong>Автопроверка включена</strong><p>Видео проверяется по {currentLesson.reviewCriteria?.length} структурированным критериям. Следующий урок откроется после успешного результата.</p></div></div>}

            <div className="lesson-submission-tabs">
              <button
                type="button"
                className={submissionType === "link" ? "active" : ""}
                onClick={() => setSubmissionType("link")}
                disabled={submissionLoading || automaticReviewRequired}
              >
                Ссылка
              </button>
              <button
                type="button"
                className={submissionType === "video" ? "active" : ""}
                onClick={() => setSubmissionType("video")}
                disabled={submissionLoading}
              >
                Видео
              </button>
            </div>

            {submissionType === "link" ? (
              <label className="lesson-submission-field">
                <span>Ссылка на работу</span>
                <input
                  type="url"
                  value={submissionUrl}
                  onChange={(e) => setSubmissionUrl(e.target.value)}
                  placeholder="https://youtube.com/... или https://drive.google.com/..."
                  disabled={submissionLoading}
                />
              </label>
            ) : (
              <label className="lesson-submission-field">
                <span>Видеофайл MP4/MOV/WEBM/MKV</span>
                <input
                  type="file"
                  accept="video/mp4,video/quicktime,video/webm,video/x-matroska"
                  onChange={(e) => setSubmissionFile(e.target.files?.[0] || null)}
                  disabled={submissionLoading}
                />
              </label>
            )}

            <label className="lesson-submission-field">
              <span>Комментарий к работе</span>
              <textarea
                value={submissionNotes}
                onChange={(e) => setSubmissionNotes(e.target.value)}
                placeholder="Что получилось, где нужна обратная связь?"
                rows={3}
                disabled={submissionLoading}
              />
            </label>

            <label className="lesson-submission-check">
              <input
                type="checkbox"
                checked={submissionPublic}
                onChange={(e) => setSubmissionPublic(e.target.checked)}
                disabled={submissionLoading}
              />
              <span>Можно показать эту работу в публичной галерее Frame School</span>
            </label>

            <button
              type="submit"
              className="lesson-submission-submit"
              disabled={submissionLoading}
            >
              {submissionLoading ? "Отправляем..." : "Отправить работу"}
            </button>
          </form>

          <SubmissionReviewPanel lessonId={Number(currentLesson.id)} refreshKey={submissionRefreshKey} onApproved={handleReviewApproved} />

          <div className="lesson-checklist">
            <h2>Чек-лист урока</h2>

            <div className="lesson-checklist-grid">
              <div>
                <span>01</span>
                Посмотри материал до конца
              </div>

              <div>
                <span>02</span>
                Повтори действия в редакторе
              </div>

              <div>
                <span>03</span>
                Выполни практическое задание
              </div>

              <div>
                <span>04</span>
                Нажми “Я выполнил задание”
              </div>
            </div>
          </div>

          {!nextLesson && (
            <div className="course-finish-notice">
              <div className="course-finish-notice-icon"><FrameIcon name="certificate" /></div>

              <div className="course-finish-notice-content">
                <span className="course-finish-notice-badge">
                  Финальный шаг
                </span>
                <h3>Ты почти завершил курс!</h3>
                <p>
                  Нажми на кнопку <strong>«Завершить курс»</strong>, чтобы
                  завершить обучение и получить сертификат.
                </p>
              </div>
            </div>
          )}

          <div className="lesson-actions">
            {prevLesson ? (
              <Link
                to={`/courses/${course.id}/lessons/${prevLesson.id}`}
                className="lesson-nav-btn"
              >
                ← Предыдущий урок
              </Link>
            ) : (
              <Link to={`/courses/${course.id}`} className="lesson-nav-btn">
                ← К курсу
              </Link>
            )}

            <button
              className={
                completed ? "lesson-complete-btn done" : "lesson-complete-btn"
              }
              onClick={handleCompleteLesson}
              disabled={completed || automaticReviewRequired}
            >
              {completed ? "Урок уже пройден" : automaticReviewRequired ? "Ожидаем проверку видео" : "Я выполнил задание"}
            </button>

            {nextLesson && (!automaticReviewRequired || completed) ? (
              <Link
                to={`/courses/${course.id}/lessons/${nextLesson.id}`}
                className="lesson-nav-btn primary"
              >
                Следующий урок →
              </Link>
            ) : nextLesson ? (
              <button type="button" className="lesson-nav-btn primary" disabled>Следующий урок откроется после проверки</button>
            ) : automaticReviewRequired && !completed ? (
              <button type="button" className="lesson-nav-btn primary" disabled>
                Курс завершится после проверки видео
              </button>
            ) : (
              <button
                type="button"
                className="lesson-nav-btn primary"
                onClick={handleCompleteCourse}
              >
                Завершить курс →
              </button>
            )}
          </div>

          {showCongrats && (
            <div className="lesson-congrats">
              <h2>Отлично! Урок завершён.</h2>
              <p>
                Твой прогресс сохранён. Теперь можешь перейти к следующему
                уроку или повторить материал.
              </p>
            </div>
          )}
        </section>
      </section>
    </main>
  );
}

function getLessonTypeName(type: string) {
  switch (type) {
    case "VIDEO":
      return "🎥 Видеоурок";
    case "TEXT":
      return "📘 Теория";
    case "PRACTICE":
      return "📝 Практика";
    case "QUIZ":
      return "🧠 Проверка";
    default:
      return "Урок";
  }
}

function getDefaultLearnList(category: string) {
  if (category === "capcut") {
    return [
      "как повторить действия из видео",
      "где искать нужные инструменты",
      "как выполнить маленькую практику",
    ];
  }

  return [
    "что сделать в этом уроке",
    "как закрепить материал на практике",
    "как понять, что урок пройден правильно",
  ];
}

function getDefaultSteps(type: string, category: string) {
  const editor = category === "premiere-pro" ? "Premiere Pro" : "CapCut";

  if (type === "TEXT") {
    return [
      "Прочитай материал урока.",
      "Выдели главную идею.",
      "Открой редактор и найди похожий инструмент.",
      "Выполни практическое задание.",
      "Нажми кнопку завершения урока.",
    ];
  }

  return [
    "Посмотри видео полностью.",
    `Открой ${editor} на телефоне или ПК.`,
    "Повтори действия из урока на данном видео.",
    "Сохрани результат или сделай черновик.",
    "Нажми “Я выполнил задание”.",
  ];
}

function getPracticeText(type: string, category: string) {
  if (type === "PRACTICE") {
    return "Повтори действия из урока и собери короткий монтаж на 10–15 секунд. Добавь музыку, нарезку и один эффект.";
  }

  if (category === "capcut") {
    return "Открой CapCut, создай новый проект, добавь видео и попробуй сделать простую нарезку под музыку.";
  }

  if (category === "premiere-pro") {
    return "Создай проект в Premiere Pro, импортируй видео, добавь его на таймлайн и сделай первую нарезку.";
  }

  if (category === "tiktok") {
    return "Выбери короткое видео, найди бит в музыке и попробуй сделать 3 быстрых склейки под ритм.";
  }

  return "Повтори основные действия из урока и сохрани результат как свою учебную работу.";
}

function convertYouTubeToEmbed(url?: string) {
  if (!url) return null;

  let videoId = "";

  if (url.includes("youtu.be/")) {
    videoId = url.split("youtu.be/")[1]?.split("?")[0]?.split("&")[0] || "";
  } else if (url.includes("youtube.com/watch")) {
    videoId = url.split("v=")[1]?.split("&")[0] || "";
  } else if (url.includes("youtube.com/shorts/")) {
    videoId =
      url.split("youtube.com/shorts/")[1]?.split("?")[0]?.split("&")[0] || "";
  } else if (url.includes("youtube.com/embed/")) {
    videoId =
      url.split("youtube.com/embed/")[1]?.split("?")[0]?.split("&")[0] || "";
  }

  if (!videoId) return null;

  return `https://www.youtube.com/embed/${videoId}`;
}
