import { Alert, Card, Typography } from "antd";
import { Navigate, useOutletContext } from "react-router-dom";
import PageHeader from "../../components/ui/PageHeader";

export default function FitnessSettingsPage() {
  const { business } = useOutletContext();

  if (business?.business_type !== "fitness_center") {
    return <Navigate to="/business/dashboard" replace />;
  }

  return (
    <div>
      <PageHeader title="Sozlamalar" subtitle="Fitness zal konfiguratsiyasi" />
      <Card>
        <Typography.Paragraph>
          Telegram eslatmalar uchun loyiha ildizidagi <code>.env</code> faylida quyidagilarni sozlang:
        </Typography.Paragraph>
        <pre style={{ background: "#0f172a", color: "#94a3b8", padding: 16, borderRadius: 8 }}>
{`TELEGRAM_BOT_TOKEN=...
# ixtiyoriy — admin chat ID (vergul bilan)
FITNESS_ADMIN_CHAT_IDS=123456789`}
        </pre>
        <Alert
          type="info"
          showIcon
          message="Eslatmalar"
          description="Abonement tugashiga 7 kun qolganda, to'lov qabul qilinganda va yangi a'zo qo'shilganda admin Telegramga xabar oladi. Qarzdorlar uchun `python manage.py send_fitness_reminders` ni cron orqali ishga tushiring."
          style={{ marginTop: 16 }}
        />
      </Card>
    </div>
  );
}
