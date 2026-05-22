import { Button, Table } from "antd";
import { useCallback, useEffect, useState } from "react";
import { Navigate, useOutletContext } from "react-router-dom";
import PageHeader from "../../components/ui/PageHeader";
import LoadingScreen from "../../components/ui/LoadingScreen";
import { exportDebtorsCsv, getDebtors } from "../../services/fitnessService";
import { formatPrice } from "../../utils/formatters";

export default function FitnessDebtorsPage() {
  const { businessId, business } = useOutletContext();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!businessId) return;
    setLoading(true);
    try {
      const data = await getDebtors({ business_id: businessId });
      setRows(data.debtors || []);
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  useEffect(() => { load(); }, [load]);

  if (business?.business_type !== "fitness_center") return <Navigate to="/business/dashboard" replace />;
  if (loading) return <LoadingScreen />;

  return (
    <div>
      <PageHeader
        title="Qarzdorlar"
        extra={<Button onClick={() => exportDebtorsCsv(businessId)}>CSV eksport</Button>}
      />
      <Table
        rowKey="membership_id"
        dataSource={rows}
        columns={[
          { title: "A'zo", dataIndex: "member_name" },
          { title: "Telefon", dataIndex: "phone" },
          { title: "Abonement", dataIndex: "plan_name" },
          { title: "Jami", render: (_, r) => formatPrice(r.total_amount) },
          { title: "To'langan", render: (_, r) => formatPrice(r.paid_amount) },
          { title: "Qarz", render: (_, r) => formatPrice(r.debt_amount) },
          { title: "Muddat", dataIndex: "due_date" },
          { title: "Holat", dataIndex: "status" },
        ]}
      />
    </div>
  );
}
