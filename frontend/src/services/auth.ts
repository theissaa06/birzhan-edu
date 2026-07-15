import api from "./api";
import {
  clearAuthSession,
  getAuthToken,
  getStoredAuthUser,
  saveAuthSession,
  type AuthSessionUser,
} from "./authStorage";

export const register = (data: {
  username: string;
  email: string;
  password: string;
  phone?: string;
}) => api.post("/auth/register", data);

export const login = (data: { email: string; password: string }) =>
  api.post("/auth/login", data);

export const getMe = () => api.get("/auth/me");

export const saveAuth = (token: string, user: AuthSessionUser) => {
  saveAuthSession(token, user);
};

export const logout = () => {
  clearAuthSession();
};

export const getUser = () => getStoredAuthUser();

export const isLoggedIn = () => Boolean(getAuthToken());
