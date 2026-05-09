import { api } from "./api";

export async function getTeacherPortalSummary(params = {}) {
  const { month } = params;
  const query = month ? { month } : {};
  const { data } = await api.get("/auth/portal/education/teacher-summary/", { params: query });
  return data;
}

export async function getStudentPortalSummary() {
  const { data } = await api.get("/auth/portal/education/student-summary/");
  return data;
}

export async function getParentPortalSummary() {
  const { data } = await api.get("/auth/portal/education/parent-summary/");
  return data;
}
