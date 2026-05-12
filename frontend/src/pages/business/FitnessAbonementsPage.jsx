import {
  Button,
  Card,
  Col,
  Drawer,
  Empty,
  Input,
  Row,
  Space,
  Statistic,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, Navigate, useOutletContext } from "react-router-dom";
import PageHeader from "../../components/ui/PageHeader";
import LoadingScreen from "../../components/ui/LoadingScreen";
import EmptyState from "../../components/ui/EmptyState";
import { getFitnessAbonements } from "../../services/membershipService";
import { formatPhone } from "../../utils/formatters";
import { BUSINESS_DATA_CHANGED } from "../../utils/businessEvents";
import { useWindowEvent } from "../../hooks/useWindowEvent";

const STATUS_TAG = {
  active: { label: "Faol", color: "green" },
  expiring: { label: "Tugayapti", color: "orange" },
  expired: { label: "Tugagan", color: "red" },
  cancelled: { label: "Bekor", color: "default" },
};

const PAYMENT_STATUS_TAG = {
  unpaid: { label: "To'lanmagan", color: "red" },
  partial: { label: "Qisman", color: "orange" },
  paid: { label: "To'langan", color: "green" },
};

const CLIENT_TYPE_TAG = {
  daily: { label: "Kunlik", color: "blue" },
  monthly: { label: "Oylik", color: "purple" },
};

function fmt(v, currency = "UZS") {
  return `${Number(v || 0).toLocaleString("uz-UZ")} ${currency}`;
}

export default function FitnessAbonementsPage() {
  const { businessId, business } = useOutletContext();
  const isFitness = business?.business_type === "fitness_center";

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [drawer, setDrawer] = useState({ open: false, item: null });

  const load = useCallback(async () => {
    if (!businessId) return;
    setLoading(true);
    try {
      const data = await getFitnessAbonements({ business_id: businessId });
      setRows(data.items || []);
    } catch {
      message.error("Abonementlar yuklanmadi.");
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

  const filtered = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.trim().toLowerCase();
    return rows.filter((r) => r.title.toLowerCase().includes(q));
  }, [rows, search]);

  const totals = useMemo(() => {
    return rows.reduce(
      (acc, r) => {
        acc.subscribers_active += r.subscribers_active || 0;
        acc.subscribers_total += r.subscribers_total || 0;
        acc.expected += Number(r.expected_amount || 0);
        acc.paid += Number(r.paid_amount || 0);
        acc.debt += Number(r.debt_amount || 0);
        return acc;
      },
      { subscribers_active: 0, subscribers_total: 0, expected: 0, paid: 0, debt: 0 },
    );
  }, [rows]);

  const columns = useMemo(
    () => [
      {
        title: "Abonement",
        dataIndex: "title",
        render: (text, row) =>
          row.item_id ? (
            <Space direction="vertical" size={0}>
              <Link to={`/business/items/${row.item_id}`}>
                <Typography.Text strong>{text}</Typography.Text>
              </Link>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                {fmt(row.price, row.currency || "UZS")}
              </Typography.Text>
            </Space>
          ) : (
            <Typography.Text>{text}</Typography.Text>
          ),
      },
      {
        title: "Obunachilar (faol)",
        dataIndex: "subscribers_active",
        width: 150,
        align: "center",
        sorter: (a, b) => a.subscribers_active - b.subscribers_active,
        render: (v) => (
          <Typography.Text strong style={{ fontSize: 18 }}>
            {v}
          </Typography.Text>
        ),
      },
      {
        title: "Jami obunachilar",
        dataIndex: "subscribers_total",
        width: 140,
        align: "center",
        sorter: (a, b) => a.subscribers_total - b.subscribers_total,
      },
      {
        title: "Kutilayotgan",
        dataIndex: "expected_amount",
        width: 160,
        render: (v) => fmt(v),
        sorter: (a, b) => Number(a.expected_amount) - Number(b.expected_amount),
      },
      {
        title: "To'langan",
        dataIndex: "paid_amount",
        width: 160,
        render: (v) => (
          <Typography.Text type="success">{fmt(v)}</Typography.Text>
        ),
      },
      {
        title: "Qarz",
        dataIndex: "debt_amount",
        width: 160,
        render: (v) => (
          <Typography.Text type={Number(v) > 0 ? "danger" : undefined}>
            {fmt(v)}
          </Typography.Text>
        ),
        sorter: (a, b) => Number(a.debt_amount) - Number(b.debt_amount),
      },
      {
        title: "",
        key: "act",
        width: 120,
        render: (_, row) =>
          row.subscribers_total > 0 ? (
            <Button type="link" size="small" onClick={() => setDrawer({ open: true, item: row })}>
              Obunachilar
            </Button>
          ) : (
            <Typography.Text type="secondary">—</Typography.Text>
          ),
      },
    ],
    [],
  );

  if (!business) return null;
  if (!isFitness) return <Navigate to="/business/dashboard" replace />;
  if (!businessId) return null;
  if (loading && !rows.length) return <LoadingScreen />;

  return (
    <>
      <PageHeader
        title="Abonementlar (hisob)"
        description="Har bir abonement bo'yicha nechta klient olgan, qancha to'lov tushgan va qarzdorlik."
        extra={
          <Link to="/business/items">
            <Button>Abonement qo'shish</Button>
          </Link>
        }
      />

      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        <Col xs={12} md={6}>
          <Card size="small">
            <Statistic title="Faol obunalar" value={totals.subscribers_active} />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card size="small">
            <Statistic title="Jami obunalar" value={totals.subscribers_total} />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card size="small">
            <Statistic
              title="Jami to'langan"
              value={totals.paid}
              suffix="UZS"
              valueStyle={{ color: "#16a34a" }}
              formatter={(v) => Number(v).toLocaleString("uz-UZ")}
            />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card size="small">
            <Statistic
              title="Jami qarz"
              value={totals.debt}
              suffix="UZS"
              valueStyle={{ color: totals.debt > 0 ? "#cf1322" : undefined }}
              formatter={(v) => Number(v).toLocaleString("uz-UZ")}
            />
          </Card>
        </Col>
      </Row>

      <Card size="small" style={{ marginBottom: 12 }}>
        <Input.Search
          placeholder="Abonement nomi"
          allowClear
          style={{ maxWidth: 280 }}
          onChange={(e) => setSearch(e.target.value)}
        />
      </Card>

      {filtered.length === 0 ? (
        <EmptyState description="Hozircha abonement yo'q. Avval Items sahifasida abonement qo'shing." />
      ) : (
        <Card size="small">
          <Table
            rowKey={(r) => r.item_id ?? "orphan"}
            dataSource={filtered}
            columns={columns}
            pagination={false}
            scroll={{ x: "max-content" }}
          />
        </Card>
      )}

      <Drawer
        title={drawer.item ? `${drawer.item.title} — obunachilar` : "Obunachilar"}
        open={drawer.open}
        onClose={() => setDrawer({ open: false, item: null })}
        width={760}
      >
        {drawer.item ? (
          <>
            <Row gutter={[12, 12]} style={{ marginBottom: 12 }}>
              <Col xs={12} md={8}>
                <Card size="small">
                  <Statistic title="Faol" value={drawer.item.subscribers_active} />
                </Card>
              </Col>
              <Col xs={12} md={8}>
                <Card size="small">
                  <Statistic
                    title="To'langan"
                    value={Number(drawer.item.paid_amount)}
                    suffix="UZS"
                    formatter={(v) => Number(v).toLocaleString("uz-UZ")}
                  />
                </Card>
              </Col>
              <Col xs={12} md={8}>
                <Card size="small">
                  <Statistic
                    title="Qarz"
                    value={Number(drawer.item.debt_amount)}
                    suffix="UZS"
                    valueStyle={{
                      color: Number(drawer.item.debt_amount) > 0 ? "#cf1322" : undefined,
                    }}
                    formatter={(v) => Number(v).toLocaleString("uz-UZ")}
                  />
                </Card>
              </Col>
            </Row>

            {drawer.item.subscribers?.length ? (
              <Table
                rowKey="membership_id"
                pagination={{ pageSize: 20 }}
                size="small"
                dataSource={drawer.item.subscribers}
                columns={[
                  {
                    title: "Klient",
                    dataIndex: "client_name",
                    render: (t, r) => (
                      <Space direction="vertical" size={0}>
                        <Typography.Text strong>{t}</Typography.Text>
                        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                          {formatPhone(r.client_phone) || "—"}
                        </Typography.Text>
                      </Space>
                    ),
                  },
                  {
                    title: "Turi",
                    dataIndex: "client_type",
                    width: 90,
                    render: (v) => {
                      const t = CLIENT_TYPE_TAG[v] || { label: v, color: "default" };
                      return <Tag color={t.color}>{t.label}</Tag>;
                    },
                  },
                  {
                    title: "Boshlanish",
                    dataIndex: "start_date",
                    width: 110,
                  },
                  {
                    title: "Tugash",
                    dataIndex: "end_date",
                    width: 110,
                    render: (v) => v || "—",
                  },
                  {
                    title: "Holat",
                    dataIndex: "status",
                    width: 100,
                    render: (s) => {
                      const t = STATUS_TAG[s] || { label: s, color: "default" };
                      return <Tag color={t.color}>{t.label}</Tag>;
                    },
                  },
                  {
                    title: "To'lov",
                    dataIndex: "payment_status",
                    width: 110,
                    render: (s) => {
                      const t = PAYMENT_STATUS_TAG[s] || { label: s, color: "default" };
                      return <Tag color={t.color}>{t.label}</Tag>;
                    },
                  },
                  {
                    title: "Qarz",
                    dataIndex: "debt_amount",
                    width: 140,
                    render: (v) => (
                      <Typography.Text type={Number(v) > 0 ? "danger" : undefined}>
                        {fmt(v)}
                      </Typography.Text>
                    ),
                  },
                ]}
              />
            ) : (
              <Empty description="Obunachi yo'q" />
            )}
          </>
        ) : null}
      </Drawer>
    </>
  );
}
