import { Button, Select, Space, Tag } from "antd";
import { GlobalOutlined, MenuOutlined } from "@ant-design/icons";
import { LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { logout } from "../../services/authService";
import { PUBLIC_SITE_HOME } from "../../utils/authRouting";
import { getSelectedBusinessId, setSelectedBusinessId } from "../../utils/storage";

export default function Topbar({ title, subtitle, businesses = [], onMenuClick, showBizSelect, adminOverride = false }) {
  const nav = useNavigate();
  const bid = getSelectedBusinessId();

  return (
    <header className="cs-topbar">
      <Space align="start" size={12}>
        {onMenuClick ? <Button type="text" icon={<MenuOutlined />} onClick={onMenuClick} className="mobile-only" /> : null}
        <div>
          <div className="cs-topbar__title">{title}</div>
          {subtitle && <div className="cs-topbar__subtitle">{subtitle}</div>}
          {adminOverride ? (
            <Tag color="gold" style={{ marginTop: 6 }}>
              Admin override mode
            </Tag>
          ) : null}
        </div>
      </Space>
      <Space wrap className="cs-topbar__actions">
        {showBizSelect && businesses.length > 0 && (
          <Select
            placeholder="Biznes"
            value={bid ?? undefined}
            options={businesses.map((b) => ({ value: b.id, label: b.name }))}
            onChange={(v) => {
              setSelectedBusinessId(v);
              window.dispatchEvent(new Event("business-changed"));
            }}
          />
        )}
        <Button type="default" icon={<GlobalOutlined />} onClick={() => nav(PUBLIC_SITE_HOME)}>
          Sayt bosh sahifasi
        </Button>
        <Button
          icon={<LogOut size={16} />}
          onClick={() => {
            logout();
            nav("/login");
          }}
        >
          Chiqish
        </Button>
      </Space>
    </header>
  );
}
