import { Layout } from "antd";
import { Outlet } from "react-router-dom";
import Topbar from "../components/layout/Topbar";

const { Content } = Layout;

export default function PortalLayout() {
  return (
    <Layout className="cs-app-layout">
      <Topbar title="O‘quv markaz kabineti" subtitle="Faqat sizning markazingiz ma’lumotlari" />
      <Content className="cs-content">
        <div className="cs-page">
          <Outlet />
        </div>
      </Content>
    </Layout>
  );
}
