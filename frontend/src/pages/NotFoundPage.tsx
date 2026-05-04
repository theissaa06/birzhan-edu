import { Link } from "react-router-dom";
import "./NotFoundPage.css";

export default function NotFoundPage() {
  return (
    <main className="notfound-page">
      <section className="notfound-card">
        <div className="notfound-content">
          <p className="notfound-label">Ошибка 404</p>

          <h1>
            Страница не <span>найдена</span>
          </h1>

          <p>
            Возможно, ссылка устарела, страница была удалена или адрес введён
            неправильно. Вернитесь на главную или перейдите к курсам.
          </p>

          <div className="notfound-actions">
            <Link to="/" className="notfound-btn notfound-btn--primary">
              На главную
            </Link>

            <Link to="/courses" className="notfound-btn notfound-btn--light">
              К курсам
            </Link>
          </div>
        </div>

        <div className="notfound-visual">
          <div className="notfound-number">404</div>
          <div className="notfound-icon">🧭</div>
          <div className="notfound-float notfound-float--one">Oops</div>
          <div className="notfound-float notfound-float--two">Not Found</div>
        </div>
      </section>
    </main>
  );
}
