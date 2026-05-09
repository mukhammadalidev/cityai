import { Outlet } from "react-router-dom";

export default function AuthLayout() {
  return (
    <div className="cs-auth-wrap">
      <Outlet />
    </div>
  );
}
