import { api } from "./api";
import { normalizeList } from "../utils/normalizers";

/** @returns {Promise<{ rows: unknown[], monthSummary: { month: string, total_tokens: number, total_estimated_cost_usd: string } | null }>} */
export async function getAIUsage(params) {
  const { data } = await api.get("/ai-usage/", { params });
  if (data && typeof data === "object" && Array.isArray(data.results)) {
    return { rows: data.results, monthSummary: data.month_summary || null };
  }
  return { rows: normalizeList(data), monthSummary: null };
}
