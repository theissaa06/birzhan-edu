import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import api from "../services/api";
import {
  AUTH_SESSION_EVENT,
  clearAuthSession,
  getAuthToken,
  getStoredAuthUser,
  persistAuthUser,
  saveAuthSession,
  type AuthSessionUser,
} from "../services/authStorage";

type AuthSessionContextValue = {
  user: AuthSessionUser | null;
  isAuthenticated: boolean;
  checking: boolean;
  signIn: (token: string, user: AuthSessionUser) => void;
  signOut: () => void;
  refreshSession: () => Promise<void>;
};

const AuthSessionContext = createContext<AuthSessionContextValue | null>(null);

export function AuthSessionProvider({ children }: { children: ReactNode }) {
  const initialToken = getAuthToken();
  const [user, setUser] = useState<AuthSessionUser | null>(() =>
    getStoredAuthUser(),
  );
  const [isAuthenticated, setIsAuthenticated] = useState(Boolean(initialToken));
  const [checking, setChecking] = useState(Boolean(initialToken));

  const applySignedOutState = useCallback(() => {
    setUser(null);
    setIsAuthenticated(false);
    setChecking(false);
  }, []);

  const refreshSession = useCallback(async () => {
    const token = getAuthToken();
    if (!token) {
      applySignedOutState();
      return;
    }

    const storedUser = getStoredAuthUser();
    setIsAuthenticated(true);
    if (storedUser) setUser(storedUser);
    setChecking(true);

    try {
      const response = await api.get("/auth/me");
      const verifiedUser = (response.data?.user ||
        response.data?.data) as AuthSessionUser | undefined;

      if (!verifiedUser) {
        throw new Error("Backend returned an empty user profile");
      }

      const mergedUser = { ...storedUser, ...verifiedUser };
      persistAuthUser(mergedUser);
      setUser(mergedUser);
      setIsAuthenticated(true);
    } catch (error) {
      const status = (error as { response?: { status?: number } })?.response
        ?.status;

      if (status === 401 || status === 403 || status === 404) {
        clearAuthSession();
        applySignedOutState();
      } else {
        console.warn("[AuthSession] Session verification was deferred.", {
          status: status || null,
          message: error instanceof Error ? error.message : String(error),
        });
      }
    } finally {
      setChecking(false);
    }
  }, [applySignedOutState]);

  useEffect(() => {
    const handleSessionChange = () => {
      void refreshSession();
    };

    void refreshSession();
    window.addEventListener("storage", handleSessionChange);
    window.addEventListener(AUTH_SESSION_EVENT, handleSessionChange);

    return () => {
      window.removeEventListener("storage", handleSessionChange);
      window.removeEventListener(AUTH_SESSION_EVENT, handleSessionChange);
    };
  }, [refreshSession]);

  const signIn = useCallback((token: string, nextUser: AuthSessionUser) => {
    saveAuthSession(token, nextUser);
    setUser(nextUser);
    setIsAuthenticated(true);
    setChecking(false);
  }, []);

  const signOut = useCallback(() => {
    clearAuthSession();
    applySignedOutState();
  }, [applySignedOutState]);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated,
      checking,
      signIn,
      signOut,
      refreshSession,
    }),
    [checking, isAuthenticated, refreshSession, signIn, signOut, user],
  );

  return (
    <AuthSessionContext.Provider value={value}>
      {children}
    </AuthSessionContext.Provider>
  );
}

export function useAuthSession() {
  const context = useContext(AuthSessionContext);
  if (!context) {
    throw new Error("useAuthSession must be used inside AuthSessionProvider");
  }
  return context;
}
