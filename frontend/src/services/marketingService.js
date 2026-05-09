import { api } from "./api";
import { normalizeList } from "../utils/normalizers";

export async function generateContent(body) {
  const { data } = await api.post("/marketing/generate/", body);
  return data;
}

export async function getHistory(params) {
  const { data } = await api.get("/marketing/history/", { params });
  return normalizeList(data);
}
