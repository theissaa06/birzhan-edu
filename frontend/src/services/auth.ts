import api from "./api";

export const register = (data: {
  username: string;
  email: string;
  password: string;
  phone?: string;
}) => api.post("/auth/register", data);

export const login = (data: { email: string; password: string }) =>
  api.post("/auth/login", data);

export const getMe = () => api.get("/auth/me");

export const saveAuth = (token: string, user: object) => {
  localStorage.setItem("token", token);
  localStorage.setItem("user", JSON.stringify(user));
};

export const logout = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
};

export const getUser = () => {
  const u = localStorage.getItem("user");
  return u ? JSON.parse(u) : null;
};

export const isLoggedIn = () => !!localStorage.getItem("token");
