import { api } from "./api";
import { normalizeList } from "../utils/normalizers";

export async function getPlans() {
  const { data } = await api.get("/plans/");
  return normalizeList(data);
}

export async function getSubscriptions(params) {
  const { data } = await api.get("/subscriptions/", { params });
  return normalizeList(data);
}

export async function upgradeSubscription(body) {
  const { data } = await api.post("/subscriptions/upgrade/", body);
  return data;
}
