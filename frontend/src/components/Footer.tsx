import { Link } from "react-router-dom";
import "./Footer.css";

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-container">
        <div className="footer-main">
          <div className="footer-brand">
            <Link to="/" className="footer-logo">
              Frame School
            </Link>

            <p>
              Образовательная платформа по видеомонтажу: практика, портфолио,
              сертификаты и понятный путь от первого кадра до готовой работы.
            </p>

            <div className="footer-socials">
              <a href="#" aria-label="Telegram">
                TG
              </a>
              <a href="#" aria-label="Instagram">
                IG
              </a>
              <a href="#" aria-label="YouTube">
                YT
              </a>
              <a href="#" aria-label="TikTok">
                TK
              </a>
            </div>
          </div>

          <div className="footer-column">
            <h3>Направления</h3>
            <ul>
              <li>
                <Link to="/courses">Видеомонтаж</Link>
              </li>
              <li>
                <Link to="/courses">CapCut</Link>
              </li>
              <li>
                <Link to="/courses">Premiere Pro</Link>
              </li>
              <li>
                <Link to="/courses">TikTok / Reels</Link>
              </li>
              <li>
                <Link to="/courses">Цветокоррекция</Link>
              </li>
              <li>
                <Link to="/courses">VFX и эффекты</Link>
              </li>
              <li>
                <Link to="/courses">Motion Design</Link>
              </li>
            </ul>
          </div>

          <div className="footer-column">
            <h3>О платформе</h3>
            <ul>
              <li>
                <Link to="/about">О нас</Link>
              </li>
              <li>
                <Link to="/students">Студенты</Link>
              </li>
              <li>
                <Link to="/reviews">Отзывы</Link>
              </li>
              <li>
                <Link to="/media">Медиа</Link>
              </li>
              <li>
                <Link to="/webinars">Вебинары</Link>
              </li>
              <li>
                <Link to="/bonus">Бонусы 2026</Link>
              </li>
            </ul>
          </div>

          <div className="footer-column">
            <h3>Контакты</h3>

            <div className="footer-contact">
              <p>📞 +7 (727) 123-45-67</p>
              <p>✉️ hello@frameschool.kz</p>
              <p>📍 Алматы, Казахстан</p>
            </div>

            <ul>
              <li>
                <Link to="/support">Сотрудничество</Link>
              </li>
              <li>
                <Link to="/career-center">Работа у нас</Link>
              </li>
              <li>
                <Link to="/career-center">Центр карьеры</Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <span>© 2026 Frame School. Все права защищены.</span>

          <div>
            <Link to="/support">Политика конфиденциальности</Link>
            {" · "}
            <Link to="/support">Публичная оферта</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
