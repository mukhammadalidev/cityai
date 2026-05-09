import { api } from "./api";
import { normalizeList } from "../utils/normalizers";

export async function getCategories(params) {
  const { data } = await api.get("/service-categories/", { params });
  return normalizeList(data);
}

export async function createCategory(body) {
  const { data } = await api.post("/service-categories/", body);
  return data;
}

export async function updateCategory(id, body) {
  const { data } = await api.patch(`/service-categories/${id}/`, body);
  return data;
}

export async function deleteCategory(id) {
  await api.delete(`/service-categories/${id}/`);
}
