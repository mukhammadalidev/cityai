import { api } from "./api";
import { normalizeList } from "../utils/normalizers";

export async function getLeads(params) {
  const { data } = await api.get("/leads/", { params });
  return normalizeList(data);
}

export async function getLead(id) {
  const { data } = await api.get(`/leads/${id}/`);
  return data;
}

export async function createLead(body) {
  const { data } = await api.post("/leads/", body);
  return data;
}

export async function updateLead(id, body) {
  const { data } = await api.patch(`/leads/${id}/`, body);
  return data;
}

export async function deleteLead(id) {
  await api.delete(`/leads/${id}/`);
}

/** Faoliyat — backend alohida endpoint bo‘lmasa, metadata orqali saqlanadi */
export async function addLeadActivity(id, note) {
  const lead = await getLead(id);
  const meta = { ...(lead.metadata || {}), last_note: note, last_note_at: new Date().toISOString() };
  return updateLead(id, { metadata: meta });
}
