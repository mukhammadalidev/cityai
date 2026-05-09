import { api } from "./api";

export async function getTeacherPortalSummary() {
  const { data } = await api.get("/auth/portal/education/teacher-summary/");
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
