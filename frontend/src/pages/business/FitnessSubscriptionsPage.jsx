import { Button, Form, InputNumber, Modal, Select, Space, Table, Tag, message } from "antd";
import dayjs from "dayjs";
import { useCallback, useEffect, useState } from "react";
import { Navigate, useOutletContext } from "react-router-dom";
import PageHeader from "../../components/ui/PageHeader";
import LoadingScreen from "../../components/ui/LoadingScreen";
import { createSubscription, getMembers, getSubscriptions, updateSubscription } from "../../services/fitnessService";
import { formatPrice } from "../../utils/formatters";

const PLAN_OPTIONS = [
  { value: "1_month", label: "1 oy" },
  { value: "3_month", label: "3 oy" },
  { value: "6_month", label: "6 oy" },
  { value: "12_month", label: "12 oy" },
  { value: "individual", label: "Individual" },
];

const STATUS_COLOR = { active: "green", expiring: "orange", expired: "red", frozen: "blue", cancelled: "default" };

export default function FitnessSubscriptionsPage() {
  const { businessId, business } = useOutletContext();
  const [rows, setRows] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [modal, setModal] = useState({ open: false, record: null });
  const [form] = Form.useForm();

  const load = useCallback(async () => {
    if (!businessId) return;
    setLoading(true);
    try {
      const params = { business_id: businessId };
      if (filter) params.status = filter;
      const [subs, mem] = await Promise.all([getSubscriptions(params), getMembers({ business_id: businessId })]);
      setRows(subs);
      setMembers(mem);
    } finally {
      setLoading(false);
    }
  }, [businessId, filter]);

  useEffect(() => { load(); }, [load]);

  if (business?.business_type !== "fitness_center") return <Navigate to="/business/dashboard" replace />;
  if (loading) return <LoadingScreen />;

  const save = async () => {
    const v = await form.validateFields();
    const body = {
      business: businessId,
      client: v.client,
      plan_type: v.plan_type,
      plan_name: PLAN_OPTIONS.find((p) => p.value === v.plan_type)?.label,
      price: v.price,
      expected_amount: v.price,
      start_date: dayjs().format("YYYY-MM-DD"),
      status: "active",
    };
    try {
      if (modal.record) await updateSubscription(modal.record.id, body);
      else await createSubscription(body);
      message.success("Saqlandi");
      setModal({ open: false, record: null });
      load();
    } catch {
      message.error("Xatolik");
    }
  };

  return (
    <div>
      <PageHeader
        title="Abonementlar"
        extra={
          <Space>
            <Select
              allowClear
              placeholder="Holat"
              style={{ width: 140 }}
              onChange={setFilter}
              options={[
                { value: "active", label: "Faol" },
                { value: "expiring", label: "Tugayapti" },
                { value: "expired", label: "Tugagan" },
                { value: "frozen", label: "Muzlatilgan" },
              ]}
            />
            <Button type="primary" onClick={() => { setModal({ open: true, record: null }); form.resetFields(); }}>Abonement biriktirish</Button>
          </Space>
        }
      />
      <Table
        rowKey="id"
        dataSource={rows}
        columns={[
          { title: "A'zo", dataIndex: "client_name" },
          { title: "Reja", dataIndex: "plan_name" },
          { title: "Boshlash", dataIndex: "start_date" },
          { title: "Tugash", dataIndex: "end_date" },
          { title: "Qolgan kun", dataIndex: "remaining_days" },
          { title: "Narx", render: (_, r) => formatPrice(r.price || r.expected_amount) },
          { title: "Qarz", render: (_, r) => formatPrice(r.debt_amount) },
          { title: "Holat", render: (_, r) => <Tag color={STATUS_COLOR[r.status]}>{r.status}</Tag> },
        ]}
      />
      <Modal open={modal.open} title="Abonement" onCancel={() => setModal({ open: false, record: null })} onOk={save}>
        <Form form={form} layout="vertical">
          <Form.Item name="client" label="A'zo" rules={[{ required: true }]}>
            <Select options={members.map((m) => ({ value: m.id, label: m.full_name }))} />
          </Form.Item>
          <Form.Item name="plan_type" label="Turi" rules={[{ required: true }]}><Select options={PLAN_OPTIONS} /></Form.Item>
          <Form.Item name="price" label="Narx" rules={[{ required: true }]}><InputNumber style={{ width: "100%" }} min={0} /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
