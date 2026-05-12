import {
  Button,
  Card,
  Col,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Row,
  Select,
  Space,
  Statistic,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import dayjs from "dayjs";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Navigate, useOutletContext } from "react-router-dom";
import PageHeader from "../../components/ui/PageHeader";
import LoadingScreen from "../../components/ui/LoadingScreen";
import EmptyState from "../../components/ui/EmptyState";
import {
  createPayment,
  deletePayment,
  getClients,
  getFitnessLedgerSummary,
  getMemberships,
  getPayments,
} from "../../services/membershipService";
import { BUSINESS_DATA_CHANGED, notifyBusinessDataChanged } from "../../utils/businessEvents";
import { useWindowEvent } from "../../hooks/useWindowEvent";

const METHOD_TAG = {
  cash: { label: "Naqd", color: "green" },
  card: { label: "Karta", color: "blue" },
  transfer: { label: "O'tkazma", color: "geekblue" },
  other: { label: "Boshqa", color: "default" },
};

const PAYMENT_STATUS_TAG = {
  unpaid: { label: "To'lanmagan", color: "red" },
  partial: { label: "Qisman", color: "orange" },
  paid: { label: "To'langan", color: "green" },
};

function fmt(v) {
  return `${Number(v || 0).toLocaleString("uz-UZ")} UZS`;
}

export default function FitnessPaymentsPage() {
  const { businessId, business } = useOutletContext();
  const isFitness = business?.business_type === "fitness_center";

  const [rows, setRows] = useState([]);
  const [clients, setClients] = useState([]);
  const [memberships, setMemberships] = useState([]);
  const [debtors, setDebtors] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filterMonth, setFilterMonth] = useState(dayjs());

  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();
  const [clientMemberships, setClientMemberships] = useState([]);

  const load = useCallback(async () => {
    if (!businessId) return;
    setLoading(true);
    try {
      const monthStr = filterMonth ? filterMonth.format("YYYY-MM") : undefined;
      const [paymentsData, clientsData, summaryData, allMemberships] = await Promise.all([
        getPayments({ business_id: businessId, month: monthStr }),
        getClients({ business_id: businessId }),
        getFitnessLedgerSummary({ business_id: businessId, month: monthStr }).catch(() => null),
        getMemberships({ business_id: businessId }),
      ]);
      setRows(paymentsData);
      setClients(clientsData);
      setSummary(summaryData);
      setMemberships(allMemberships);
      setDebtors(summaryData?.debtors || []);
    } catch {
      message.error("To'lovlar yuklanmadi.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [businessId, filterMonth]);

  useEffect(() => {
    load();
  }, [load]);

  useWindowEvent("business-changed", load);
  useWindowEvent(BUSINESS_DATA_CHANGED, load);

  const onClientChange = (clientId) => {
    const cm = memberships.filter((m) => m.client === clientId);
    setClientMemberships(cm);
    if (cm[0]) {
      const debt = Number(cm[0].debt_amount || 0);
      form.setFieldsValue({ membership: cm[0].id, amount: debt > 0 ? debt : cm[0].expected_amount });
    } else {
      form.setFieldsValue({ membership: undefined });
    }
  };

  const openAdd = (presetClient, presetMembership, presetAmount) => {
    form.resetFields();
    form.setFieldsValue({
      payment_date: dayjs(),
      method: "cash",
      amount: presetAmount ?? 0,
      client: presetClient,
      membership: presetMembership,
    });
    if (presetClient) {
      onClientChange(presetClient);
      if (presetMembership) {
        form.setFieldsValue({ membership: presetMembership, amount: presetAmount });
      }
    } else {
      setClientMemberships([]);
    }
    setModalOpen(true);
  };

  const save = async () => {
    const v = await form.validateFields();
    const payload = {
      business: businessId,
      client: v.client,
      membership: v.membership || null,
      amount: v.amount,
      payment_date: v.payment_date.format("YYYY-MM-DD"),
      method: v.method,
      note: v.note || "",
    };
    try {
      await createPayment(payload);
      message.success("To'lov saqlandi.");
      setModalOpen(false);
      load();
      notifyBusinessDataChanged();
    } catch (e) {
      message.error(e.response?.data?.detail || "Xatolik.");
    }
  };

  const remove = async (row) => {
    try {
      await deletePayment(row.id);
      message.success("To'lov o'chirildi.");
      load();
      notifyBusinessDataChanged();
    } catch {
      message.error("O'chirib bo'lmadi.");
    }
  };

  const columns = useMemo(
    () => [
      {
        title: "Sana",
        dataIndex: "payment_date",
        width: 110,
      },
      {
        title: "Klient",
        dataIndex: "client_name",
      },
      {
        title: "Abonement",
        dataIndex: "membership_title",
        render: (v) => v || "—",
      },
      {
        title: "Summa",
        dataIndex: "amount",
        width: 140,
        render: (v) => fmt(v),
      },
      {
        title: "Usul",
        dataIndex: "method",
        width: 110,
        render: (v) => {
          const t = METHOD_TAG[v] || { label: v, color: "default" };
          return <Tag color={t.color}>{t.label}</Tag>;
        },
      },
      {
        title: "Izoh",
        dataIndex: "note",
        render: (v) => v || "—",
      },
      {
        title: "",
        key: "act",
        width: 100,
        render: (_, row) => (
          <Popconfirm title="To'lov o'chirilsinmi?" onConfirm={() => remove(row)}>
            <Button type="link" size="small" danger>
              O'chirish
            </Button>
          </Popconfirm>
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
        title="To'lovlar"
        description="Klientlarning to'lovlari va qarzdorliklari. Abonementga biriktirilgan to'lovlar avtomatik hisobga olinadi."
        extra={
          <Button type="primary" onClick={() => openAdd()}>
            To'lov qo'shish
          </Button>
        }
      />

      {summary ? (
        <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
          <Col xs={12} md={6}>
            <Card size="small">
              <Statistic
                title="Oy daromadi"
                value={Number(summary.month_paid)}
                suffix="UZS"
                formatter={(v) => Number(v).toLocaleString("uz-UZ")}
              />
            </Card>
          </Col>
          <Col xs={12} md={6}>
            <Card size="small">
              <Statistic title="Oy to'lovlar soni" value={summary.month_payments_count} />
            </Card>
          </Col>
          <Col xs={12} md={6}>
            <Card size="small">
              <Statistic
                title="Kutilayotgan"
                value={Number(summary.expected_total)}
                suffix="UZS"
                formatter={(v) => Number(v).toLocaleString("uz-UZ")}
              />
            </Card>
          </Col>
          <Col xs={12} md={6}>
            <Card size="small">
              <Statistic
                title="Qarzdorlik"
                value={Number(summary.debt_total)}
                valueStyle={{ color: Number(summary.debt_total) > 0 ? "#cf1322" : undefined }}
                suffix="UZS"
                formatter={(v) => Number(v).toLocaleString("uz-UZ")}
              />
            </Card>
          </Col>
        </Row>
      ) : null}

      <Card size="small" style={{ marginBottom: 12 }}>
        <Space wrap>
          <DatePicker.MonthPicker
            value={filterMonth}
            onChange={(v) => setFilterMonth(v || dayjs())}
            placeholder="Oy"
            allowClear={false}
          />
        </Space>
      </Card>

      <Row gutter={[12, 12]}>
        <Col xs={24} lg={16}>
          <Card size="small" title="To'lovlar ro'yxati">
            {rows.length === 0 ? (
              <EmptyState description="Tanlangan oyda to'lov yo'q." />
            ) : (
              <Table
                rowKey="id"
                dataSource={rows}
                columns={columns}
                pagination={{ pageSize: 30 }}
                scroll={{ x: "max-content" }}
                size="small"
              />
            )}
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card size="small" title="Qarzdor klientlar">
            {debtors.length === 0 ? (
              <EmptyState description="Qarzdor yo'q" />
            ) : (
              <Table
                rowKey="membership_id"
                dataSource={debtors}
                pagination={false}
                size="small"
                columns={[
                  {
                    title: "Klient",
                    dataIndex: "client_name",
                    render: (t, r) => (
                      <Space direction="vertical" size={0}>
                        <Typography.Text>{t}</Typography.Text>
                        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                          {r.title}
                        </Typography.Text>
                      </Space>
                    ),
                  },
                  {
                    title: "Qarz",
                    dataIndex: "debt",
                    render: (v) => (
                      <Typography.Text type="danger">{fmt(v)}</Typography.Text>
                    ),
                  },
                  {
                    title: "",
                    key: "act",
                    render: (_, r) => (
                      <Button
                        size="small"
                        type="link"
                        onClick={() =>
                          openAdd(r.client_id, r.membership_id, Number(r.debt || 0))
                        }
                      >
                        To'lash
                      </Button>
                    ),
                  },
                ]}
              />
            )}
          </Card>
        </Col>
      </Row>

      <Modal
        title="To'lov qo'shish"
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={save}
        okText="Saqlash"
      >
        <Form form={form} layout="vertical">
          <Form.Item name="client" label="Klient" rules={[{ required: true }]}>
            <Select
              showSearch
              placeholder="Klient tanlang"
              optionFilterProp="label"
              onChange={onClientChange}
              options={clients.map((c) => ({
                value: c.id,
                label: `${c.full_name}${c.phone ? ` — ${c.phone}` : ""}`,
              }))}
            />
          </Form.Item>
          {clientMemberships.length > 0 ? (
            <Form.Item name="membership" label="Abonement (qarzga yozish uchun)">
              <Select
                allowClear
                options={clientMemberships.map((m) => ({
                  value: m.id,
                  label: `${m.title || m.item_title || "Abonement"} — qarz: ${fmt(m.debt_amount)}`,
                }))}
                onChange={(val) => {
                  const m = clientMemberships.find((x) => x.id === val);
                  if (m) {
                    const debt = Number(m.debt_amount || 0);
                    form.setFieldsValue({ amount: debt > 0 ? debt : m.expected_amount });
                  }
                }}
              />
            </Form.Item>
          ) : null}
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="amount" label="Summa" rules={[{ required: true }]}>
                <InputNumber style={{ width: "100%" }} min={0} step={10000} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="payment_date" label="Sana" rules={[{ required: true }]}>
                <DatePicker style={{ width: "100%" }} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="method" label="To'lov usuli" rules={[{ required: true }]}>
            <Select
              options={[
                { value: "cash", label: "Naqd" },
                { value: "card", label: "Karta" },
                { value: "transfer", label: "O'tkazma" },
                { value: "other", label: "Boshqa" },
              ]}
            />
          </Form.Item>
          <Form.Item name="note" label="Izoh">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
