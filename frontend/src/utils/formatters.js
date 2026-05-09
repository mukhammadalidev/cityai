import dayjs from "dayjs";
import { getApiOrigin } from "./apiBase";

export function formatPrice(value, currency = "UZS") {
  if (value == null || value === "") return "—";
  const n = Number(value);
  if (Number.isNaN(n)) return String(value);
  const s = Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return currency === "UZS" ? `${s} so‘m` : `${s} ${currency}`;
}

export function formatDate(iso) {
  if (!iso) return "—";
  return dayjs(iso).format("DD.MM.YYYY");
}

export function formatDateTime(iso) {
  if (!iso) return "—";
  return dayjs(iso).format("DD.MM.YYYY HH:mm");
}

export function formatPhone(p) {
  if (!p) return "—";
  const d = String(p).replace(/\D/g, "");
  if (d.length === 12 && d.startsWith("998")) {
    return `+${d.slice(0, 3)} ${d.slice(3, 5)} ${d.slice(5, 8)} ${d.slice(8, 10)} ${d.slice(10)}`;
  }
  return p;
}

/** @param {string|null|undefined} path */
export function mediaUrl(path) {
  if (!path) return "";
  const s = String(path);
  if (s.startsWith("http")) return s;
  const base = getApiOrigin();
  return `${base}${s.startsWith("/") ? "" : "/"}${s}`;
}

/** @param {string|null|undefined} key @param {Record<string, { label?: string }>} dict */
export function statusLabel(key, dict) {
  if (!key) return "—";
  return dict?.[key]?.label || key;
}
