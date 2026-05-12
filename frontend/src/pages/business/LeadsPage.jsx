import { Button, Col, DatePicker, Drawer, Form, Input, Row, Segmented, Select, Space, Table, message } from "antd";
import dayjs from "dayjs";
import { useCallback, useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import PageHeader from "../../components/ui/PageHeader";
import SearchFilterBar from "../../components/ui/SearchFilterBar";
import LoadingScreen from "../../components/ui/LoadingScreen";
import EmptyState from "../../components/ui/EmptyState";
import LeadCard from "../../components/cards/LeadCard";
import { LEAD_STATUS } from "../../config/statusConfigs";
import StatusTag from "../../components/ui/StatusTag";
import { getLeads, getLead, updateLead, addLeadActivity } from "../../services/leadService";
import { listManagers } from "../../services/authService";
import { formatPhone } from "../../utils/formatters";
import { useWindowEvent } from "../../hooks/useWindowEvent";
import { BUSINESS_DATA_CHANGED, notifyBusinessDataChanged } from "../../utils/businessEvents";

const STATUS_KEYS = Object.keys(LEAD_STATUS);

export default function LeadsPage() {
  const { businessId } = useOutletContext();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("kanban");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState();
  const [typeFilter, setTypeFilter] = useState();
  const [prioFilter, setPrioFilter] = useState();
  const [drawer, setDrawer] = useState({ open: false, lead: null });
  const [managers, setManagers] = useState([]);
  const [form] = Form.useForm();

  const load = useCallback(async () => {
    if (!businessId) return;
    setLoading(true);
    try {
      const list = await getLeads({ business_id: businessId });
      setRows(list);
      const mgr = await listManagers({ business_id: businessId });
      setManagers(mgr);
    } catch {
      message.error("Lidlar yuklanmadi.");
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

  const filtered = rows.filter((l) => {
    if (statusFilter && l.status !== statusFilter) return false;
    if (typeFilter && l.lead_type !== typeFilter) return false;
    if (prioFilter && l.priority !== prioFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!`${l.name} ${l.phone} ${l.message}`.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const openDrawer = async (lead) => {
    try {
      const full = await getLead(lead.id);
      form.setFieldsValue({
        ...full,
        follow_up: full.metadata?.follow_up_at ? dayjs(full.metadata.follow_up_at) : undefined,
      });
      setDrawer({ open: true, lead: full });
    } catch {
      message.error("Lid yuklanmadi.");
    }
  };

  const saveDrawer = async () => {
    const v = await form.validateFields();
    const { follow_up, note, ...rest } = v;
    try {
      const meta = { ...(drawer.lead.metadata || {}) };
      if (follow_up) meta.follow_up_at = follow_up.toISOString();
      await updateLead(drawer.lead.id, { ...rest, metadata: meta });
      if (note) await addLeadActivity(drawer.lead.id, note);
      message.success("Saqlandi.");
      setDrawer({ open: false, lead: null });
      load();
      notifyBusinessDataChanged();
    } catch (e) {
      message.error(e.response?.data?.detail || "Xatolik.");
    }
  };

  if (!businessId) return null;
  if (loading && !rows.length) return <LoadingScreen />;

  return (
    <>
      <PageHeader title="Lidlar" description="Kanban yoki jadval rejimi." />
      <Space style={{ marginBottom: 16 }}>
        <Segmented
          value={view}
          onChange={setView}
          options={[
            { label: "Kanban", value: "kanban" },
            { label: "Jadval", value: "table" },
          ]}
        />
      </Space>
      <SearchFilterBar
        placeholder="Ism, telefon, xabar"
        value={search}
        onChange={setSearch}
        extra={
          <Space wrap>
            <Select
              allowClear
              placeholder="Holat"
              style={{ width: 160 }}
              value={statusFilter}
              onChange={setStatusFilter}
              options={STATUS_KEYS.map((k) => ({ value: k, label: LEAD_STATUS[k].label }))}
            />
            <Select
              allowClear
              placeholder="Tur"
              style={{ width: 200 }}
              value={typeFilter}
              onChange={setTypeFilter}
              options={[
                { value: "general", label: "Umumiy" },
                { value: "contact", label: "Aloqa" },
                { value: "car_interest", label: "Mashina qiziqishi" },
                { value: "credit", label: "Kredit" },
                { value: "trade_in", label: "Trade-in" },
                { value: "course_register", label: "Kursga yozilish" },
                { value: "price_question", label: "Narx savoli" },
                { value: "delivery_question", label: "Yetkazib berish" },
                { value: "payment_question", label: "To‘lov" },
                { value: "property_interest", label: "Uy qiziqishi" },
                { value: "product_question", label: "Mahsulot" },
                { value: "membership_request", label: "Abonement arizasi" },
                { value: "order", label: "Buyurtma" },
                { value: "custom", label: "Boshqa" },
              ]}
            />
            <Select
              allowClear
              placeholder="Muhimlik"
              style={{ width: 140 }}
              value={prioFilter}
              onChange={setPrioFilter}
              options={[
                { value: "low", label: "Past" },
                { value: "medium", label: "O‘rta" },
                { value: "high", label: "Yuqori" },
              ]}
            />
          </Space>
        }
      />
      {!filtered.length ? (
        <EmptyState description="Lidlar topilmadi." />
      ) : view === "kanban" ? (
        <Row gutter={12} wrap={false} style={{ overflowX: "auto" }}>
          {STATUS_KEYS.map((st) => (
            <Col key={st} style={{ minWidth: 260 }}>
              <div className="cs-kanban-col">
                <div style={{ fontWeight: 700, marginBottom: 8 }}>{LEAD_STATUS[st].label}</div>
                {filtered
                  .filter((l) => l.status === st)
                  .map((l) => (
                    <LeadCard key={l.id} lead={l} onClick={() => openDrawer(l)} />
                  ))}
              </div>
            </Col>
          ))}
        </Row>
      ) : (
        <Table
          rowKey="id"
          dataSource={filtered}
          pagination={{ pageSize: 12 }}
          onRow={(r) => ({ onClick: () => openDrawer(r) })}
          columns={[
            { title: "Ism", dataIndex: "name" },
            { title: "Telefon", dataIndex: "phone", render: formatPhone },
            {
              title: "Holat",
              dataIndex: "status",
              render: (v) => <StatusTag map={LEAD_STATUS} value={v} />,
            },
            { title: "Tur", dataIndex: "lead_type" },
          ]}
        />
      )}
      <Drawer title="Lid tafsilotlari" width={400} open={drawer.open} onClose={() => setDrawer({ open: false, lead: null })} extra={<Button type="primary" onClick={saveDrawer}>Saqlash</Button>}>
        <Form form={form} layout="vertical">
          <Form.Item name="status" label="Holat">
            <Select options={STATUS_KEYS.map((k) => ({ value: k, label: LEAD_STATUS[k].label }))} />
          </Form.Item>
          <Form.Item name="lead_type" label="Tur">
            <Input />
          </Form.Item>
          <Form.Item name="priority" label="Muhimlik">
            <Select
              options={[
                { value: "low", label: "Past" },
                { value: "medium", label: "O‘rta" },
                { value: "high", label: "Yuqori" },
              ]}
            />
          </Form.Item>
          <Form.Item name="assigned_to" label="Mas’ul">
            <Select
              allowClear
              options={managers.map((m) => ({ value: m.id, label: m.full_name || m.username }))}
            />
          </Form.Item>
          <Form.Item name="follow_up" label="Eslatma sanasi">
            <DatePicker style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="note" label="Izoh / faoliyat">
            <Input.TextArea rows={3} placeholder="Saqlashda metadata ga yoziladi" />
          </Form.Item>
        </Form>
      </Drawer>
    </>
  );
}
