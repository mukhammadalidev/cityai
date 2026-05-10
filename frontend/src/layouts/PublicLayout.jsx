import { Button, Space } from "antd";
import { Link, Outlet } from "react-router-dom";
import { LoginOutlined, SendOutlined } from "@ant-design/icons";
import BrandLogo from "../components/ui/BrandLogo";
import { PUBLIC_TELEGRAM_BOT_URL } from "../config/publicSite";

const telegramBotUrl = PUBLIC_TELEGRAM_BOT_URL.replace(/\/$/, "");

export default function PublicLayout() {
  return (
    <div className="cs-public-shell">
      <nav className="cs-public-nav" aria-label="Asosiy navigatsiya">
        <Link to="/c/buxoro" className="cs-public-nav__brand" title="Bosh sahifa">
          <BrandLogo height={34} className="cs-brand-img--public" />
        </Link>
        <Space wrap className="cs-public-nav__actions" size="middle">
          <Button
            type="default"
            ghost
            className="cs-public-nav__btn-ghost"
            icon={<SendOutlined />}
            href={telegramBotUrl}
            target="_blank"
            rel="noreferrer"
          >
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
        <div className="cs-public-footer__inner">
          <p className="cs-public-footer__tagline">Shahar bo‘yicha xizmatlar va ishonchli bizneslar</p>
          <div className="cs-public-footer__links">
            <a href={telegramBotUrl} target="_blank" rel="noreferrer">
              Telegram
            </a>
            <span className="cs-public-footer__dot" aria-hidden>
              ·
            </span>
            <Link to="/c/buxoro">Bosh sahifa</Link>
            <span className="cs-public-footer__dot" aria-hidden>
              ·
            </span>
            <Link to="/login">Kabinet</Link>
          </div>
          <p className="cs-public-footer__copy">© {new Date().getFullYear()} Citybot</p>
        </div>
      </footer>
    </div>
  );
}
