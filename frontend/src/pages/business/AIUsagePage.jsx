import { Button, Card, Progress, Row, Col, Table, Typography, message } from "antd";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import PageHeader from "../../components/ui/PageHeader";
import LoadingScreen from "../../components/ui/LoadingScreen";
import EmptyState from "../../components/ui/EmptyState";
import UpgradeCard from "../../components/ui/UpgradeCard";
import UsageChart from "../../components/charts/UsageChart";
import { getAIUsage } from "../../services/aiUsageService";
import { getSubscriptions, getPlans } from "../../services/subscriptionService";
import { formatDateTime } from "../../utils/formatters";
import { useWindowEvent } from "../../hooks/useWindowEvent";
import { BUSINESS_DATA_CHANGED } from "../../utils/businessEvents";

export default function AIUsagePage() {
  const { businessId, plan } = useOutletContext();
  const [rows, setRows] = useState([]);
  const [limit, setLimit] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!businessId) return;
    setLoading(true);
    try {
      const [ai, subs, plans] = await Promise.all([
        getAIUsage({ business_id: businessId }),
        getSubscriptions({ business_id: businessId }),
        getPlans(),
      ]);
      setRows(ai);
      const sub = subs[0];
      const plan = plans.find((p) => p.id === sub?.plan);
      setLimit(plan?.max_ai_messages_per_month || 0);
    } catch {
      message.error("AI statistikasi yuklanmadi.");
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

  const used = rows.length;
  const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;

  const chartData = useMemo(() => {
    const m = {};
    rows.forEach((r) => {
      const d = String(r.created_at || "").slice(5, 10);
      if (!d) return;
      m[d] = (m[d] || 0) + (r.total_tokens || 0);
    });
    return Object.entries(m)
      .map(([n, t]) => ({ n, t }))
      .slice(-14);
  }, [rows]);

  if (!businessId) return null;
  if (plan && !plan.has_ai_chat) {
    return (
      <>
        <PageHeader title="AI ishlatish" description="Tarifda AI chat yo‘q bo‘lsa, sarflangan tokenlar ko‘rinmaydi." />
        <UpgradeCard
          title="AI chat-bot tarifda yo‘q"
          description="Start va yuqori tariflarda ochiladi. Billing sahifasidan yangilang."
        />
        <Link to="/business/billing">
          <Button type="primary" style={{ marginTop: 16 }}>
            Tariflarni ko‘rish
          </Button>
        </Link>
      </>
    );
  }
  if (loading) return <LoadingScreen />;

  return (
    <>
      <PageHeader title="AI ishlatish" description="Javoblar, tokenlar va limitlar." />
      <Row gutter={[16, 16]}>
        <Col xs={24} md={8}>
          <Card title="Limit (oylik yozuvlar)">
            <Typography.Paragraph>Jami yozuvlar: {used}</Typography.Paragraph>
            <Typography.Paragraph>Limit (reja): {limit || "—"}</Typography.Paragraph>
            <Progress percent={pct} status={pct > 90 ? "exception" : "active"} />
          </Card>
        </Col>
        <Col xs={24} md={16}>
          <Card title="Tokenlar">
            <UsageChart data={chartData} />
          </Card>
        </Col>
      </Row>
      <Card title="So‘nggi AI xabarlar" style={{ marginTop: 16 }}>
        {!rows.length ? (
          <EmptyState description="Yozuvlar yo‘q." />
        ) : (
          <Table
            size="small"
            rowKey="id"
            dataSource={rows.slice(0, 50)}
            pagination={false}
            columns={[
              { title: "Vaqt", dataIndex: "created_at", render: formatDateTime },
              { title: "Tokenlar", dataIndex: "total_tokens" },
              { title: "Xabar", dataIndex: "message", ellipsis: true },
              { title: "Javob", dataIndex: "response", ellipsis: true },
            ]}
          />
        )}
      </Card>
    </>
  );
}
