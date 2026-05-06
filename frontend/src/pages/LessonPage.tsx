import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../services/api";
import "./LessonPage.css";

type Lesson = {
  id: number;
  title: string;
  content?: string;
  videoUrl?: string;
  orderNumber: number;
  type: "VIDEO" | "TEXT" | "PRACTICE";
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

export default function LessonPage() {
  const { courseId, lessonId } = useParams();

  const [course, setCourse] = useState<Course | null>(null);
  const [completed, setCompleted] = useState(false);
  const [showCongrats, setShowCongrats] = useState(false);
  const [showCourseToast, setShowCourseToast] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (courseId && lessonId) {
      localStorage.setItem(`course-last-lesson-${courseId}`, lessonId);
    }
  }, [courseId, lessonId]);

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

  const nextLesson = currentIndex >= 0 ? sortedLessons[currentIndex + 1] : null;
  const prevLesson = currentIndex > 0 ? sortedLessons[currentIndex - 1] : null;

  useEffect(() => {
    async function loadCourse() {
      try {
        setLoading(true);
        setError("");

        const response = await api.get(`/courses/${courseId}`);
        const data =
          response.data.data || response.data.course || response.data;

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
    async function loadProgress() {
      try {
        const res = await api.get(`/users/me`);
        const progress = res.data.lessonProgress || [];

        const isDone = progress.some(
          (p: any) => p.lessonId === Number(lessonId) && p.completed,
        );

        setCompleted(isDone);
      } catch (e) {
        console.log("Прогресс не загрузился, используем localStorage");
      }
    }

    if (lessonId) {
      loadProgress();
    }
  }, [lessonId]);

  useEffect(() => {
    const saved = localStorage.getItem(`lesson-completed-${lessonId}`);
    setCompleted(saved === "true");
    setShowCongrats(false);
    setShowCourseToast(false);
  }, [lessonId]);

  async function handleCompleteLesson() {
    if (!lessonId) return;

    try {
      await api.post(`/lessons/${lessonId}/complete`);
    } catch (err) {
      console.error("Backend не сохранил урок, сохраняем локально:", err);
    }

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
      localStorage.setItem(`lesson-completed-${lesson.id}`, "true");
    });

    localStorage.setItem(`course-completed-${course.id}`, "true");
    localStorage.setItem(`course-certificate-${course.id}`, "true");

    const newCertificate = {
      courseId: course.id,
      courseTitle: course.title,
      claimedAt: new Date().toISOString(),
    };

    localStorage.setItem("last-course-bonus", JSON.stringify(newCertificate));

    const savedCertificates = localStorage.getItem("my-certificates");

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

    localStorage.setItem("my-certificates", JSON.stringify(certificates));

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
              <strong>
                {Math.round(
                  (sortedLessons.filter(
                    (lesson) =>
                      localStorage.getItem(`lesson-completed-${lesson.id}`) ===
                      "true",
                  ).length /
                    Math.max(sortedLessons.length, 1)) *
                    100,
                )}
                %
              </strong>
            </div>

            <div className="lesson-progress-bar">
              <div
                style={{
                  width: `${Math.round(
                    (sortedLessons.filter(
                      (lesson) =>
                        localStorage.getItem(
                          `lesson-completed-${lesson.id}`,
                        ) === "true",
                    ).length /
                      Math.max(sortedLessons.length, 1)) *
                      100,
                  )}%`,
                }}
              />
            </div>
          </div>

          <div className="lesson-list">
            {sortedLessons.map((lesson, index) => {
              const isActive = lesson.id === currentLesson.id;
              const isDone =
                localStorage.getItem(`lesson-completed-${lesson.id}`) ===
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
              {getLessonTypeName(currentLesson.type)}
            </p>
            <h1>{currentLesson.title}</h1>
            <p>{currentLesson.content || "Описание урока скоро появится."}</p>
          </div>

          <div className="lesson-video-box">
            {currentLesson.videoUrl ? (
              <iframe
                src={convertYouTubeToEmbed(currentLesson.videoUrl)}
                title={currentLesson.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              ></iframe>
            ) : (
              <div className="lesson-video-placeholder">
                <div>▶</div>
                <h3>Видео скоро появится</h3>
                <p>Здесь будет видеоурок по монтажу.</p>
              </div>
            )}
          </div>

          <div className="lesson-task">
            <h2>Практическое задание</h2>
            <p>{getPracticeText(currentLesson.type, course.category)}</p>
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
                Сохрани свой результат
              </div>

              <div>
                <span>04</span>
                Нажми “Завершить урок”
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
              {completed ? "🔥 Урок уже пройден" : "Завершить урок"}
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
              <h2>🎉 Молодец!</h2>
              <p>
                Поздравляю тебя с окончанием урока. Продолжай в том же духе!
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
    default:
      return "Урок";
  }
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
  if (!url) return "";

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

  if (!videoId) return url;

  return `https://www.youtube.com/embed/${videoId}`;
}
