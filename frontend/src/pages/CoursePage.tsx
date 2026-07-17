import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../services/api";
import "./CoursePage.css";

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
  imageUrl?: string | null;
  lessons: Lesson[];
};

export default function CoursePage() {
  const { courseId } = useParams();
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lessonFilter, setLessonFilter] = useState<"all" | "not-completed">(
    "all",
  );
  const [serverProgress, setServerProgress] = useState<number[]>([]);

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
        console.error("Ошибка загрузки курса:", err);
        setError("Не удалось загрузить курс. Проверь backend.");
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
        const res = await api.get("/users/me");
        const progress =
          res.data.data?.lessonProgress ||
          res.data.lessonProgress ||
          res.data.user?.lessonProgress ||
          [];

        const completedIds = progress
          .filter((p: any) => p.completed)
          .map((p: any) => p.lessonId);

        setServerProgress(completedIds);
      } catch {
        setServerProgress([]);
      }
    }

    loadProgress();
  }, []);

  const sortedLessons = useMemo(() => {
    return [...(course?.lessons || [])].sort(
      (a, b) => a.orderNumber - b.orderNumber,
    );
  }, [course]);

  const completedLessonIds = useMemo(() => {
    return sortedLessons.filter((lesson) => serverProgress.includes(lesson.id)).map((lesson) => lesson.id);
  }, [sortedLessons, serverProgress]);

  const completedCount = completedLessonIds.length;
  const totalLessons = sortedLessons.length;
  const isCourseCompleted = completedCount === totalLessons && totalLessons > 0;
  const progressPercent =
    totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

  const lastOpenedLessonId = Number(
    courseId ? localStorage.getItem(`course-last-lesson-${courseId}`) : 0,
  );

  const lastOpenedLesson = sortedLessons.find(
    (lesson) => lesson.id === lastOpenedLessonId,
  );

  const firstNotCompletedLesson =
    lastOpenedLesson ||
    sortedLessons.find((lesson) => !completedLessonIds.includes(lesson.id)) ||
    sortedLessons[0];

  const visibleLessons =
    lessonFilter === "not-completed"
      ? sortedLessons.filter(
          (lesson) => !completedLessonIds.includes(lesson.id),
        )
      : sortedLessons;

  if (loading) {
    return (
      <main className="course-page">
        <section className="course-status">
          <div className="course-loader"></div>
          <p>Загружаем курс...</p>
        </section>
      </main>
    );
  }

  if (error || !course) {
    return (
      <main className="course-page">
        <section className="course-error">
          <h1>Ошибка</h1>
          <p>{error || "Курс не найден."}</p>
          <Link to="/courses">← Вернуться в каталог</Link>
        </section>
      </main>
    );
  }

  return (
    <main className="course-page">
      <section className="course-hero">
        <div className="course-hero-content">
          <Link to="/courses" className="course-back">
            ← Назад в каталог
          </Link>

          <p className="course-label">{getCategoryName(course.category)}</p>

          <h1>{course.title}</h1>

          <p className="course-description">{course.description}</p>

          <div className="course-meta">
            <div>
              <strong>{course.duration}</strong>
              <span>длительность</span>
            </div>

            <div>
              <strong>{course.level}</strong>
              <span>уровень</span>
            </div>

            <div>
              <strong>{totalLessons}</strong>
              <span>уроков</span>
            </div>
          </div>

          <div className="course-progress-card">
            <div className="course-progress-head">
              <span>Прогресс обучения</span>
              <strong>{progressPercent}%</strong>
            </div>

            {isCourseCompleted && (
              <div className="course-complete-card">
                <div className="course-complete-icon">🏆</div>

                <div>
                  <span>Курс завершён</span>
                  <h3>Молодец, ты прошёл весь курс!</h3>
                  <p>
                    Все уроки отмечены как пройденные. Сертификат уже готов —
                    нажми кнопку ниже, чтобы открыть его и сохранить результат
                    обучения.
                  </p>
                </div>

                <Link
                  to="/bonus"
                  className="course-complete-btn"
                >
                  Открыть бонусы
                </Link>
              </div>
            )}

            <div className="course-progress-bar">
              <div style={{ width: `${progressPercent}%` }}></div>
            </div>

            <p>
              Пройдено {completedCount} из {totalLessons} уроков
              {isCourseCompleted ? " — курс завершён" : ""}
            </p>

            {isCourseCompleted && (
              <Link
                to="/certificates"
                className="course-certificate-btn"
              >
                Открыть сертификат
              </Link>
            )}
          </div>

          {firstNotCompletedLesson && (
            <Link
              to={`/courses/${course.id}/lessons/${firstNotCompletedLesson.id}`}
              className="course-start-btn"
            >
              {isCourseCompleted
                ? "↻ Повторить курс"
                : completedCount > 0
                  ? "▶ Продолжить обучение"
                  : "▶ Начать обучение"}
            </Link>
          )}
        </div>

        <div className="course-visual">
          <div className="course-icon">{getCourseIcon(course.category)}</div>
          <div className="course-visual-card">
            <span>Программа курса</span>
            <strong>{totalLessons} уроков</strong>
          </div>
        </div>
      </section>

      <section className="course-lessons-section">
        <div className="course-section-head">
          <p className="course-label">Уроки курса</p>
          <h2>Программа обучения</h2>
          <p>
            Проходите уроки по порядку: смотрите видео, повторяйте действия и
            выполняйте практику.
          </p>

          <div className="lesson-filter-tabs">
            <button
              type="button"
              className={lessonFilter === "all" ? "active" : ""}
              onClick={() => setLessonFilter("all")}
            >
              Все уроки
            </button>

            <button
              type="button"
              className={lessonFilter === "not-completed" ? "active" : ""}
              onClick={() => setLessonFilter("not-completed")}
            >
              Не пройденные
            </button>
          </div>
        </div>

        <div className="course-lessons-list">
          {visibleLessons.length === 0 ? (
            <div className="course-empty-lessons">
              <h3>
                {lessonFilter === "not-completed"
                  ? "Все уроки уже пройдены"
                  : "Уроков пока нет"}
              </h3>
              <p>
                {lessonFilter === "not-completed"
                  ? "Ты завершил все уроки этого курса. Отличная работа!"
                  : "Администратор скоро добавит материалы для этого курса."}
              </p>
            </div>
          ) : (
            visibleLessons.map((lesson, index) => {
              const isCompleted = completedLessonIds.includes(lesson.id);

              return (
                <article
                  className={
                    isCompleted ? "lesson-row lesson-row--done" : "lesson-row"
                  }
                  key={lesson.id}
                >
                  <div className="lesson-number">
                    {isCompleted ? "✓" : String(index + 1).padStart(2, "0")}
                  </div>

                  <div className="lesson-info">
                    <span>{getLessonTypeName(lesson.type)}</span>
                    <h3>{lesson.title}</h3>
                    <p>{lesson.content || "Описание урока скоро появится."}</p>

                    {isCompleted && (
                      <em className="lesson-done-label">Урок пройден</em>
                    )}
                  </div>

                  <Link
                    to={`/courses/${course.id}/lessons/${lesson.id}`}
                    className="lesson-open-btn"
                  >
                    {isCompleted ? "Повторить урок →" : "Открыть урок →"}
                  </Link>
                </article>
              );
            })
          )}
        </div>
      </section>
    </main>
  );
}

function getCourseIcon(category: string) {
  switch (category) {
    case "capcut":
      return "✂️";
    case "premiere-pro":
      return "🎞️";
    case "tiktok":
      return "📱";
    case "color-correction":
      return "🎨";
    case "sound":
      return "🔊";
    case "vfx":
      return "⚡";
    default:
      return "🎬";
  }
}

function getCategoryName(category: string) {
  switch (category) {
    case "capcut":
      return "CapCut";
    case "premiere-pro":
      return "Premiere Pro";
    case "tiktok":
      return "TikTok / Reels";
    case "color-correction":
      return "Цветокоррекция";
    case "sound":
      return "Звук";
    case "vfx":
      return "VFX";
    default:
      return "Видеомонтаж";
  }
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
