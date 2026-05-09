import { Navigate } from "react-router-dom";
import { getStoredUser } from "../utils/storage";

export default function RoleRoute({ children, roles }) {
  const r = getStoredUser()?.role;
  if (!roles?.length) return children;
  if (!r || !roles.includes(r)) {
    return <Navigate to="/login" replace />;
  }
  return children;
}
