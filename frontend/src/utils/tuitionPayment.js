import dayjs from "dayjs";

/** Ro‘yxatdagi qator (API student) uchun Tag rangi */
export function tuitionPaymentTagProps(row) {
  const u = row?.tuition_paid_until;
  if (!u) return { children: "Kiritilmagan", color: "default" };
  const d = dayjs(u).startOf("day");
  const today = dayjs().startOf("day");
  if (d.isBefore(today)) return { children: "Muddati o‘tgan", color: "error" };
  return { children: `To‘g‘ri: ${d.format("DD.MM.YYYY")}`, color: "success" };
}
