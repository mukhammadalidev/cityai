import { api } from "./api";
import { normalizeList } from "../utils/normalizers";

export async function getInvoices(params) {
  const { data } = await api.get("/invoices/", { params });
  return normalizeList(data);
}

export async function createInvoice(body) {
  const { data } = await api.post("/invoices/", body);
  return data;
}

export async function markInvoicePaid(id) {
  const { data } = await api.post(`/invoices/${id}/mark_paid/`);
  return data;
}
