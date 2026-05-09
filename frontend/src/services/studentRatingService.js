import { api } from "./api";
import { normalizeList } from "../utils/normalizers";

export async function getStudentRatings(params) {
  const { data } = await api.get("/student-ratings/", { params });
  return normalizeList(data);
}

export async function getStudentRating(id) {
  const { data } = await api.get(`/student-ratings/${id}/`);
  return data;
}

export async function createStudentRating(body) {
  const { data } = await api.post("/student-ratings/", body);
  return data;
}

export async function updateStudentRating(id, body) {
  const { data } = await api.patch(`/student-ratings/${id}/`, body);
  return data;
}

export async function deleteStudentRating(id) {
  await api.delete(`/student-ratings/${id}/`);
}

/** @param {{ business_id: number|string, group_id?: string|number, month?: string }} params */
export async function getRatingLeaderboard(params) {
  const { data } = await api.get("/students/rating-leaderboard/", { params });
  return data;
}
