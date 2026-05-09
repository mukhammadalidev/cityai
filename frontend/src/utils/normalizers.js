/** @param {unknown} data */
export function normalizeList(data) {
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object" && Array.isArray(data.results)) return data.results;
  return [];
}

/** Axios response */
export function normalizeResponse(res) {
  return normalizeList(res?.data);
}
