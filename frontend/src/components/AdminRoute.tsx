import { useEffect, useState, type ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import api from "../services/api";
import { clearAuthSession, persistAuthUser } from "../services/authStorage";

type AdminRouteProps = {
  children: ReactNode;
};

type AccessState =
  | "checking"
  | "allowed"
  | "unauthenticated"
  | "forbidden"
  | "error";

type AuthUser = {
  role?: string;
  roles?: string[];
  badges?: string[];
  [key: string]: unknown;
};

const ADMIN_BADGES = new Set(["ADMIN", "OWNER", "DEVELOPER"]);

function hasAdminAccess(user: AuthUser) {
  if (String(user.role || "").toUpperCase() === "ADMIN") return true;

  const roles = [
    ...(Array.isArray(user.roles) ? user.roles : []),
    ...(Array.isArray(user.badges) ? user.badges : []),
  ];
  return roles.some((badge) =>
    ADMIN_BADGES.has(String(badge).toUpperCase()),
  );
}

export default function AdminRoute({ children }: AdminRouteProps) {
  const location = useLocation();
  const [access, setAccess] = useState<AccessState>("checking");

  useEffect(() => {
    let active = true;

    async function verifyAdmin() {
      if (!localStorage.getItem("token")) {
        if (active) setAccess("unauthenticated");
        return;
      }

      try {
        const response = await api.get("/auth/me");
        const user = (response.data?.user || response.data?.data) as AuthUser | undefined;

        if (!user) {
          throw new Error("Backend returned an empty user profile");
        }

        persistAuthUser(user);
        if (active) setAccess(hasAdminAccess(user) ? "allowed" : "forbidden");
      } catch (error) {
        const status = (error as { response?: { status?: number } })?.response?.status;

        if (status === 401 || status === 403 || status === 404) {
          clearAuthSession();
          if (active) setAccess("unauthenticated");
          return;
        }

        console.error("[AdminRoute] Failed to verify admin access", {
          status: status || null,
          message: error instanceof Error ? error.message : String(error),
        });
        if (active) setAccess("error");
      }
    }

    void verifyAdmin();
    return () => {
      active = false;
    };
  }, []);

  if (access === "unauthenticated") {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (access === "forbidden") {
    return <Navigate to="/profile" replace />;
  }

  if (access === "error") {
    return (
      <main className="admin-page">
        <section className="error-state" role="alert">
          <h1>Не удалось проверить права доступа</h1>
          <p>Backend временно недоступен. Обновите страницу и повторите попытку.</p>
        </section>
      </main>
    );
  }

  if (access !== "allowed") {
    return (
      <main className="admin-page">
        <section className="loading-state" aria-live="polite">
          Проверяем права администратора...
        </section>
      </main>
    );
  }

  return children;
}
