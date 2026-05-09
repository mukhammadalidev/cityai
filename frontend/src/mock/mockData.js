/**
 * Prod interfeys faqat backend API dan foydalanadi.
 * Bu fayl faqat ixtiyoriy diagnostika uchun saqlanadi.
 */
export function isNetworkError(err) {
  return Boolean(err && !err.response && (err.request || err.code === "ERR_NETWORK"));
}
