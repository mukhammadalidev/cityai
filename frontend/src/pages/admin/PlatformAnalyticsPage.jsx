import { Card, Col, Row, Table, Typography, message } from "antd";
import { useEffect, useState } from "react";
import PageHeader from "../../components/ui/PageHeader";
import LoadingScreen from "../../components/ui/LoadingScreen";
import RevenueChart from "../../components/charts/RevenueChart";
import LeadsChart from "../../components/charts/LeadsChart";
import CategoryChart from "../../components/charts/CategoryChart";
import UsageChart from "../../components/charts/UsageChart";
import ConversionChart from "../../components/charts/ConversionChart";
import { getPlatformAnalytics } from "../../services/analyticsService";
import { getBusinesses } from "../../services/businessService";
import { getAIUsage } from "../../services/aiUsageService";
import { formatPrice } from "../../utils/formatters";
import { emptyPlatformAnalytics } from "../../utils/emptyAnalytics";

export default function PlatformAnalyticsPage() {
  const [data, setData] = useState(null);
  const [topBiz, setTopBiz] = useState([]);
  const [aiUsage, setAiUsage] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const a = await getPlatformAnalytics();
        setData(a);
        const b = await getBusinesses({});
        setTopBiz([...b].sort((x, y) => Number(y.rating || 0) - Number(x.rating || 0)).slice(0, 8));
        const aiPack = await getAIUsage({});
        const ai = aiPack.rows || [];
        const byDay = {};
        ai.forEach((row) => {
          const d = String(row.created_at || "").slice(0, 10);
          if (!d) return;
          byDay[d] = (byDay[d] || 0) + (row.total_tokens || 0);
        });
        setAiUsage(Object.entries(byDay).map(([n, t]) => ({ n, t })).slice(-14));
      } catch {
        message.error("Analitika yuklanmadi.");
        setData({ ...emptyPlatformAnalytics });
        setTopBiz([]);
        setAiUsage([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <LoadingScreen />;

  const conv = (data?.businesses_by_category || []).slice(0, 6).map((x) => ({
    name: (x.category__name || "—").slice(0, 14),
    value: x.c,
  }));

  return (
    <>
      <PageHeader title="Platforma analitikasi" description="Daromad, lidlar, kategoriyalar va AI." />
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card title="Daromad (demo)">
            <RevenueChart data={[]} />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Leadlar dinamikasi">
            <LeadsChart data={data?.leads_by_day} />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Kategoriya bo‘yicha bizneslar">
            <CategoryChart data={data?.businesses_by_category} />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="AI tokenlar (kunlar bo‘yicha, so‘nggi)">
            <UsageChart data={aiUsage} />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Konversiya (kategoriya ulushi)">
            <ConversionChart data={conv.length ? conv : [{ name: "—", value: 1 }]} />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Top bizneslar (reyting)">
            <Table
              size="small"
              rowKey="id"
              dataSource={topBiz}
              pagination={false}
              columns={[
                { title: "Nomi", dataIndex: "name" },
                { title: "Reyting", dataIndex: "rating" },
                { title: "Ko‘rishlar", dataIndex: "views_count" },
                { title: "Oylik (demo)", render: () => formatPrice(0) },
              ]}
            />
          </Card>
        </Col>
      </Row>
      <Typography.Paragraph type="secondary" style={{ marginTop: 16 }}>
        * Daromad va ayrim ustunlar demo ma’lumot bilan to‘ldiriladi.
      </Typography.Paragraph>
    </>
  );
}
