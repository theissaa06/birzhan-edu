import { Link, NavLink, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import "./Header.css";

type CurrentUser = {
  id?: number;
  username?: string;
  email?: string;
  role?: "USER" | "ADMIN";
};

export default function Header() {
  const navigate = useNavigate();
  const headerRef = useRef<HTMLElement | null>(null);

  const [user, setUser] = useState<CurrentUser | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [freeOpen, setFreeOpen] = useState(false);

  useEffect(() => {
    function loadUser() {
      const storedUser =
        localStorage.getItem("user") || localStorage.getItem("currentUser");

      if (storedUser) {
        try {
          setUser(JSON.parse(storedUser));
        } catch {
          setUser(null);
        }
      } else {
        setUser(null);
      }
    }

    loadUser();

    // Обновляем при логине/логауте в другой вкладке или после reload
    window.addEventListener("storage", loadUser);
    return () => window.removeEventListener("storage", loadUser);
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!headerRef.current?.contains(event.target as Node)) {
        setFreeOpen(false);
      }
    }

    function handleEsc(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setFreeOpen(false);
        setMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEsc);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEsc);
    };
  }, []);

  function closeMenus() {
    setMenuOpen(false);
    setFreeOpen(false);
  }

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("currentUser");
    setUser(null);
    closeMenus();
    navigate("/login");
  }

  const profileName = user?.username || user?.email || "Профиль";

  return (
    <>
      <div className="top-sale-banner">
        🔥 Скидка 30% на все курсы до 31 мая 2026! Используй промокод:{" "}
        <strong>BIRZHAN30</strong>
      </div>

      <header className="site-header" ref={headerRef}>
        <div className="site-header-container">
          <Link to="/" className="site-logo" onClick={closeMenus}>
            <span className="site-logo-mark">B</span>
            <span className="site-logo-text">
              Birzhan<span>_Edu</span>
            </span>
          </Link>

          <button
            className={menuOpen ? "site-burger open" : "site-burger"}
            type="button"
            onClick={() => {
              setMenuOpen((prev) => !prev);
              setFreeOpen(false);
            }}
            aria-label="Открыть меню"
            aria-expanded={menuOpen}
          >
            <span />
            <span />
            <span />
          </button>

          <nav className={menuOpen ? "site-nav open" : "site-nav"}>
            <NavLink to="/courses" onClick={closeMenus}>
              Каталог
            </NavLink>

            <NavLink to="/kids" onClick={closeMenus}>
              Детям
            </NavLink>

            <NavLink to="/online-college" onClick={closeMenus}>
              Колледж
            </NavLink>

            <div className={`site-dropdown ${freeOpen ? "open" : ""}`}>
              <button
                type="button"
                className="site-dropdown-btn"
                onClick={() => setFreeOpen((prev) => !prev)}
                aria-expanded={freeOpen}
              >
                Бесплатно <span>▾</span>
              </button>

              <div className="site-dropdown-menu">
                <NavLink to="/free" onClick={closeMenus}>
                  Бесплатный раздел
                </NavLink>

                <NavLink to="/free/career-test" onClick={closeMenus}>
                  Тест профессии
                </NavLink>

                <NavLink to="/free/webinars" onClick={closeMenus}>
                  Вебинары
                </NavLink>

                <NavLink to="/free/media" onClick={closeMenus}>
                  Медиа
                </NavLink>

                <NavLink to="/free/ai" onClick={closeMenus}>
                  AI помощник
                </NavLink>
              </div>
            </div>

            <NavLink to="/support" onClick={closeMenus}>
              Поддержка
            </NavLink>

            <NavLink to="/ai" onClick={closeMenus} title="AI помощник">
              AI
            </NavLink>

            <NavLink to="/bonus" onClick={closeMenus}>
              🎁 Бонус
            </NavLink>
          </nav>

          <div className="site-actions">
            <Link
              to="/certificates"
              className="site-certificates-link"
              onClick={closeMenus}
            >
              Сертификаты
            </Link>

            <Link
              to="/premium"
              className="site-premium-link"
              onClick={closeMenus}
            >
              💎 Premium
            </Link>

            {user ? (
              <>
                <Link
                  to="/profile"
                  className="site-user"
                  onClick={closeMenus}
                  title={profileName}
                >
                  {profileName}
                </Link>

                {user.role === "ADMIN" && (
                  <Link
                    to="/admin"
                    className="site-admin-link"
                    onClick={closeMenus}
                  >
                    Админ
                  </Link>
                )}

                <button
                  type="button"
                  className="site-logout"
                  onClick={handleLogout}
                >
                  Выйти
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="site-login" onClick={closeMenus}>
                  Войти
                </Link>

                <Link
                  to="/register"
                  className="site-register"
                  onClick={closeMenus}
                >
                  Регистрация
                </Link>
              </>
            )}
          </div>
        </div>
      </header>
    </>
  );
}
