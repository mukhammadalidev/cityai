import { Card, Typography } from "antd";
import { LockOutlined } from "@ant-design/icons";

export default function UpgradeCard({ title, description }) {
  return (
    <Card>
      <Typography.Title level={4}>
        <LockOutlined /> {title || "Cheklangan"}
      </Typography.Title>
      <Typography.Paragraph type="secondary">{description}</Typography.Paragraph>
    </Card>
  );
}
