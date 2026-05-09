import { api } from "./api";
import { normalizeList } from "../utils/normalizers";
import { clearSession, setStoredUser, setTokens } from "../utils/storage";

export async function login(username, password) {
  const { data } = await api.post("/auth/login/", { username, password });
  setTokens(data.access, data.refresh);
  if (data.user) setStoredUser(data.user);
  return data;
}

export async function fetchMe() {
  const { data } = await api.get("/auth/me/");
  setStoredUser(data);
  return data;
}

export async function loginWithMe(username, password) {
  const d = await login(username, password);
  if (!d.user) await fetchMe();
  return d;
}

export function logout() {
  clearSession();
}

export async function listManagers(params) {
  const { data } = await api.get("/auth/managers/", { params });
  return normalizeList(data);
}

/**
 * @param {{ kind: "teacher"|"student"|"parent"; username: string; password: string; teacher_id?: number; student_id?: number; parent_display_name?: string }} body
 */
export async function createEduPortalUser(body) {
  const { data } = await api.post("/auth/portal/education/create-user/", body);
  return data;
}
