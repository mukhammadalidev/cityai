import { Card, Form, Input, Typography } from "antd";
import PageHeader from "../../components/ui/PageHeader";

const apiBase = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

export default function PlatformSettingsPage() {
  return (
    <>
      <PageHeader title="Platforma sozlamalari" description="Umumiy ma’lumot va API manzili." />
      <Card>
        <Typography.Paragraph>
          Global sozlamalar backend orqali boshqariladi. Bu sahifada faqat frontend uchun API manzili va eslatmalar ko‘rsatiladi.
        </Typography.Paragraph>
        <Form layout="vertical" style={{ maxWidth: 480 }} disabled>
          <Form.Item label="API bazaviy URL">
            <Input value={apiBase} readOnly />
          </Form.Item>
          <Form.Item label="Axios yo‘li">
            <Input value={`${apiBase.replace(/\/$/, "")}/api`} readOnly />
          </Form.Item>
        </Form>
        <Typography.Text type="secondary">
          JWT kalitlari brauzer <code>localStorage</code>ida saqlanadi. Chiqish tugmasi sessiyani tozalaydi.
        </Typography.Text>
      </Card>
    </>
  );
}
