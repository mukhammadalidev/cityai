import { Button, Space, Tag, Typography } from "antd";
import { Link } from "react-router-dom";
import { EyeOutlined } from "@ant-design/icons";
import StatusTag from "../ui/StatusTag";
import { BUSINESS_STATUS } from "../../config/statusConfigs";
import { formatPhone } from "../../utils/formatters";

export default function BusinessCard({ business, showAdminActions, onEdit }) {
  return (
    <div className="cs-business-card">
      <div style={{ padding: 16 }}>
        <Space wrap style={{ marginBottom: 8 }}>
          <StatusTag map={BUSINESS_STATUS} value={business.status} />
          {business.is_featured && <Tag color="gold">Tavsiya</Tag>}
        </Space>
        <Typography.Title level={4} style={{ margin: "0 0 8px" }}>
          {business.name}
        </Typography.Title>
        <Typography.Text type="secondary" style={{ display: "block", marginBottom: 8 }}>
          {business.category_name} · {business.city_name}
        </Typography.Text>
        <Typography.Text>{formatPhone(business.phone)}</Typography.Text>
        <Space style={{ marginTop: 12 }}>
          <Link to={`/b/${business.slug}`}>
            <Button type="primary" icon={<EyeOutlined />} size="small">
              Ko‘rish
            </Button>
          </Link>
          {showAdminActions && onEdit && (
            <Button size="small" onClick={() => onEdit(business)}>
              Tahrirlash
            </Button>
          )}
        </Space>
      </div>
    </div>
  );
}
