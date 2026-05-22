import { Button, Card, Col, Row, Statistic } from "antd";
import dayjs from "dayjs";
import { useCallback, useEffect, useState } from "react";
import { Navigate, useOutletContext } from "react-router-dom";
import PageHeader from "../../components/ui/PageHeader";
import LoadingScreen from "../../components/ui/LoadingScreen";
import { exportDebtorsCsv, getFitnessDashboard } from "../../services/fitnessService";
import { formatPrice } from "../../utils/formatters";

function downloadCsv(path, businessId) {
  const base = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api";
  const token = localStorage.getItem("access_token");
  const url = `${base}${path}?business_id=${businessId}&export=csv&month=${dayjs().format("YYYY-MM")}`;
  return fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
    .then((r) => r.blob())
    .then((blob) => {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = path.includes("attendance") ? "davomat.csv" : "hisobot.csv";
      a.click();
    });
}

export default function FitnessReportsPage() {
  const { businessId, business } = useOutletContext();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!businessId) return;
    setLoading(true);
    try {
      setData(await getFitnessDashboard({ business_id: businessId, month: dayjs().format("YYYY-MM") }));
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  useEffect(() => { load(); }, [load]);

  if (business?.business_type !== "fitness_center") return <Navigate to="/business/dashboard" replace />;
  if (loading) return <LoadingScreen />;

  const c = data?.cards || {};

  return (
    <div>
      <PageHeader title="Hisobotlar" subtitle="Kunlik / oylik tushum, qarzdorlar, davomat" />
      <Row gutter={[16, 16]}>
        <Col xs={24} md={8}>
          <Card title="Kunlik tushum">
            <Statistic value={formatPrice(c.today_income)} />
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card title="Oylik tushum">
            <Statistic value={formatPrice(c.month_income)} />
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card title="Faol a'zolar">
            <Statistic value={c.members_active ?? 0} />
          </Card>
        </Col>
      </Row>
      <Card title="Eksport" style={{ marginTop: 16 }}>
        <Row gutter={[12, 12]}>
          <Col><Button onClick={() => exportDebtorsCsv(businessId)}>Qarzdorlar (CSV)</Button></Col>
          <Col><Button onClick={() => downloadCsv("/reports/attendance/", businessId)}>Davomat (CSV)</Button></Col>
        </Row>
        <p style={{ marginTop: 12, color: "#94a3b8" }}>
          PDF eksport keyingi versiyada qo'shiladi. Hozir CSV orqali Excelga ochishingiz mumkin.
        </p>
      </Card>
    </div>
  );
}
