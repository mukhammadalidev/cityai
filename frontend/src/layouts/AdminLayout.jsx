import { Layout, Button } from "antd";
import { useState } from "react";
import { Outlet } from "react-router-dom";
import AdminSidebar from "../components/layout/AdminSidebar";
import Topbar from "../components/layout/Topbar";
import MobileSidebar from "../components/layout/MobileSidebar";
import BrandLogo from "../components/ui/BrandLogo";

const { Sider } = Layout;

export default function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <Layout className="cs-app-layout">
      <Sider width={260} collapsedWidth={0} collapsed={collapsed} breakpoint="lg" className="cs-sider" trigger={null}>
        <div className="cs-sider-inner">
          <div className="cs-sider-brand">
            <BrandLogo height={36} className="cs-sider-brand__logo" />
            <div className="cs-sider-brand__title">City Services AI</div>
            <div className="cs-sider-brand__sub">Super administrator</div>
          </div>
          <AdminSidebar collapsed={collapsed} />
          <div className="cs-sider-footer">
            <Button type="link" style={{ color: "rgba(255,255,255,0.65)", padding: 0 }} onClick={() => setCollapsed(!collapsed)}>
              {collapsed ? "»" : "« Menyuni yig‘ish"}
            </Button>
          </div>
        </div>
      </Sider>
      <Layout className="cs-content">
        <Topbar title="Admin panel" subtitle="Platforma boshqaruvi" onMenuClick={() => setMobileOpen(true)} />
        <MobileSidebar open={mobileOpen} onClose={() => setMobileOpen(false)}>
          <div className="cs-mobile-sidebar__inner">
            <div className="cs-sider-brand">
              <BrandLogo height={34} className="cs-sider-brand__logo" />
              <div className="cs-sider-brand__title">City Services AI</div>
            </div>
            <AdminSidebar onNavigate={() => setMobileOpen(false)} />
          </div>
        </MobileSidebar>
        <div className="cs-page">
          <Outlet />
        </div>
      </Layout>
    </Layout>
  );
}
