import {
  Button,
  DatePicker,
  Drawer,
  Form,
  Input,
  Segmented,
  Select,
  Space,
  Table,
  Typography,
  message,
} from "antd";
import dayjs from "dayjs";
import { LayoutGrid, Table2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import PageHeader from "../../components/ui/PageHeader";
import SearchFilterBar from "../../components/ui/SearchFilterBar";
import LoadingScreen from "../../components/ui/LoadingScreen";
import EmptyState from "../../components/ui/EmptyState";
import LeadCard, { LeadCardTableStatus } from "../../components/cards/LeadCard";
import { LEAD_STATUS } from "../../config/statusConfigs";
import { getBusinessTypeConfig } from "../../config/businessTypes";
import { getLeads, getLead, updateLead, addLeadActivity } from "../../services/leadService";
import { listManagers } from "../../services/authService";
import { formatDateTime, formatPhone } from "../../utils/formatters";
import { useWindowEvent } from "../../hooks/useWindowEvent";
import { BUSINESS_DATA_CHANGED, notifyBusinessDataChanged } from "../../utils/businessEvents";

const KANBAN_COLUMNS = ["new", "contacted", "interested", "negotiation", "won", "lost"];

const KANBAN_ACCENT = {
  new: "#2563EB",
  contacted: "#06B6D4",
  interested: "#7C3AED",
  negotiation: "#F59E0B",
  won: "#16A34A",
  lost: "#94A3B8",
};

const LEAD_TYPE_OPTIONS = [
  { value: "general", label: "Umumiy" },
  { value: "contact", label: "Aloqa" },
  { value: "car_interest", label: "Mashina qiziqishi" },
  { value: "credit", label: "Kredit" },
  { value: "trade_in", label: "Trade-in" },
  { value: "course_register", label: "Kursga yozilish" },
  { value: "price_question", label: "Narx savoli" },
  { value: "delivery_question", label: "Yetkazib berish" },
  { value: "payment_question", label: "To'lov" },
  { value: "property_interest", label: "Uy qiziqishi" },
  { value: "product_question", label: "Mahsulot" },
  { value: "membership_request", label: "Abonement arizasi" },
  { value: "order", label: "Buyurtma" },
  { value: "custom", label: "Boshqa" },
];

export default function LeadsPage() {
  const { businessId, business } = useOutletContext();
  const cfg = getBusinessTypeConfig(business?.business_type);
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

  const filtered = useMemo(
    () =>
      rows.filter((l) => {
        if (statusFilter && l.status !== statusFilter) return false;
        if (typeFilter && l.lead_type !== typeFilter) return false;
        if (prioFilter && l.priority !== prioFilter) return false;
        if (search) {
          const q = search.toLowerCase();
          if (!`${l.name} ${l.phone} ${l.message} ${l.lead_type}`.toLowerCase().includes(q)) return false;
        }
        return true;
      }),
    [rows, statusFilter, typeFilter, prioFilter, search]
  );

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

  const leadsTitle = cfg.leadsLabel || "Lidlar";

  return (
    <>
      <PageHeader
        eyebrow={cfg.label}
        title={leadsTitle}
        description="Kanban yoki jadval — holatni yangilang, mas'ul biriktiring, izoh qoldiring."
        accent={cfg.color}
      />

      <div className="cs-page-toolbar">
        <SearchFilterBar
          embedded
          placeholder="Ism, telefon, xabar…"
          value={search}
          onChange={setSearch}
          extra={
            <Space wrap>
              <Select
                allowClear
                placeholder="Holat"
                style={{ width: 150 }}
                value={statusFilter}
                onChange={setStatusFilter}
                options={KANBAN_COLUMNS.map((k) => ({ value: k, label: LEAD_STATUS[k]?.label || k }))}
              />
              <Select
                allowClear
                placeholder="Tur"
                style={{ width: 180 }}
                value={typeFilter}
                onChange={setTypeFilter}
                options={LEAD_TYPE_OPTIONS}
              />
              <Select
                allowClear
                placeholder="Muhimlik"
                style={{ width: 130 }}
                value={prioFilter}
                onChange={setPrioFilter}
                options={[
                  { value: "low", label: "Past" },
                  { value: "medium", label: "O'rta" },
                  { value: "high", label: "Yuqori" },
                ]}
              />
            </Space>
          }
        />
        <Segmented
          className="cs-view-toggle"
          value={view}
          onChange={setView}
          options={[
            { label: "Kanban", value: "kanban", icon: <LayoutGrid size={14} /> },
            { label: "Jadval", value: "table", icon: <Table2 size={14} /> },
          ]}
        />
      </div>

      {!filtered.length ? (
        <EmptyState description={`${leadsTitle} topilmadi.`} />
      ) : view === "kanban" ? (
        <div className="cs-kanban-board">
          {KANBAN_COLUMNS.map((st) => {
            const colLeads = filtered.filter((l) => l.status === st);
            return (
              <div
                key={st}
                className="cs-kanban-col"
                style={{ "--kanban-accent": KANBAN_ACCENT[st] || "var(--primary)" }}
              >
                <div className="cs-kanban-col__head">
                  <span className="cs-kanban-col__title">{LEAD_STATUS[st]?.label || st}</span>
                  <span className="cs-kanban-col__count">{colLeads.length}</span>
                </div>
                {colLeads.map((l) => (
                  <LeadCard
                    key={l.id}
                    lead={l}
                    itemTitle={l.item_title || l.metadata?.item_title}
                    onClick={() => openDrawer(l)}
                  />
                ))}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="cs-table-scroll">
          <Table
            className="cs-premium-table"
            rowKey="id"
            dataSource={filtered}
            pagination={{ pageSize: 12 }}
            scroll={{ x: 800 }}
            onRow={(r) => ({
              onClick: () => openDrawer(r),
              style: { cursor: "pointer" },
            })}
            columns={[
              { title: "Ism", dataIndex: "name", width: 160 },
              { title: "Telefon", dataIndex: "phone", width: 150, render: formatPhone },
              {
                title: "Holat",
                dataIndex: "status",
                width: 130,
                render: (v) => <LeadCardTableStatus status={v} />,
              },
              {
                title: "Tur",
                dataIndex: "lead_type",
                width: 140,
                render: (v) => LEAD_TYPE_OPTIONS.find((o) => o.value === v)?.label || v,
              },
              {
                title: "Muhimlik",
                dataIndex: "priority",
                width: 100,
                render: (v) =>
                  v === "high" ? "Yuqori" : v === "medium" ? "O'rta" : v === "low" ? "Past" : "—",
              },
              {
                title: "Sana",
                dataIndex: "created_at",
                width: 160,
                render: formatDateTime,
              },
            ]}
          />
        </div>
      )}

      <Drawer
        className="cs-lead-drawer"
        title={drawer.lead?.name || "Lid tafsilotlari"}
        width={Math.min(440, typeof window !== "undefined" ? window.innerWidth - 24 : 440)}
        open={drawer.open}
        onClose={() => setDrawer({ open: false, lead: null })}
        extra={
          <Button type="primary" onClick={saveDrawer}>
            Saqlash
          </Button>
        }
      >
        {drawer.lead ? (
          <div className="cs-drawer-section">
            <Typography.Text type="secondary">
              {formatPhone(drawer.lead.phone)} · {formatDateTime(drawer.lead.created_at)}
            </Typography.Text>
            {drawer.lead.message ? (
              <Typography.Paragraph style={{ marginTop: 8 }}>{drawer.lead.message}</Typography.Paragraph>
            ) : null}
          </div>
        ) : null}
        <Form form={form} layout="vertical">
          <div className="cs-drawer-section">
            <div className="cs-drawer-section__title">Holat va mas'ul</div>
            <Form.Item name="status" label="Holat">
              <Select options={Object.keys(LEAD_STATUS).map((k) => ({ value: k, label: LEAD_STATUS[k].label }))} />
            </Form.Item>
            <Form.Item name="assigned_to" label="Mas'ul menejer">
              <Select
                allowClear
                options={managers.map((m) => ({ value: m.id, label: m.full_name || m.username }))}
              />
            </Form.Item>
            <Form.Item name="priority" label="Muhimlik">
              <Select
                options={[
                  { value: "low", label: "Past" },
                  { value: "medium", label: "O'rta" },
                  { value: "high", label: "Yuqori" },
                ]}
              />
            </Form.Item>
          </div>
          <div className="cs-drawer-section">
            <div className="cs-drawer-section__title">Qo'shimcha</div>
            <Form.Item name="lead_type" label="Tur">
              <Select options={LEAD_TYPE_OPTIONS} />
            </Form.Item>
            <Form.Item name="follow_up" label="Eslatma sanasi">
              <DatePicker style={{ width: "100%" }} format="DD.MM.YYYY" />
            </Form.Item>
            <Form.Item name="note" label="Yangi izoh">
              <Input.TextArea rows={3} placeholder="Saqlashda faoliyat sifatida yoziladi" />
            </Form.Item>
          </div>
        </Form>
      </Drawer>
    </>
  );
}
