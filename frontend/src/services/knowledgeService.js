import { api } from "./api";
import { normalizeList } from "../utils/normalizers";

export async function getKnowledge(params) {
  const { data } = await api.get("/knowledge/", { params });
  return normalizeList(data);
}

export async function createKnowledge(body) {
  const { data } = await api.post("/knowledge/", body);
  return data;
}

export async function updateKnowledge(id, body) {
  const { data } = await api.patch(`/knowledge/${id}/`, body);
  return data;
}

export async function deleteKnowledge(id) {
  await api.delete(`/knowledge/${id}/`);
}
