import {
  Alert,
  Button,
  Card,
  Col,
  DatePicker,
  Drawer,
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
  Tooltip,
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
  createBusinessClientPortal,
  resetBusinessClientPortal,
} from "../../services/authService";
import {
  createClient,
  createMembership,
  deleteClient,
  getClients,
  getFitnessLedgerSummary,
  getMemberships,
  updateClient,
  updateMembership,
} from "../../services/membershipService";
import { getItems } from "../../services/itemService";
import { formatPhone } from "../../utils/formatters";
import { BUSINESS_DATA_CHANGED, notifyBusinessDataChanged } from "../../utils/businessEvents";
import { useWindowEvent } from "../../hooks/useWindowEvent";

const CLIENT_TYPE_TAG = {
  daily: { label: "Kunlik", color: "blue" },
  monthly: { label: "Oylik", color: "purple" },
};

const STATUS_TAG = {
  active: { label: "Faol", color: "green" },
  paused: { label: "To'xtatilgan", color: "orange" },
  archived: { label: "Arxiv", color: "default" },
};

const PAYMENT_STATUS_TAG = {
  unpaid: { label: "To'lanmagan", color: "red" },
  partial: { label: "Qisman", color: "orange" },
  paid: { label: "To'langan", color: "green" },
};

function formatMoney(value, currency = "UZS") {
  const n = Number(value || 0);
  return `${n.toLocaleString("uz-UZ")} ${currency}`;
}

export default function FitnessClientsPage() {
  const { businessId, business } = useOutletContext();
  const isFitness = business?.business_type === "fitness_center";

  const [rows, setRows] = useState([]);
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ client_type: undefined, status: undefined, search: "" });

  const [drawer, setDrawer] = useState({ open: false, record: null });
  const [form] = Form.useForm();

  const [membershipDrawer, setMembershipDrawer] = useState({ open: false, client: null });
  const [membershipForm] = Form.useForm();
  const [clientMemberships, setClientMemberships] = useState([]);

  const [portalModal, setPortalModal] = useState({ open: false, client: null, result: null });
  const [portalForm] = Form.useForm();

  const load = useCallback(async () => {
    if (!businessId) return;
    setLoading(true);
    try {
      const params = { business_id: businessId };
      if (filters.client_type) params.client_type = filters.client_type;
      if (filters.status) params.status = filters.status;
      if (filters.search) params.search = filters.search;
      const [clientsData, summaryData, itemsData] = await Promise.all([
        getClients(params),
        getFitnessLedgerSummary({ business_id: businessId }).catch(() => null),
        getItems({ business_id: businessId }).catch(() => []),
      ]);
      setRows(clientsData);
      setSummary(summaryData);
      setItems(itemsData);
    } catch {
      message.error("Klientlar yuklanmadi.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [businessId, filters]);

  useEffect(() => {
    load();
  }, [load]);

  useWindowEvent("business-changed", load);
  useWindowEvent(BUSINESS_DATA_CHANGED, load);

  const openCreate = () => {
    form.resetFields();
    form.setFieldsValue({ client_type: "monthly", status: "active", gender: "unknown" });
    setDrawer({ open: true, record: null });
  };

  const openEdit = (row) => {
    form.setFieldsValue({
      ...row,
      birth_date: row.birth_date ? dayjs(row.birth_date) : null,
    });
    setDrawer({ open: true, record: row });
  };

  const save = async () => {
    const v = await form.validateFields();
    const payload = {
      ...v,
      birth_date: v.birth_date ? v.birth_date.format("YYYY-MM-DD") : null,
    };
    try {
      if (drawer.record) {
        await updateClient(drawer.record.id, payload);
        message.success("Klient saqlandi.");
      } else {
        await createClient({ ...payload, business: businessId });
        message.success("Klient qo'shildi.");
      }
      setDrawer({ open: false, record: null });
      load();
      notifyBusinessDataChanged();
    } catch (e) {
      message.error(e.response?.data?.detail || "Xatolik.");
    }
  };

  const remove = async (row) => {
    try {
      await deleteClient(row.id);
      message.success("Klient o'chirildi.");
      load();
      notifyBusinessDataChanged();
    } catch {
      message.error("O'chirib bo'lmadi.");
    }
  };

  const openMembership = async (client) => {
    membershipForm.resetFields();
    membershipForm.setFieldsValue({
      start_date: dayjs(),
      end_date: client.client_type === "monthly" ? dayjs().add(30, "day") : null,
    });
    try {
      const mlist = await getMemberships({ business_id: businessId, client_id: client.id });
      setClientMemberships(mlist);
    } catch {
      setClientMemberships([]);
    }
    setMembershipDrawer({ open: true, client });
  };

  const saveMembership = async () => {
    const v = await membershipForm.validateFields();
    const item = items.find((it) => it.id === v.item);
    const payload = {
      business: businessId,
      client: membershipDrawer.client.id,
      item: v.item || null,
      title: v.title || item?.title || "",
      start_date: v.start_date ? v.start_date.format("YYYY-MM-DD") : null,
      end_date: v.end_date ? v.end_date.format("YYYY-MM-DD") : null,
      expected_amount: v.expected_amount ?? item?.price ?? 0,
      currency: item?.currency || "UZS",
      sessions_total: v.sessions_total ?? 0,
      note: v.note || "",
    };
    try {
      await createMembership(payload);
      message.success("Abonement biriktirildi.");
      const mlist = await getMemberships({
        business_id: businessId,
        client_id: membershipDrawer.client.id,
      });
      setClientMemberships(mlist);
      membershipForm.resetFields();
      load();
      notifyBusinessDataChanged();
    } catch (e) {
      message.error(e.response?.data?.detail || "Xatolik.");
    }
  };

  const openPortal = (client) => {
    portalForm.resetFields();
    const fallback = (client.full_name || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "")
      .slice(0, 12);
    portalForm.setFieldsValue({
      username: client.portal_username || (fallback ? `${fallback}${client.id}` : `client${client.id}`),
      password: "",
    });
    setPortalModal({ open: true, client, result: null });
  };

  const submitPortal = async () => {
    const v = await portalForm.validateFields();
    const client = portalModal.client;
    if (!client) return;
    try {
      let res;
      if (client.portal_username) {
        res = await resetBusinessClientPortal({
          client_id: client.id,
          username: v.username,
          password: v.password,
        });
      } else {
        res = await createBusinessClientPortal({
          client_id: client.id,
          username: v.username,
          password: v.password,
        });
      }
      message.success(
        client.portal_username ? "Kabinet yangilandi." : "Kabinet yaratildi.",
      );
      setPortalModal({
        open: true,
        client,
        result: { username: res.username || v.username, password: res.password || v.password },
      });
      load();
    } catch (e) {
      message.error(e.response?.data?.detail || "Kabinet yaratib bo'lmadi.");
    }
  };

  const cancelMembership = async (m) => {
    try {
      await updateMembership(m.id, { status: "cancelled" });
      message.success("Abonement bekor qilindi.");
      const mlist = await getMemberships({
        business_id: businessId,
        client_id: membershipDrawer.client.id,
      });
      setClientMemberships(mlist);
      load();
      notifyBusinessDataChanged();
    } catch {
      message.error("Bekor qilib bo'lmadi.");
    }
  };

  const columns = useMemo(
    () => [
      {
        title: "F.I.Sh.",
        dataIndex: "full_name",
        render: (text, row) => (
          <Space direction="vertical" size={0}>
            <Typography.Text strong>{text}</Typography.Text>
            {row.telegram_username ? (
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                @{row.telegram_username}
              </Typography.Text>
            ) : null}
          </Space>
        ),
      },
      {
        title: "Telefon",
        dataIndex: "phone",
        width: 140,
        render: formatPhone,
      },
      {
        title: "Turi",
        dataIndex: "client_type",
        width: 100,
        filters: [
          { text: "Kunlik", value: "daily" },
          { text: "Oylik", value: "monthly" },
        ],
        onFilter: (v, r) => r.client_type === v,
        render: (v) => {
          const t = CLIENT_TYPE_TAG[v] || { label: v, color: "default" };
          return <Tag color={t.color}>{t.label}</Tag>;
        },
      },
      {
        title: "Holat",
        dataIndex: "status",
        width: 110,
        render: (s) => {
          const t = STATUS_TAG[s] || { label: s, color: "default" };
          return <Tag color={t.color}>{t.label}</Tag>;
        },
      },
      {
        title: "Faol abonement",
        dataIndex: "active_memberships_count",
        width: 130,
        align: "center",
      },
      {
        title: "To'langan",
        dataIndex: "total_paid",
        width: 140,
        render: (v) => formatMoney(v),
      },
      {
        title: "Qarz",
        dataIndex: "total_debt",
        width: 140,
        render: (v) => (
          <Typography.Text type={Number(v) > 0 ? "danger" : undefined}>
            {formatMoney(v)}
          </Typography.Text>
        ),
      },
      {
        title: "Oxirgi tashrif",
        dataIndex: "last_visit_date",
        width: 130,
        render: (v) => (v ? dayjs(v).format("YYYY-MM-DD") : "—"),
      },
      {
        title: "Kabinet",
        dataIndex: "portal_username",
        width: 140,
        render: (v, row) =>
          v ? (
            <Space direction="vertical" size={0}>
              <Tag color="green">@{v}</Tag>
              <Button type="link" size="small" style={{ padding: 0 }} onClick={() => openPortal(row)}>
                Parolni yangilash
              </Button>
            </Space>
          ) : (
            <Button type="link" size="small" onClick={() => openPortal(row)}>
              Kabinet yaratish
            </Button>
          ),
      },
      {
        title: "",
        key: "act",
        width: 220,
        render: (_, row) => (
          <Space wrap size={[4, 4]}>
            <Button type="link" size="small" onClick={() => openMembership(row)}>
              Abonement
            </Button>
            <Button type="link" size="small" onClick={() => openEdit(row)}>
              Tahrirlash
            </Button>
            <Popconfirm
              title="Klient o'chirilsinmi? Davomat va to'lovlar ham o'chadi."
              onConfirm={() => remove(row)}
            >
              <Button type="link" size="small" danger>
                O'chirish
              </Button>
            </Popconfirm>
          </Space>
        ),
      },
    ],
    [businessId, items],
  );

  if (!business) return null;
  if (!isFitness) return <Navigate to="/business/dashboard" replace />;
  if (!businessId) return null;
  if (loading && !rows.length) return <LoadingScreen />;

  return (
    <>
      <PageHeader
        title="Klientlar"
        description="Kunlik va oylik klientlar, abonementlar, qarzdorlik."
        extra={
          <Button type="primary" onClick={openCreate}>
            Klient qo'shish
          </Button>
        }
      />

      {summary ? (
        <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
          <Col xs={12} md={6}>
            <Card size="small">
              <Statistic title="Oylik klientlar" value={summary.active_monthly} />
            </Card>
          </Col>
          <Col xs={12} md={6}>
            <Card size="small">
              <Statistic title="Kunlik klientlar" value={summary.active_daily} />
            </Card>
          </Col>
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
          <Input.Search
            placeholder="Ism yoki telefon"
            allowClear
            style={{ width: 240 }}
            onSearch={(val) => setFilters((f) => ({ ...f, search: val }))}
            onChange={(e) => {
              if (!e.target.value) setFilters((f) => ({ ...f, search: "" }));
            }}
          />
          <Select
            allowClear
            placeholder="Klient turi"
            style={{ width: 160 }}
            value={filters.client_type}
            onChange={(v) => setFilters((f) => ({ ...f, client_type: v }))}
            options={[
              { value: "daily", label: "Kunlik" },
              { value: "monthly", label: "Oylik" },
            ]}
          />
          <Select
            allowClear
            placeholder="Holat"
            style={{ width: 160 }}
            value={filters.status}
            onChange={(v) => setFilters((f) => ({ ...f, status: v }))}
            options={[
              { value: "active", label: "Faol" },
              { value: "paused", label: "To'xtatilgan" },
              { value: "archived", label: "Arxiv" },
            ]}
          />
        </Space>
      </Card>

      {rows.length === 0 ? (
        <EmptyState description="Hozircha klient yo'q. Birinchisini qo'shing." />
      ) : (
        <Card size="small">
          <Table
            rowKey="id"
            dataSource={rows}
            columns={columns}
            pagination={{ pageSize: 20 }}
            scroll={{ x: "max-content" }}
          />
        </Card>
      )}

      <Drawer
        title={drawer.record ? "Klientni tahrirlash" : "Yangi klient"}
        open={drawer.open}
        onClose={() => setDrawer({ open: false, record: null })}
        width={460}
        extra={
          <Space>
            <Button onClick={() => setDrawer({ open: false, record: null })}>Bekor</Button>
            <Button type="primary" onClick={save}>
              Saqlash
            </Button>
          </Space>
        }
      >
        <Form form={form} layout="vertical">
          <Form.Item name="full_name" label="To'liq ism" rules={[{ required: true }]}>
            <Input placeholder="Masalan: Aliyev Bekzod" />
          </Form.Item>
          <Form.Item name="phone" label="Telefon">
            <Input placeholder="+998 90 ..." />
          </Form.Item>
          <Form.Item name="telegram_username" label="Telegram (username)">
            <Input placeholder="bekzod" />
          </Form.Item>
          <Form.Item name="client_type" label="Klient turi" rules={[{ required: true }]}>
            <Select
              options={[
                { value: "monthly", label: "Oylik" },
                { value: "daily", label: "Kunlik" },
              ]}
            />
          </Form.Item>
          <Form.Item name="gender" label="Jinsi" initialValue="unknown">
            <Select
              options={[
                { value: "unknown", label: "Ko'rsatilmagan" },
                { value: "male", label: "Erkak" },
                { value: "female", label: "Ayol" },
              ]}
            />
          </Form.Item>
          <Form.Item name="birth_date" label="Tug'ilgan sana">
            <DatePicker style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="status" label="Holat" initialValue="active">
            <Select
              options={[
                { value: "active", label: "Faol" },
                { value: "paused", label: "To'xtatilgan" },
                { value: "archived", label: "Arxiv" },
              ]}
            />
          </Form.Item>
          <Form.Item name="note" label="Ichki izoh (faqat admin ko'radi)">
            <Input.TextArea rows={3} placeholder="Masalan: tibbiy cheklov, individual mashg'ulot va h.k." />
          </Form.Item>
          <Form.Item
            name="announcement"
            label="Klient kabinetida ko'rinadigan xabar"
            tooltip="Klient o'z kabinetiga kirsa ushbu matn ko'rinadi"
          >
            <Input.TextArea
              rows={3}
              placeholder="Masalan: Abonementingiz 3 kundan keyin tugaydi, iltimos uzaytiring."
            />
          </Form.Item>
        </Form>
      </Drawer>

      <Modal
        title={
          portalModal.client?.portal_username
            ? "Klient kabineti — parol yangilash"
            : "Klient kabineti — login yaratish"
        }
        open={portalModal.open}
        onCancel={() => setPortalModal({ open: false, client: null, result: null })}
        footer={
          portalModal.result
            ? [
                <Button
                  key="ok"
                  type="primary"
                  onClick={() => setPortalModal({ open: false, client: null, result: null })}
                >
                  Yopish
                </Button>,
              ]
            : [
                <Button
                  key="cancel"
                  onClick={() => setPortalModal({ open: false, client: null, result: null })}
                >
                  Bekor
                </Button>,
                <Button key="ok" type="primary" onClick={submitPortal}>
                  {portalModal.client?.portal_username ? "Yangilash" : "Yaratish"}
                </Button>,
              ]
        }
      >
        {portalModal.result ? (
          <Alert
            type="success"
            showIcon
            message="Tayyor! Quyidagi ma'lumotlarni klientga bering."
            description={
              <div>
                <div>
                  <strong>Sayt:</strong> {window.location.origin}/login
                </div>
                <div>
                  <strong>Login:</strong> <code>{portalModal.result.username}</code>
                </div>
                <div>
                  <strong>Parol:</strong> <code>{portalModal.result.password}</code>
                </div>
                <Typography.Paragraph type="secondary" style={{ marginTop: 8, marginBottom: 0 }}>
                  Klient bu login bilan saytga kirib, abonementi va davomatini ko'radi. Parolni
                  saqlab qo'ying — qaytadan ko'rsatilmaydi.
                </Typography.Paragraph>
              </div>
            }
          />
        ) : (
          <Form form={portalForm} layout="vertical">
            <Typography.Paragraph type="secondary">
              {portalModal.client?.full_name} uchun login va parol o'rnating. Klient saytga shu
              ma'lumotlar bilan kiradi.
            </Typography.Paragraph>
            <Form.Item
              name="username"
              label="Login"
              rules={[
                { required: true, message: "Login kiriting" },
                { min: 3, message: "Kamida 3 ta belgi" },
              ]}
            >
              <Input autoComplete="off" />
            </Form.Item>
            <Form.Item
              name="password"
              label={portalModal.client?.portal_username ? "Yangi parol" : "Parol"}
              rules={[
                { required: true, message: "Parol kiriting" },
                { min: 6, message: "Kamida 6 ta belgi" },
              ]}
            >
              <Input.Password autoComplete="new-password" />
            </Form.Item>
          </Form>
        )}
      </Modal>

      <Drawer
        title={membershipDrawer.client ? `${membershipDrawer.client.full_name} — abonementlar` : "Abonement"}
        open={membershipDrawer.open}
        onClose={() => setMembershipDrawer({ open: false, client: null })}
        width={560}
      >
        <Typography.Title level={5}>Yangi abonement biriktirish</Typography.Title>
        <Form form={membershipForm} layout="vertical">
          <Form.Item name="item" label="Abonement (Items dan)">
            <Select
              allowClear
              placeholder="Tanlang"
              options={items.map((it) => ({
                value: it.id,
                label: `${it.title} — ${Number(it.price).toLocaleString("uz-UZ")} ${it.currency || "UZS"}`,
              }))}
              onChange={(val) => {
                const it = items.find((x) => x.id === val);
                if (it) {
                  membershipForm.setFieldsValue({
                    title: it.title,
                    expected_amount: it.price,
                  });
                }
              }}
            />
          </Form.Item>
          <Form.Item name="title" label="Nomi">
            <Input placeholder="Masalan: 1 oylik premium" />
          </Form.Item>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="start_date" label="Boshlanish sanasi" rules={[{ required: true }]}>
                <DatePicker style={{ width: "100%" }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="end_date" label="Tugash sanasi">
                <DatePicker style={{ width: "100%" }} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="expected_amount" label="Kutilayotgan summa">
                <InputNumber style={{ width: "100%" }} min={0} step={10000} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="sessions_total" label="Mashg'ulot soni">
                <InputNumber style={{ width: "100%" }} min={0} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="note" label="Izoh">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Button type="primary" onClick={saveMembership}>
            Biriktirish
          </Button>
        </Form>

        <div style={{ marginTop: 24 }}>
          <Typography.Title level={5}>Mavjud abonementlar</Typography.Title>
          {clientMemberships.length === 0 ? (
            <EmptyState description="Klientda abonement yo'q" />
          ) : (
            <Table
              size="small"
              rowKey="id"
              pagination={false}
              dataSource={clientMemberships}
              columns={[
                {
                  title: "Nomi",
                  dataIndex: "title",
                  render: (t, r) => t || r.item_title || "—",
                },
                {
                  title: "Sanalar",
                  key: "dates",
                  render: (_, r) => (
                    <span>
                      {r.start_date}
                      {r.end_date ? ` → ${r.end_date}` : ""}
                    </span>
                  ),
                },
                {
                  title: "Kutilayotgan",
                  dataIndex: "expected_amount",
                  render: (v) => formatMoney(v),
                },
                {
                  title: "To'langan",
                  dataIndex: "paid_amount",
                  render: (v) => formatMoney(v),
                },
                {
                  title: "Qarz",
                  dataIndex: "debt_amount",
                  render: (v) => (
                    <Typography.Text type={Number(v) > 0 ? "danger" : undefined}>
                      {formatMoney(v)}
                    </Typography.Text>
                  ),
                },
                {
                  title: "To'lov",
                  dataIndex: "payment_status",
                  render: (s) => {
                    const t = PAYMENT_STATUS_TAG[s] || { label: s, color: "default" };
                    return <Tag color={t.color}>{t.label}</Tag>;
                  },
                },
                {
                  title: "",
                  key: "act",
                  render: (_, r) =>
                    r.status === "cancelled" ? (
                      <Tag>Bekor qilingan</Tag>
                    ) : (
                      <Popconfirm title="Bekor qilinsinmi?" onConfirm={() => cancelMembership(r)}>
                        <Button type="link" size="small" danger>
                          Bekor qilish
                        </Button>
                      </Popconfirm>
                    ),
                },
              ]}
            />
          )}
        </div>
      </Drawer>
    </>
  );
}
