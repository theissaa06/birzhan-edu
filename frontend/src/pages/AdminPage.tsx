import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../services/api";
import {
  getSupportMessages,
  sendSupportMessage,
  deleteSupportMessage,
  SupportMessage,
} from "../services/support";
import "./AdminPage.css";

type LessonType = "VIDEO" | "TEXT" | "PRACTICE";

type Lesson = {
  id: number;
  title: string;
  content?: string | null;
  videoUrl?: string | null;
  orderNumber: number;
  type: LessonType;
  courseId: number;
};

type Course = {
  id: number;
  title: string;
  category: string;
  level: string;
  duration: string;
  description?: string;
  lessons?: Lesson[];
};

type AdminUser = {
  id: number;
  username: string;
  email: string;
  phone?: string | null;
  role: "USER" | "ADMIN";
  isPhoneVerified: boolean;
  password: string;
  createdAt: string;
  updatedAt: string;
  lessonProgress?: unknown[];
  userBonuses?: unknown[];
  supportMessages?: unknown[];
};

const USERS_API = "http://localhost:3003/api/users";

const demoApplications = [
  {
    id: 1,
    name: "Алихан",
    email: "alikhan@mail.com",
    type: "Курс",
    message: "Хочу записаться на CapCut с нуля.",
  },
  {
    id: 2,
    name: "Аружан",
    email: "aruzhan@mail.com",
    type: "Вебинар",
    message: "Интересует вебинар по TikTok-эдитам.",
  },
  {
    id: 3,
    name: "Дамир",
    email: "damir@mail.com",
    type: "Работа",
    message: "Хочу откликнуться на роль наставника.",
  },
];

export default function AdminPage() {
  const navigate = useNavigate();

  const [courses, setCourses] = useState<Course[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [supportMessagesList, setSupportMessagesList] = useState<
    SupportMessage[]
  >([]);
  const [adminReplyText, setAdminReplyText] = useState("");

  const supportMessagesRef = useRef<HTMLDivElement | null>(null);

  const [loading, setLoading] = useState(true);
  const [lessonsLoading, setLessonsLoading] = useState(false);
  const [usersLoading, setUsersLoading] = useState(false);

  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [resetUserId, setResetUserId] = useState<number | null>(null);
  const [resetUserName, setResetUserName] = useState("");
  const [resetPasswordValue, setResetPasswordValue] = useState("");

  const [editingCourseId, setEditingCourseId] = useState<number | null>(null);
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);
  const [editingLessonId, setEditingLessonId] = useState<number | null>(null);

  const categories = [
    { label: "Видеомонтаж", value: "video-editing" },
    { label: "CapCut", value: "capcut" },
    { label: "Premiere Pro", value: "premiere-pro" },
    { label: "Цветокоррекция", value: "color-correction" },
    { label: "Звук", value: "sound" },
    { label: "VFX", value: "vfx" },
    { label: "TikTok контент", value: "tiktok" },
  ];

  const [newCourse, setNewCourse] = useState({
    title: "",
    category: "capcut",
    level: "С нуля",
    duration: "",
    description: "",
  });

  const [newLesson, setNewLesson] = useState({
    title: "",
    content: "",
    videoUrl: "",
    orderNumber: "1",
    type: "VIDEO" as LessonType,
    courseId: "",
  });

  useEffect(() => {
    loadCourses();
    loadUsers();
    loadSupportMessages();

    const interval = setInterval(() => {
      loadSupportMessages();
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  async function loadCourses() {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/courses");
      const data = response.data.data || response.data.courses || response.data;
      const coursesData: Course[] = Array.isArray(data) ? data : [];

      setCourses(coursesData);

      if (coursesData.length > 0 && !selectedCourseId) {
        const firstCourseId = coursesData[0].id;
        setSelectedCourseId(firstCourseId);

        setNewLesson((prev) => ({
          ...prev,
          courseId: String(firstCourseId),
        }));

        loadLessons(firstCourseId);
      }
    } catch (err) {
      console.error("Ошибка загрузки курсов:", err);
      setError("Не удалось загрузить курсы. Проверь backend.");
    } finally {
      setLoading(false);
    }
  }

  async function loadLessons(courseId?: number) {
    const id = courseId || selectedCourseId;

    if (!id) {
      setLessons([]);
      return;
    }

    try {
      setLessonsLoading(true);

      const response = await api.get(`/lessons?courseId=${id}`);
      const data = response.data.data || response.data.lessons || response.data;

      setLessons(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Ошибка загрузки уроков:", err);
      setError("Не удалось загрузить уроки. Проверь backend.");
    } finally {
      setLessonsLoading(false);
    }
  }

  async function loadUsers() {
    try {
      setUsersLoading(true);
      setError("");

      const response = await fetch(USERS_API);

      if (!response.ok) {
        throw new Error("Ошибка ответа backend");
      }

      const result = await response.json();
      const data = result.data || result.users || result;

      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Ошибка загрузки пользователей:", err);
      setError("Не удалось загрузить пользователей. Проверь backend.");
    } finally {
      setUsersLoading(false);
    }
  }

  async function handleChangeUserRole(userId: number, role: "USER" | "ADMIN") {
    try {
      setError("");

      const response = await fetch(`${USERS_API}/${userId}/role`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ role }),
      });

      if (!response.ok) {
        throw new Error("Ошибка изменения роли");
      }

      setSuccessMessage(
        role === "ADMIN"
          ? "Пользователь получил роль ADMIN."
          : "Пользователь получил роль USER.",
      );

      await loadUsers();
    } catch (err) {
      console.error("Ошибка изменения роли:", err);
      setSuccessMessage("");
      setError("Не удалось изменить роль пользователя.");
    }
  }
  function handleResetUserPassword(userId: number, username: string) {
    setResetUserId(userId);
    setResetUserName(username || "пользователя");
    setResetPasswordValue("");
  }

  async function confirmResetUserPassword() {
    if (!resetUserId) return;

    const newPassword = resetPasswordValue.trim();

    if (newPassword.length < 6) {
      setError("Новый пароль должен быть минимум 6 символов.");
      return;
    }

    try {
      setError("");

      const response = await fetch(
        `${USERS_API}/${resetUserId}/reset-password`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            newPassword,
          }),
        },
      );

      if (!response.ok) {
        throw new Error("Ошибка изменения пароля");
      }

      const result = await response.json();
      const savedPassword = result.newPassword || newPassword;

      setSuccessMessage(
        `Пароль изменён навсегда. Новый пароль: ${savedPassword}`,
      );

      setResetUserId(null);
      setResetUserName("");
      setResetPasswordValue("");

      localStorage.removeItem("token");
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("user");
      localStorage.removeItem("currentUser");

      setTimeout(() => {
        navigate("/login");
      }, 600);
    } catch (err) {
      console.error("Ошибка изменения пароля:", err);
      setSuccessMessage("");
      setError("Не удалось изменить пароль пользователя.");
    }
  }

  async function handleDeleteUser(userId: number) {
    const isConfirmed = window.confirm(
      "Ты точно хочешь удалить этого пользователя? Это действие нельзя отменить.",
    );

    if (!isConfirmed) return;

    try {
      setError("");

      const response = await fetch(`${USERS_API}/${userId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Ошибка удаления пользователя");
      }

      setSuccessMessage("Пользователь успешно удалён.");

      await loadUsers();
    } catch (err) {
      console.error("Ошибка удаления пользователя:", err);
      setSuccessMessage("");
      setError("Не удалось удалить пользователя.");
    }
  }

  function shortHash(hash: string) {
    if (!hash) return "Нет хеша";
    return `${hash.slice(0, 14)}...${hash.slice(-8)}`;
  }

  function formatDate(date: string) {
    if (!date) return "—";

    return new Date(date).toLocaleDateString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }

  function handleCourseChange(
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) {
    setNewCourse({
      ...newCourse,
      [e.target.name]: e.target.value,
    });
  }

  function convertYouTubeToEmbed(url: string) {
    if (!url.trim()) return "";

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

  function handleLessonChange(
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) {
    setNewLesson({
      ...newLesson,
      [e.target.name]: e.target.value,
    });
  }
  function applyLessonTemplate(type: LessonType) {
    if (type === "VIDEO") {
      setNewLesson((prev) => ({
        ...prev,
        type: "VIDEO",
        title: prev.title || "Видеоурок: базовые действия",
        content:
          prev.content ||
          "В этом уроке ученик смотрит видео, повторяет действия преподавателя и закрепляет материал на практике.",
      }));
    }

    if (type === "TEXT") {
      setNewLesson((prev) => ({
        ...prev,
        type: "TEXT",
        title: prev.title || "Теория: основные понятия",
        content:
          prev.content ||
          "Изучи основные термины, принципы и последовательность действий. После прочтения переходи к практическому заданию.",
      }));
    }

    if (type === "PRACTICE") {
      setNewLesson((prev) => ({
        ...prev,
        type: "PRACTICE",
        title: prev.title || "Практика: повтори и сохрани результат",
        content:
          prev.content ||
          "Выполни практическое задание: повтори действия из урока, создай короткий монтаж и сохрани готовый результат.",
      }));
    }
  }

  function handleSelectCourse(courseId: number) {
    setSelectedCourseId(courseId);
    setEditingLessonId(null);

    setNewLesson({
      title: "",
      content: "",
      videoUrl: "",
      orderNumber: "1",
      type: "VIDEO",
      courseId: String(courseId),
    });

    loadLessons(courseId);
  }

  async function handleCreateCourse(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!newCourse.title || !newCourse.duration || !newCourse.description) {
      setError("Заполни название, длительность и описание курса.");
      setSuccessMessage("");
      return;
    }

    try {
      if (editingCourseId) {
        await api.put(`/courses/${editingCourseId}`, {
          title: newCourse.title,
          category: newCourse.category,
          level: newCourse.level,
          duration: newCourse.duration,
          description: newCourse.description,
        });

        setSuccessMessage("Курс успешно обновлён!");
      } else {
        await api.post("/courses", {
          title: newCourse.title,
          category: newCourse.category,
          level: newCourse.level,
          duration: newCourse.duration,
          description: newCourse.description,
        });

        setSuccessMessage("Курс успешно создан!");
      }

      setError("");
      setEditingCourseId(null);

      setNewCourse({
        title: "",
        category: "capcut",
        level: "С нуля",
        duration: "",
        description: "",
      });

      loadCourses();
    } catch (error) {
      console.error("Ошибка сохранения курса:", error);
      setSuccessMessage("");
      setError(
        editingCourseId
          ? "Не удалось обновить курс. Проверь backend."
          : "Не удалось создать курс. Проверь backend.",
      );
    }
  }

  function handleEditCourse(course: Course) {
    setEditingCourseId(course.id);
    setError("");
    setSuccessMessage("");

    setNewCourse({
      title: course.title || "",
      category: course.category || "capcut",
      level: course.level || "С нуля",
      duration: course.duration || "",
      description: course.description || "",
    });

    window.scrollTo({
      top: 520,
      behavior: "smooth",
    });
  }

  function handleCancelEditCourse() {
    setEditingCourseId(null);
    setError("");
    setSuccessMessage("");

    setNewCourse({
      title: "",
      category: "capcut",
      level: "С нуля",
      duration: "",
      description: "",
    });
  }

  async function handleDeleteCourse(courseId: number) {
    const isConfirmed = window.confirm(
      "Ты точно хочешь удалить этот курс? Вместе с ним удалятся все уроки курса.",
    );

    if (!isConfirmed) return;

    try {
      await api.delete(`/courses/${courseId}`);

      setSuccessMessage("Курс успешно удалён!");
      setError("");

      if (editingCourseId === courseId) {
        handleCancelEditCourse();
      }

      if (selectedCourseId === courseId) {
        setSelectedCourseId(null);
        setLessons([]);
      }

      loadCourses();
    } catch (error) {
      console.error("Ошибка удаления курса:", error);
      setSuccessMessage("");
      setError("Не удалось удалить курс. Проверь backend.");
    }
  }

  async function handleSaveLesson(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!newLesson.title || !newLesson.orderNumber || !newLesson.courseId) {
      setError("Заполни название урока, номер урока и выбери курс.");
      setSuccessMessage("");
      return;
    }

    try {
      const payload = {
        title: newLesson.title,
        content: newLesson.content,
        videoUrl: convertYouTubeToEmbed(newLesson.videoUrl),
        orderNumber: Number(newLesson.orderNumber),
        type: newLesson.type,
        courseId: Number(newLesson.courseId),
      };

      if (editingLessonId) {
        await api.put(`/lessons/${editingLessonId}`, payload);
        setSuccessMessage("Урок успешно обновлён!");
      } else {
        await api.post("/lessons", payload);
        setSuccessMessage("Урок успешно создан!");
      }

      setError("");
      setEditingLessonId(null);

      setNewLesson({
        title: "",
        content: "",
        videoUrl: "",
        orderNumber: "1",
        type: "VIDEO",
        courseId: newLesson.courseId,
      });

      loadLessons(Number(newLesson.courseId));
      loadCourses();
    } catch (error) {
      console.error("Ошибка сохранения урока:", error);
      setSuccessMessage("");
      setError(
        editingLessonId
          ? "Не удалось обновить урок. Проверь backend."
          : "Не удалось создать урок. Проверь backend.",
      );
    }
  }

  function handleEditLesson(lesson: Lesson) {
    setEditingLessonId(lesson.id);
    setError("");
    setSuccessMessage("");

    setNewLesson({
      title: lesson.title || "",
      content: lesson.content || "",
      videoUrl: lesson.videoUrl || "",
      orderNumber: String(lesson.orderNumber || 1),
      type: lesson.type || "VIDEO",
      courseId: String(lesson.courseId),
    });

    setSelectedCourseId(lesson.courseId);
  }

  function handleCancelEditLesson() {
    setEditingLessonId(null);
    setError("");
    setSuccessMessage("");

    setNewLesson({
      title: "",
      content: "",
      videoUrl: "",
      orderNumber: "1",
      type: "VIDEO",
      courseId: selectedCourseId ? String(selectedCourseId) : "",
    });
  }

  async function handleDeleteLesson(lessonId: number) {
    const isConfirmed = window.confirm("Ты точно хочешь удалить этот урок?");

    if (!isConfirmed) return;

    try {
      await api.delete(`/lessons/${lessonId}`);

      setSuccessMessage("Урок успешно удалён!");
      setError("");

      if (editingLessonId === lessonId) {
        handleCancelEditLesson();
      }

      if (selectedCourseId) {
        loadLessons(selectedCourseId);
      }

      loadCourses();
    } catch (error) {
      console.error("Ошибка удаления урока:", error);
      setSuccessMessage("");
      setError("Не удалось удалить урок. Проверь backend.");
    }
  }

  const selectedCourse = courses.find(
    (course) => course.id === selectedCourseId,
  );
  function scrollSupportToBottom() {
    setTimeout(() => {
      const box = supportMessagesRef.current;

      if (!box) return;

      box.scrollTop = box.scrollHeight;
    }, 80);
  }

  async function loadSupportMessages() {
    try {
      const data = await getSupportMessages();
      const safeData = Array.isArray(data) ? data : [];

      setSupportMessagesList(safeData);

      return safeData;
    } catch (err) {
      console.error("Ошибка загрузки чата:", err);
      setError("Не удалось загрузить сообщения поддержки.");
      return [];
    }
  }

  async function handleAdminReply() {
    const text = adminReplyText.trim();

    if (!text) {
      setError("Напиши текст ответа перед отправкой.");
      return;
    }

    try {
      setError("");

      const newMessage = await sendSupportMessage({
        text,
        from: "admin",
      });

      setSupportMessagesList((prev) => [...prev, newMessage]);
      setAdminReplyText("");
      setSuccessMessage("Ответ отправлен пользователю.");

      scrollSupportToBottom();
    } catch (err) {
      console.error("Ошибка отправки ответа:", err);
      setSuccessMessage("");
      setError("Не удалось отправить ответ. Проверь backend поддержки.");
    }
  }

  async function handleDeleteSupportMessage(messageId: number) {
    const isConfirmed = window.confirm("Удалить это сообщение из поддержки?");

    if (!isConfirmed) return;

    try {
      setError("");

      await deleteSupportMessage(messageId);

      setSupportMessagesList((prev) =>
        prev.filter((message) => message.id !== messageId),
      );

      setSuccessMessage("Сообщение поддержки удалено.");
    } catch (err) {
      console.error("Ошибка удаления сообщения:", err);
      setSuccessMessage("");
      setError("Не удалось удалить сообщение поддержки.");
    }
  }

  async function handleRefreshSupportChat() {
    setError("");

    const data = await loadSupportMessages();

    setSuccessMessage(`Чат обновлён. Сообщений: ${data.length}.`);

    scrollSupportToBottom();
  }

  function handleScrollToLastSupportMessage() {
    const box = supportMessagesRef.current;

    if (!box) {
      setError("Блок сообщений ещё не загружен.");
      return;
    }

    box.scrollTop = box.scrollHeight;
    setSuccessMessage("Прокручено к последнему сообщению.");
  }
  return (
    <main className="admin-page">
      <section className="admin-hero">
        <div>
          <p className="admin-label">Админ-панель</p>

          <h1>
            Управление платформой <span>Birzhan-Edu</span>
          </h1>

          <p>
            Здесь администратор может управлять курсами, уроками,
            пользователями, заявками, сообщениями поддержки и статистикой
            образовательной платформы.
          </p>

          <div className="admin-actions">
            <Link to="/courses" className="admin-btn admin-btn--primary">
              Смотреть каталог
            </Link>

            <Link to="/" className="admin-btn admin-btn--light">
              На главную
            </Link>
          </div>
        </div>

        <div className="admin-hero-card">
          <div>⚙️</div>
          <strong>Admin</strong>
          <span>панель управления</span>
        </div>
      </section>

      <section className="admin-stats">
        <div>
          <strong>{courses.length}</strong>
          <span>курсов в базе</span>
        </div>

        <div>
          <strong>
            {courses.reduce(
              (total, course) => total + (course.lessons?.length || 0),
              0,
            )}
          </strong>
          <span>уроков</span>
        </div>

        <div>
          <strong>{users.length}</strong>
          <span>пользователей</span>
        </div>

        <div>
          <strong>{demoApplications.length}</strong>
          <span>заявок</span>
        </div>

        <div className="admin-stat-support">
          {supportMessagesList.length > 0 && (
            <span className="admin-notification-dot">
              {supportMessagesList.length}
            </span>
          )}

          <strong>{supportMessagesList.length}</strong>
          <span>сообщений поддержки</span>
        </div>
      </section>

      {error && <div className="admin-error">{error}</div>}

      {successMessage && (
        <div className="admin-success">
          <span>✅</span>
          <div>
            <strong>{successMessage}</strong>
            <p>Изменения сохранены и данные обновлены.</p>
          </div>
        </div>
      )}

      <section className="admin-layout">
        <div className="admin-main">
          <section className="admin-panel">
            <div className="admin-panel-head">
              <div>
                <p className="admin-label">Курсы</p>
                <h2>Список курсов из backend</h2>
              </div>

              <button className="admin-small-btn" onClick={loadCourses}>
                Обновить
              </button>
            </div>

            {loading && <p className="admin-muted">Загружаем курсы...</p>}

            {!loading && (
              <div className="admin-course-list">
                {courses.length === 0 ? (
                  <p className="admin-muted">Курсов пока нет.</p>
                ) : (
                  courses.map((course) => (
                    <article className="admin-course-card" key={course.id}>
                      <div>
                        <span>{course.category}</span>
                        <h3>{course.title}</h3>
                        <p>{course.description || "Описание отсутствует."}</p>

                        <div className="admin-course-meta">
                          <em>{course.level}</em>
                          <em>{course.duration}</em>
                          <em>{course.lessons?.length || 0} уроков</em>
                        </div>
                      </div>

                      <div className="admin-course-actions">
                        <Link to={`/courses/${course.id}`}>Открыть</Link>

                        <button
                          type="button"
                          onClick={() => handleSelectCourse(course.id)}
                        >
                          Уроки
                        </button>

                        <button
                          type="button"
                          onClick={() => handleEditCourse(course)}
                        >
                          Редактировать
                        </button>

                        <button
                          type="button"
                          className="danger"
                          onClick={() => handleDeleteCourse(course.id)}
                        >
                          Удалить
                        </button>
                      </div>
                    </article>
                  ))
                )}
              </div>
            )}
          </section>

          <section className="admin-panel">
            <div className="admin-panel-head">
              <div>
                <p className="admin-label">Уроки</p>
                <h2>
                  {selectedCourse
                    ? `Уроки курса: ${selectedCourse.title}`
                    : "Выбери курс"}
                </h2>
              </div>

              {selectedCourseId && (
                <button
                  className="admin-small-btn"
                  onClick={() => loadLessons(selectedCourseId)}
                >
                  Обновить уроки
                </button>
              )}
            </div>

            {!selectedCourseId && (
              <p className="admin-muted">
                Нажми кнопку “Уроки” у любого курса, чтобы увидеть список
                уроков.
              </p>
            )}

            {selectedCourseId && lessonsLoading && (
              <p className="admin-muted">Загружаем уроки...</p>
            )}

            {selectedCourseId && !lessonsLoading && (
              <div className="admin-course-list">
                {lessons.length === 0 ? (
                  <p className="admin-muted">В этом курсе пока нет уроков.</p>
                ) : (
                  lessons.map((lesson) => (
                    <article className="admin-course-card" key={lesson.id}>
                      <div>
                        <span>
                          Урок #{lesson.orderNumber} · {lesson.type}
                        </span>

                        <h3>{lesson.title}</h3>

                        <p>
                          {lesson.content || "Текст урока пока не добавлен."}
                        </p>

                        {lesson.videoUrl && (
                          <div className="admin-course-meta">
                            <em>Видео добавлено</em>
                          </div>
                        )}
                      </div>

                      <div className="admin-course-actions">
                        <button
                          type="button"
                          onClick={() => handleEditLesson(lesson)}
                        >
                          Редактировать
                        </button>

                        <button
                          type="button"
                          className="danger"
                          onClick={() => handleDeleteLesson(lesson.id)}
                        >
                          Удалить
                        </button>
                      </div>
                    </article>
                  ))
                )}
              </div>
            )}
          </section>

          <section className="admin-panel">
            <div className="admin-panel-head">
              <div>
                <p className="admin-label">Пользователи</p>
                <h2>Пользователи из базы данных</h2>
              </div>

              <button className="admin-small-btn" onClick={loadUsers}>
                Обновить
              </button>
            </div>

            {usersLoading && (
              <p className="admin-muted">Загружаем пользователей...</p>
            )}

            {!usersLoading && (
              <div className="admin-users-list">
                {users.length === 0 ? (
                  <p className="admin-muted">Пользователей пока нет.</p>
                ) : (
                  users.map((user) => (
                    <article className="admin-user-card" key={user.id}>
                      <div className="admin-user-main">
                        <div className="admin-user-avatar">
                          {user.username?.charAt(0)?.toUpperCase() || "U"}
                        </div>

                        <div>
                          <div className="admin-user-title">
                            <h3>{user.username || "Без имени"}</h3>
                            <span
                              className={
                                user.role === "ADMIN"
                                  ? "admin-role admin-role--admin"
                                  : "admin-role"
                              }
                            >
                              {user.role}
                            </span>
                          </div>

                          <p>{user.email}</p>

                          <div className="admin-user-info">
                            <span>📞 {user.phone || "Телефон не указан"}</span>
                            <span>📅 {formatDate(user.createdAt)}</span>
                            <span>
                              📚 Прогресс: {user.lessonProgress?.length || 0}
                            </span>
                            <span>
                              🎁 Бонусы: {user.userBonuses?.length || 0}
                            </span>
                            <span>
                              💬 Поддержка: {user.supportMessages?.length || 0}
                            </span>
                          </div>

                          <div className="admin-password-box">
                            <strong>Хеш пароля:</strong>
                            <code>{shortHash(user.password)}</code>
                            <small>
                              Настоящий пароль не хранится. Можно только
                              изменить пароль на новый постоянный.
                            </small>
                          </div>
                        </div>
                      </div>

                      <div className="admin-user-actions">
                        {user.role === "ADMIN" ? (
                          <button
                            type="button"
                            onClick={() =>
                              handleChangeUserRole(user.id, "USER")
                            }
                          >
                            Сделать USER
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() =>
                              handleChangeUserRole(user.id, "ADMIN")
                            }
                          >
                            Сделать ADMIN
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() =>
                            handleResetUserPassword(user.id, user.username)
                          }
                        >
                          Изменить пароль
                        </button>

                        <button
                          type="button"
                          className="danger"
                          onClick={() => handleDeleteUser(user.id)}
                        >
                          Удалить
                        </button>
                      </div>
                    </article>
                  ))
                )}
              </div>
            )}
          </section>

          <section className="admin-panel">
            <div className="admin-panel-head">
              <div>
                <p className="admin-label">Заявки</p>
                <h2>Последние заявки</h2>
              </div>
            </div>

            <div className="admin-table">
              {demoApplications.map((app) => (
                <article key={app.id}>
                  <div>
                    <strong>{app.name}</strong>
                    <span>{app.email}</span>
                  </div>

                  <em>{app.type}</em>

                  <p>{app.message}</p>

                  <button type="button">Ответить</button>
                </article>
              ))}
            </div>
          </section>
        </div>

        <aside className="admin-sidebar">
          <section className="admin-panel">
            <p className="admin-label">
              {editingCourseId ? "Редактировать курс" : "Создать курс"}
            </p>

            <h2>
              {editingCourseId ? "Изменение курса" : "Быстрое добавление"}
            </h2>

            <form className="admin-form" onSubmit={handleCreateCourse}>
              <label>
                Название курса
                <input
                  name="title"
                  value={newCourse.title}
                  onChange={handleCourseChange}
                  placeholder="Например: CapCut PRO"
                />
              </label>
              <div className="admin-lesson-templates">
                <button
                  type="button"
                  onClick={() => applyLessonTemplate("VIDEO")}
                >
                  🎥 Видеоурок
                </button>

                <button
                  type="button"
                  onClick={() => applyLessonTemplate("TEXT")}
                >
                  📘 Теория
                </button>

                <button
                  type="button"
                  onClick={() => applyLessonTemplate("PRACTICE")}
                >
                  📝 Практика
                </button>
              </div>

              <label>
                Категория
                <select
                  name="category"
                  value={newCourse.category}
                  onChange={handleCourseChange}
                >
                  <option value="capcut">CapCut</option>
                  <option value="premiere-pro">Premiere Pro</option>
                  <option value="tiktok">TikTok</option>
                  <option value="color-correction">Цветокоррекция</option>
                  <option value="sound">Звук</option>
                  <option value="vfx">VFX</option>
                </select>
              </label>

              <label>
                Уровень
                <select
                  name="level"
                  value={newCourse.level}
                  onChange={handleCourseChange}
                >
                  <option value="С нуля">С нуля</option>
                  <option value="Новичок">Новичок</option>
                  <option value="Средний">Средний</option>
                  <option value="PRO">PRO</option>
                </select>
              </label>

              <label>
                Длительность
                <input
                  name="duration"
                  value={newCourse.duration}
                  onChange={handleCourseChange}
                  placeholder="Например: 6 часов"
                />
              </label>

              <label>
                Описание
                <textarea
                  name="description"
                  value={newCourse.description}
                  onChange={handleCourseChange}
                  placeholder="Краткое описание курса..."
                />
              </label>

              <button className="admin-btn admin-btn--primary" type="submit">
                {editingCourseId ? "Сохранить изменения" : "Создать курс"}
              </button>

              {editingCourseId && (
                <button
                  className="admin-btn admin-btn--light"
                  type="button"
                  onClick={handleCancelEditCourse}
                >
                  Отмена
                </button>
              )}
            </form>
          </section>

          <section className="admin-panel">
            <p className="admin-label">
              {editingLessonId ? "Редактировать урок" : "Создать урок"}
            </p>

            <h2>{editingLessonId ? "Изменение урока" : "Добавление урока"}</h2>

            <form className="admin-form" onSubmit={handleSaveLesson}>
              {selectedCourse ? (
                <div className="admin-selected-course">
                  <div className="admin-selected-course-icon">🎬</div>

                  <div>
                    <span>Выбранный курс</span>
                    <strong>{selectedCourse.title}</strong>
                    <p>
                      {selectedCourse.category} · {selectedCourse.level} ·{" "}
                      {selectedCourse.duration}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="admin-selected-course admin-selected-course--empty">
                  <div className="admin-selected-course-icon">⚠️</div>

                  <div>
                    <span>Курс не выбран</span>
                    <strong>Сначала выбери курс</strong>
                    <p>Урок нельзя создать без привязки к курсу.</p>
                  </div>
                </div>
              )}
              <label>
                Курс
                <select
                  name="courseId"
                  value={newLesson.courseId}
                  onChange={(e) => {
                    handleLessonChange(e);
                    handleSelectCourse(Number(e.target.value));
                  }}
                >
                  <option value="">Выбери курс</option>
                  {courses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.title}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Название урока
                <input
                  name="title"
                  value={newLesson.title}
                  onChange={handleLessonChange}
                  placeholder="Например: Первый монтаж в CapCut"
                />
              </label>

              <label>
                Тип урока
                <select
                  name="type"
                  value={newLesson.type}
                  onChange={handleLessonChange}
                >
                  <option value="VIDEO">Видео</option>
                  <option value="TEXT">Текст</option>
                  <option value="PRACTICE">Практика</option>
                </select>
              </label>

              <label>
                Номер урока
                <input
                  name="orderNumber"
                  type="number"
                  min="1"
                  value={newLesson.orderNumber}
                  onChange={handleLessonChange}
                  placeholder="1"
                />
              </label>

              <label>
                Ссылка на видео
                <input
                  name="videoUrl"
                  value={newLesson.videoUrl}
                  onChange={handleLessonChange}
                  placeholder="Вставь ссылку YouTube: https://youtu.be/... или https://youtube.com/watch?v=..."
                />
              </label>

              {newLesson.videoUrl.trim() && (
                <div className="admin-video-preview">
                  <div className="admin-video-preview-head">
                    <span>🎬 Предпросмотр видео</span>
                    <small>
                      Ссылка автоматически преобразуется в embed-формат
                    </small>
                  </div>

                  <div className="admin-video-frame">
                    <iframe
                      src={convertYouTubeToEmbed(newLesson.videoUrl)}
                      title="Предпросмотр урока"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                    />
                  </div>
                </div>
              )}

              <label>
                Текст урока
                <textarea
                  name="content"
                  value={newLesson.content}
                  onChange={handleLessonChange}
                  placeholder="Подробное описание урока..."
                />
              </label>

              <button className="admin-btn admin-btn--primary" type="submit">
                {editingLessonId ? "Сохранить урок" : "Создать урок"}
              </button>

              {editingLessonId && (
                <button
                  className="admin-btn admin-btn--light"
                  type="button"
                  onClick={handleCancelEditLesson}
                >
                  Отмена
                </button>
              )}
            </form>
          </section>
          <section className="admin-panel admin-support">
            <div className="admin-support-title-row">
              <div>
                <p className="admin-label">Техподдержка</p>
                <h2>Сообщения</h2>
              </div>

              <span className="admin-support-badge">
                {supportMessagesList.length} сообщений
              </span>
            </div>

            {supportMessagesList.length > 0 ? (
              <div className="admin-support-notice">
                💬 Есть активные сообщения от пользователей. Можно ответить
                сразу здесь.
              </div>
            ) : (
              <div className="admin-support-notice">
                💬 Новых сообщений пока нет. Нажми “Обновить чат”, чтобы
                проверить.
              </div>
            )}

            <div className="admin-support-tools">
              <button type="button" onClick={handleRefreshSupportChat}>
                🔄 Обновить чат
              </button>

              <button type="button" onClick={handleScrollToLastSupportMessage}>
                ↓ К последнему сообщению
              </button>
            </div>

            <div className="admin-messages" ref={supportMessagesRef}>
              {supportMessagesList.length === 0 ? (
                <div className="admin-support-empty">
                  <span>💬</span>
                  <strong>Сообщений пока нет</strong>
                  <p>
                    Когда пользователь напишет в поддержку, сообщение появится
                    здесь.
                  </p>
                </div>
              ) : (
                supportMessagesList.map((message: SupportMessage) => (
                  <div
                    key={message.id}
                    className={
                      message.from === "admin"
                        ? "admin-message admin-message--admin"
                        : "admin-message"
                    }
                  >
                    <div
                      className={
                        message.from === "admin"
                          ? "admin-chat-avatar admin-chat-avatar--admin"
                          : "admin-chat-avatar"
                      }
                    >
                      {message.from === "admin" ? "A" : "U"}
                    </div>

                    <div className="admin-message-bubble">
                      <span>
                        {message.from === "admin" ? "Админ" : "Пользователь"} ·{" "}
                        {new Date(message.createdAt).toLocaleTimeString(
                          "ru-RU",
                          {
                            hour: "2-digit",
                            minute: "2-digit",
                          },
                        )}
                      </span>

                      <p>{message.text}</p>

                      <button
                        type="button"
                        className="admin-message-delete"
                        onClick={() => handleDeleteSupportMessage(message.id)}
                      >
                        удалить
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="admin-reply-box">
              <textarea
                value={adminReplyText}
                onChange={(e) => setAdminReplyText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleAdminReply();
                  }
                }}
                placeholder="Напиши ответ пользователю..."
              />

              <div className="admin-reply-actions">
                <button type="button" onClick={handleAdminReply}>
                  Отправить ответ
                </button>

                <button type="button" onClick={handleRefreshSupportChat}>
                  Обновить чат
                </button>
              </div>
            </div>
          </section>

          <section className="admin-panel admin-quick">
            <p className="admin-label">Быстрые действия</p>
            <h2>Навигация</h2>

            <Link to="/bonus">🎁 Бонусы</Link>
            <Link to="/students">👨‍🎓 Студенты</Link>
            <Link to="/reviews">⭐ Отзывы</Link>
            <Link to="/career-center">🚀 Центр карьеры</Link>
          </section>
        </aside>
      </section>

      {resetUserId && (
        <div className="admin-modal-backdrop">
          <div className="admin-modal">
            <div className="admin-modal-icon">🔐</div>

            <h2>Изменить пароль?</h2>

            <p>
              Введи новый пароль для <strong>{resetUserName}</strong>. Он будет
              установлен навсегда:
            </p>

            <input
              className="admin-new-password-input"
              type="text"
              value={resetPasswordValue}
              onChange={(e) => setResetPasswordValue(e.target.value)}
              placeholder="Например: qwerty123"
              autoFocus
            />

            <span>
              Пользователь сможет входить по этому паролю, пока администратор
              снова не изменит его.
            </span>

            <div className="admin-modal-actions">
              <button
                type="button"
                className="admin-modal-primary"
                onClick={confirmResetUserPassword}
              >
                Да, изменить пароль
              </button>

              <button
                type="button"
                className="admin-modal-light"
                onClick={() => {
                  setResetUserId(null);
                  setResetUserName("");
                }}
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
