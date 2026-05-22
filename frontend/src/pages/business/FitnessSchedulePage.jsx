import { Button, DatePicker, Form, Input, InputNumber, Modal, Select, Space, Table, TimePicker, message } from "antd";
import dayjs from "dayjs";
import { useCallback, useEffect, useState } from "react";
import { Navigate, useOutletContext } from "react-router-dom";
import PageHeader from "../../components/ui/PageHeader";
import LoadingScreen from "../../components/ui/LoadingScreen";
import {
  createSchedule,
  deleteSchedule,
  enrollSchedule,
  getMembers,
  getSchedules,
  getTrainers,
  updateSchedule,
} from "../../services/fitnessService";

export default function FitnessSchedulePage() {
  const { businessId, business } = useOutletContext();
  const [rows, setRows] = useState([]);
  const [trainers, setTrainers] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState({ open: false, record: null });
  const [enrollModal, setEnrollModal] = useState({ open: false, session: null });
  const [form] = Form.useForm();
  const [enrollForm] = Form.useForm();

  const load = useCallback(async () => {
    if (!businessId) return;
    setLoading(true);
    try {
      const [s, t, m] = await Promise.all([
        getSchedules({ business_id: businessId, date: dayjs().format("YYYY-MM-DD") }),
        getTrainers({ business_id: businessId }),
        getMembers({ business_id: businessId, status: "active" }),
      ]);
      setRows(s);
      setTrainers(t);
      setMembers(m);
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  useEffect(() => { load(); }, [load]);

  if (business?.business_type !== "fitness_center") return <Navigate to="/business/dashboard" replace />;
  if (loading) return <LoadingScreen />;

  const open = (record = null) => {
    setModal({ open: true, record });
    if (record) {
      form.setFieldsValue({
        ...record,
        session_date: dayjs(record.session_date),
        start_time: dayjs(record.start_time, "HH:mm:ss"),
        end_time: dayjs(record.end_time, "HH:mm:ss"),
      });
    } else {
      form.setFieldsValue({
        business: businessId,
        session_type: "group",
        status: "scheduled",
        session_date: dayjs(),
        start_time: dayjs("09:00", "HH:mm"),
        end_time: dayjs("10:00", "HH:mm"),
        max_members: 15,
      });
    }
  };

  const save = async () => {
    const v = await form.validateFields();
    const body = {
      business: businessId,
      title: v.title,
      trainer: v.trainer,
      session_type: v.session_type,
      session_date: v.session_date.format("YYYY-MM-DD"),
      start_time: v.start_time.format("HH:mm:ss"),
      end_time: v.end_time.format("HH:mm:ss"),
      max_members: v.max_members,
      status: v.status,
      note: v.note || "",
    };
    try {
      if (modal.record) await updateSchedule(modal.record.id, body);
      else await createSchedule(body);
      message.success("Saqlandi");
      setModal({ open: false, record: null });
      load();
    } catch {
      message.error("Xatolik");
    }
  };

  return (
    <div>
      <PageHeader title="Mashg'ulot jadvali" extra={<Button type="primary" onClick={() => open()}>Mashg'ulot qo'shish</Button>} />
      <Table
        rowKey="id"
        dataSource={rows}
        columns={[
          { title: "Nomi", dataIndex: "title" },
          { title: "Trener", dataIndex: "trainer_name" },
          { title: "Sana", dataIndex: "session_date" },
          { title: "Vaqt", render: (_, r) => `${String(r.start_time).slice(0, 5)} – ${String(r.end_time).slice(0, 5)}` },
          { title: "A'zolar", render: (_, r) => `${r.current_members}/${r.max_members}` },
          { title: "Holat", dataIndex: "status" },
          {
            title: "",
            render: (_, r) => (
              <Space>
                <Button size="small" onClick={() => { setEnrollModal({ open: true, session: r }); enrollForm.resetFields(); }}>A'zo biriktirish</Button>
                <Button size="small" onClick={() => open(r)}>Tahrir</Button>
                <Button size="small" danger onClick={async () => { await deleteSchedule(r.id); load(); }}>O'chirish</Button>
              </Space>
            ),
          },
        ]}
      />
      <Modal open={modal.open} title="Mashg'ulot" onCancel={() => setModal({ open: false, record: null })} onOk={save} width={520}>
        <Form form={form} layout="vertical">
          <Form.Item name="title" label="Nomi" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="trainer" label="Trener"><Select allowClear options={trainers.map((t) => ({ value: t.id, label: t.full_name }))} /></Form.Item>
          <Form.Item name="session_type" label="Turi"><Select options={[{ value: "group", label: "Guruh" }, { value: "individual", label: "Individual" }]} /></Form.Item>
          <Form.Item name="session_date" label="Sana"><DatePicker style={{ width: "100%" }} /></Form.Item>
          <Form.Item name="start_time" label="Boshlanish"><TimePicker style={{ width: "100%" }} format="HH:mm" /></Form.Item>
          <Form.Item name="end_time" label="Tugash"><TimePicker style={{ width: "100%" }} format="HH:mm" /></Form.Item>
          <Form.Item name="max_members" label="Maks a'zo"><InputNumber min={1} style={{ width: "100%" }} /></Form.Item>
        </Form>
      </Modal>
      <Modal
        open={enrollModal.open}
        title="A'zo biriktirish"
        onCancel={() => setEnrollModal({ open: false, session: null })}
        onOk={async () => {
          const v = await enrollForm.validateFields();
          await enrollSchedule(enrollModal.session.id, v.member_id);
          message.success("Biriktirildi");
          setEnrollModal({ open: false, session: null });
          load();
        }}
      >
        <Form form={enrollForm} layout="vertical">
          <Form.Item name="member_id" label="A'zo" rules={[{ required: true }]}>
            <Select showSearch optionFilterProp="label" options={members.map((m) => ({ value: m.id, label: m.full_name }))} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
