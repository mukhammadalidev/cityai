import { api } from "./api";
import { normalizeList } from "../utils/normalizers";

export async function getOrders(params) {
  const { data } = await api.get("/orders/", { params });
  return normalizeList(data);
}

export async function createOrder(body) {
  const { data } = await api.post("/orders/", body);
  return data;
}

export async function updateOrder(id, body) {
  const { data } = await api.patch(`/orders/${id}/`, body);
  return data;
}
