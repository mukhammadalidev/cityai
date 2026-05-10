import { Button, Space } from "antd";
import { Link, Outlet } from "react-router-dom";
import { LoginOutlined, SendOutlined } from "@ant-design/icons";
import BrandLogo from "../components/ui/BrandLogo";

const telegramBotUrl =
  (import.meta.env.VITE_TELEGRAM_BOT_URL || "https://t.me/citybotuz_bot").replace(/\/$/, "");

export default function PublicLayout() {
  return (
    <div>
      <nav className="cs-public-nav">
        <Link to="/c/buxoro" className="cs-public-nav__brand">
          <BrandLogo height={34} className="cs-brand-img--public" />
        </Link>
        <Space wrap>
          <Button icon={<SendOutlined />} href={telegramBotUrl} target="_blank" rel="noreferrer">
            Telegram bot
          </Button>
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
