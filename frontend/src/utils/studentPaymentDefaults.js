/** Oylik to'lov summasini avtomatik to'ldirish */
export function resolveDefaultAmount(student, coursesById, groupsById) {
  const meta = student?.metadata;
  if (meta && meta.monthly_fee != null && Number(meta.monthly_fee) > 0) {
    return Number(meta.monthly_fee);
  }
  if (student?.group && groupsById) {
    const g = groupsById.get(student.group);
    if (g?.course && coursesById) {
      const c = coursesById.get(g.course);
      if (c?.price != null) return Number(c.price);
    }
  }
  if (student?.course && coursesById) {
    const c = coursesById.get(student.course);
    if (c?.price != null) return Number(c.price);
  }
  return 0;
}

export function debtAmount(amount, paidAmount) {
  const a = Number(amount || 0);
  const p = Number(paidAmount || 0);
  return Math.max(0, a - p);
}

export function effectiveStatus(record) {
  if (!record) return "unpaid";
  return record.status || "unpaid";
}
