import axios from "axios";
import { getApiOrigin } from "../utils/apiBase";
import { clearSession, getAccessToken } from "../utils/storage";

const raw = getApiOrigin();

export const api = axios.create({
  baseURL: `${raw}/api`,
});

function isPublicWebPath() {
  if (typeof window === "undefined") return false;
  const p = window.location.pathname;
  return p.startsWith("/b/") || p.startsWith("/c/");
}

api.interceptors.request.use((config) => {
  // Ochiq sahifa (Telegram Web App): eski JWT yuborilmasin — 401 va /login redirect bo‘lmasin
  if (!isPublicWebPath()) {
    const t = getAccessToken();
    if (t) config.headers.Authorization = `Bearer ${t}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    console.error("API error:", error.response?.data || error.message);
    if (error.response?.status === 401) {
      clearSession();
      const p = typeof window !== "undefined" ? window.location.pathname : "";
      if (!p.startsWith("/login") && !p.startsWith("/b/") && !p.startsWith("/c/")) {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  },
);
