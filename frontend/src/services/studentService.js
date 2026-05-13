import { api } from "./api";
import { normalizeList } from "../utils/normalizers";

export async function getStudents(params) {
  const { data } = await api.get("/students/", { params });
  return normalizeList(data);
}

export async function getStudent(id) {
  const { data } = await api.get(`/students/${id}/`);
  return data;
}

/** @param {number|string} id @param {{ month?: string }} [params] month: YYYY-MM yoki butun davr */
export async function getStudentCrmSummary(id, params) {
  const { data } = await api.get(`/students/${id}/crm-summary/`, { params });
  return data;
}

export async function createStudent(body) {
  const { data } = await api.post("/students/", body);
  return data;
}

export async function updateStudent(id, body) {
  const { data } = await api.patch(`/students/${id}/`, body);
  return data;
}

export async function enrollStudentFace(id, formData) {
  const { data } = await api.post(`/students/${id}/face-enroll/`, formData);
  return data;
}

export async function deleteStudent(id) {
  await api.delete(`/students/${id}/`);
}

export async function getAttendanceStats(params) {
  const { data } = await api.get("/students/attendance-stats/", { params });
  return data;
}

export async function getStudentAttendance(params) {
  const { data } = await api.get("/student-attendance/", { params });
  return normalizeList(data);
}

export async function bulkAttendanceDay(body) {
  const { data } = await api.post("/student-attendance/bulk-day/", body);
  return data;
}

export async function faceCheckIn(body) {
  const { data } = await api.post("/student-attendance/face-check-in/", body);
  return data;
}
