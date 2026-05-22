import { Button, Space } from "antd";
import { Link, Outlet } from "react-router-dom";
import { LoginOutlined, SendOutlined, UserOutlined } from "@ant-design/icons";
import BrandLogo from "../components/ui/BrandLogo";
import { getDashboardPathForRole } from "../utils/authRouting";
import { getAccessToken, getStoredUser } from "../utils/storage";

export default function PublicLayout() {
  const token = typeof window !== "undefined" ? getAccessToken() : null;
  const user = typeof window !== "undefined" ? getStoredUser() : null;
  const cabinetPath = user?.role ? getDashboardPathForRole(user.role) : "/business/select";

  return (
    <div className="cs-public-shell">
      <nav className="cs-public-nav" aria-label="Asosiy navigatsiya">
        <Link to="/" className="cs-public-nav__brand" title="CityBot CRM">
          <BrandLogo height={40} variant="onDark" />
        </Link>
        <Space wrap className="cs-public-nav__actions" size="middle">
          <a
            className="ant-btn ant-btn-default ant-btn-color-default cs-public-nav__btn-ghost cs-public-telegram-link"
            href="https://t.me/citybotuz_bot"
            target="_blank"
            rel="noopener noreferrer"
          >
            <span className="ant-btn-icon">
              <SendOutlined />
            </span>
            <span>Telegram bot</span>
          </a>
          {token ? (
            <Link to={cabinetPath}>
              <Button type="primary" icon={<UserOutlined />}>
                Kabinet
              </Button>
            </Link>
          ) : (
            <Link to="/login">
              <Button type="primary" icon={<LoginOutlined />}>
                Kabinetga kirish
              </Button>
            </Link>
          )}
        </Space>
      </nav>
      <div className="cs-public-main">
        <Outlet />
      </div>
      <footer className="cs-public-footer">
        <div className="cs-public-footer__inner">
          <p className="cs-public-footer__tagline">Shahar bo‘yicha xizmatlar va ishonchli bizneslar</p>
          <div className="cs-public-footer__links">
            <a href="https://t.me/citybotuz_bot" target="_blank" rel="noopener noreferrer">
              Telegram
            </a>
            <span className="cs-public-footer__dot" aria-hidden>
              ·
            </span>
            <Link to="/">CityBot CRM</Link>
            <span className="cs-public-footer__dot" aria-hidden>·</span>
            <Link to="/c/buxoro">Shahar katalogi</Link>
            <span className="cs-public-footer__dot" aria-hidden>
              ·
            </span>
            {token ? (
              <Link to={cabinetPath}>Kabinet</Link>
            ) : (
              <Link to="/login">Kabinet</Link>
            )}
          </div>
          <p className="cs-public-footer__copy">© {new Date().getFullYear()} Citybot</p>
        </div>
      </footer>
    </div>
  );
}
