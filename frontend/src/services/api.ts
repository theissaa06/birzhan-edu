import axios from "axios";

const RAW = String(
  import.meta.env.VITE_API_URL ||
    (import.meta.env.PROD ? window.location.origin : "http://localhost:3003"),
).trim();
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
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      localStorage.removeItem("currentUser");
    }
    return Promise.reject(error);
  },
);

export default api;
