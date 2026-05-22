import { api } from "./api";
import { normalizeList } from "../utils/normalizers";

// Members (alias: clients)
export const getMembers = (params) =>
  api.get("/members/", { params }).then((r) => normalizeList(r.data));
export const getMember = (id) => api.get(`/members/${id}/`).then((r) => r.data);
export const getMemberLedger = (id) => api.get(`/members/${id}/ledger/`).then((r) => r.data);
export const createMember = (body) => api.post("/members/", body).then((r) => r.data);
export const updateMember = (id, body) => api.patch(`/members/${id}/`, body).then((r) => r.data);
export const deleteMember = (id) => api.delete(`/members/${id}/`);

// Subscriptions (alias: memberships)
export const getSubscriptions = (params) =>
  api.get("/subscriptions/", { params }).then((r) => normalizeList(r.data));
export const createSubscription = (body) => api.post("/subscriptions/", body).then((r) => r.data);
export const updateSubscription = (id, body) =>
  api.patch(`/subscriptions/${id}/`, body).then((r) => r.data);
export const deleteSubscription = (id) => api.delete(`/subscriptions/${id}/`);

// Payments, attendance — same paths
export const getFitnessPayments = (params) =>
  api.get("/payments/", { params }).then((r) => normalizeList(r.data));
export const createFitnessPayment = (body) => api.post("/payments/", body).then((r) => r.data);
export const getFitnessAttendance = (params) =>
  api.get("/attendance/", { params }).then((r) => normalizeList(r.data));
export const createFitnessAttendance = (body) => api.post("/attendance/", body).then((r) => r.data);
export const checkOutAttendance = (id) =>
  api.post(`/attendance/${id}/check-out/`).then((r) => r.data);

// Trainers & schedules
export const getTrainers = (params) =>
  api.get("/trainers/", { params }).then((r) => normalizeList(r.data));
export const createTrainer = (body) => api.post("/trainers/", body).then((r) => r.data);
export const updateTrainer = (id, body) => api.patch(`/trainers/${id}/`, body).then((r) => r.data);
export const deleteTrainer = (id) => api.delete(`/trainers/${id}/`);

export const getSchedules = (params) =>
  api.get("/schedules/", { params }).then((r) => normalizeList(r.data));
export const createSchedule = (body) => api.post("/schedules/", body).then((r) => r.data);
export const updateSchedule = (id, body) => api.patch(`/schedules/${id}/`, body).then((r) => r.data);
export const deleteSchedule = (id) => api.delete(`/schedules/${id}/`);
export const enrollSchedule = (id, clientId) =>
  api.post(`/schedules/${id}/enroll/`, { member_id: clientId }).then((r) => r.data);

// Debtors & reports
export const getDebtors = (params) => api.get("/debtors/", { params }).then((r) => r.data);
export const getFitnessDashboard = (params) =>
  api.get("/reports/dashboard/", { params }).then((r) => r.data);
export const getFitnessLedgerSummary = (params) =>
  api.get("/fitness-ledger/summary/", { params }).then((r) => r.data);

export function exportDebtorsCsv(businessId) {
  const base = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api";
  const token = localStorage.getItem("access_token");
  const url = `${base}/reports/debtors/?business_id=${businessId}&export=csv`;
  return fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
    .then((r) => r.blob())
    .then((blob) => {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "qarzdorlar.csv";
      a.click();
    });
}
