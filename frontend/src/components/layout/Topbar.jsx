import { Button, Select, Space, Tag } from "antd";
import { MenuOutlined } from "@ant-design/icons";
import { LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { logout } from "../../services/authService";
import { getSelectedBusinessId, setSelectedBusinessId } from "../../utils/storage";

export default function Topbar({ title, subtitle, businesses = [], onMenuClick, showBizSelect, adminOverride = false }) {
  const nav = useNavigate();
  const bid = getSelectedBusinessId();

  return (
    <header className="cs-topbar">
      <Space align="start">
        <Button type="text" icon={<MenuOutlined />} onClick={onMenuClick} className="mobile-only" />
        <div>
          <div style={{ fontWeight: 800, fontSize: "1.05rem" }}>{title}</div>
          {subtitle && <div style={{ color: "var(--cs-muted)", fontSize: 13 }}>{subtitle}</div>}
          {adminOverride ? (
            <Tag color="gold" style={{ marginTop: 6 }}>
              Admin override mode
            </Tag>
          ) : null}
        </div>
      </Space>
      <Space wrap>
        {showBizSelect && businesses.length > 0 && (
          <Select
            style={{ minWidth: 220 }}
            placeholder="Biznes"
            value={bid ?? undefined}
            options={businesses.map((b) => ({ value: b.id, label: b.name }))}
            onChange={(v) => {
              setSelectedBusinessId(v);
              window.dispatchEvent(new Event("business-changed"));
            }}
          />
        )}
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
