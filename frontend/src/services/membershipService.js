import { api } from "./api";
import { normalizeList } from "../utils/normalizers";

// Clients
export async function getClients(params) {
  const { data } = await api.get("/clients/", { params });
  return normalizeList(data);
}

export async function getClient(id) {
  const { data } = await api.get(`/clients/${id}/`);
  return data;
}

export async function getClientLedger(id) {
  const { data } = await api.get(`/clients/${id}/ledger/`);
  return data;
}

export async function createClient(body) {
  const { data } = await api.post("/clients/", body);
  return data;
}

export async function updateClient(id, body) {
  const { data } = await api.patch(`/clients/${id}/`, body);
  return data;
}

export async function deleteClient(id) {
  await api.delete(`/clients/${id}/`);
}

// Memberships
export async function getMemberships(params) {
  const { data } = await api.get("/memberships/", { params });
  return normalizeList(data);
}

export async function createMembership(body) {
  const { data } = await api.post("/memberships/", body);
  return data;
}

export async function updateMembership(id, body) {
  const { data } = await api.patch(`/memberships/${id}/`, body);
  return data;
}

export async function deleteMembership(id) {
  await api.delete(`/memberships/${id}/`);
}

// Payments
export async function getPayments(params) {
  const { data } = await api.get("/payments/", { params });
  return normalizeList(data);
}

export async function createPayment(body) {
  const { data } = await api.post("/payments/", body);
  return data;
}

export async function updatePayment(id, body) {
  const { data } = await api.patch(`/payments/${id}/`, body);
  return data;
}

export async function deletePayment(id) {
  await api.delete(`/payments/${id}/`);
}

// Attendance
export async function getAttendance(params) {
  const { data } = await api.get("/attendance/", { params });
  return normalizeList(data);
}

export async function createAttendance(body) {
  const { data } = await api.post("/attendance/", body);
  return data;
}

export async function updateAttendance(id, body) {
  const { data } = await api.patch(`/attendance/${id}/`, body);
  return data;
}

export async function deleteAttendance(id) {
  await api.delete(`/attendance/${id}/`);
}

// Summary
export async function getFitnessLedgerSummary(params) {
  const { data } = await api.get("/fitness-ledger/summary/", { params });
  return data;
}

export async function getFitnessAbonements(params) {
  const { data } = await api.get("/fitness-ledger/abonements/", { params });
  return data;
}
