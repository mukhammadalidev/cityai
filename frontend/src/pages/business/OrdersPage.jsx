import { Button, Drawer, Form, Input, Select, Space, Table, Typography, message } from "antd";
import { useCallback, useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import PageHeader from "../../components/ui/PageHeader";
import LoadingScreen from "../../components/ui/LoadingScreen";
import EmptyState from "../../components/ui/EmptyState";
import StatusTag from "../../components/ui/StatusTag";
import { ORDER_STATUS } from "../../config/statusConfigs";
import { formatPhone, formatPrice, formatDateTime } from "../../utils/formatters";
import { getOrders, updateOrder } from "../../services/orderService";
import { useWindowEvent } from "../../hooks/useWindowEvent";
import { BUSINESS_DATA_CHANGED, notifyBusinessDataChanged } from "../../utils/businessEvents";

export default function OrdersPage() {
  const { businessId } = useOutletContext();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState();
  const [drawer, setDrawer] = useState({ open: false, row: null });
  const [form] = Form.useForm();

  const load = useCallback(async () => {
    if (!businessId) return;
    setLoading(true);
    try {
      setRows(await getOrders({ business_id: businessId }));
    } catch {
      message.error("Buyurtmalar yuklanmadi.");
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

  const filtered = status ? rows.filter((r) => r.status === status) : rows;

  const save = async () => {
    const v = await form.validateFields();
    try {
      await updateOrder(drawer.row.id, v);
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

  return (
    <>
      <PageHeader title="Buyurtmalar" description="Holat va mijoz ma’lumotlari." />
      <Space style={{ marginBottom: 16 }}>
        <Select
          allowClear
          placeholder="Holat"
          style={{ width: 180 }}
          value={status}
          onChange={setStatus}
          options={Object.keys(ORDER_STATUS).map((k) => ({ value: k, label: ORDER_STATUS[k].label }))}
        />
      </Space>
      {!filtered.length ? (
        <EmptyState description="Buyurtmalar yo‘q." />
      ) : (
        <Table
          rowKey="id"
          dataSource={filtered}
          pagination={{ pageSize: 12 }}
          onRow={(r) => ({
            onClick: () => {
              form.setFieldsValue({ ...r });
              setDrawer({ open: true, row: r });
            },
          })}
          columns={[
            { title: "ID", dataIndex: "id", width: 70 },
            { title: "Ism", dataIndex: "name" },
            { title: "Telefon", dataIndex: "phone", render: formatPhone },
            {
              title: "Manzil",
              dataIndex: "address",
              ellipsis: true,
              render: (a) => a || "—",
            },
            { title: "Summa", dataIndex: "total_amount", render: (a) => formatPrice(a) },
            {
              title: "Holat",
              dataIndex: "status",
              render: (v) => <StatusTag map={ORDER_STATUS} value={v} />,
            },
            { title: "Vaqt", dataIndex: "created_at", render: formatDateTime },
          ]}
        />
      )}
      <Drawer title="Buyurtma" width={420} open={drawer.open} onClose={() => setDrawer({ open: false, row: null })} extra={<Button type="primary" onClick={save}>Saqlash</Button>}>
        {drawer.row && (
          <>
            <Typography.Paragraph>
              <strong>Mijoz:</strong> {drawer.row.name} · {formatPhone(drawer.row.phone)}
            </Typography.Paragraph>
            <Typography.Paragraph>
              <strong>Manzil:</strong> {drawer.row.address || "—"}
            </Typography.Paragraph>
            <Form form={form} layout="vertical">
              <Form.Item name="status" label="Holat">
                <Select options={Object.keys(ORDER_STATUS).map((k) => ({ value: k, label: ORDER_STATUS[k].label }))} />
              </Form.Item>
              <Form.Item name="note" label="Izoh">
                <Input.TextArea rows={3} />
              </Form.Item>
            </Form>
          </>
        )}
      </Drawer>
    </>
  );
}
