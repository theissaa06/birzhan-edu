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

type AccessFailure = {
  title: string;
  message: string;
  retryable: boolean;
};

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
  const [failure, setFailure] = useState<AccessFailure | null>(null);
  const [checkAttempt, setCheckAttempt] = useState(0);

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
        if (active) setFailure(null);
        if (active) setAccess(hasAdminAccess(user) ? "allowed" : "forbidden");
      } catch (error) {
        const response = (error as {
          response?: { status?: number; data?: { code?: string; message?: string } };
        })?.response;
        const status = response?.status;
        const code = response?.data?.code;
        const serverMessage = response?.data?.message;

        if (status === 401 || status === 404) {
          clearAuthSession();
          if (active) setAccess("unauthenticated");
          return;
        }

        if (status === 403) {
          if (active) {
            setFailure({
              title: "Доступ к аккаунту ограничен",
              message: serverMessage || "Сервер отклонил доступ к аккаунту.",
              retryable: false,
            });
            setAccess("error");
          }
          return;
        }

        console.error("[AdminRoute] Failed to verify admin access", {
          endpoint: "/api/auth/me",
          status: status || null,
          code: code || null,
          timestamp: new Date().toISOString(),
          message: error instanceof Error ? error.message : String(error),
        });
        if (active) {
          setFailure({
            title: "Не удалось проверить права доступа",
            message:
              serverMessage ||
              (status
                ? "Сервис проверки доступа временно недоступен. Повторите попытку."
                : "Не удалось связаться с сервисом проверки доступа. Проверьте соединение и повторите попытку."),
            retryable: true,
          });
          setAccess("error");
        }
      }
    }

    void verifyAdmin();
    return () => {
      active = false;
    };
  }, [checkAttempt]);

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
          <h1>{failure?.title || "Не удалось проверить права доступа"}</h1>
          <p>{failure?.message || "Повторите попытку позже."}</p>
          {failure?.retryable && (
            <button
              type="button"
              className="access-retry-button"
              onClick={() => {
                setAccess("checking");
                setCheckAttempt((current) => current + 1);
              }}
            >
              Повторить проверку
            </button>
          )}
        </section>
      </main>
    );
  }

  if (access !== "allowed") {
    return (
      <main className="admin-page">
        <section className="loading-state" aria-live="polite">
          Проверяем права администратора…
        </section>
      </main>
    );
  }

  return children;
}
