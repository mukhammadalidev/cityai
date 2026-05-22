import { Button, Form, Input, InputNumber, Modal, Popconfirm, Select, Space, Table, message } from "antd";
import { useCallback, useEffect, useState } from "react";
import { Navigate, useOutletContext } from "react-router-dom";
import PageHeader from "../../components/ui/PageHeader";
import LoadingScreen from "../../components/ui/LoadingScreen";
import { createTrainer, deleteTrainer, getTrainers, updateTrainer } from "../../services/fitnessService";

export default function FitnessTrainersPage() {
  const { businessId, business } = useOutletContext();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState({ open: false, record: null });
  const [form] = Form.useForm();

  const load = useCallback(async () => {
    if (!businessId) return;
    setLoading(true);
    try {
      setRows(await getTrainers({ business_id: businessId }));
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  useEffect(() => { load(); }, [load]);

  if (business?.business_type !== "fitness_center") return <Navigate to="/business/dashboard" replace />;
  if (loading) return <LoadingScreen />;

  const open = (record = null) => {
    setModal({ open: true, record });
    form.setFieldsValue(
      record || { business: businessId, status: "active", salary_type: "fixed", salary_amount: 0 }
    );
  };

  const save = async () => {
    const v = await form.validateFields();
    v.business = businessId;
    try {
      if (modal.record) await updateTrainer(modal.record.id, v);
      else await createTrainer(v);
      message.success("Saqlandi");
      setModal({ open: false, record: null });
      load();
    } catch {
      message.error("Xatolik");
    }
  };

  return (
    <div>
      <PageHeader title="Trenerlar" extra={<Button type="primary" onClick={() => open()}>Trener qo'shish</Button>} />
      <Table
        rowKey="id"
        dataSource={rows}
        columns={[
          { title: "Ism", dataIndex: "full_name" },
          { title: "Telefon", dataIndex: "phone" },
          { title: "Mutaxassislik", dataIndex: "specialization" },
          { title: "Mashg'ulotlar", dataIndex: "sessions_count" },
          { title: "Holat", dataIndex: "status" },
          {
            title: "",
            render: (_, r) => (
              <Space>
                <Button size="small" onClick={() => open(r)}>Tahrir</Button>
                <Popconfirm title="O'chirilsinmi?" onConfirm={async () => { await deleteTrainer(r.id); load(); }}>
                  <Button size="small" danger>O'chirish</Button>
                </Popconfirm>
              </Space>
            ),
          },
        ]}
      />
      <Modal open={modal.open} title={modal.record ? "Trener tahriri" : "Yangi trener"} onCancel={() => setModal({ open: false, record: null })} onOk={save} okText="Saqlash">
        <Form form={form} layout="vertical">
          <Form.Item name="full_name" label="F.I.O" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="phone" label="Telefon"><Input /></Form.Item>
          <Form.Item name="specialization" label="Mutaxassislik"><Input /></Form.Item>
          <Form.Item name="salary_type" label="Maosh turi"><Select options={[{ value: "fixed", label: "Belgilangan" }, { value: "percent", label: "Foiz" }]} /></Form.Item>
          <Form.Item name="salary_amount" label="Summa / foiz"><InputNumber style={{ width: "100%" }} min={0} /></Form.Item>
          <Form.Item name="status" label="Holat"><Select options={[{ value: "active", label: "Faol" }, { value: "inactive", label: "Nofaol" }]} /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
