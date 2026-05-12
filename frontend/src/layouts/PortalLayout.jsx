import { Layout } from "antd";
import { Outlet } from "react-router-dom";
import Topbar from "../components/layout/Topbar";
import { getStoredUser } from "../utils/storage";

const { Content } = Layout;

export default function PortalLayout() {
  const user = getStoredUser();
  const isFitness = user?.role === "business_client";
  return (
    <Layout className="cs-app-layout">
      <Topbar
        title={isFitness ? "Mening kabinetim" : "O‘quv markaz kabineti"}
        subtitle={
          isFitness
            ? "Abonement, davomat va to'lovlaringiz"
            : "Faqat sizning markazingiz ma’lumotlari"
        }
      />
      <Content className="cs-content">
        <div className="cs-page">
          <Outlet />
        </div>
      </Content>
    </Layout>
  );
}
