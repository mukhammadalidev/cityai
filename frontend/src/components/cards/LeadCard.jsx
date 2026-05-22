import { Tag, Typography } from "antd";
import StatusTag from "../ui/StatusTag";
import { LEAD_STATUS } from "../../config/statusConfigs";
import { formatDateTime, formatPhone } from "../../utils/formatters";

const LEAD_TYPE_LABELS = {
  general: "Umumiy",
  contact: "Aloqa",
  car_interest: "Mashina",
  credit: "Kredit",
  trade_in: "Trade-in",
  course_register: "Kurs",
  price_question: "Narx",
  delivery_question: "Yetkazish",
  payment_question: "To'lov",
  property_interest: "Uy",
  product_question: "Mahsulot",
  membership_request: "Abonement",
  order: "Buyurtma",
  custom: "Boshqa",
};

const PRIORITY_COLORS = {
  low: "default",
  medium: "blue",
  high: "red",
};

export default function LeadCard({ lead, onClick, itemTitle }) {
  const typeLabel = LEAD_TYPE_LABELS[lead.lead_type] || lead.lead_type || "—";
  const priority = lead.priority;

  return (
    <div className="cs-kanban-card" onClick={onClick} role="button" tabIndex={0} onKeyDown={(e) => e.key === "Enter" && onClick?.()}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 6 }}>
        <Typography.Text strong style={{ fontSize: 14 }}>
          {lead.name || "—"}
        </Typography.Text>
        {priority ? (
          <Tag color={PRIORITY_COLORS[priority] || "default"} style={{ margin: 0, fontSize: 11 }}>
            {priority === "high" ? "Yuqori" : priority === "medium" ? "O'rta" : "Past"}
          </Tag>
        ) : null}
      </div>
      <Typography.Text type="secondary" style={{ fontSize: 12, display: "block" }}>
        {formatPhone(lead.phone)}
      </Typography.Text>
      <div className="cs-kanban-card__meta">
        <Tag style={{ margin: 0 }}>{typeLabel}</Tag>
        {itemTitle ? <span>{itemTitle}</span> : null}
      </div>
      {lead.message ? (
        <Typography.Paragraph ellipsis={{ rows: 2 }} style={{ margin: "8px 0 0", fontSize: 12, color: "var(--muted)" }}>
          {lead.message}
        </Typography.Paragraph>
      ) : null}
      <div style={{ marginTop: 8, fontSize: 11, color: "var(--muted)" }}>{formatDateTime(lead.created_at)}</div>
    </div>
  );
}

export function LeadCardTableStatus({ status }) {
  return <StatusTag map={LEAD_STATUS} value={status} />;
}
