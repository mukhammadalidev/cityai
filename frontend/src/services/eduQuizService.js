import { api } from "./api";
import { normalizeList } from "../utils/normalizers";

export async function getEduQuizCategories(params) {
  const { data } = await api.get("/edu-quiz-categories/", { params });
  return normalizeList(data);
}

export async function createEduQuizCategory(body) {
  const { data } = await api.post("/edu-quiz-categories/", body);
  return data;
}

export async function updateEduQuizCategory(id, body) {
  const { data } = await api.patch(`/edu-quiz-categories/${id}/`, body);
  return data;
}

export async function deleteEduQuizCategory(id) {
  await api.delete(`/edu-quiz-categories/${id}/`);
}

export async function getEduQuizzes(params) {
  const { data } = await api.get("/edu-quizzes/", { params });
  return normalizeList(data);
}

export async function getEduQuiz(id) {
  const { data } = await api.get(`/edu-quizzes/${id}/`);
  return data;
}

export async function createEduQuiz(body) {
  const { data } = await api.post("/edu-quizzes/", body);
  return data;
}

export async function updateEduQuiz(id, body) {
  const { data } = await api.patch(`/edu-quizzes/${id}/`, body);
  return data;
}

export async function deleteEduQuiz(id) {
  await api.delete(`/edu-quizzes/${id}/`);
}
