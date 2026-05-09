import { api } from "./api";

export async function getPlatformAnalytics() {
  const { data } = await api.get("/analytics/platform/");
  return data;
}

export async function getBusinessAnalytics(businessId) {
  const { data } = await api.get(`/analytics/business/${businessId}/`);
  return data;
}
