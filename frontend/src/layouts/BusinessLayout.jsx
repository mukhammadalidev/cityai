import { MenuOutlined } from "@ant-design/icons";
import { Layout } from "antd";
import { useCallback, useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import BusinessSidebar from "../components/layout/BusinessSidebar";
import Topbar from "../components/layout/Topbar";
import MobileSidebar from "../components/layout/MobileSidebar";
import BrandLogo from "../components/ui/BrandLogo";
import { getBusiness, getBusinesses } from "../services/businessService";
import { getPlans, getSubscriptions } from "../services/subscriptionService";
import { BUSINESS_DATA_CHANGED } from "../utils/businessEvents";
import { getSelectedBusinessId, getStoredUser } from "../utils/storage";

const { Sider, Content } = Layout;

export default function BusinessLayout() {
  const loc = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [biz, setBiz] = useState(null);
  const [list, setList] = useState([]);
  const [plan, setPlan] = useState(null);
  const bid = getSelectedBusinessId();
  const isSuperAdmin = getStoredUser()?.role === "super_admin";

  const reloadList = useCallback(() => {
    const params = isSuperAdmin ? {} : { mine: 1 };
    getBusinesses(params)
      .then(setList)
      .catch(() => setList([]));
  }, [isSuperAdmin]);

  useEffect(() => {
    reloadList();
  }, [reloadList]);

  useEffect(() => {
    const h = () => reloadList();
    window.addEventListener("business-changed", h);
    return () => window.removeEventListener("business-changed", h);
  }, [reloadList]);

  useEffect(() => {
    if (!bid) {
      setBiz(null);
      return;
    }
    getBusiness(bid)
      .then(setBiz)
      .catch(() => setBiz(null));
  }, [bid]);

  const reloadPlan = useCallback(() => {
    if (!bid) {
      setPlan(null);
      return;
    }
    Promise.all([getSubscriptions({ business_id: bid }), getPlans()])
      .then(([subs, plans]) => {
        const sub = subs[0];
        setPlan(plans.find((p) => p.id === sub?.plan) ?? null);
      })
      .catch(() => setPlan(null));
  }, [bid]);

  useEffect(() => {
    reloadPlan();
  }, [reloadPlan]);

  useEffect(() => {
    const h = () => reloadPlan();
    window.addEventListener(BUSINESS_DATA_CHANGED, h);
    return () => window.removeEventListener(BUSINESS_DATA_CHANGED, h);
  }, [reloadPlan]);

  useEffect(() => {
    setMobileOpen(false);
  }, [loc.pathname]);

  if (loc.pathname !== "/business/select" && !bid) {
    return <Navigate to="/business/select" replace />;
  }

  if (loc.pathname === "/business/select") {
    return (
      <Layout className="cs-app-layout">
        <Content className="cs-content">
          <Topbar title="Biznes tanlash" />
          <div className="cs-page">
            <Outlet context={{ business: biz, businessList: list, reloadBusinesses: reloadList, plan: null, reloadPlan: () => {} }} />
          </div>
        </Content>
      </Layout>
    );
  }

  const layout = (
    <Layout className={`cs-app-layout${collapsed ? " cs-app-layout--sider-collapsed" : ""}`}>
      <Sider width={260} collapsedWidth={0} collapsed={collapsed} breakpoint="lg" className="cs-sider" trigger={null}>
        <div className="cs-sider-inner">
          <div className="cs-sider-brand">
            <BrandLogo height={32} variant="onDark" compact className="cs-sider-brand__logo" />
            <p className="cs-sider-brand__biz" title={biz?.name}>
              {biz?.name || "Biznes tanlang"}
            </p>
          </div>
          <BusinessSidebar collapsed={collapsed} businessType={biz?.business_type} plan={plan} />
          <div className="cs-sider-footer">
            <button type="button" className="cs-sider-collapse" onClick={() => setCollapsed(!collapsed)}>
              {collapsed ? "Menyuni ochish" : "Menyuni yig‘ish"}
            </button>
          </div>
        </div>
      </Sider>
      {collapsed ? (
        <button
          type="button"
          className="cs-sider-open-fab"
          onClick={() => setCollapsed(false)}
          aria-label="Menyuni ochish"
        >
          <MenuOutlined />
        </button>
      ) : null}
      <Layout className="cs-content">
        <Topbar
          title={biz?.name || "Kabinet"}
          subtitle="Mahsulot va mijozlar"
          businesses={list}
          showBizSelect
          adminOverride={isSuperAdmin}
          sidebarCollapsed={collapsed}
          onSidebarToggle={() => setCollapsed((c) => !c)}
          onMenuClick={() => setMobileOpen(true)}
        />
        <MobileSidebar
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          title="Biznes kabineti"
          subtitle={biz?.name}
        >
          <BusinessSidebar
            mobile
            businessType={biz?.business_type}
            plan={plan}
            onNavigate={() => setMobileOpen(false)}
          />
        </MobileSidebar>
        <div className="cs-page">
          <Outlet
            context={{
              businessId: bid,
              business: biz,
              businessList: list,
              reloadBusinesses: reloadList,
              plan,
              reloadPlan,
            }}
          />
        </div>
      </Layout>
    </Layout>
  );

  return layout;
}
