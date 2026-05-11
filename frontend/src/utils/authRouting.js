/** Login muvaffaqiyatidan keyin yoki token bor Login sahifasida — qayerga yo‘naltirish */
export function getDashboardPathForRole(role) {
  if (!role) return "/business/select";
  if (role === "super_admin") return "/admin/dashboard";
  if (role === "edu_teacher") return "/portal/teacher";
  if (role === "edu_student") return "/portal/student";
  if (role === "edu_parent") return "/portal/parent";
  return "/business/select";
}

/** Ochiq sayt (shahar) — default demo shahar */
export const PUBLIC_SITE_HOME = "/c/buxoro";
