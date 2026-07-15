import axios from "axios";
import { clearAuthSession } from "./authStorage";

const RAW = String(
  import.meta.env.VITE_API_URL ||
    (import.meta.env.PROD ? window.location.origin : "http://localhost:3003"),
).trim();
export const API_ORIGIN = RAW.replace(/\/+$/, "").replace(/\/api$/, "");
export const API_BASE_URL = `${API_ORIGIN}/api`;

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      clearAuthSession();
    }
    return Promise.reject(error);
  },
);

export default api;
