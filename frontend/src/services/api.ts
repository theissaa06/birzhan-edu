import axios from "axios";

const RAW = import.meta.env.VITE_API_URL || "http://localhost:3003";
const BASE_URL = RAW.replace(/\/api\/?$/, "") + "/api";

const api = axios.create({
  baseURL: BASE_URL,
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
      // Токен истёк — чистим localStorage
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      localStorage.removeItem("currentUser");
    }
    return Promise.reject(error);
  },
);

export default api;
