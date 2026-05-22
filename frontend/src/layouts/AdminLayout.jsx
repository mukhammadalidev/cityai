import { Layout } from "antd";
import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import AdminSidebar from "../components/layout/AdminSidebar";
import Topbar from "../components/layout/Topbar";
import MobileSidebar from "../components/layout/MobileSidebar";
import BrandLogo from "../components/ui/BrandLogo";

const { Sider } = Layout;

export default function AdminLayout() {
  const loc = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [loc.pathname]);

  return (
    <Layout className="cs-app-layout">
      <Sider width={260} collapsedWidth={0} collapsed={collapsed} breakpoint="lg" className="cs-sider" trigger={null}>
        <div className="cs-sider-inner">
          <div className="cs-sider-brand">
            <BrandLogo height={32} variant="onDark" compact className="cs-sider-brand__logo" />
            <p className="cs-sider-brand__biz">Super administrator</p>
          </div>
          <AdminSidebar collapsed={collapsed} />
          <div className="cs-sider-footer">
            <button type="button" className="cs-sider-collapse" onClick={() => setCollapsed(!collapsed)}>
              {collapsed ? "Menyuni ochish" : "Menyuni yig‘ish"}
            </button>
          </div>
        </div>
      </Sider>
      <Layout className="cs-content">
        <Topbar title="Admin panel" subtitle="Platforma boshqaruvi" onMenuClick={() => setMobileOpen(true)} />
        <MobileSidebar
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          title="City Services AI"
          subtitle="Super administrator"
        >
          <AdminSidebar mobile onNavigate={() => setMobileOpen(false)} />
        </MobileSidebar>
        <div className="cs-page">
          <Outlet />
        </div>
      </Layout>
    </Layout>
  );
}
