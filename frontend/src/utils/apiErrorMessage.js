/** DRF / Django API xato matnini foydalanuvchiga ko‘rsatish */
export function formatApiError(error, fallback = "Xatolik.") {
  if (!error?.response) {
    return error?.message?.includes("Network")
      ? "Serverga ulanib bo‘lmadi. Internet yoki backend (citybot.uz API) ishlamayapti."
      : error?.message || fallback;
  }
  const data = error.response.data;
  if (!data) return `${fallback} (HTTP ${error.response.status})`;
  if (typeof data.detail === "string") return data.detail;
  if (Array.isArray(data.detail)) return data.detail.map(String).join("; ");
  const parts = Object.entries(data).map(([key, val]) => {
    const text = Array.isArray(val) ? val.join(", ") : String(val);
    return key === "non_field_errors" ? text : `${key}: ${text}`;
  });
  return parts.length ? parts.join(" · ") : fallback;
}
