import { api } from "./api";
import { normalizeList } from "../utils/normalizers";

export async function getPayments(params) {
  const { data } = await api.get("/student-monthly-payments/", { params });
  return normalizeList(data);
}

export async function getPaymentSummary(params) {
  const { data } = await api.get("/student-monthly-payments/summary/", { params });
  return data;
}

export async function quickUpdatePayment(body) {
  const { data } = await api.post("/student-monthly-payments/quick-update/", body);
  return data;
}

export async function createPayment(body) {
  const { data } = await api.post("/student-monthly-payments/", body);
  return data;
}

export async function updatePayment(id, body) {
  const { data } = await api.patch(`/student-monthly-payments/${id}/`, body);
  return data;
}

/** @deprecated use quickUpdatePayment */
export async function bulkUpdateStudentMonthlyPayment(body) {
  return quickUpdatePayment(body);
}

/** @deprecated use getPayments */
export const getStudentMonthlyPayments = getPayments;

/** @deprecated use getPaymentSummary */
export const getStudentMonthlyPaymentSummary = getPaymentSummary;

export async function deletePayment(id) {
  await api.delete(`/student-monthly-payments/${id}/`);
}
