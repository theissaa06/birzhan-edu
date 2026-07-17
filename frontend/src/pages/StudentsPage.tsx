import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import FrameIcon from "../components/FrameIcon";
import UserBadges, { resolveUserBadges } from "../components/UserBadges";
import api from "../services/api";
import "./StudentsPage.css";

type PublicUser = {
  id: number;
  username: string;
  role: "USER" | "ADMIN";
  badges?: string[];
  premiumUntil?: string | null;
  isPremium?: boolean;
  createdAt: string;
};

type UserFilter = "ALL" | "PRIVILEGED" | "PREMIUM" | "USER";

function getUserRank(user: PublicUser) {
  const badges = resolveUserBadges(user);
  if (badges.includes("OWNER")) return 0;
  if (badges.includes("DEVELOPER")) return 1;
  if (badges.includes("ADMIN")) return 2;
  if (badges.includes("PREMIUM")) return 3;
  return 4;
}

function isProtectedUser(user: PublicUser) {
  const badges = (user.badges || []).map((badge) => String(badge).toUpperCase());
  return badges.includes("OWNER") || badges.includes("DEVELOPER");
}

function formatMemberSince(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Участник платформы";
  return `С нами с ${new Intl.DateTimeFormat("ru-RU", {
    month: "long",
    year: "numeric",
  }).format(date)}`;
}

export default function StudentsPage() {
  const [users, setUsers] = useState<PublicUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<UserFilter>("ALL");

  useEffect(() => {
    let active = true;

    async function loadUsers() {
      try {
        setLoading(true);
        setError("");
        const response = await api.get("/users/public");
        const items = response.data?.users;
        if (active) setUsers(Array.isArray(items) ? items : []);
      } catch (loadError) {
        console.error("[Community] Не удалось загрузить пользователей.", loadError);
        if (active) setError("Не удалось загрузить сообщество из базы данных.");
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadUsers();
    return () => {
      active = false;
    };
  }, []);

  const counts = useMemo(() => {
    return users.reduce(
      (result, user) => {
        const badges = resolveUserBadges(user);
        if (badges.includes("OWNER") || badges.includes("DEVELOPER") || badges.includes("ADMIN")) {
          result.privileged += 1;
        }
        if (badges.includes("PREMIUM")) result.premium += 1;
        return result;
      },
      { privileged: 0, premium: 0 },
    );
  }, [users]);

  const visibleUsers = useMemo(() => {
    const cleanQuery = query.trim().toLowerCase();

    return users
      .filter((user) => {
        if (cleanQuery && !user.username.toLowerCase().includes(cleanQuery)) return false;
        const badges = resolveUserBadges(user);
        if (filter === "PRIVILEGED") {
          return badges.some((badge) => ["OWNER", "DEVELOPER", "ADMIN"].includes(badge));
        }
        if (filter === "PREMIUM") return badges.includes("PREMIUM");
        if (filter === "USER") return user.role === "USER" && badges.length === 0;
        return true;
      })
      .sort((left, right) => {
        const rankDifference = getUserRank(left) - getUserRank(right);
        return rankDifference || left.username.localeCompare(right.username, "ru");
      });
  }, [filter, query, users]);

  return (
    <main className="students-page">
      <section className="students-hero">
        <div>
          <p className="students-kicker">Сообщество Frame School</p>
          <h1>Знакомьтесь с участниками Frame School</h1>
          <p>
            Здесь собраны участники нашей школы: студенты, команда и авторы
            проектов. Имена и достижения открыты, а контактные данные остаются
            приватными.
          </p>
          <div className="students-actions">
            <Link to="/courses" className="students-btn students-btn--primary">Каталог курсов</Link>
            <Link to="/reviews" className="students-btn students-btn--light">Отзывы сообщества</Link>
          </div>
        </div>
        <div className="students-hero-mark" aria-hidden="true">
          <FrameIcon name="lens" />
          <span>COMMUNITY</span>
        </div>
      </section>

      <section className="students-stats" aria-label="Статистика сообщества">
        <article><strong>{users.length}</strong><span>участников</span></article>
        <article><strong>{counts.privileged}</strong><span>участников команды</span></article>
        <article><strong>{counts.premium}</strong><span>с Premium-доступом</span></article>
      </section>

      <section className="students-section">
        <div className="students-section-head">
          <p className="students-kicker">Участники платформы</p>
          <h2>Наше сообщество</h2>
          <p>Найдите участника по имени и посмотрите его подтверждённый статус на платформе.</p>
        </div>

        <div className="students-toolbar">
          <label>
            <span>Найти участника</span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Введите имя..."
            />
          </label>
          <div className="students-filters" aria-label="Показать участников">
            {([
              ["ALL", "Все"],
              ["PRIVILEGED", "Команда"],
              ["PREMIUM", "Premium"],
              ["USER", "Студенты"],
            ] as Array<[UserFilter, string]>).map(([value, label]) => (
              <button
                type="button"
                className={filter === value ? "is-active" : ""}
                onClick={() => setFilter(value)}
                aria-pressed={filter === value}
                key={value}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {loading && <div className="students-state">Загружаем сообщество...</div>}
        {!loading && error && <div className="students-state students-state--error" role="alert">{error}</div>}
        {!loading && !error && visibleUsers.length === 0 && (
          <div className="students-state">По выбранному фильтру пока никого нет.</div>
        )}

        {!loading && !error && visibleUsers.length > 0 && (
          <div className="students-grid">
            {visibleUsers.map((user) => (
              <article
                className={`student-card ${isProtectedUser(user) ? "student-card--protected" : ""} student-card--static`}
                key={user.id}
              >
                <div className="student-card__top">
                  <div className="student-avatar" aria-hidden="true">
                    {(user.username || "U").slice(0, 1).toUpperCase()}
                  </div>
                  {isProtectedUser(user) && (
                    <span className="student-protected-mark" title="Официальный аккаунт">
                      <FrameIcon name="check" />
                    </span>
                  )}
                </div>
                <h3>{user.username}</h3>
                <p className="student-base-role">
                  {user.role === "ADMIN" ? "Команда Frame School" : "Участник Frame School"}
                </p>
                <UserBadges
                  role={user.role}
                  badges={user.badges}
                  premiumUntil={user.premiumUntil}
                  isPremium={user.isPremium}
                  className="student-badges"
                />
                <footer>
                  <span>{formatMemberSince(user.createdAt)}</span>
                  {isProtectedUser(user) && <strong>Официальный аккаунт</strong>}
                </footer>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
