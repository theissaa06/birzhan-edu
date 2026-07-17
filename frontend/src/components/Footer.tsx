import { Link } from "react-router-dom";
import "./Footer.css";

const directions = [
  ["Видеомонтаж", "video"], ["CapCut", "capcut"], ["Premiere Pro", "premiere"],
  ["Shorts / Reels", "shorts"], ["Цветокоррекция", "color"], ["VFX", "vfx"],
];

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-container">
        <div className="footer-main">
          <div className="footer-brand">
            <Link to="/" className="footer-logo">Frame School</Link>
            <p>Практическая школа видеомонтажа: понятные дорожки обучения, портфолио и проверяемые сертификаты.</p>
            <Link className="footer-support-link" to="/support">Связаться с поддержкой</Link>
          </div>
          <div className="footer-column"><h3>Направления</h3><ul>{directions.map(([label, category]) => <li key={category}><Link to={`/courses?category=${category}`}>{label}</Link></li>)}</ul></div>
          <div className="footer-column"><h3>О платформе</h3><ul>
            <li><Link to="/about">О нас</Link></li><li><Link to="/students">Студенты</Link></li>
            <li><Link to="/reviews">Отзывы</Link></li><li><Link to="/media">Медиа</Link></li>
            <li><Link to="/webinars">Вебинары</Link></li><li><Link to="/bonus">Бонусы 2026</Link></li>
          </ul></div>
          <div className="footer-column"><h3>Помощь</h3><ul>
            <li><Link to="/support">Поддержка</Link></li><li><Link to="/jobs">Работа в команде</Link></li>
            <li><Link to="/career-center">Центр карьеры</Link></li><li><Link to="/faq">Частые вопросы</Link></li>
            <li><Link to="/privacy">Конфиденциальность</Link></li><li><Link to="/offer">Публичная оферта</Link></li>
          </ul></div>
        </div>
        <div className="footer-bottom"><span>© 2026 Frame School</span><span>Каждый кадр — часть большой истории.</span></div>
      </div>
    </footer>
  );
}
