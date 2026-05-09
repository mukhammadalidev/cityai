import { Alert, Table, Typography, message } from "antd";
import { useCallback, useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import PageHeader from "../../components/ui/PageHeader";
import LoadingScreen from "../../components/ui/LoadingScreen";
import EmptyState from "../../components/ui/EmptyState";
import { formatPhone } from "../../utils/formatters";
import { listManagers } from "../../services/authService";
import { useWindowEvent } from "../../hooks/useWindowEvent";
import { BUSINESS_DATA_CHANGED } from "../../utils/businessEvents";

export default function ManagersPage() {
  const { businessId } = useOutletContext();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!businessId) return;
    setLoading(true);
    try {
      setRows(await listManagers({ business_id: businessId }));
    } catch {
      message.error("Managerlar ro‘yxati yuklanmadi.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  useEffect(() => {
    load();
  }, [load]);

  useWindowEvent("business-changed", load);
  useWindowEvent(BUSINESS_DATA_CHANGED, load);

  if (!businessId) return null;
  if (loading) return <LoadingScreen />;

  return (
    <>
      <PageHeader title="Managerlar" description="Biznesga biriktirilgan jamoa a’zolari." />
      <Alert type="info" showIcon style={{ marginBottom: 16 }} message="Yangi manager qo‘shish va ruxsatlarni tahrirlash hozircha backend / admin jarayonlari orqali amalga oshiriladi. Bu yerda faqat ro‘yxat ko‘rsatiladi." />
      {!rows.length ? (
        <EmptyState description="Managerlar topilmadi." />
      ) : (
        <Table
          rowKey="id"
          dataSource={rows}
          pagination={false}
          columns={[
            { title: "F.I.O", dataIndex: "full_name", render: (t, r) => t || r.username },
            { title: "Rol", dataIndex: "role" },
            { title: "Telefon", dataIndex: "phone", render: formatPhone },
            { title: "Telegram ID", dataIndex: "telegram_id" },
            {
              title: "Holat",
              dataIndex: "is_active",
              render: (v) => (v ? "Faol" : "Nofaol"),
            },
          ]}
        />
      )}
      <Typography.Paragraph type="secondary" style={{ marginTop: 16 }}>
        Ruxsatlar (buyurtma / lid / sozlamalar) backenddagi BusinessManager modeliga mos keladi.
      </Typography.Paragraph>
    </>
  );
}
