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

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 1000,
        background: "rgba(255,255,255,0.95)",
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid var(--gray-border)",
        boxShadow: "0 2px 20px rgba(0,0,0,0.06)",
      }}
    >
      {/* Discount Banner */}
      <div
        style={{
          background: "var(--gradient)",
          color: "#fff",
          textAlign: "center",
          padding: "8px",
          fontSize: "14px",
          fontWeight: 600,
        }}
      >
        🎉 Скидка 30% на все курсы до 31 мая 2026! Используй промокод:{" "}
        <strong>BIRZHAN30</strong>
      </div>

      <div
        className="container"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 20px",
        }}
      >
        {/* Logo */}
        <Link to="/" style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              background: "var(--gradient)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontWeight: 800,
              fontSize: 18,
            }}
          >
            B
          </div>
          <span
            style={{ fontWeight: 800, fontSize: 18, color: "var(--black)" }}
          >
            Birzhan-<span className="gradient-text">Edu</span>
          </span>
        </Link>

        {/* Desktop Nav */}
        <nav
          style={{ display: "flex", alignItems: "center", gap: 28 }}
          className="desktop-nav"
        >
          <Link
            to="/courses"
            style={{
              fontWeight: 500,
              color: "var(--black)",
              transition: "color 0.2s",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.color = "var(--purple)")
            }
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--black)")}
          >
            Каталог
          </Link>
          <Link
            to="/kids"
            style={{
              fontWeight: 500,
              color: "var(--black)",
              transition: "color 0.2s",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.color = "var(--purple)")
            }
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--black)")}
          >
            Для детей
          </Link>
          <Link
            to="/online-college"
            style={{
              fontWeight: 500,
              color: "var(--black)",
              transition: "color 0.2s",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.color = "var(--purple)")
            }
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--black)")}
          >
            Онлайн-колледж
          </Link>

          {/* Dropdown */}
          <div
            style={{ position: "relative" }}
            onMouseEnter={() => setFreeOpen(true)}
            onMouseLeave={() => setFreeOpen(false)}
          >
            <span
              style={{
                fontWeight: 500,
                color: "var(--black)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 4,
                transition: "color 0.2s",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.color = "var(--purple)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.color = "var(--black)")
              }
            >
              Бесплатно <span style={{ fontSize: 10 }}>▼</span>
            </span>
            {freeOpen && (
              <div
                style={{
                  position: "absolute",
                  top: "100%",
                  left: 0,
                  background: "#fff",
                  border: "1px solid var(--gray-border)",
                  borderRadius: 12,
                  boxShadow: "var(--shadow-lg)",
                  padding: "8px",
                  minWidth: 180,
                  zIndex: 100,
                }}
              >
                {[
                  ["Профориентация", "/free/career-test"],
                  ["Вебинары", "/free/webinars"],
                  ["Медиа", "/media"],
                ].map(([label, path]) => (
                  <Link
                    key={path}
                    to={path}
                    onClick={() => setFreeOpen(false)}
                    style={{
                      display: "block",
                      padding: "10px 16px",
                      borderRadius: 8,
                      fontWeight: 500,
                      color: "var(--black)",
                      transition: "background 0.2s",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = "var(--purple-light)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = "transparent")
                    }
                  >
                    {label}
                  </Link>
                ))}
              </div>
            )}
          </div>

          <Link to="/bonus" style={{ fontWeight: 600, color: "var(--purple)" }}>
            🎁 Бонус
          </Link>
          <Link
            to="/about"
            style={{
              fontWeight: 500,
              color: "var(--black)",
              transition: "color 0.2s",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.color = "var(--purple)")
            }
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--black)")}
          >
            О платформе
          </Link>
          <Link to="/my-certificates">Мои сертификаты</Link>
        </nav>

        {/* Auth Buttons */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {loggedIn ? (
            <>
              {user?.role === "ADMIN" && (
                <Link
                  to="/admin"
                  className="btn btn-outline"
                  style={{ padding: "8px 18px", fontSize: 13 }}
                >
                  Админ
                </Link>
              )}
              <span style={{ fontWeight: 600, color: "var(--purple)" }}>
                {user?.username}
              </span>
              <button
                onClick={handleLogout}
                className="btn btn-outline"
                style={{ padding: "8px 18px", fontSize: 13 }}
              >
                Выйти
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="btn btn-outline"
                style={{ padding: "10px 22px", fontSize: 14 }}
              >
                Войти
              </Link>
              <Link
                to="/register"
                className="btn btn-primary"
                style={{ padding: "10px 22px", fontSize: 14 }}
              >
                Регистрация
              </Link>
            </>
          )}
          {/* Burger */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            style={{
              display: "none",
              background: "none",
              fontSize: 22,
              color: "var(--black)",
            }}
            className="burger-btn"
          >
            ☰
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div
          style={{
            background: "#fff",
            borderTop: "1px solid var(--gray-border)",
            padding: "16px 20px",
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          {[
            ["Каталог", "/courses"],
            ["Для детей", "/kids"],
            ["Онлайн-колледж", "/online-college"],
            ["Профориентация", "/free/career-test"],
            ["Вебинары", "/free/webinars"],
            ["Медиа", "/media"],
            ["🎁 Бонус", "/bonus"],
            ["О платформе", "/about"],
          ].map(([label, path]) => (
            <Link
              key={path}
              to={path}
              onClick={() => setMenuOpen(false)}
              style={{
                fontWeight: 500,
                padding: "8px 0",
                borderBottom: "1px solid var(--gray-border)",
              }}
            >
              {label}
            </Link>
          ))}
        </div>
      )}

      <style>{`
        @media (max-width: 900px) {
          .desktop-nav { display: none !important; }
          .burger-btn { display: block !important; }
        }
      `}</style>
    </header>
  );
}
