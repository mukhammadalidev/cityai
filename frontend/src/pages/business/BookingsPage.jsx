import {
  Button,
  Col,
  DatePicker,
  Drawer,
  Form,
  Input,
  Popconfirm,
  Row,
  Segmented,
  Select,
  Space,
  Table,
  message,
} from "antd";
import dayjs from "dayjs";
import { AppstoreOutlined, UnorderedListOutlined } from "@ant-design/icons";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import BookingCard from "../../components/cards/BookingCard";
import PageHeader from "../../components/ui/PageHeader";
import LoadingScreen from "../../components/ui/LoadingScreen";
import EmptyState from "../../components/ui/EmptyState";
import StatusTag from "../../components/ui/StatusTag";
import { BOOKING_STATUS } from "../../config/statusConfigs";
import { getBusinessTypeConfig } from "../../config/businessTypes";
import { formatPhone, formatDate, formatDateTime } from "../../utils/formatters";
import { getBookingsPageDescription, getBookingsPageTitle } from "../../utils/bookingPageLabels";
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

const RESTAURANT_TABLE_SCROLL_X = 1680;

export default function BookingsPage() {
  const { businessId, business } = useOutletContext();
  const bt = business?.business_type;
  const cfg = getBusinessTypeConfig(bt);
  const isRestaurant = bt === "restaurant";
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState(isRestaurant ? "table" : "cards");
  const [status, setStatus] = useState();
  const [btype, setBtype] = useState();
  const [dateRange, setDateRange] = useState();
  const [drawer, setDrawer] = useState({ open: false, row: null });
  const [form] = Form.useForm();

  useEffect(() => {
    if (bt === "restaurant") setBtype("table_booking");
    else if (bt === "education_center") setBtype("trial_lesson");
    else if (bt === "fitness_center") setBtype("trial_lesson");
    else if (bt === "auto_salon") setBtype("test_drive");
    else if (bt === "clinic" || bt === "legal_service") setBtype("consultation");
    else if (bt === "beauty_salon" || bt === "real_estate") setBtype("appointment");
    else if (bt === "repair_service" || bt === "taxi_delivery" || bt === "photo_video")
      setBtype("service_booking");
    else setBtype(undefined);
  }, [bt]);

  const load = useCallback(async () => {
    const bid = businessId || getSelectedBusinessId();
    if (!bid) return;
    setLoading(true);
    try {
      const params = { business_id: bid };
      if (bt === "restaurant") params.booking_type = "table_booking";
      else if (bt === "education_center") params.booking_type = "trial_lesson";
      else if (bt === "fitness_center") params.booking_type = "trial_lesson";
      else if (bt === "auto_salon") params.booking_type = "test_drive";
      else if (bt === "clinic" || bt === "legal_service") params.booking_type = "consultation";
      else if (bt === "beauty_salon" || bt === "real_estate") params.booking_type = "appointment";
      else if (bt === "repair_service" || bt === "taxi_delivery" || bt === "photo_video")
        params.booking_type = "service_booking";
      const list = await getBookings(params);
      setRows(list);
    } catch (e) {
      message.error("Ma'lumotlarni yuklashda xatolik yuz berdi.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [businessId, bt]);

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
        message.error(e.response?.data?.detail || "Holatni yangilashda xatolik.");
      }
    },
    [load]
  );

  const openDrawer = (row) => {
    form.setFieldsValue({ ...row });
    setDrawer({ open: true, row });
  };

  const save = async () => {
    const v = await form.validateFields();
    try {
      await updateBooking(drawer.row.id, v);
      message.success("Yangilandi.");
      setDrawer({ open: false, row: null });
      load();
      notifyBusinessDataChanged();
    } catch (e) {
      message.error(e.response?.data?.detail || "Xatolik.");
    }
  };

  if (!businessId) return null;
  if (loading && !rows.length) return <LoadingScreen />;

  const title = getBookingsPageTitle(bt);
  const description = getBookingsPageDescription(bt);

  const formatBookingTime = (t) => {
    if (t == null || t === "") return "—";
    const s = String(t);
    return s.length >= 5 ? s.slice(0, 5) : s;
  };

  const bookingTypeLabel = (v) => TYPES.find((t) => t.value === v)?.label || v;

  const formatMeta = (r) => {
    const m = r.metadata;
    if (!m || typeof m !== "object") return null;
    const parts = [];
    if (m.training_type) parts.push(`Yo'nalish: ${m.training_type}`);
    if (m.service_type) parts.push(m.service_type);
    if (m.legal_topic) parts.push(m.legal_topic);
    return parts.length ? parts.join(" · ") : null;
  };

  const restaurantColumns = [
    { title: "ID", dataIndex: "id", width: 72, fixed: "left" },
    { title: "Ism", dataIndex: "name", width: 160, ellipsis: true },
    { title: "Telefon", dataIndex: "phone", width: 168, render: formatPhone },
    { title: "Kishi", dataIndex: "guests_count", width: 80, align: "center", render: (v) => v ?? "—" },
    { title: "Sana", dataIndex: "preferred_date", width: 118, render: formatDate },
    { title: "Vaqt", dataIndex: "preferred_time", width: 88, render: formatBookingTime },
    { title: "Izoh", dataIndex: "note", width: 200, ellipsis: true, render: (v) => v || "—" },
    { title: "Holat", dataIndex: "status", width: 132, render: (v) => <StatusTag map={BOOKING_STATUS} value={v} /> },
    { title: "Yaratilgan", dataIndex: "created_at", width: 158, render: formatDateTime },
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
              <Popconfirm title="Rad etilsinmi?" okText="Ha" cancelText="Yo'q" onConfirm={() => updateStatus(r, "rejected")}>
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
                Bekor
              </Button>
            </Space>
          </Space>
        </div>
      ),
    },
  ];

  const genericColumns = [
    { title: "Ism", dataIndex: "name", width: 140 },
    { title: "Telefon", dataIndex: "phone", width: 150, render: formatPhone },
    { title: "Sana", dataIndex: "preferred_date", width: 110, render: formatDate },
    { title: "Vaqt", dataIndex: "preferred_time", width: 80, render: formatBookingTime },
    { title: "Tur", dataIndex: "booking_type", width: 120, render: bookingTypeLabel },
    {
      title: "Qo&apos;shimcha",
      key: "meta",
      ellipsis: true,
      render: (_, r) => formatMeta(r) || "—",
    },
    { title: "Holat", dataIndex: "status", width: 120, render: (v) => <StatusTag map={BOOKING_STATUS} value={v} /> },
  ];

  return (
    <>
      <PageHeader eyebrow={cfg.label} title={title} description={description} accent={cfg.color} />

      <div className="cs-bookings-filters">
        <Select allowClear placeholder="Holat" style={{ width: 160 }} value={status} onChange={setStatus} options={STATUS_OPTIONS} />
        {!isRestaurant && (
          <Select allowClear placeholder="Tur" style={{ width: 180 }} value={btype} onChange={setBtype} options={TYPES} />
        )}
        <DatePicker.RangePicker onChange={setDateRange} format="DD.MM.YYYY" />
        {!isRestaurant && (
          <div style={{ marginLeft: "auto" }}>
            <Segmented
              value={view}
              onChange={setView}
              options={[
                { label: "Kartalar", value: "cards", icon: <AppstoreOutlined /> },
                { label: "Jadval", value: "table", icon: <UnorderedListOutlined /> },
              ]}
            />
          </div>
        )}
      </div>

      {!filtered.length ? (
        <EmptyState description={`${title} hozircha yo'q.`} />
      ) : view === "cards" && !isRestaurant ? (
        <Row gutter={[16, 16]}>
          {filtered.map((b) => (
            <Col xs={24} sm={12} lg={8} key={b.id}>
              <BookingCard booking={b} metaLine={formatMeta(b)} onClick={() => openDrawer(b)} />
            </Col>
          ))}
        </Row>
      ) : (
        <div className="cs-table-scroll">
          <Table
            className={`cs-premium-table${isRestaurant ? " cs-bookings-table" : ""}`}
            rowKey="id"
            dataSource={filtered}
            pagination={{ pageSize: 12 }}
            scroll={isRestaurant ? { x: RESTAURANT_TABLE_SCROLL_X } : { x: 900 }}
            tableLayout={isRestaurant ? "fixed" : undefined}
            onRow={(r) => ({
              onClick: () => openDrawer(r),
              style: { cursor: "pointer" },
            })}
            columns={isRestaurant ? restaurantColumns : genericColumns}
          />
        </div>
      )}

      <Drawer
        title="Bron tafsilotlari"
        width={Math.min(420, typeof window !== "undefined" ? window.innerWidth - 24 : 420)}
        open={drawer.open}
        onClose={() => setDrawer({ open: false, row: null })}
        extra={
          <Button type="primary" onClick={save}>
            Saqlash
          </Button>
        }
      >
        {drawer.row ? (
          <div className="cs-drawer-section">
            <div style={{ fontWeight: 700, fontSize: 16 }}>{drawer.row.name}</div>
            <div style={{ color: "var(--muted)", marginTop: 4 }}>{formatPhone(drawer.row.phone)}</div>
            <div style={{ marginTop: 8, color: "var(--muted)" }}>
              {formatDate(drawer.row.preferred_date)} · {formatBookingTime(drawer.row.preferred_time)}
            </div>
          </div>
        ) : null}
        <Form form={form} layout="vertical">
          <Form.Item name="status" label="Holat">
            <Select options={STATUS_OPTIONS} />
          </Form.Item>
          <Form.Item name="note" label="Izoh">
            <Input.TextArea rows={4} />
          </Form.Item>
        </Form>
        {drawer.row && isRestaurant ? (
          <Space wrap style={{ marginTop: 16 }}>
            <Button type="primary" onClick={() => updateStatus(drawer.row, "confirmed")}>
              Tasdiqlash
            </Button>
            <Button onClick={() => updateStatus(drawer.row, "completed")}>Bajarildi</Button>
            <Button danger onClick={() => updateStatus(drawer.row, "cancelled")}>
              Bekor
            </Button>
          </Space>
        ) : null}
      </Drawer>
    </>
  );
}
