import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../services/api";
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

function getLessonCompletedKey(lessonId: string | number) {
  return getUserStorageKey(`lesson-completed-${lessonId}`);
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

export default function LessonPage() {
  const { courseId, lessonId } = useParams();

  const [course, setCourse] = useState<Course | null>(null);
  const [completed, setCompleted] = useState(false);
  const [showCongrats, setShowCongrats] = useState(false);
  const [showCourseToast, setShowCourseToast] = useState(false);
  const [hintIndex, setHintIndex] = useState(0);
  const [visibleHintCount, setVisibleHintCount] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
    return sortedLessons.filter(
      (lesson) =>
        localStorage.getItem(getLessonCompletedKey(lesson.id)) === "true",
    ).length;
  }, [sortedLessons, completed]);

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

        setCompleted(isDone);

        if (isDone && lessonId) {
          localStorage.setItem(getLessonCompletedKey(lessonId), "true");
        }
      } catch {
        // Используем localStorage как fallback.
      }
    }

    if (lessonId) {
      loadProgress();
    }
  }, [lessonId]);

  useEffect(() => {
    if (!lessonId) return;

    const saved = localStorage.getItem(getLessonCompletedKey(lessonId));

    setCompleted(saved === "true");
    setShowCongrats(false);
    setShowCourseToast(false);
    setHintIndex(0);
    setVisibleHintCount(1);
  }, [lessonId]);

  function showNextHint() {
    if (hints.length <= 1) {
      setVisibleHintCount(1);
      return;
    }

    setHintIndex((prev) => (prev + 1) % hints.length);
    setVisibleHintCount((prev) => Math.min(prev + 1, hints.length));
  }

  async function handleCompleteLesson() {
    if (!lessonId) return;

    try {
      await api.post(`/lessons/${lessonId}/complete`);
    } catch (err) {
      console.error("Backend не сохранил урок, сохраняем локально:", err);
    }

    localStorage.setItem(getLessonCompletedKey(lessonId), "true");
    localStorage.setItem(`lesson-completed-${lessonId}`, "true");
    setCompleted(true);
    setShowCongrats(true);
  }

  async function handleCompleteCourse() {
    if (!course) return;

    try {
      if (lessonId) {
        await api.post(`/lessons/${lessonId}/complete`);
      }
    } catch (err) {
      console.error(
        "Backend не сохранил последний урок, сохраняем локально:",
        err,
      );
    }

    course.lessons.forEach((lesson) => {
      localStorage.setItem(getLessonCompletedKey(lesson.id), "true");
      localStorage.setItem(`lesson-completed-${lesson.id}`, "true");
    });

    localStorage.setItem(
      getUserStorageKey(`course-completed-${course.id}`),
      "true",
    );
    localStorage.setItem(
      getUserStorageKey(`course-certificate-${course.id}`),
      "true",
    );

    const newCertificate = {
      courseId: course.id,
      courseTitle: course.title,
      claimedAt: new Date().toISOString(),
    };

    localStorage.setItem(
      getUserStorageKey("last-course-bonus"),
      JSON.stringify(newCertificate),
    );

    const savedCertificates = localStorage.getItem(
      getUserStorageKey("my-certificates"),
    );

    let certificates = [];

    if (savedCertificates) {
      try {
        certificates = JSON.parse(savedCertificates);
      } catch {
        certificates = [];
      }
    }

    const alreadyExists = certificates.some(
      (certificate: any) => certificate.courseId === course.id,
    );

    if (!alreadyExists) {
      certificates.push(newCertificate);
    }

    localStorage.setItem(
      getUserStorageKey("my-certificates"),
      JSON.stringify(certificates),
    );

    setCompleted(true);
    setShowCongrats(true);
    setShowCourseToast(true);

    setTimeout(() => {
      window.location.href = "/certificate";
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
          <div className="course-toast-icon">🎓</div>

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

          <div className="lesson-course-box">
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

          <div className="lesson-list">
            {sortedLessons.map((lesson, index) => {
              const isActive = lesson.id === currentLesson.id;
              const isDone =
                localStorage.getItem(getLessonCompletedKey(lesson.id)) ===
                "true";

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
                  <em>{isDone ? "✅" : "○"}</em>
                </Link>
              );
            })}
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

            <div className="lesson-helper-card">
              <h2>💡 Помощник новичка</h2>
              <p>
                {currentLesson.beginnerHelp ||
                  "Сначала посмотри видео, затем повтори действия у себя в редакторе. Не спеши: цель урока — понять логику и выполнить маленькую практику."}
              </p>

              <div className="lesson-hint-box">
                <span>Подсказка</span>
                <strong>{currentHint}</strong>
              </div>

              <button type="button" onClick={showNextHint}>
                Показать подсказку
              </button>
            </div>
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
              <div className="course-finish-notice-icon">🎓</div>

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
              disabled={completed}
            >
              {completed ? "🔥 Урок уже пройден" : "✅ Я выполнил задание"}
            </button>

            {nextLesson ? (
              <Link
                to={`/courses/${course.id}/lessons/${nextLesson.id}`}
                className="lesson-nav-btn primary"
              >
                Следующий урок →
              </Link>
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
              <h2>🎉 Отлично! Урок завершён.</h2>
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
    "Повтори действия из урока на своём видео.",
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
