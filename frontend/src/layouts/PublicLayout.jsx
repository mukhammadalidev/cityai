import { Button, Space } from "antd";
import { Link, Outlet } from "react-router-dom";
import { LoginOutlined } from "@ant-design/icons";
import BrandLogo from "../components/ui/BrandLogo";

export default function PublicLayout() {
  return (
    <div>
      <nav className="cs-public-nav">
        <Link to="/c/buxoro" className="cs-public-nav__brand">
          <BrandLogo height={34} className="cs-brand-img--public" />
        </Link>
        <Space>
          <Link to="/login">
            <Button type="primary" icon={<LoginOutlined />}>
              Kabinetga kirish
            </Button>
          </Link>
        </Space>
      </nav>
      <div className="cs-public-main">
        <Outlet />
      </div>
      <footer className="cs-public-footer">
        <span>© {new Date().getFullYear()} Shahar Xizmatlari AI</span>
      </footer>
    </div>
  );
}
