import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer
      style={{
        background: "var(--black)",
        color: "#CBD5E1",
        paddingTop: 64,
        paddingBottom: 32,
        marginTop: 80,
      }}
    >
      <div className="container">
        <div className="grid-4" style={{ marginBottom: 48 }}>
          {/* Logo & Desc */}
          <div>
            <Link
              to="/"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 16,
              }}
            >
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
              <span style={{ fontWeight: 800, fontSize: 18, color: "#fff" }}>
                Birzhan-Edu
              </span>
            </Link>
            <p style={{ fontSize: 14, lineHeight: 1.7, marginBottom: 20 }}>
              Образовательная платформа нового поколения. Учись монтажу, дизайну
              и медиа онлайн.
            </p>
            <div style={{ display: "flex", gap: 12 }}>
              {["TG", "IG", "YT", "TK"].map((s) => (
                <div
                  key={s}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 8,
                    background: "rgba(255,255,255,0.1)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: "pointer",
                    color: "#fff",
                    transition: "background 0.2s",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "var(--purple)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "rgba(255,255,255,0.1)")
                  }
                >
                  {s}
                </div>
              ))}
            </div>
          </div>

          {/* Направления */}
          <div>
            <h4
              style={{
                color: "#fff",
                fontWeight: 700,
                marginBottom: 16,
                fontSize: 15,
              }}
            >
              Направления
            </h4>
            {[
              "Видеомонтаж",
              "CapCut",
              "Premiere Pro",
              "TikTok / Reels",
              "Цветокоррекция",
              "VFX и эффекты",
              "Motion Design",
            ].map((item) => (
              <Link
                key={item}
                to="/courses"
                style={{
                  display: "block",
                  fontSize: 14,
                  marginBottom: 8,
                  color: "#94A3B8",
                  transition: "color 0.2s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#fff")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#94A3B8")}
              >
                {item}
              </Link>
            ))}
          </div>

          {/* О платформе */}
          <div>
            <h4
              style={{
                color: "#fff",
                fontWeight: 700,
                marginBottom: 16,
                fontSize: 15,
              }}
            >
              О платформе
            </h4>
            {[
              ["О нас", "/about"],
              ["Студенты", "/students"],
              ["Отзывы", "/reviews"],
              ["Медиа", "/media"],
              ["Вебинары", "/free/webinars"],
              ["Бонусы 2026", "/bonus"],
            ].map(([label, path]) => (
              <Link
                key={path}
                to={path}
                style={{
                  display: "block",
                  fontSize: 14,
                  marginBottom: 8,
                  color: "#94A3B8",
                  transition: "color 0.2s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#fff")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#94A3B8")}
              >
                {label}
              </Link>
            ))}
          </div>

          {/* Контакты */}
          <div>
            <h4
              style={{
                color: "#fff",
                fontWeight: 700,
                marginBottom: 16,
                fontSize: 15,
              }}
            >
              Контакты
            </h4>
            <p style={{ fontSize: 14, marginBottom: 8 }}>
              📞 +7 (727) 123-45-67
            </p>
            <p style={{ fontSize: 14, marginBottom: 8 }}>
              ✉️ hello@birzhan.edu
            </p>
            <p style={{ fontSize: 14, marginBottom: 20 }}>
              📍 Алматы, Казахстан
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[
                ["Сотрудничество", "/find-employee"],
                ["Работа у нас", "/jobs"],
                ["Центр карьеры", "/career-center"],
              ].map(([label, path]) => (
                <Link
                  key={path}
                  to={path}
                  style={{
                    fontSize: 14,
                    color: "#94A3B8",
                    transition: "color 0.2s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "#fff")}
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.color = "#94A3B8")
                  }
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>
        </div>

        <div
          style={{
            borderTop: "1px solid rgba(255,255,255,0.1)",
            paddingTop: 24,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <p style={{ fontSize: 14 }}>
            © 2026 Birzhan-Edu Platform. Все права защищены.
          </p>
          <div style={{ display: "flex", gap: 24 }}>
            <a href="#" style={{ fontSize: 13, color: "#94A3B8" }}>
              Политика конфиденциальности
            </a>
            <a href="#" style={{ fontSize: 13, color: "#94A3B8" }}>
              Публичная оферта
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
