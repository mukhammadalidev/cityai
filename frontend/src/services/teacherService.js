import { api } from "./api";
import { normalizeList } from "../utils/normalizers";

export async function getTeachers(params) {
  const { data } = await api.get("/teachers/", { params });
  return normalizeList(data);
}

export async function getTeacher(id) {
  const { data } = await api.get(`/teachers/${id}/`);
  return data;
}

export async function getTeacherCrmSummary(id) {
  const { data } = await api.get(`/teachers/${id}/crm-summary/`);
  return data;
}

export async function createTeacher(body) {
  const { data } = await api.post("/teachers/", body);
  return data;
}

export async function updateTeacher(id, body) {
  const { data } = await api.patch(`/teachers/${id}/`, body);
  return data;
}

export async function deleteTeacher(id) {
  await api.delete(`/teachers/${id}/`);
}
