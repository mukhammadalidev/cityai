import { api } from "./api";
import { normalizeList } from "../utils/normalizers";

export async function getStudentGroups(params) {
  const { data } = await api.get("/student-groups/", { params });
  return normalizeList(data);
}

export async function getStudentGroup(id) {
  const { data } = await api.get(`/student-groups/${id}/`);
  return data;
}

export async function createStudentGroup(body) {
  const { data } = await api.post("/student-groups/", body);
  return data;
}

export async function updateStudentGroup(id, body) {
  const { data } = await api.patch(`/student-groups/${id}/`, body);
  return data;
}

export async function deleteStudentGroup(id) {
  await api.delete(`/student-groups/${id}/`);
}
