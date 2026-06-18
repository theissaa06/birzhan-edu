import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import ConfirmModal from "../components/ConfirmModal";
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
  createdAt: string;
  updatedAt: string;
  password?: string;
  lessonProgress?: unknown[];
  userBonuses?: unknown[];
  supportMessages?: unknown[];
};

type ConfirmTarget =
  | { type: "course"; id: number; title?: string }
  | { type: "lesson"; id: number; title?: string }
  | { type: "user"; id: number; title?: string }
  | { type: "support"; id: number; title?: string }
  | null;

const USERS_API_BASE = "/users";

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

const categoryOptions = [
  { label: "CapCut", value: "capcut" },
  { label: "Premiere Pro", value: "premiere-pro" },
  { label: "TikTok", value: "tiktok" },
  { label: "Цветокоррекция", value: "color-correction" },
  { label: "Звук", value: "sound" },
  { label: "VFX", value: "vfx" },
];

export default function AdminPage() {
  const navigate = useNavigate();
  const supportMessagesRef = useRef<HTMLDivElement | null>(null);

  const [courses, setCourses] = useState<Course[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [supportMessagesList, setSupportMessagesList] = useState<
    SupportMessage[]
  >([]);

  const [adminReplyText, setAdminReplyText] = useState("");
  const [loading, setLoading] = useState(true);
  const [lessonsLoading, setLessonsLoading] = useState(false);
  const [usersLoading, setUsersLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [resetUserId, setResetUserId] = useState<number | null>(null);
  const [resetUserName, setResetUserName] = useState("");
  const [resetPasswordValue, setResetPasswordValue] = useState("");

  const [confirmTarget, setConfirmTarget] = useState<ConfirmTarget>(null);
  const [editingCourseId, setEditingCourseId] = useState<number | null>(null);
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);
  const [editingLessonId, setEditingLessonId] = useState<number | null>(null);

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

    const interval = window.setInterval(() => {
      loadSupportMessages(false);
    }, 3000);

    return () => window.clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function showSuccess(message: string) {
    setSuccessMessage(message);
    setError("");
  }

  function showError(message: string) {
    setError(message);
    setSuccessMessage("");
  }

  async function loadCourses() {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/courses");
      const data = response.data.data || response.data.courses || response.data;
      const coursesData: Course[] = Array.isArray(data) ? data : [];

      setCourses(coursesData);

      if (coursesData.length > 0) {
        const currentCourseExists = selectedCourseId
          ? coursesData.some((course) => course.id === selectedCourseId)
          : false;

        const nextCourseId = currentCourseExists
          ? selectedCourseId
          : coursesData[0].id;

        if (nextCourseId) {
          setSelectedCourseId(nextCourseId);
          setNewLesson((prev) => ({ ...prev, courseId: String(nextCourseId) }));
          await loadLessons(nextCourseId);
        }
      } else {
        setSelectedCourseId(null);
        setLessons([]);
      }
    } catch (err) {
      console.error("Ошибка загрузки курсов:", err);
      showError("Не удалось загрузить курсы. Проверь backend.");
    } finally {
      setLoading(false);
    }
  }

  async function loadLessons(courseId?: number | null) {
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
      showError("Не удалось загрузить уроки. Проверь backend.");
    } finally {
      setLessonsLoading(false);
    }
  }

  async function loadUsers() {
    try {
      setUsersLoading(true);
      setError("");

      const response = await api.get(USERS_API_BASE);
      const result = response.data;
      const data = result.data || result.users || result;
      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Ошибка загрузки пользователей:", err);
      showError("Не удалось загрузить пользователей. Проверь backend.");
    } finally {
      setUsersLoading(false);
    }
  }

  async function loadSupportMessages(showSuccessAfterLoad = false) {
    try {
      const data = await getSupportMessages();
      const safeData = Array.isArray(data) ? data : [];
      setSupportMessagesList(safeData);

      if (showSuccessAfterLoad) {
        showSuccess(`Чат обновлён. Сообщений: ${safeData.length}.`);
      }

      return safeData;
    } catch (err) {
      console.error("Ошибка загрузки чата:", err);
      showError("Не удалось загрузить сообщения поддержки.");
      return [];
    }
  }

  function scrollSupportToBottom() {
    window.setTimeout(() => {
      const box = supportMessagesRef.current;
      if (!box) return;
      box.scrollTop = box.scrollHeight;
    }, 80);
  }

  function handleScrollToLastSupportMessage() {
    const box = supportMessagesRef.current;

    if (!box) {
      showError("Блок сообщений ещё не загружен.");
      return;
    }

    box.scrollTop = box.scrollHeight;
    showSuccess("Прокручено к последнему сообщению.");
  }

  async function handleRefreshSupportChat() {
    await loadSupportMessages(true);
    scrollSupportToBottom();
  }

  function handleCourseChange(
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) {
    setNewCourse({ ...newCourse, [e.target.name]: e.target.value });
  }

  function handleLessonChange(
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) {
    setNewLesson({ ...newLesson, [e.target.name]: e.target.value });
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

    return videoId ? `https://www.youtube.com/embed/${videoId}` : url;
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
    if (!courseId || Number.isNaN(courseId)) {
      setSelectedCourseId(null);
      setLessons([]);
      setNewLesson((prev) => ({ ...prev, courseId: "" }));
      return;
    }

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

    if (
      !newCourse.title.trim() ||
      !newCourse.duration.trim() ||
      !newCourse.description.trim()
    ) {
      showError("Заполни название, длительность и описание курса.");
      return;
    }

    try {
      setActionLoading(true);

      const payload = {
        title: newCourse.title.trim(),
        category: newCourse.category,
        level: newCourse.level,
        duration: newCourse.duration.trim(),
        description: newCourse.description.trim(),
      };

      if (editingCourseId) {
        await api.put(`/courses/${editingCourseId}`, payload);
        showSuccess("Курс успешно обновлён!");
      } else {
        await api.post("/courses", payload);
        showSuccess("Курс успешно создан!");
      }

      setEditingCourseId(null);
      setNewCourse({
        title: "",
        category: "capcut",
        level: "С нуля",
        duration: "",
        description: "",
      });

      await loadCourses();
    } catch (err) {
      console.error("Ошибка сохранения курса:", err);
      showError(
        editingCourseId
          ? "Не удалось обновить курс."
          : "Не удалось создать курс.",
      );
    } finally {
      setActionLoading(false);
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
    window.scrollTo({ top: 520, behavior: "smooth" });
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

  async function performDeleteCourse(courseId: number) {
    try {
      setActionLoading(true);
      await api.delete(`/courses/${courseId}`);

      if (editingCourseId === courseId) handleCancelEditCourse();
      if (selectedCourseId === courseId) {
        setSelectedCourseId(null);
        setLessons([]);
      }

      showSuccess("Курс успешно удалён!");
      await loadCourses();
    } catch (err) {
      console.error("Ошибка удаления курса:", err);
      showError("Не удалось удалить курс. Проверь backend.");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleSaveLesson(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (
      !newLesson.title.trim() ||
      !newLesson.orderNumber ||
      !newLesson.courseId
    ) {
      showError("Заполни название урока, номер урока и выбери курс.");
      return;
    }

    try {
      setActionLoading(true);

      const payload = {
        title: newLesson.title.trim(),
        content: newLesson.content.trim(),
        videoUrl: convertYouTubeToEmbed(newLesson.videoUrl),
        orderNumber: Number(newLesson.orderNumber),
        type: newLesson.type,
        courseId: Number(newLesson.courseId),
      };

      if (editingLessonId) {
        await api.put(`/lessons/${editingLessonId}`, payload);
        showSuccess("Урок успешно обновлён!");
      } else {
        await api.post("/lessons", payload);
        showSuccess("Урок успешно создан!");
      }

      setEditingLessonId(null);
      setNewLesson({
        title: "",
        content: "",
        videoUrl: "",
        orderNumber: "1",
        type: "VIDEO",
        courseId: newLesson.courseId,
      });

      await loadLessons(Number(newLesson.courseId));
      await loadCourses();
    } catch (err) {
      console.error("Ошибка сохранения урока:", err);
      showError(
        editingLessonId
          ? "Не удалось обновить урок."
          : "Не удалось создать урок.",
      );
    } finally {
      setActionLoading(false);
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

  async function performDeleteLesson(lessonId: number) {
    try {
      setActionLoading(true);
      await api.delete(`/lessons/${lessonId}`);

      if (editingLessonId === lessonId) handleCancelEditLesson();
      if (selectedCourseId) await loadLessons(selectedCourseId);
      await loadCourses();

      showSuccess("Урок успешно удалён!");
    } catch (err) {
      console.error("Ошибка удаления урока:", err);
      showError("Не удалось удалить урок. Проверь backend.");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleChangeUserRole(userId: number, role: "USER" | "ADMIN") {
    try {
      setActionLoading(true);
      setError("");

      await api.patch(`${USERS_API_BASE}/${userId}/role`, { role });

      showSuccess(
        role === "ADMIN"
          ? "Пользователь получил роль ADMIN."
          : "Пользователь получил роль USER.",
      );
      await loadUsers();
    } catch (err) {
      console.error("Ошибка изменения роли:", err);
      showError("Не удалось изменить роль пользователя.");
    } finally {
      setActionLoading(false);
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
      showError("Новый пароль должен быть минимум 6 символов.");
      return;
    }

    try {
      setActionLoading(true);
      setError("");

      const result = await api.patch(`${USERS_API_BASE}/${resetUserId}/reset-password`, { newPassword });
      const savedPassword = result.data.newPassword || newPassword;

      setResetUserId(null);
      setResetUserName("");
      setResetPasswordValue("");
      showSuccess(`Пароль изменён. Новый пароль: ${savedPassword}`);

      localStorage.removeItem("token");
      localStorage.removeItem("user");
      localStorage.removeItem("currentUser");

      window.setTimeout(() => navigate("/login"), 700);
    } catch (err) {
      console.error("Ошибка изменения пароля:", err);
      showError("Не удалось изменить пароль пользователя.");
    } finally {
      setActionLoading(false);
    }
  }

  async function performDeleteUser(userId: number) {
    try {
      setActionLoading(true);
      setError("");

      await api.delete(`${USERS_API_BASE}/${userId}`);

      showSuccess("Пользователь успешно удалён.");
      await loadUsers();
    } catch (err) {
      console.error("Ошибка удаления пользователя:", err);
      showError("Не удалось удалить пользователя.");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleAdminReply() {
    const text = adminReplyText.trim();
    if (!text) {
      showError("Напиши текст ответа перед отправкой.");
      return;
    }

    try {
      setActionLoading(true);
      setError("");

      const newMessage = await sendSupportMessage({ text, from: "admin" });
      setSupportMessagesList((prev) => [...prev, newMessage]);
      setAdminReplyText("");
      showSuccess("Ответ отправлен пользователю.");
      scrollSupportToBottom();
    } catch (err) {
      console.error("Ошибка отправки ответа:", err);
      showError("Не удалось отправить ответ. Проверь backend поддержки.");
    } finally {
      setActionLoading(false);
    }
  }

  async function performDeleteSupportMessage(messageId: number) {
    try {
      setActionLoading(true);
      setError("");
      await deleteSupportMessage(messageId);
      setSupportMessagesList((prev) =>
        prev.filter((message) => message.id !== messageId),
      );
      showSuccess("Сообщение поддержки удалено.");
    } catch (err) {
      console.error("Ошибка удаления сообщения:", err);
      showError("Не удалось удалить сообщение поддержки.");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleConfirmAction() {
    if (!confirmTarget) return;

    const target = confirmTarget;
    setConfirmTarget(null);

    if (target.type === "course") await performDeleteCourse(target.id);
    if (target.type === "lesson") await performDeleteLesson(target.id);
    if (target.type === "user") await performDeleteUser(target.id);
    if (target.type === "support") await performDeleteSupportMessage(target.id);
  }

  function handleApplicationReply(app: (typeof demoApplications)[number]) {
    setAdminReplyText(
      `Здравствуйте, ${app.name}! Спасибо за заявку по теме “${app.type}”. Мы получили сообщение: “${app.message}”.`,
    );
    showSuccess(
      `Черновик ответа для ${app.name} подготовлен в блоке поддержки.`,
    );
    window.setTimeout(() => {
      supportMessagesRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 100);
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

  const selectedCourse = courses.find(
    (course) => course.id === selectedCourseId,
  );
  const latestSupportMessages = supportMessagesList.slice(-12);

  const confirmText = (() => {
    if (!confirmTarget)
      return {
        title: "Подтвердить действие",
        text: "Вы уверены?",
        button: "Подтвердить",
      };

    if (confirmTarget.type === "course") {
      return {
        title: "Удалить курс?",
        text: `Курс “${confirmTarget.title || "без названия"}” и его уроки будут удалены. Действие нельзя отменить.`,
        button: "Удалить курс",
      };
    }

    if (confirmTarget.type === "lesson") {
      return {
        title: "Удалить урок?",
        text: `Урок “${confirmTarget.title || "без названия"}” будет удалён из курса.`,
        button: "Удалить урок",
      };
    }

    if (confirmTarget.type === "user") {
      return {
        title: "Удалить пользователя?",
        text: `Пользователь “${confirmTarget.title || "без имени"}” будет удалён из базы.`,
        button: "Удалить пользователя",
      };
    }

    return {
      title: "Удалить сообщение?",
      text: "Сообщение поддержки будет удалено. Действие нельзя отменить.",
      button: "Удалить сообщение",
    };
  })();

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
              <button
                className="admin-small-btn"
                type="button"
                onClick={loadCourses}
                disabled={loading || actionLoading}
              >
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
                          onClick={() =>
                            setConfirmTarget({
                              type: "course",
                              id: course.id,
                              title: course.title,
                            })
                          }
                          disabled={actionLoading}
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
                  type="button"
                  onClick={() => loadLessons(selectedCourseId)}
                  disabled={lessonsLoading}
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
                          onClick={() =>
                            setConfirmTarget({
                              type: "lesson",
                              id: lesson.id,
                              title: lesson.title,
                            })
                          }
                          disabled={actionLoading}
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
              <button
                className="admin-small-btn"
                type="button"
                onClick={loadUsers}
                disabled={usersLoading}
              >
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
                            <code>{shortHash(user.password || "")}</code>
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
                            disabled={actionLoading}
                          >
                            Сделать USER
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() =>
                              handleChangeUserRole(user.id, "ADMIN")
                            }
                            disabled={actionLoading}
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
                          onClick={() =>
                            setConfirmTarget({
                              type: "user",
                              id: user.id,
                              title: user.username || user.email,
                            })
                          }
                          disabled={actionLoading}
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
                  <button
                    type="button"
                    onClick={() => handleApplicationReply(app)}
                  >
                    Ответить
                  </button>
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

              <label>
                Категория
                <select
                  name="category"
                  value={newCourse.category}
                  onChange={handleCourseChange}
                >
                  {categoryOptions.map((category) => (
                    <option key={category.value} value={category.value}>
                      {category.label}
                    </option>
                  ))}
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

              <button
                className="admin-btn admin-btn--primary"
                type="submit"
                disabled={actionLoading}
              >
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

            <div className="admin-lesson-templates">
              <button
                type="button"
                onClick={() => applyLessonTemplate("VIDEO")}
              >
                🎥 Видеоурок
              </button>
              <button type="button" onClick={() => applyLessonTemplate("TEXT")}>
                📘 Теория
              </button>
              <button
                type="button"
                onClick={() => applyLessonTemplate("PRACTICE")}
              >
                📝 Практика
              </button>
            </div>

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
                  onChange={(e) => handleSelectCourse(Number(e.target.value))}
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
                  placeholder="YouTube: https://youtu.be/..."
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

              <button
                className="admin-btn admin-btn--primary"
                type="submit"
                disabled={actionLoading}
              >
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

            <div className="admin-support-notice">
              {supportMessagesList.length > 0
                ? "💬 Есть активные сообщения от пользователей. Последние 12 сообщений показаны ниже."
                : "💬 Новых сообщений пока нет. Нажми “Обновить чат”, чтобы проверить."}
            </div>

            <div className="admin-support-tools">
              <button type="button" onClick={handleRefreshSupportChat}>
                🔄 Обновить чат
              </button>
              <button type="button" onClick={handleScrollToLastSupportMessage}>
                ↓ К последнему
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
                latestSupportMessages.map((message) => (
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
                          { hour: "2-digit", minute: "2-digit" },
                        )}
                      </span>
                      <p>{message.text}</p>
                      <button
                        type="button"
                        className="admin-message-delete"
                        onClick={() =>
                          setConfirmTarget({ type: "support", id: message.id })
                        }
                        disabled={actionLoading}
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
                <button
                  type="button"
                  onClick={handleAdminReply}
                  disabled={actionLoading}
                >
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

      <ConfirmModal
        open={Boolean(confirmTarget)}
        title={confirmText.title}
        text={confirmText.text}
        confirmText={confirmText.button}
        cancelText="Отмена"
        danger
        onCancel={() => setConfirmTarget(null)}
        onConfirm={handleConfirmAction}
      />

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
                disabled={actionLoading}
              >
                Да, изменить пароль
              </button>
              <button
                type="button"
                className="admin-modal-light"
                onClick={() => {
                  setResetUserId(null);
                  setResetUserName("");
                  setResetPasswordValue("");
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
