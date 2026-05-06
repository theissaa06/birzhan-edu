import { Link } from "react-router-dom";
import "./PremiumLock.css";

type PremiumLockProps = {
  title?: string;
  text?: string;
};

export default function PremiumLock({
  title = "Этот раздел доступен по Premium",
  text = "Оформи Premium-подписку, чтобы открыть продвинутые материалы, бонусы, вебинары, сертификаты и дополнительные возможности платформы.",
}: PremiumLockProps) {
  return (
    <section className="premium-lock">
      <div className="premium-lock-icon">💎</div>

      <span>Premium доступ</span>

      <h1>{title}</h1>

      <p>{text}</p>

      <div className="premium-lock-actions">
        <Link to="/premium">Оформить Premium</Link>
        <Link to="/courses">← Вернуться к курсам</Link>
      </div>
    </section>
  );
}
