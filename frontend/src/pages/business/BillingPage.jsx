import { Button, Card, Col, Row, Table, Typography, message } from "antd";
import { useCallback, useEffect, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import PageHeader from "../../components/ui/PageHeader";
import LoadingScreen from "../../components/ui/LoadingScreen";
import EmptyState from "../../components/ui/EmptyState";
import PricingCard from "../../components/ui/PricingCard";
import StatusTag from "../../components/ui/StatusTag";
import { SUBSCRIPTION_STATUS, INVOICE_STATUS } from "../../config/statusConfigs";
import { planFeatureList } from "../../config/planConfigs";
import { formatPrice, formatDate } from "../../utils/formatters";
import { getSubscriptions, getPlans } from "../../services/subscriptionService";
import { getInvoices } from "../../services/billingService";
import { useWindowEvent } from "../../hooks/useWindowEvent";
import { BUSINESS_DATA_CHANGED } from "../../utils/businessEvents";

export default function BillingPage() {
  const { businessId } = useOutletContext();
  const [subs, setSubs] = useState([]);
  const [plans, setPlans] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!businessId) return;
    setLoading(true);
    try {
      const [s, p, inv] = await Promise.all([
        getSubscriptions({ business_id: businessId }),
        getPlans(),
        getInvoices({ business_id: businessId }),
      ]);
      setSubs(s);
      setPlans(p);
      setInvoices(inv);
    } catch {
      message.error("Billing yuklanmadi.");
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

  const sub = subs[0];
  const plan = plans.find((p) => p.id === sub?.plan);

  return (
    <>
      <PageHeader title="Billing" description="Tarif, limitlar va hisob-fakturalar." />
      <Row gutter={[16, 16]}>
        <Col xs={24} md={12}>
          <Card title="Joriy tarif">
            {plan ? (
              <>
                <Typography.Title level={4}>{plan.name}</Typography.Title>
                <Typography.Paragraph>{formatPrice(plan.monthly_price)} / oy</Typography.Paragraph>
                <Typography.Paragraph type="secondary">
                  {planFeatureList(plan).join(" · ") || "—"}
                </Typography.Paragraph>
                {sub && (
                  <>
                    <div>
                      Holat: <StatusTag map={SUBSCRIPTION_STATUS} value={sub.status} />
                    </div>
                    <div>Keyingi to‘lov: {formatDate(sub.next_payment_date)}</div>
                  </>
                )}
              </>
            ) : (
              <EmptyState description="Faol obuna topilmadi." />
            )}
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card title="Boshqa tariflar">
            <Row gutter={[8, 8]}>
              {plans.slice(0, 3).map((p) => (
                <Col span={24} key={p.id}>
                  <PricingCard plan={p} />
                </Col>
              ))}
            </Row>
            <Link to="/business/settings">
              <Button type="link" style={{ marginTop: 8 }}>
                Sozlamalarga o‘tish
              </Button>
            </Link>
          </Card>
        </Col>
      </Row>
      <Card title="Hisob-fakturalar" style={{ marginTop: 16 }}>
        {!invoices.length ? (
          <EmptyState description="Hisob-fakturalar yo‘q." />
        ) : (
          <Table
            size="small"
            rowKey="id"
            dataSource={invoices}
            columns={[
              { title: "Summa", dataIndex: "amount", render: formatPrice },
              { title: "Tur", dataIndex: "invoice_type" },
              {
                title: "Holat",
                dataIndex: "status",
                render: (v) => <StatusTag map={INVOICE_STATUS} value={v} />,
              },
              { title: "Muddati", dataIndex: "due_date", render: formatDate },
            ]}
          />
        )}
      </Card>
    </>
  );
}
