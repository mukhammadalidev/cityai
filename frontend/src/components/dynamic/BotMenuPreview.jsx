import { Card, Space, Tag } from "antd";
import { getBotMenuPreview } from "../../config/menuConfigs";

export default function BotMenuPreview({ businessType }) {
  const items = getBotMenuPreview(businessType);
  return (
    <Card size="small" title="Telegram bot menyusi (preview)">
      <Space wrap>
        {items.map((t) => (
          <Tag key={t}>{t}</Tag>
        ))}
      </Space>
    </Card>
  );
}
