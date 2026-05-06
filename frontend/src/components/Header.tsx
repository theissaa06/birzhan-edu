import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getUser, logout, isLoggedIn } from "../services/auth";

export default function Header() {
  const [freeOpen, setFreeOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const navigate = useNavigate();
  const user = getUser();
  const loggedIn = isLoggedIn();

  const handleLogout = () => {
    logout();
    navigate("/");
    window.location.reload();
  };

  const navItems = [
    ["Каталог", "/courses"],
    ["Для детей", "/kids"],
    ["Онлайн-колледж", "/online-college"],
    ["🤖 AI помощник", "/ai-assistant"],
    ["🎁 Бонус", "/bonus"],
    ["О платформе", "/about"],
    ["Мои сертификаты", "/my-certificates"],
    ["💎 Premium", "/premium"],
  ];

  return (
    <header className="be-header">
      {/* Promo bar */}
      <div className="be-sale-bar">
        🎉 Скидка 30% на все курсы до 31 мая 2026! Используй промокод:{" "}
        <strong>BIRZHAN30</strong>
      </div>

      {/* Верхняя строка: logo + auth */}
      <div className="be-header-top">
        <Link to="/" className="be-logo">
          <span className="be-logo-icon">B</span>
          <span className="be-logo-text">
            Birzhan-<b>Edu</b>
          </span>
        </Link>

        <div className="be-auth">
          {loggedIn ? (
            <>
              {user?.role === "ADMIN" && (
                <Link to="/admin" className="be-auth-btn be-auth-btn--outline">
                  Админ
                </Link>
              )}

              <Link to="/profile" className="be-user-chip">
                <span>{(user?.username || user?.email || "U").charAt(0)}</span>
                {user?.username || user?.email || "Профиль"}
              </Link>

              <button
                type="button"
                onClick={handleLogout}
                className="be-auth-btn be-auth-btn--outline"
              >
                Выйти
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="be-auth-btn be-auth-btn--outline">
                Войти
              </Link>

              <Link to="/register" className="be-auth-btn be-auth-btn--fill">
                Регистрация
              </Link>
            </>
          )}

          <button
            type="button"
            className="be-burger"
            onClick={() => setMenuOpen((prev) => !prev)}
            aria-label="Открыть меню"
          >
            {menuOpen ? "✕" : "☰"}
          </button>
        </div>
      </div>

      {/* Нижняя строка: функции сайта */}
      <nav className="be-header-nav">
        <div className="be-header-nav-inner">
          <Link to="/courses" className="be-nav-link">
            Каталог
          </Link>

          <Link to="/kids" className="be-nav-link">
            Для детей
          </Link>

          <Link to="/online-college" className="be-nav-link">
            Онлайн-колледж
          </Link>

          <Link to="/ai-assistant" className="be-nav-link be-nav-link--ai">
            🤖 AI помощник
          </Link>

          <div
            className="be-free-dropdown"
            onMouseEnter={() => setFreeOpen(true)}
            onMouseLeave={() => setFreeOpen(false)}
          >
            <button
              type="button"
              className="be-nav-link be-free-btn"
              onClick={() => setFreeOpen((prev) => !prev)}
            >
              Бесплатно <span>▼</span>
            </button>

            {freeOpen && (
              <div className="be-free-menu">
                <Link to="/free" onClick={() => setFreeOpen(false)}>
                  🎁 Все бесплатное
                </Link>
                <Link to="/free/career-test" onClick={() => setFreeOpen(false)}>
                  🧭 Профориентация
                </Link>
                <Link to="/free/webinars" onClick={() => setFreeOpen(false)}>
                  🎙️ Вебинары
                </Link>
                <Link to="/media" onClick={() => setFreeOpen(false)}>
                  🎬 Медиа
                </Link>
                <Link to="/reviews" onClick={() => setFreeOpen(false)}>
                  ⭐ Отзывы
                </Link>
              </div>
            )}
          </div>

          <Link to="/bonus" className="be-nav-link be-nav-link--bonus">
            🎁 Бонус
          </Link>

          <Link to="/about" className="be-nav-link">
            О платформе
          </Link>

          <Link to="/my-certificates" className="be-nav-link">
            Мои сертификаты
          </Link>

          <Link to="/premium" className="be-nav-link be-nav-link--premium">
            💎 Premium
          </Link>
        </div>
      </nav>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="be-mobile-menu">
          {navItems.map(([label, path]) => (
            <Link
              key={path}
              to={path}
              onClick={() => setMenuOpen(false)}
              className={
                label.includes("AI")
                  ? "be-mobile-link be-mobile-link--ai"
                  : label.includes("Premium")
                    ? "be-mobile-link be-mobile-link--premium"
                    : "be-mobile-link"
              }
            >
              {label}
            </Link>
          ))}

          <Link
            to="/free/career-test"
            onClick={() => setMenuOpen(false)}
            className="be-mobile-link"
          >
            🧭 Профориентация
          </Link>

          <Link
            to="/free/webinars"
            onClick={() => setMenuOpen(false)}
            className="be-mobile-link"
          >
            🎙️ Вебинары
          </Link>

          <Link
            to="/media"
            onClick={() => setMenuOpen(false)}
            className="be-mobile-link"
          >
            🎬 Медиа
          </Link>
        </div>
      )}
    </header>
  );
}
