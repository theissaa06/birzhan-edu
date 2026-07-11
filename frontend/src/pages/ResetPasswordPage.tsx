import { Link } from "react-router-dom";
import "./LoginPage.css";

export default function ResetPasswordPage() {
  return (
    <main className="auth-page">
      <div className="auth-wrap">
        <div className="auth-info">
          <p className="auth-kicker">Новый способ восстановления</p>
          <h1>
            Пароль меняется через <span className="auth-brand">код из письма</span>
          </h1>
          <p className="auth-desc">
            Ссылки восстановления больше не используются: это безопаснее и не
            оставляет долгоживущие токены в URL.
          </p>
        </div>

        <div className="auth-card">
          <h2>Запросите код</h2>
          <p className="auth-card-sub">
            Введите email на странице восстановления, получите 6-значный код и
            задайте новый пароль.
          </p>

          <Link className="auth-submit auth-link-button" to="/forgot-password">
            Перейти к восстановлению
          </Link>

          <p className="auth-footer-link">
            Вспомнили пароль? <Link to="/login">Войти</Link>
          </p>
        </div>
      </div>
    </main>
  );
}
