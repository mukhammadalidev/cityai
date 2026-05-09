import { Navigate, useLocation } from "react-router-dom";
import { getAccessToken } from "../utils/storage";

export default function ProtectedRoute({ children }) {
  const loc = useLocation();
  if (!getAccessToken()) {
    return <Navigate to="/login" replace state={{ from: loc.pathname }} />;
  }
  return children;
}
