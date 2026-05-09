const ACCESS = "access";
const REFRESH = "refresh";
const USER = "user";
const BIZ = "selectedBusinessId";

export function getAccessToken() {
  return localStorage.getItem(ACCESS);
}

export function getRefreshToken() {
  return localStorage.getItem(REFRESH);
}

export function setTokens(access, refresh) {
  if (access) localStorage.setItem(ACCESS, access);
  if (refresh) localStorage.setItem(REFRESH, refresh);
}

export function setStoredUser(user) {
  if (user) localStorage.setItem(USER, JSON.stringify(user));
  else localStorage.removeItem(USER);
}

export function getStoredUser() {
  try {
    const r = localStorage.getItem(USER);
    return r ? JSON.parse(r) : null;
  } catch {
    return null;
  }
}

export function clearSession() {
  localStorage.removeItem(ACCESS);
  localStorage.removeItem(REFRESH);
  localStorage.removeItem(USER);
  localStorage.removeItem(BIZ);
}

export function getSelectedBusinessId() {
  const v = localStorage.getItem(BIZ);
  if (!v) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export function setSelectedBusinessId(id) {
  if (id == null) localStorage.removeItem(BIZ);
  else localStorage.setItem(BIZ, String(id));
}
