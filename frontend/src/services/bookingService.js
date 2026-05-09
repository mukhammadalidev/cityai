import { api } from "./api";
import { normalizeList } from "../utils/normalizers";

/** @param {{ business_id?: number|string, booking_type?: string, status?: string }} params */
export async function getBookings(params) {
  const { data } = await api.get("/bookings/", { params });
  return normalizeList(data);
}

export async function getBooking(id) {
  const { data } = await api.get(`/bookings/${id}/`);
  return data;
}

export async function createBooking(body) {
  const { data } = await api.post("/bookings/", body);
  return data;
}

export async function updateBooking(id, body) {
  const { data } = await api.patch(`/bookings/${id}/`, body);
  return data;
}

export async function deleteBooking(id) {
  await api.delete(`/bookings/${id}/`);
  return true;
}
