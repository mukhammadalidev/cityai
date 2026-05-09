import { Typography } from "antd";
import StatusTag from "../ui/StatusTag";
import { LEAD_STATUS } from "../../config/statusConfigs";
import { formatPhone } from "../../utils/formatters";

export default function LeadCard({ lead, onClick }) {
  return (
    <div className="cs-kanban-card" onClick={onClick} role="presentation" style={{ cursor: "pointer" }}>
      <SpaceBetween title={lead.name} tag={<StatusTag map={LEAD_STATUS} value={lead.status} />} />
      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
        {formatPhone(lead.phone)}
      </Typography.Text>
      {lead.message && (
        <Typography.Paragraph ellipsis={{ rows: 2 }} style={{ margin: "8px 0 0", fontSize: 12 }}>
          {lead.message}
        </Typography.Paragraph>
      )}
    </div>
  );
}

function SpaceBetween({ title, tag }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 6 }}>
      <Typography.Text strong>{title}</Typography.Text>
      {tag}
    </div>
  );
}
