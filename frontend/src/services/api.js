import axios from "axios";
import { getApiOrigin } from "../utils/apiBase";
import { clearSession, getAccessToken } from "../utils/storage";

const raw = getApiOrigin();

export const api = axios.create({
  baseURL: `${raw}/api`,
});

api.interceptors.request.use((config) => {
  const t = getAccessToken();
  if (t) config.headers.Authorization = `Bearer ${t}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    console.error("API error:", error.response?.data || error.message);
    if (error.response?.status === 401) {
      clearSession();
      const p = typeof window !== "undefined" ? window.location.pathname : "";
      const publicPath = p.startsWith("/b/") || p.startsWith("/c/");
      if (!p.startsWith("/login") && !publicPath) {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  },
);
