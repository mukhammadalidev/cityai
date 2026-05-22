import { api } from "./api";
import { normalizeList } from "../utils/normalizers";

export async function getStudentMonthlyPayments(params) {
  const { data } = await api.get("/student-monthly-payments/", { params });
  return normalizeList(data);
}

export async function bulkUpdateStudentMonthlyPayment(body) {
  const { data } = await api.post("/student-monthly-payments/bulk-update/", body);
  return data;
}

export async function getStudentMonthlyPaymentSummary(params) {
  const { data } = await api.get("/student-monthly-payments/summary/", { params });
  return data;
}

export async function deleteStudentMonthlyPayment(id) {
  await api.delete(`/student-monthly-payments/${id}/`);
}
