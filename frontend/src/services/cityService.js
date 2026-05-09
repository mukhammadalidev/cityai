import { api } from "./api";
import { normalizeList } from "../utils/normalizers";

export async function getCities(params) {
  const { data } = await api.get("/cities/", { params });
  return normalizeList(data);
}

export async function createCity(body) {
  const { data } = await api.post("/cities/", body);
  return data;
}

export async function updateCity(id, body) {
  const { data } = await api.patch(`/cities/${id}/`, body);
  return data;
}

export async function deleteCity(id) {
  await api.delete(`/cities/${id}/`);
}
