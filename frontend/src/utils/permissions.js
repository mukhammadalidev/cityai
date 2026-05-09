import { getStoredUser } from "./storage";

export function canAccessAdmin() {
  return getStoredUser()?.role === "super_admin";
}

export function canAccessBusiness() {
  const r = getStoredUser()?.role;
  return r === "business_owner" || r === "manager";
}
