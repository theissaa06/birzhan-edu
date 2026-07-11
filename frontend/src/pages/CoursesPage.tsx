import { useEffect, useMemo, useState } from "react";
import api from "../services/api";
import "./CoursesPage.css";

type Lesson = {
  id: number;
  title?: string;
  orderNumber?: number;
};

type Course = {
  id: number;
  title: string;
  category: string;
  level: string;
  duration: string;
  description?: string;
  imageUrl?: string;
  lessons?: Lesson[];
};

const categories = [
  { title: "Все", value: "all", icon: "🌍" },
  { title: "CapCut", value: "capcut", icon: "✂️" },
  { title: "Premiere Pro", value: "premiere-pro", icon: "🎞️" },
  { title: "TikTok", value: "tiktok", icon: "📱" },
  { title: "Цветокоррекция", value: "color-correction", icon: "🎨" },
  { title: "Звук", value: "sound", icon: "🔊" },
  { title: "VFX", value: "vfx", icon: "⚡" },
];

const apiOrigin = (import.meta.env.VITE_API_URL || "http://localhost:3003").replace(
  /\/api\/?$/,
  "",
);

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

function getCourseLastLessonKey(courseId: string | number) {
  return getUserStorageKey(`course-last-lesson-${courseId}`);
}

export default function CoursesPage() {
  const [serverProgress, setServerProgress] = useState<number[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [activeCategory, setActiveCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [progressKey, setProgressKey] = useState(0);

  useEffect(() => {
    async function loadProgress() {
      try {
        // /users/me возвращает lessonProgress из БД
        const res = await api.get("/users/me");
        const progress =
          res.data.data?.lessonProgress ||
          res.data.user?.lessonProgress ||
          res.data.lessonProgress ||
          [];

        const completedIds = progress
          .filter((p: any) => p.completed)
          .map((p: any) => Number(p.lessonId));

        setServerProgress(completedIds);
      } catch {
        setServerProgress([]);
      }
    }

    loadProgress();
  }, []);

  useEffect(() => {
    async function loadCourses() {
      try {
        setLoading(true);
        setError("");

        const response = await api.get("/courses");
        const data =
          response.data.courses || response.data.data || response.data;

        setCourses(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Ошибка загрузки курсов:", err);
        setError("Не удалось загрузить курсы. Проверь, запущен ли backend.");
      } finally {
        setLoading(false);
      }
    }

    loadCourses();
  }, []);

  useEffect(() => {
    function updateProgress() {
      setProgressKey((prev) => prev + 1);
    }

    window.addEventListener("storage", updateProgress);
    window.addEventListener("focus", updateProgress);

    return () => {
      window.removeEventListener("storage", updateProgress);
      window.removeEventListener("focus", updateProgress);
    };
  }, []);

  const filteredCourses = useMemo(() => {
    return courses.filter((course) => {
      const matchesCategory =
        activeCategory === "all" || course.category === activeCategory;

      const matchesSearch =
        (course.title || "").toLowerCase().includes(search.toLowerCase()) ||
        (course.description || "").toLowerCase().includes(search.toLowerCase());

      return matchesCategory && matchesSearch;
    });
  }, [courses, activeCategory, search]);

  function getCourseProgress(course: Course) {
    progressKey;

    const lessons = [...(course.lessons || [])].sort(
      (a, b) => (a.orderNumber || 0) - (b.orderNumber || 0),
    );

    const total = lessons.length;

    const completedLessonIds = lessons
      .filter((lesson) => {
        const localDone =
          localStorage.getItem(getLessonCompletedKey(lesson.id)) === "true";

        const serverDone = serverProgress.includes(Number(lesson.id));

        return localDone || serverDone;
      })
      .map((lesson) => lesson.id);

    const completed = completedLessonIds.length;
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

    const firstLesson = lessons[0];

    const lastOpenedLessonId = Number(
      localStorage.getItem(getCourseLastLessonKey(course.id)),
    );

    const lastOpenedLesson = lessons.find(
      (lesson) => lesson.id === lastOpenedLessonId,
    );

    const firstNotCompletedLesson =
      lastOpenedLesson ||
      lessons.find((lesson) => !completedLessonIds.includes(lesson.id)) ||
      firstLesson;

    const continueUrl = firstNotCompletedLesson
      ? `/courses/${course.id}/lessons/${firstNotCompletedLesson.id}`
      : `/courses/${course.id}`;

    return {
      total,
      completed,
      percent,
      isCompleted: total > 0 && completed === total,
      continueUrl,
    };
  }

  return (
    <main className="courses-page">
      <section className="courses-hero">
        <div>
          <p className="courses-label">Каталог обучения</p>

          <h1>
            Выберите курс и начните <span>обучение монтажу</span>
          </h1>

          <p>
            Курсы по CapCut, Premiere Pro, TikTok-эдитам, цветокоррекции, звуку
            и VFX. Начните с простого уровня и постепенно переходите к
            профессиональному монтажу.
          </p>
        </div>

        <div className="courses-hero-card">
          <strong>{courses.length || "40+"}</strong>
          <span>курсов и уроков на платформе</span>
        </div>
      </section>

      <section className="courses-controls">
        <div className="courses-search">
          <span>🔎</span>
          <input
            type="text"
            placeholder="Найти курс..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="courses-categories">
          {categories.map((category) => (
            <button
              key={category.value}
              type="button"
              className={
                activeCategory === category.value
                  ? "course-category active"
                  : "course-category"
              }
              onClick={() => setActiveCategory(category.value)}
            >
              <span>{category.icon}</span>
              {category.title}
            </button>
          ))}
        </div>
      </section>

      {loading && (
        <section className="courses-status">
          <div className="loader"></div>
          <p>Загружаем курсы...</p>
        </section>
      )}

      {error && (
        <section className="courses-error">
          <h3>Ошибка</h3>
          <p>{error}</p>
          <p>
            Проверьте, что backend доступен по адресу <strong>{apiOrigin}</strong>
          </p>
        </section>
      )}

      {!loading && !error && (
        <section className="courses-grid-section">
          <div className="courses-result-head">
            <h2>Доступные курсы</h2>
            <p>Найдено: {filteredCourses.length}</p>
          </div>

          {filteredCourses.length === 0 ? (
            <div className="courses-empty">
              <h3>Курсы не найдены</h3>
              <p>Попробуй выбрать другую категорию или изменить поиск.</p>
            </div>
          ) : (
            <div className="courses-grid">
              {filteredCourses.map((course) => {
                const progress = getCourseProgress(course);

                return (
                  <article className="course-card" key={course.id}>
                    <div className="course-card-image">
                      {course.imageUrl ? (
                        <img src={course.imageUrl} alt={course.title} />
                      ) : (
                        <div className="course-card-placeholder">
                          {getCourseIcon(course.category)}
                        </div>
                      )}

                      <span className="course-card-badge">
                        {progress.isCompleted ? "Завершён" : course.level}
                      </span>
                    </div>

                    <div className="course-card-body">
                      <div className="course-card-meta">
                        <span>⏱ {course.duration}</span>
                        <span>📚 {progress.total} уроков</span>
                      </div>

                      <h3>{course.title}</h3>

                      <p>
                        {course.description || "Описание курса скоро появится."}
                      </p>

                      <div className="course-card-progress">
                        <div className="course-card-progress-head">
                          <span>Прогресс</span>
                          <strong>{progress.percent}%</strong>
                        </div>

                        <div className="course-card-progress-bar">
                          <div style={{ width: `${progress.percent}%` }} />
                        </div>

                        <p>
                          Пройдено {progress.completed} из {progress.total}{" "}
                          уроков
                        </p>
                      </div>

                      <a
                        href={
                          progress.completed > 0
                            ? progress.continueUrl
                            : `/courses/${course.id}`
                        }
                        className="course-card-link"
                      >
                        {progress.isCompleted
                          ? "Повторить курс →"
                          : progress.completed > 0
                            ? "Продолжить →"
                            : "Подробнее →"}
                      </a>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      )}
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
