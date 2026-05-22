import { getApiOrigin } from "./apiBase";
import { getAccessToken } from "./storage";

/**
 * Autentifikatsiyali fayl yuklab olish (CSV / Excel / PDF).
 */
export async function downloadAuthenticatedExport(path, params, filename) {
  const origin = getApiOrigin();
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") qs.set(k, String(v));
  });
  const url = `${origin}/api${path}?${qs.toString()}`;
  const token = getAccessToken();
  const res = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    let msg = `Yuklab olish xatosi (${res.status})`;
    try {
      const data = await res.json();
      msg = data.detail || data.message || msg;
    } catch {
      /* ignore */
    }
    throw new Error(typeof msg === "string" ? msg : JSON.stringify(msg));
  }
  const blob = await res.blob();
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}
