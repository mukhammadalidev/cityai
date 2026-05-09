import { api } from "./api";
import { normalizeList } from "../utils/normalizers";

export async function getItems(params) {
  const { data } = await api.get("/items/", { params });
  return normalizeList(data);
}

export async function getItem(id) {
  const { data } = await api.get(`/items/${id}/`);
  return data;
}

export async function createItem(body) {
  const { data } = await api.post("/items/", body);
  return data;
}

export async function updateItem(id, body) {
  const { data } = await api.patch(`/items/${id}/`, body);
  return data;
}

export async function deleteItem(id) {
  await api.delete(`/items/${id}/`);
}

/** @param {FormData} fd */
export async function postItemFormData(fd) {
  const { data } = await api.post("/items/", fd);
  return data;
}

/** @param {number|string} id @param {FormData} fd */
export async function patchItemFormData(id, fd) {
  const { data } = await api.patch(`/items/${id}/`, fd);
  return data;
}
