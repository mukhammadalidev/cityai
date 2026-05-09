import { api } from "./api";
import { normalizeList } from "../utils/normalizers";

export async function getAIUsage(params) {
  const { data } = await api.get("/ai-usage/", { params });
  return normalizeList(data);
}
