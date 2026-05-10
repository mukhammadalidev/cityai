import { api } from "./api";

export async function getTeacherPortalSummary(params = {}) {
  const { month } = params;
  const query = month ? { month } : {};
  const { data } = await api.get("/auth/portal/education/teacher-summary/", { params: query });
  return data;
}

export async function getStudentPortalSummary() {
  const { data } = await api.get("/auth/portal/education/student-summary/");
  if (!data || typeof data !== "object") return data;
  return {
    ...data,
    portal_quizzes: Array.isArray(data.portal_quizzes)
      ? data.portal_quizzes
      : Array.isArray(data.portalQuizzes)
        ? data.portalQuizzes
        : [],
    portal_quiz_scores: Array.isArray(data.portal_quiz_scores)
      ? data.portal_quiz_scores
      : Array.isArray(data.portalQuizScores)
        ? data.portalQuizScores
        : [],
  };
}

/** O‘quvchi: markaz testi natijasini serverda tekshirish */
export async function submitStudentPortalQuiz(body) {
  const { data } = await api.post("/auth/portal/education/student-quiz-submit/", body);
  return data;
}

export async function getParentPortalSummary() {
  const { data } = await api.get("/auth/portal/education/parent-summary/");
  if (!data || typeof data !== "object") return data;
  return {
    ...data,
    portal_quizzes: Array.isArray(data.portal_quizzes)
      ? data.portal_quizzes
      : Array.isArray(data.portalQuizzes)
        ? data.portalQuizzes
        : [],
    portal_quiz_scores: Array.isArray(data.portal_quiz_scores)
      ? data.portal_quiz_scores
      : Array.isArray(data.portalQuizScores)
        ? data.portalQuizScores
        : [],
  };
}
