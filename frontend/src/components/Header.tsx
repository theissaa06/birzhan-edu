import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuthSession } from "./AuthSessionProvider";
import FrameIcon from "./FrameIcon";
import UserAvatar from "./UserAvatar";
import { showToast } from "../services/appToast";
import "./Header.css";

const links = [
  ["Курсы", "/courses"], ["Студентам", "/students"], ["Отзывы", "/reviews"],
  ["Вебинары", "/webinars"], ["Медиа", "/media"], ["Карьера", "/career-center"],
] as const;

export default function Header() {
  const [open, setOpen] = useState(false);
  const { user, isAuthenticated, signOut } = useAuthSession();
  const navigate = useNavigate();
  const roles = (user?.roles || user?.badges || []).map((role) => String(role).toUpperCase());
  const staff = roles.some((role) => ["ADMIN", "DEVELOPER", "OWNER"].includes(role));

  const logout = () => {
    showToast({ tone: "info", title: "До связи", message: "Прогресс сохранён. Возвращайтесь к монтажу в любое время." });
    signOut();
    setOpen(false);
    navigate("/");
  };

  return (
    <header className="site-header">
      <div className="site-header-inner">
        <Link to="/" className="site-logo" onClick={() => setOpen(false)} aria-label="Frame School — главная">
          <span className="site-logo-mark"><FrameIcon name="frame" /></span>
          <span className="site-logo-text">FRAME <span>SCHOOL</span></span>
        </Link>
        <button type="button" className="site-menu-toggle" aria-expanded={open} aria-label="Открыть меню" onClick={() => setOpen((value) => !value)}><span /><span /><span /></button>
        <nav className={`site-nav ${open ? "open" : ""}`} aria-label="Основная навигация">
          {links.map(([label, to]) => <NavLink key={to} to={to} onClick={() => setOpen(false)}>{label}</NavLink>)}
          <NavLink to="/ai" onClick={() => setOpen(false)}>Frame AI</NavLink>
        </nav>
        <div className="site-actions">
          <Link to="/premium" className="site-premium-link"><FrameIcon name="premium" />Premium</Link>
          {staff && <Link to="/admin" className="site-admin-link">Admin</Link>}
          {isAuthenticated ? <><Link to="/profile" className="site-profile-link"><UserAvatar name={user?.username} avatarUrl={typeof user?.avatarUrl === "string" ? user.avatarUrl : null} size="small" decorative />{user?.username || "Профиль"}</Link><button type="button" className="site-logout" onClick={logout}>Выйти</button></> : <><Link to="/login" className="site-login">Войти</Link><Link to="/register" className="site-register">Начать</Link></>}
        </div>
      </div>
    </header>
  );
}
