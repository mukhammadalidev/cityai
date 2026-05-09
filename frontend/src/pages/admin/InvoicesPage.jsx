import { Button, DatePicker, Form, InputNumber, Modal, Select, Space, Table, message } from "antd";
import dayjs from "dayjs";
import { useCallback, useEffect, useState } from "react";
import PageHeader from "../../components/ui/PageHeader";
import SearchFilterBar from "../../components/ui/SearchFilterBar";
import LoadingScreen from "../../components/ui/LoadingScreen";
import EmptyState from "../../components/ui/EmptyState";
import StatusTag from "../../components/ui/StatusTag";
import { INVOICE_STATUS } from "../../config/statusConfigs";
import { formatPrice, formatDate, formatDateTime } from "../../utils/formatters";
import { createInvoice, getInvoices, markInvoicePaid } from "../../services/billingService";
import { getBusinesses } from "../../services/businessService";

const invTypes = [
  { value: "setup", label: "O‘rnatish" },
  { value: "monthly", label: "Oylik" },
  { value: "featured", label: "Reklama" },
  { value: "extra_ai", label: "Qo‘shimcha AI" },
];

export default function InvoicesPage() {
  const [rows, setRows] = useState([]);
  const [biz, setBiz] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState();
  const [businessId, setBusinessId] = useState();
  const [modal, setModal] = useState(false);
  const [form] = Form.useForm();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [inv, b] = await Promise.all([
        getInvoices({
          business_id: businessId || undefined,
        }),
        getBusinesses({}),
      ]);
      let list = inv;
      if (status) list = list.filter((i) => i.status === status);
      setRows(list);
      setBiz(b);
    } catch {
      message.error("Hisob-fakturalar yuklanmadi.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [status, businessId]);

  useEffect(() => {
    load();
  }, [load]);

  const pay = async (id) => {
    try {
      await markInvoicePaid(id);
      message.success("To‘langan deb belgilandi.");
      load();
    } catch (e) {
      message.error(e.response?.data?.detail || "Xatolik.");
    }
  };

  const submitCreate = async () => {
    const v = await form.validateFields();
    try {
      await createInvoice({
        business: v.business,
        amount: v.amount,
        invoice_type: v.invoice_type,
        status: v.status || "unpaid",
        due_date: v.due_date.format("YYYY-MM-DD"),
      });
      message.success("Yaratildi.");
      setModal(false);
      load();
    } catch (e) {
      message.error(e.response?.data?.detail || "Xatolik.");
    }
  };

  if (loading && !rows.length) return <LoadingScreen />;

  return (
    <>
      <PageHeader title="Hisob-fakturalar" description="To‘lovlar va holat." extra={<Button type="primary" onClick={() => setModal(true)}>Yangi hisob-faktura</Button>} />
      <SearchFilterBar
        placeholder="Filtrlar ostida ro‘yxat yangilanadi"
        value=""
        onChange={() => {}}
        extra={
          <Space wrap>
            <Select
              allowClear
              placeholder="Holat"
              style={{ width: 160 }}
              value={status}
              onChange={setStatus}
              options={Object.keys(INVOICE_STATUS).map((k) => ({ value: k, label: INVOICE_STATUS[k].label }))}
            />
            <Select
              allowClear
              placeholder="Biznes"
              style={{ width: 220 }}
              value={businessId}
              onChange={setBusinessId}
              options={biz.map((b) => ({ value: b.id, label: b.name }))}
            />
          </Space>
        }
      />
      {!rows.length ? (
        <EmptyState description="Hisob-fakturalar topilmadi." />
      ) : (
        <Table
          rowKey="id"
          dataSource={rows}
          pagination={{ pageSize: 12 }}
          columns={[
            { title: "ID", dataIndex: "id", width: 70 },
            { title: "Biznes", dataIndex: "business" },
            { title: "Summa", dataIndex: "amount", render: (a) => formatPrice(a) },
            { title: "Tur", dataIndex: "invoice_type" },
            {
              title: "Holat",
              dataIndex: "status",
              render: (v) => <StatusTag map={INVOICE_STATUS} value={v} />,
            },
            { title: "Muddati", dataIndex: "due_date", render: formatDate },
            { title: "To‘langan", dataIndex: "paid_at", render: formatDateTime },
            {
              title: "",
              render: (_, r) =>
                r.status !== "paid" ? (
                  <Button type="link" onClick={() => pay(r.id)}>
                    To‘langan deb belgilash
                  </Button>
                ) : null,
            },
          ]}
        />
      )}
      <Modal title="Yangi hisob-faktura" open={modal} onCancel={() => setModal(false)} onOk={submitCreate} okText="Yaratish" cancelText="Bekor" destroyOnClose>
        <Form form={form} layout="vertical" initialValues={{ invoice_type: "monthly", status: "unpaid", due_date: dayjs() }}>
          <Form.Item name="business" label="Biznes" rules={[{ required: true }]}>
            <Select options={biz.map((b) => ({ value: b.id, label: `${b.name} (#${b.id})` }))} />
          </Form.Item>
          <Form.Item name="amount" label="Summa" rules={[{ required: true }]}>
            <InputNumber min={0} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="invoice_type" label="Tur" rules={[{ required: true }]}>
            <Select options={invTypes} />
          </Form.Item>
          <Form.Item name="status" label="Holat">
            <Select options={Object.keys(INVOICE_STATUS).map((k) => ({ value: k, label: INVOICE_STATUS[k].label }))} />
          </Form.Item>
          <Form.Item name="due_date" label="Muddati" rules={[{ required: true }]}>
            <DatePicker style={{ width: "100%" }} format="DD.MM.YYYY" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
