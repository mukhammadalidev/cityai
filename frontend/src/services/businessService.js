import { api } from "./api";
import { normalizeList } from "../utils/normalizers";

export async function getBusinesses(params) {
  const { data } = await api.get("/businesses/", { params });
  return normalizeList(data);
}

export async function getBusiness(id) {
  const { data } = await api.get(`/businesses/${id}/`);
  return data;
}

export async function getBusinessBySlug(slug) {
  const { data } = await api.get(`/businesses/slug/${slug}/`);
  return data;
}

export async function createBusiness(body) {
  const { data } = await api.post("/businesses/", body);
  return data;
}

export async function updateBusiness(id, body) {
  const { data } = await api.patch(`/businesses/${id}/`, body);
  return data;
}

/** @param {FormData} fd */
export async function patchBusinessFormData(id, fd) {
  const { data } = await api.patch(`/businesses/${id}/`, fd);
  return data;
}

export async function deleteBusiness(id) {
  await api.delete(`/businesses/${id}/`);
}

export async function getBusinessDashboard(id) {
  const { data } = await api.get(`/businesses/${id}/dashboard/`);
  return data;
}

export async function resetBusinessOwnerCredentials(id, body = {}) {
  const { data } = await api.post(`/businesses/${id}/owner-credentials/reset/`, body);
  return data;
}
