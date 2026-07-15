import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuthSession } from "../components/AuthSessionProvider";
import FrameIcon, { type FrameIconName } from "../components/FrameIcon";
import UserBadges from "../components/UserBadges";
import api from "../services/api";
import { getMySubmissions, type AssignmentSubmission } from "../services/submissions";
import "./ProfilePage.css";

type User = {
  id?: number;
  username?: string;
  name?: string;
  email?: string;
  role?: string;
  badges?: string[];
  isPremium?: boolean;
  premiumPlan?: string | null;
  premiumUntil?: string | null;
};

type LessonProgress = {
  id: number;
  lessonId: number;
  courseId?: number | null;
  completed: boolean;
  started: boolean;
};

type Certificate = {
  courseId: number;
  courseTitle: string;
  claimedAt: string;
};

type CourseProgress = {
  id: number;
  title: string;
  icon: FrameIconName;
  totalLessons: number;
  completedLessons: number;
  percent: number;
};

function readCertificates(userId?: number | string): Certificate[] {
  const key = userId ? `my-certificates:user:${userId}` : "my-certificates";
  const saved = localStorage.getItem(key) || localStorage.getItem("my-certificates");
  if (!saved) return [];
  try {
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

const COURSE_ICONS: Record<string, FrameIconName> = {
  capcut: "cut",
  "premiere-pro": "timeline",
  tiktok: "phone",
  "color-correction": "lens",
  sound: "sound",
  vfx: "spark",
};

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user: sessionUser, signOut } = useAuthSession();
  const user = sessionUser as User | null;

  const [serverUser, setServerUser] = useState<User | null>(null);
  const [lessonProgress, setLessonProgress] = useState<LessonProgress[]>([]);
  const [courses, setCourses] = useState<CourseProgress[]>([]);
  const [submissions, setSubmissions] = useState<AssignmentSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [submissionsLoading, setSubmissionsLoading] = useState(true);
  const [submissionsError, setSubmissionsError] = useState("");
  const displayUser = serverUser || user;

  const certificates = readCertificates(user?.id);

  const isPremium =
    displayUser?.isPremium === true ||
    Boolean(
      displayUser?.premiumUntil &&
        new Date(displayUser.premiumUntil).getTime() > Date.now(),
    );
  const canAccessAdmin =
    displayUser?.role === "ADMIN" ||
    (displayUser?.badges || []).some((badge) =>
      ["ADMIN", "OWNER", "DEVELOPER"].includes(String(badge).toUpperCase()),
    );

  const loadSubmissions = useCallback(async () => {
    try {
      setSubmissionsLoading(true);
      setSubmissionsError("");
      const submissionList = await getMySubmissions();
      setSubmissions(submissionList);
    } catch (error) {
      console.error("Ошибка загрузки практических работ:", error);
      setSubmissions([]);
      setSubmissionsError(
        "Не удалось загрузить работы. Проверьте соединение и повторите запрос.",
      );
    } finally {
      setSubmissionsLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      try {
        setLoading(true);
        const [meRes, coursesRes] = await Promise.all([
          api.get("/users/me"),
          api.get("/courses"),
        ]);
        if (!active) return;

        const meData = meRes.data.data || meRes.data.user || meRes.data;
        const progress: LessonProgress[] = meData?.lessonProgress || [];
        if (meData) {
          setServerUser(meData);
          setLessonProgress(progress);
          localStorage.setItem("user", JSON.stringify({ ...user, ...meData }));
        }

        const coursesData =
          coursesRes.data.data || coursesRes.data.courses || coursesRes.data;
        if (Array.isArray(coursesData)) {
          const progressMap: Record<number, { completed: number }> = {};
          progress.forEach((item) => {
            if (!item.courseId) return;
            if (!progressMap[item.courseId]) progressMap[item.courseId] = { completed: 0 };
            if (item.completed) progressMap[item.courseId].completed += 1;
          });

          setCourses(
            coursesData.slice(0, 4).map((course: any) => {
              const total = Array.isArray(course.lessons) ? course.lessons.length : 0;
              const completed = progressMap[course.id]?.completed || 0;
              return {
                id: course.id,
                title: course.title,
                icon: COURSE_ICONS[course.category] || "frame",
                totalLessons: total,
                completedLessons: completed,
                percent: total > 0 ? Math.round((completed / total) * 100) : 0,
              };
            }),
          );
        }
      } catch (error) {
        console.error("Ошибка загрузки профиля:", error);
      } finally {
        if (active) setLoading(false);
      }
    }

    if (user?.id) {
      void loadProfile();
      void loadSubmissions();
    } else {
      setLoading(false);
      setSubmissionsLoading(false);
    }

    return () => {
      active = false;
    };
  }, [loadSubmissions, user?.id]);

  const completedLessons = lessonProgress.filter((p) => p.completed).length;
  const activeCourses = courses.filter((c) => c.completedLessons > 0).length;
  const completedCourses = courses.filter((c) => c.percent >= 100).length;
  const totalPercent =
    courses.length > 0
      ? Math.round(courses.reduce((s, c) => s + c.percent, 0) / courses.length)
      : 0;

  function logout() {
    signOut();
    navigate("/login");
  }

  if (!user) {
    return (
      <main className="profile-page">
        <section className="profile-not-logged">
          <div className="profile-not-logged-icon"><FrameIcon name="lens" /></div>
          <h1>Войдите в аккаунт</h1>
          <p>Чтобы видеть профиль, прогресс и сертификаты — нужно войти.</p>
          <div className="profile-not-logged-actions">
            <Link to="/login" className="profile-btn profile-btn--primary">Войти</Link>
            <Link to="/register" className="profile-btn profile-btn--light">Регистрация</Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="profile-page">
      <section className="profile-hero">
        <div className="profile-hero__content">
          <p className="profile-label">Личный кабинет</p>

          <h1>
            Добро пожаловать,{" "}
            <span>{displayUser?.username || displayUser?.name || "студент"}</span>
          </h1>

          <p>
            Здесь отображается ваш прогресс обучения, бонусы, сертификаты,
            Premium-статус и быстрые ссылки платформы.
          </p>

          <div className="profile-actions">
            <Link to="/courses" className="profile-btn profile-btn--primary">
              Продолжить обучение
            </Link>

            <Link to="/my-certificates" className="profile-btn profile-btn--light">
              Мои сертификаты
            </Link>

            <button className="profile-btn profile-btn--light" onClick={logout}>
              Выйти
            </button>
          </div>
        </div>

        <div className="profile-card">
          <div className="profile-avatar">
            {(displayUser?.username || displayUser?.name || "U").slice(0, 1).toUpperCase()}
          </div>

          <strong>{displayUser?.username || displayUser?.name || "Пользователь"}</strong>
          <span>{displayUser?.email || "email не указан"}</span>
          <UserBadges
            role={displayUser?.role}
            badges={displayUser?.badges}
            premiumUntil={displayUser?.premiumUntil}
            isPremium={isPremium}
            className="profile-user-badges"
          />
        </div>
      </section>

      <section className="profile-stats">
        <div>
          <strong>{loading ? "..." : activeCourses}</strong>
          <span>активных курса</span>
        </div>

        <div>
          <strong>{loading ? "..." : completedLessons}</strong>
          <span>пройденных уроков</span>
        </div>

        <div>
          <strong>{certificates.length}</strong>
          <span>сертификатов</span>
        </div>

        <div>
          <strong>{loading ? "..." : `${totalPercent}%`}</strong>
          <span>общий прогресс</span>
        </div>
      </section>

      <section className="profile-layout">
        <div className="profile-main">
          <section className="profile-panel profile-overview-panel">
            <div className="profile-panel-head">
              <p className="profile-label">Обзор</p>
              <h2>Состояние обучения</h2>
            </div>

            <div className="profile-overview-grid">
              <div>
                <span><FrameIcon name="timeline" /></span>
                <strong>{loading ? "..." : activeCourses}</strong>
                <p>курсов начато</p>
              </div>

              <div>
                <span><FrameIcon name="check" /></span>
                <strong>{loading ? "..." : completedCourses}</strong>
                <p>курсов завершено</p>
              </div>

              <div>
                <span><FrameIcon name="certificate" /></span>
                <strong>{certificates.length}</strong>
                <p>сертификатов</p>
              </div>

              <div>
                <span><FrameIcon name="premium" /></span>
                <strong>{isPremium ? "PRO" : "Free"}</strong>
                <p>статус аккаунта</p>
              </div>
            </div>
          </section>

          <section className="profile-panel">
            <div className="profile-panel-head">
              <p className="profile-label">Прогресс</p>
              <h2>Мои курсы</h2>
            </div>

            {loading ? (
              <p className="profile-loading">Загружаем прогресс из базы данных...</p>
            ) : courses.length === 0 ? (
              <div className="profile-empty-courses">
                <span><FrameIcon name="frame" /></span>
                <strong>Курсов пока нет</strong>
                <p>Начните обучение, чтобы видеть прогресс здесь.</p>
                <Link to="/courses" className="profile-btn profile-btn--primary">
                  Выбрать курс
                </Link>
              </div>
            ) : (
              <div className="profile-course-list">
                {courses.map((item) => (
                  <article className="profile-course-card" key={item.id}>
                    <div className="profile-course-icon"><FrameIcon name={item.icon} /></div>

                    <div>
                      <h3>{item.title}</h3>
                      <p>{item.completedLessons} из {item.totalLessons} уроков</p>

                      <div className="profile-progress">
                        <div>
                          <span style={{ width: `${item.percent}%` }}></span>
                        </div>
                        <strong>{item.percent}%</strong>
                      </div>
                    </div>

                    <Link to={`/courses/${item.id}`}>
                      {item.percent > 0 ? "Продолжить" : "Открыть"}
                    </Link>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="profile-panel">
            <div className="profile-panel-head">
              <p className="profile-label">Сертификаты</p>
              <h2>Мои достижения</h2>
            </div>

            {certificates.length === 0 ? (
              <div className="profile-empty-certificates">
                <span><FrameIcon name="certificate" /></span>
                <strong>Сертификатов пока нет</strong>
                <p>
                  Завершите курс на 100%, чтобы получить первый сертификат
                  Frame School.
                </p>

                <Link to="/courses" className="profile-btn profile-btn--primary">
                  Перейти к курсам
                </Link>
              </div>
            ) : (
              <div className="profile-certificate-list">
                {certificates.map((certificate) => (
                  <Link
                    to="/certificate"
                    key={certificate.courseId}
                    className="profile-certificate-card"
                  >
                    <span><FrameIcon name="certificate" /></span>

                    <div>
                      <strong>{certificate.courseTitle}</strong>
                      <p>
                        Получен:{" "}
                        {new Date(certificate.claimedAt).toLocaleDateString("ru-RU")}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>

          <section className="profile-panel">
            <div className="profile-panel-head">
              <p className="profile-label">Портфолио</p>
              <h2>Мои практические работы</h2>
            </div>

            {submissionsLoading ? (
              <p className="profile-loading">Загружаем работы...</p>
            ) : submissionsError ? (
              <div className="profile-empty-certificates profile-submissions-error" role="alert">
                <span><FrameIcon name="warning" /></span>
                <strong>Работы не загрузились</strong>
                <p>{submissionsError}</p>
                <button
                  type="button"
                  className="profile-btn profile-btn--primary"
                  onClick={() => void loadSubmissions()}
                >
                  Повторить
                </button>
              </div>
            ) : submissions.length === 0 ? (
              <div className="profile-empty-certificates">
                <span><FrameIcon name="folder" /></span>
                <strong>Работ пока нет</strong>
                <p>
                  Откройте урок, выполните практическое задание и отправьте
                  ссылку или видео на проверку.
                </p>
                <Link to="/courses" className="profile-btn profile-btn--primary">
                  Перейти к урокам
                </Link>
              </div>
            ) : (
              <div className="profile-submission-list">
                {submissions.slice(0, 6).map((submission) => (
                  <article className="profile-submission-card" key={submission.id}>
                    <div>
                      <span>{submission.status}</span>
                      <strong>{submission.lesson?.title || "Практическая работа"}</strong>
                      <p>
                        {submission.lesson?.course?.title || "Frame School"} ·{" "}
                        {new Date(submission.createdAt).toLocaleDateString("ru-RU")}
                      </p>
                    </div>
                    <a href={submission.url} target="_blank" rel="noreferrer">
                      Открыть
                    </a>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>

        <aside className="profile-sidebar">
          <section className="profile-panel profile-premium-box">
            <p className="profile-label">Premium</p>
            <h2>{isPremium ? "Premium активен" : "Free аккаунт"}</h2>

            <p>
              {isPremium
                ? "У вас открыт Premium PRO: бонусы, закрытые материалы и расширенные возможности."
                : "Подключите Premium, чтобы открыть расширенные материалы, бонусы и дополнительные возможности."}
            </p>

            <Link to="/premium" className="profile-btn profile-btn--primary">
              {isPremium ? "Управлять Premium" : "Открыть Premium"}
            </Link>
          </section>

          <section className="profile-panel">
            <p className="profile-label">Аккаунт</p>
            <h2>Данные</h2>

            <div className="profile-info-list">
              <div>
                <span>Имя</span>
                <strong>{displayUser?.username || displayUser?.name || "Не указано"}</strong>
              </div>

              <div>
                <span>Email</span>
                <strong>{displayUser?.email || "Не указано"}</strong>
              </div>

              <div>
                <span>Роль</span>
                <strong>{displayUser?.role || "USER"}</strong>
              </div>

              <div>
                <span>Статус</span>
                <strong>{isPremium ? "Premium PRO" : "Free"}</strong>
              </div>
            </div>
          </section>

          <section className="profile-panel profile-quick">
            <p className="profile-label">Быстрые ссылки</p>
            <h2>Навигация</h2>

            <Link to="/courses"><FrameIcon name="frame" />Курсы</Link>
            <Link to="/bonus"><FrameIcon name="premium" />Бонусы</Link>
            <Link to="/my-certificates"><FrameIcon name="certificate" />Сертификаты</Link>
            <Link to="/free/webinars"><FrameIcon name="webinar" />Вебинары</Link>
            <Link to="/career-center"><FrameIcon name="briefcase" />Центр карьеры</Link>
            <Link to="/support"><FrameIcon name="lens" />Поддержка</Link>
          </section>

          {canAccessAdmin && (
            <section className="profile-panel profile-admin-box">
              <p className="profile-label">Admin</p>
              <h2>Управление</h2>
              <p>У вас есть доступ к админ-панели.</p>

              <Link to="/admin" className="profile-btn profile-btn--primary">
                Открыть админку
              </Link>
            </section>
          )}
        </aside>
      </section>
    </main>
  );
}
