import { Menu, Space, Tag } from "antd";
import { useNavigate, useLocation } from "react-router-dom";
import {
  BarChart3,
  BadgeCheck,
  BookOpen,
  Brain,
  Calendar,
  CalendarCheck,
  CreditCard,
  Dumbbell,
  GraduationCap,
  HelpCircle,
  IdCard,
  Layers,
  LayoutDashboard,
  Library,
  ListChecks,
  Package,
  Receipt,
  Settings,
  Sparkles,
  Trophy,
  Users,
  UserCog,
  Lock,
} from "lucide-react";
import { getBusinessTypeConfig } from "../../config/businessTypes";

function MenuItemLabel({ label, locked, mobile }) {
  if (!locked) return label;
  if (mobile) {
    return (
      <span className="cs-menu-item-label">
        <span className="cs-menu-item-label__text">{label}</span>
        <span className="cs-menu-item-label__badge">
          <Lock size={12} />
          Premium
        </span>
      </span>
    );
  }
  return (
    <Space size={6} className="cs-menu-item-label--desktop">
      <span>{label}</span>
      <Lock size={13} />
      <Tag color="gold" style={{ marginInlineEnd: 0 }}>
        Premium
      </Tag>
    </Space>
  );
}

export default function BusinessSidebar({ collapsed, mobile, businessType, plan, onNavigate }) {
  const cfg = getBusinessTypeConfig(businessType);
  const nav = useNavigate();
  const loc = useLocation();

  const showKnowledge = !plan || plan.has_ai_chat;
  const showAiUsage = !plan || plan.has_ai_chat;
  const showMarketing = !plan || plan.has_marketing_generator;
  const showEduMaterials = !plan || plan.has_edu_materials;

  const isRestaurant = businessType === "restaurant";

  const ordersLabel = cfg.ordersLabel || "Buyurtmalar";
  const showOrders =
    isRestaurant ||
    businessType === "shop" ||
    businessType === "repair_service" ||
    businessType === "taxi_delivery" ||
    businessType === "photo_video";

  const withLock = (label, locked) => <MenuItemLabel label={label} locked={locked} mobile={mobile} />;

  const items = isRestaurant
    ? [
        { key: "/business/dashboard", icon: LayoutDashboard, label: "Boshqaruv" },
        { key: "/business/items", icon: Package, label: cfg.itemsLabel || "Menyu" },
        { key: "/business/bookings", icon: Calendar, label: cfg.bookingsLabel || "Bronlar" },
        { key: "/business/orders", icon: Receipt, label: ordersLabel },
        {
          key: "/business/knowledge",
          icon: BookOpen,
          label: withLock("AI bilim bazasi", !showKnowledge),
          locked: !showKnowledge,
        },
        { key: "/business/settings", icon: Settings, label: "Sozlamalar" },
      ]
    : [
        {
          key: businessType === "fitness_center" ? "/business/fitness/dashboard" : "/business/dashboard",
          icon: LayoutDashboard,
          label: "Boshqaruv",
        },
        { key: "/business/items", icon: Package, label: cfg.itemsLabel },
        { key: "/business/leads", icon: Users, label: cfg.leadsLabel },
        ...(businessType === "education_center"
          ? [
              { key: "/business/students", icon: GraduationCap, label: "O‘quvchilar va davomat" },
              { key: "/business/student-payments", icon: CreditCard, label: "To'lovlar" },
              { key: "/business/edu-reports", icon: BarChart3, label: "Hisobotlar" },
              { key: "/business/student-ratings", icon: Trophy, label: "Baholar va reyting" },
              { key: "/business/student-groups", icon: Layers, label: "O‘quv guruhlari" },
              { key: "/business/teachers", icon: IdCard, label: "Ustozlar" },
              {
                key: "/business/materials",
                icon: Library,
                label: withLock("Materiallar", !showEduMaterials),
                locked: !showEduMaterials,
              },
              { key: "/business/edu-quizzes", icon: ListChecks, label: "Testlar / quizlar" },
            ]
          : []),
        ...(businessType === "fitness_center"
          ? [
              { key: "/business/fitness/clients", icon: Dumbbell, label: "A'zolar" },
              { key: "/business/fitness/subscriptions", icon: BadgeCheck, label: "Abonementlar" },
              { key: "/business/fitness/payments", icon: CreditCard, label: "To'lovlar" },
              { key: "/business/fitness/debtors", icon: Receipt, label: "Qarzdorlar" },
              { key: "/business/fitness/attendance", icon: CalendarCheck, label: "Davomat" },
              { key: "/business/fitness/trainers", icon: IdCard, label: "Trenerlar" },
              { key: "/business/fitness/schedule", icon: Calendar, label: "Jadval" },
              { key: "/business/fitness/reports", icon: BarChart3, label: "Hisobotlar" },
              { key: "/business/fitness/settings", icon: Settings, label: "Sozlamalar" },
              { key: "/business/fitness/guide", icon: HelpCircle, label: "Qo'llanma" },
            ]
          : []),
        { key: "/business/bookings", icon: Calendar, label: cfg.bookingsLabel || "Bronlar" },
        ...(showOrders ? [{ key: "/business/orders", icon: Receipt, label: ordersLabel }] : []),
        {
          key: "/business/knowledge",
          icon: BookOpen,
          label: withLock("AI bilim bazasi", !showKnowledge),
          locked: !showKnowledge,
        },
        { key: "/business/managers", icon: UserCog, label: "Menejerlar" },
        {
          key: "/business/ai-usage",
          icon: Brain,
          label: withLock("AI sarfi", !showAiUsage),
          locked: !showAiUsage,
        },
        {
          key: "/business/marketing",
          icon: Sparkles,
          label: withLock("Marketing", !showMarketing),
          locked: !showMarketing,
        },
        { key: "/business/billing", icon: Receipt, label: "Billing" },
        { key: "/business/settings", icon: Settings, label: "Sozlamalar" },
      ];

  const selected =
    [...items].sort((a, b) => b.key.length - a.key.length).find((m) => loc.pathname.startsWith(m.key))?.key ||
    "/business/dashboard";

  return (
    <Menu
      theme="dark"
      mode="inline"
      selectedKeys={[selected]}
      inlineCollapsed={mobile ? false : collapsed}
      className={`cs-sider-menu${mobile ? " cs-sider-menu--mobile" : ""}`}
      style={{ border: "none", background: "transparent", flex: 1, overflow: "auto" }}
      onClick={({ key }) => {
        const target = items.find((m) => m.key === key);
        if (target?.locked) {
          nav("/business/billing");
          onNavigate?.();
          return;
        }
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
