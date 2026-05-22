import { Menu } from "antd";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Building2,
  Briefcase,
  CreditCard,
  FolderTree,
  LayoutDashboard,
  LineChart,
  MapPin,
  Receipt,
  Settings,
} from "lucide-react";

const items = [
  { key: "/admin/dashboard", icon: LayoutDashboard, label: "Boshqaruv" },
  { key: "/admin/cities", icon: MapPin, label: "Shaharlar" },
  { key: "/admin/categories", icon: FolderTree, label: "Kategoriyalar" },
  { key: "/admin/businesses", icon: Building2, label: "Bizneslar" },
  { key: "/business/select", icon: Briefcase, label: "Biznes kabineti" },
  { key: "/admin/subscriptions", icon: CreditCard, label: "Obunalar" },
  { key: "/admin/invoices", icon: Receipt, label: "Hisob-fakturalar" },
  { key: "/admin/analytics", icon: LineChart, label: "Analitika" },
  { key: "/admin/settings", icon: Settings, label: "Sozlamalar" },
];

export default function AdminSidebar({ collapsed, mobile, onNavigate }) {
  const nav = useNavigate();
  const loc = useLocation();
  const selected =
    [...items].sort((a, b) => b.key.length - a.key.length).find((m) => loc.pathname.startsWith(m.key))?.key ||
    "/admin/dashboard";

  return (
    <Menu
      theme="dark"
      mode="inline"
      selectedKeys={[selected]}
      inlineCollapsed={mobile ? false : collapsed}
      className={`cs-sider-menu${mobile ? " cs-sider-menu--mobile" : ""}`}
      style={{ border: "none", background: "transparent", flex: 1, overflow: "auto" }}
      onClick={({ key }) => {
        nav(key);
        onNavigate?.();
      }}
      items={items.map((m) => ({
        key: m.key,
        icon: <m.icon size={18} />,
        label: m.label,
      }))}
    />
  );
}
