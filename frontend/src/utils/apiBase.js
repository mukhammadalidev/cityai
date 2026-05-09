/**
 * Localhostda to‘g‘ridan-to‘g‘ri Django (8000).
 * Ngrok / boshqa domen: bir xil origin orqali /api va /media (Vite proxy).
 */
export function getApiOrigin() {
  if (typeof window === "undefined") {
    return (import.meta.env.VITE_API_BASE_URL || "http://localhost:8000").replace(/\/$/, "");
  }
  const h = window.location.hostname;
  const forceRelative = import.meta.env.VITE_USE_RELATIVE_API === "1";
  const notLocal = h && h !== "localhost" && h !== "127.0.0.1";
  if (forceRelative || notLocal) return "";
  return (import.meta.env.VITE_API_BASE_URL || "http://localhost:8000").replace(/\/$/, "");
}
