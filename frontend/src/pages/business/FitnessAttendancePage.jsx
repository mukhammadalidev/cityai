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
  createAttendance,
  deleteAttendance,
  getAttendance,
  getClients,
  getFitnessLedgerSummary,
  getMemberships,
} from "../../services/membershipService";
import { BUSINESS_DATA_CHANGED, notifyBusinessDataChanged } from "../../utils/businessEvents";
import { useWindowEvent } from "../../hooks/useWindowEvent";

const CLIENT_TYPE_TAG = {
  daily: { label: "Kunlik", color: "blue" },
  monthly: { label: "Oylik", color: "purple" },
};

function fmtMoney(v) {
  return `${Number(v || 0).toLocaleString("uz-UZ")} UZS`;
}

export default function FitnessAttendancePage() {
  const { businessId, business } = useOutletContext();
  const isFitness = business?.business_type === "fitness_center";

  const [rows, setRows] = useState([]);
  const [clients, setClients] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filterDate, setFilterDate] = useState(dayjs());
  const [filterClientType, setFilterClientType] = useState(undefined);

  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();
  const [activeMemberships, setActiveMemberships] = useState([]);

  const load = useCallback(async () => {
    if (!businessId) return;
    setLoading(true);
    try {
      const params = {
        business_id: businessId,
        date: filterDate ? filterDate.format("YYYY-MM-DD") : undefined,
      };
      if (filterClientType) params.client_type = filterClientType;
      const [attData, clientData, summaryData] = await Promise.all([
        getAttendance(params),
        getClients({ business_id: businessId, status: "active" }),
        getFitnessLedgerSummary({
          business_id: businessId,
          month: filterDate ? filterDate.format("YYYY-MM") : undefined,
        }).catch(() => null),
      ]);
      setRows(attData);
      setClients(clientData);
      setSummary(summaryData);
    } catch {
      message.error("Davomat yuklanmadi.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [businessId, filterDate, filterClientType]);

  useEffect(() => {
    load();
  }, [load]);

  useWindowEvent("business-changed", load);
  useWindowEvent(BUSINESS_DATA_CHANGED, load);

  const onClientSelect = async (clientId) => {
    const client = clients.find((c) => c.id === clientId);
    if (!client) {
      setActiveMemberships([]);
      return;
    }
    form.setFieldsValue({ client_type: client.client_type });
    if (client.client_type === "monthly") {
      try {
        const mlist = await getMemberships({
          business_id: businessId,
          client_id: clientId,
          status: "active",
        });
        setActiveMemberships(mlist);
        if (mlist[0]) {
          form.setFieldsValue({ membership: mlist[0].id });
        }
      } catch {
        setActiveMemberships([]);
      }
    } else {
      setActiveMemberships([]);
    }
  };

  const openAdd = () => {
    form.resetFields();
    form.setFieldsValue({
      visit_date: dayjs(),
      visit_time: dayjs(),
      client_type: "monthly",
      amount_charged: 0,
    });
    setActiveMemberships([]);
    setModalOpen(true);
  };

  const save = async () => {
    const v = await form.validateFields();
    const payload = {
      business: businessId,
      client: v.client,
      membership: v.membership || null,
      visit_date: v.visit_date.format("YYYY-MM-DD"),
      visit_time: v.visit_time ? v.visit_time.format("HH:mm") : null,
      client_type: v.client_type,
      amount_charged: v.amount_charged ?? 0,
      note: v.note || "",
    };
    try {
      await createAttendance(payload);
      message.success("Davomat qo'shildi.");
      setModalOpen(false);
      load();
      notifyBusinessDataChanged();
    } catch (e) {
      message.error(e.response?.data?.detail || "Xatolik.");
    }
  };

  const remove = async (row) => {
    try {
      await deleteAttendance(row.id);
      message.success("O'chirildi.");
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
        dataIndex: "visit_date",
        width: 110,
      },
      {
        title: "Vaqt",
        dataIndex: "visit_time",
        width: 90,
        render: (v) => (v ? v.slice(0, 5) : "—"),
      },
      {
        title: "Klient",
        dataIndex: "client_name",
        render: (t, r) => (
          <Space direction="vertical" size={0}>
            <Typography.Text strong>{t}</Typography.Text>
            {r.client_phone ? (
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                {r.client_phone}
              </Typography.Text>
            ) : null}
          </Space>
        ),
      },
      {
        title: "Turi",
        dataIndex: "client_type",
        width: 100,
        render: (v) => {
          const t = CLIENT_TYPE_TAG[v] || { label: v, color: "default" };
          return <Tag color={t.color}>{t.label}</Tag>;
        },
      },
      {
        title: "Abonement",
        key: "membership_title",
        render: (_, r) => {
          if (r.membership_title) return r.membership_title;
          if (r.client_type === "daily") {
            return (
              <Typography.Text type="secondary" italic>
                Kunlik tashrif
              </Typography.Text>
            );
          }
          return "—";
        },
      },
      {
        title: "To'lov",
        dataIndex: "amount_charged",
        width: 140,
        render: (v) => fmtMoney(v),
      },
      {
        title: "Izoh",
        dataIndex: "note",
        render: (v) => v || "—",
      },
      {
        title: "",
        key: "act",
        width: 90,
        render: (_, row) => (
          <Popconfirm title="Davomat o'chirilsinmi?" onConfirm={() => remove(row)}>
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
        title="Davomat"
        description="Klientlarning kelishini belgilang. Kunlik klient uchun to'lov ham shu yerda yoziladi."
        extra={
          <Button type="primary" onClick={openAdd}>
            Davomat qo'shish
          </Button>
        }
      />

      {summary ? (
        <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
          <Col xs={12} md={6}>
            <Card size="small">
              <Statistic title="Bugungi tashriflar" value={summary.today_attendance} />
            </Card>
          </Col>
          <Col xs={12} md={6}>
            <Card size="small">
              <Statistic title="Oy davomatlari" value={summary.month_attendance} />
            </Card>
          </Col>
          <Col xs={12} md={6}>
            <Card size="small">
              <Statistic
                title="Oy kunlik daromad"
                value={Number(summary.month_daily_revenue)}
                suffix="UZS"
                formatter={(v) => Number(v).toLocaleString("uz-UZ")}
              />
            </Card>
          </Col>
          <Col xs={12} md={6}>
            <Card size="small">
              <Statistic title="Oylik klientlar" value={summary.active_monthly} />
            </Card>
          </Col>
        </Row>
      ) : null}

      <Card size="small" style={{ marginBottom: 12 }}>
        <Space wrap>
          <DatePicker
            value={filterDate}
            onChange={(v) => setFilterDate(v)}
            placeholder="Sana"
            allowClear={false}
          />
          <Select
            allowClear
            placeholder="Klient turi"
            style={{ width: 160 }}
            value={filterClientType}
            onChange={setFilterClientType}
            options={[
              { value: "daily", label: "Kunlik" },
              { value: "monthly", label: "Oylik" },
            ]}
          />
        </Space>
      </Card>

      {rows.length === 0 ? (
        <EmptyState description="Tanlangan sanada davomat yo'q." />
      ) : (
        <Card size="small">
          <Table
            rowKey="id"
            dataSource={rows}
            columns={columns}
            pagination={{ pageSize: 50 }}
            scroll={{ x: "max-content" }}
          />
        </Card>
      )}

      <Modal
        title="Davomat qo'shish"
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
              onChange={onClientSelect}
              options={clients.map((c) => ({
                value: c.id,
                label: `${c.full_name}${c.phone ? ` — ${c.phone}` : ""} (${
                  c.client_type === "daily" ? "kunlik" : "oylik"
                })`,
              }))}
            />
          </Form.Item>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="visit_date" label="Sana" rules={[{ required: true }]}>
                <DatePicker style={{ width: "100%" }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="visit_time" label="Vaqt">
                <DatePicker.TimePicker style={{ width: "100%" }} format="HH:mm" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="client_type" label="Turi" rules={[{ required: true }]}>
            <Select
              options={[
                { value: "monthly", label: "Oylik" },
                { value: "daily", label: "Kunlik" },
              ]}
            />
          </Form.Item>
          {activeMemberships.length > 0 ? (
            <Form.Item name="membership" label="Abonement">
              <Select
                allowClear
                options={activeMemberships.map((m) => ({
                  value: m.id,
                  label: `${m.title || m.item_title || "Abonement"} (${m.start_date}${
                    m.end_date ? " → " + m.end_date : ""
                  })`,
                }))}
              />
            </Form.Item>
          ) : null}
          <Form.Item name="amount_charged" label="To'lov (kunlik klient uchun)">
            <InputNumber style={{ width: "100%" }} min={0} step={10000} />
          </Form.Item>
          <Form.Item name="note" label="Izoh">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
