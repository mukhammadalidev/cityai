import {
  Button,
  Card,
  Col,
  DatePicker,
  Drawer,
  Form,
  Input,
  Popconfirm,
  Row,
  Select,
  Space,
  Table,
  Typography,
  message,
} from "antd";
import dayjs from "dayjs";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import PageHeader from "../../components/ui/PageHeader";
import LoadingScreen from "../../components/ui/LoadingScreen";
import EmptyState from "../../components/ui/EmptyState";
import StatusTag from "../../components/ui/StatusTag";
import { BOOKING_STATUS } from "../../config/statusConfigs";
import { formatPhone, formatDate, formatDateTime } from "../../utils/formatters";
import { getBookings, updateBooking } from "../../services/bookingService";
import { useWindowEvent } from "../../hooks/useWindowEvent";
import { BUSINESS_DATA_CHANGED, notifyBusinessDataChanged } from "../../utils/businessEvents";
import { getSelectedBusinessId } from "../../utils/storage";

const TYPES = [
  { value: "appointment", label: "Qabul" },
  { value: "test_drive", label: "Test drive" },
  { value: "trial_lesson", label: "Sinov darsi" },
  { value: "table_booking", label: "Stol bron" },
  { value: "service_booking", label: "Xizmat bron" },
  { value: "consultation", label: "Konsultatsiya" },
];

const STATUS_OPTIONS = Object.keys(BOOKING_STATUS).map((k) => ({
  value: k,
  label: BOOKING_STATUS[k].label,
}));

export default function BookingsPage() {
  const { businessId, business } = useOutletContext();
  const isRestaurant = business?.business_type === "restaurant";
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState();
  const [btype, setBtype] = useState(isRestaurant ? "table_booking" : undefined);
  const [dateRange, setDateRange] = useState();
  const [drawer, setDrawer] = useState({ open: false, row: null });
  const [form] = Form.useForm();

  useEffect(() => {
    const bt = business?.business_type;
    if (bt === "restaurant") setBtype("table_booking");
    else if (bt === "education_center") setBtype("trial_lesson");
    else if (bt === "auto_salon") setBtype("test_drive");
    else if (bt === "clinic" || bt === "legal_service") setBtype("consultation");
    else if (bt === "beauty_salon" || bt === "real_estate") setBtype("appointment");
    else if (bt === "repair_service" || bt === "taxi_delivery" || bt === "photo_video")
      setBtype("service_booking");
    else setBtype(undefined);
  }, [business?.business_type]);

  const load = useCallback(async () => {
    const bid = businessId || getSelectedBusinessId();
    if (!bid) return;
    setLoading(true);
    try {
      const params = { business_id: bid };
      const bt = business?.business_type;
      if (bt === "restaurant") params.booking_type = "table_booking";
      else if (bt === "education_center") params.booking_type = "trial_lesson";
      else if (bt === "auto_salon") params.booking_type = "test_drive";
      else if (bt === "clinic" || bt === "legal_service") params.booking_type = "consultation";
      else if (bt === "beauty_salon" || bt === "real_estate") params.booking_type = "appointment";
      else if (bt === "repair_service" || bt === "taxi_delivery" || bt === "photo_video")
        params.booking_type = "service_booking";
      const list = await getBookings(params);
      console.log("[BookingsPage] selectedBusinessId=", bid, "response.length=", list.length);
      setRows(list);
    } catch (e) {
      console.error("[BookingsPage] load error", e);
      message.error("Ma’lumotlarni yuklashda xatolik yuz berdi.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [businessId, business?.business_type]);

  useEffect(() => {
    load();
  }, [load]);

  useWindowEvent("business-changed", load);
  useWindowEvent(BUSINESS_DATA_CHANGED, load);

  const filtered = useMemo(
    () =>
      rows.filter((r) => {
        if (status && r.status !== status) return false;
        if (btype && r.booking_type !== btype) return false;
        if (dateRange?.[0] && dateRange?.[1]) {
          const d = r.preferred_date;
          if (!d) return false;
          const ds = dayjs(d);
          if (ds.isBefore(dateRange[0], "day") || ds.isAfter(dateRange[1], "day")) return false;
        }
        return true;
      }),
    [rows, status, btype, dateRange]
  );

  const updateStatus = useCallback(
    async (row, newStatus) => {
      try {
        await updateBooking(row.id, { status: newStatus });
        message.success("Holat yangilandi.");
        load();
        notifyBusinessDataChanged();
      } catch (e) {
        console.error("[BookingsPage] updateStatus error", e);
        message.error(e.response?.data?.detail || "Holatni yangilashda xatolik.");
      }
    },
    [load]
  );

  const save = async () => {
    const v = await form.validateFields();
    try {
      await updateBooking(drawer.row.id, v);
      message.success("Yangilandi.");
      setDrawer({ open: false, row: null });
      load();
      notifyBusinessDataChanged();
    } catch (e) {
      console.error("[BookingsPage] save error", e);
      message.error(e.response?.data?.detail || "Xatolik.");
    }
  };

  if (!businessId) return null;
  if (loading && !rows.length) return <LoadingScreen />;

  const title = isRestaurant ? "Stol bronlari" : "Bronlar";
  const description = isRestaurant
    ? "Telegram orqali kelgan stol bron arizalari."
    : "Jadval va karta ko‘rinishi.";

  const formatBookingTime = (t) => {
    if (t == null || t === "") return "—";
    const s = String(t);
    return s.length >= 5 ? s.slice(0, 5) : s;
  };

  /** scroll.x barcha width yig‘indisiga mos — tor ustunlarda matn vertikal bo‘lib ketmasin */
  const RESTAURANT_TABLE_SCROLL_X = 1680;

  const restaurantColumns = [
    { title: "ID", dataIndex: "id", width: 72, fixed: "left" },
    {
      title: "Ism",
      dataIndex: "name",
      width: 160,
      ellipsis: { showTitle: true },
    },
    {
      title: "Telefon",
      dataIndex: "phone",
      width: 168,
      ellipsis: { showTitle: true },
      render: (p) => formatPhone(p),
    },
    {
      title: "Kishi soni",
      dataIndex: "guests_count",
      width: 100,
      align: "center",
      render: (v) => v ?? "—",
    },
    {
      title: "Sana",
      dataIndex: "preferred_date",
      width: 118,
      render: formatDate,
    },
    {
      title: "Vaqt",
      dataIndex: "preferred_time",
      width: 88,
      render: formatBookingTime,
    },
    {
      title: "Izoh",
      dataIndex: "note",
      width: 200,
      ellipsis: { showTitle: true },
      render: (v) => v || "—",
    },
    {
      title: "Status",
      dataIndex: "status",
      width: 132,
      render: (v) => <StatusTag map={BOOKING_STATUS} value={v} />,
    },
    {
      title: "Yaratilgan vaqt",
      dataIndex: "created_at",
      width: 158,
      render: formatDateTime,
    },
    {
      title: "Amallar",
      key: "actions",
      width: 276,
      fixed: "right",
      render: (_, r) => (
        <div className="cs-bookings-actions" onClick={(e) => e.stopPropagation()}>
          <Space direction="vertical" size={6} style={{ width: "100%" }}>
          <Space size={8} wrap>
            <Button
              size="small"
              type="primary"
              disabled={r.status === "confirmed"}
              onClick={() => updateStatus(r, "confirmed")}
            >
              Tasdiqlash
            </Button>
            <Popconfirm
              title="Rad etilsinmi?"
              okText="Ha"
              cancelText="Yo‘q"
              onConfirm={() => updateStatus(r, "rejected")}
            >
              <Button size="small" danger disabled={r.status === "rejected"}>
                Rad etish
              </Button>
            </Popconfirm>
          </Space>
          <Space size={8} wrap>
            <Button size="small" disabled={r.status === "completed"} onClick={() => updateStatus(r, "completed")}>
              Bajarildi
            </Button>
            <Button size="small" disabled={r.status === "cancelled"} onClick={() => updateStatus(r, "cancelled")}>
              Bekor qilish
            </Button>
          </Space>
        </Space>
        </div>
      ),
    },
  ];

  const bookingTypeLabel = (v) => TYPES.find((t) => t.value === v)?.label || v;

  const formatMeta = (r) => {
    const m = r.metadata;
    if (!m || typeof m !== "object") return "—";
    const parts = [];
    if (m.address) parts.push(`Manzil: ${m.address}`);
    if (m.problem_description) parts.push(`Muammo: ${m.problem_description}`);
    if (m.from_address || m.to_address) parts.push(`${m.from_address || "—"} → ${m.to_address || "—"}`);
    if (m.pickup_address || m.delivery_address)
      parts.push(`Olib: ${m.pickup_address || "—"}; Yetkazish: ${m.delivery_address || "—"}`);
    if (m.legal_topic) parts.push(`Mavzu: ${m.legal_topic}`);
    if (m.event_type || m.location) parts.push([m.event_type, m.location].filter(Boolean).join(" · "));
    if (m.service_type) parts.push(`Turi: ${m.service_type}`);
    return parts.length ? parts.join(" | ") : "—";
  };

  const genericColumns = [
    { title: "Ism", dataIndex: "name" },
    { title: "Telefon", dataIndex: "phone", render: formatPhone },
    { title: "Sana", dataIndex: "preferred_date", render: formatDate },
    { title: "Vaqt", dataIndex: "preferred_time", render: formatBookingTime },
    { title: "Tur", dataIndex: "booking_type", render: bookingTypeLabel },
    {
      title: "Qo‘shimcha",
      key: "meta",
      ellipsis: true,
      render: (_, r) => formatMeta(r),
    },
    {
      title: "Holat",
      dataIndex: "status",
      render: (v) => <StatusTag map={BOOKING_STATUS} value={v} />,
    },
  ];

  return (
    <>
      <PageHeader title={title} description={description} />
      <Space wrap style={{ marginBottom: 16 }}>
        <Select
          allowClear
          placeholder="Holat"
          style={{ width: 160 }}
          value={status}
          onChange={setStatus}
          options={STATUS_OPTIONS}
        />
        {!isRestaurant && (
          <Select
            allowClear
            placeholder="Tur"
            style={{ width: 180 }}
            value={btype}
            onChange={setBtype}
            options={TYPES}
          />
        )}
        <DatePicker.RangePicker onChange={setDateRange} format="DD.MM.YYYY" />
      </Space>
      {!isRestaurant && (
        <Row gutter={[16, 16]}>
          {filtered.slice(0, 6).map((b) => (
            <Col xs={24} md={12} lg={8} key={b.id}>
              <Card
                title={b.name}
                hoverable
                onClick={() => {
                  form.setFieldsValue({ ...b });
                  setDrawer({ open: true, row: b });
                }}
              >
                <Typography.Text type="secondary">{formatPhone(b.phone)}</Typography.Text>
                <div>
                  {formatDate(b.preferred_date)} · {b.preferred_time}
                </div>
                <StatusTag map={BOOKING_STATUS} value={b.status} />
              </Card>
            </Col>
          ))}
        </Row>
      )}
      {!filtered.length ? (
        <EmptyState description="Bronlar yo‘q." />
      ) : (
        <Table
          className={isRestaurant ? "cs-bookings-table" : undefined}
          style={{ marginTop: isRestaurant ? 0 : 24 }}
          rowKey="id"
          dataSource={filtered}
          pagination={{ pageSize: 12 }}
          scroll={isRestaurant ? { x: RESTAURANT_TABLE_SCROLL_X } : undefined}
          tableLayout={isRestaurant ? "fixed" : undefined}
          onRow={(r) => ({
            onClick: () => {
              form.setFieldsValue({ ...r });
              setDrawer({ open: true, row: r });
            },
          })}
          columns={isRestaurant ? restaurantColumns : genericColumns}
        />
      )}
      <Drawer
        title="Bron"
        width={400}
        open={drawer.open}
        onClose={() => setDrawer({ open: false, row: null })}
        extra={
          <Button type="primary" onClick={save}>
            Saqlash
          </Button>
        }
      >
        <Form form={form} layout="vertical">
          <Form.Item name="status" label="Holat">
            <Select options={STATUS_OPTIONS} />
          </Form.Item>
          <Form.Item name="note" label="Izoh">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Drawer>
    </>
  );
}
