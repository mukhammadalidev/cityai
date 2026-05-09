import { Button, Form, Input, Modal, Space, Switch, Table, message } from "antd";
import { useCallback, useEffect, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import PageHeader from "../../components/ui/PageHeader";
import SearchFilterBar from "../../components/ui/SearchFilterBar";
import LoadingScreen from "../../components/ui/LoadingScreen";
import EmptyState from "../../components/ui/EmptyState";
import UpgradeCard from "../../components/ui/UpgradeCard";
import { confirmDelete } from "../../components/ui/ConfirmDelete";
import { createKnowledge, deleteKnowledge, getKnowledge, updateKnowledge } from "../../services/knowledgeService";
import { useWindowEvent } from "../../hooks/useWindowEvent";
import { BUSINESS_DATA_CHANGED, notifyBusinessDataChanged } from "../../utils/businessEvents";

export default function KnowledgePage() {
  const { businessId, plan } = useOutletContext();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState({ open: false, record: null });
  const [form] = Form.useForm();

  const load = useCallback(async () => {
    if (!businessId) return;
    setLoading(true);
    try {
      const list = await getKnowledge({ business_id: businessId });
      const q = search.trim().toLowerCase();
      setRows(q ? list.filter((k) => `${k.title} ${k.content}`.toLowerCase().includes(q)) : list);
    } catch {
      message.error("Bilim bazasi yuklanmadi.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [businessId, search]);

  useEffect(() => {
    load();
  }, [load]);

  useWindowEvent("business-changed", load);
  useWindowEvent(BUSINESS_DATA_CHANGED, load);

  const openCreate = () => {
    form.resetFields();
    form.setFieldsValue({ is_active: true });
    setModal({ open: true, record: null });
  };

  const openEdit = (r) => {
    form.setFieldsValue({ ...r });
    setModal({ open: true, record: r });
  };

  const submit = async () => {
    const v = await form.validateFields();
    try {
      if (modal.record) await updateKnowledge(modal.record.id, v);
      else await createKnowledge({ ...v, business: businessId });
      message.success("Saqlandi.");
      setModal({ open: false, record: null });
      load();
    } catch (e) {
      message.error(e.response?.data?.detail || "Xatolik.");
    }
  };

  if (!businessId) return null;
  if (plan && !plan.has_ai_chat) {
    return (
      <>
        <PageHeader title="AI bilim bazasi" description="Tarifda AI chat yo‘q bo‘lsa, bilim bazasi ham cheklanadi." />
        <UpgradeCard
          title="AI chat-bot tarifda yo‘q"
          description="Start va yuqori tariflarda ochiladi. Billing sahifasidan yangilang."
        />
        <Link to="/business/billing">
          <Button type="primary" style={{ marginTop: 16 }}>
            Tariflarni ko‘rish
          </Button>
        </Link>
      </>
    );
  }
  if (loading && !rows.length) return <LoadingScreen />;

  return (
    <>
      <PageHeader
        title="AI bilim bazasi"
        description="AI bot mijozlarga shu ma’lumotlar asosida javob beradi."
        extra={
          <Button type="primary" onClick={openCreate}>
            Qo‘shish
          </Button>
        }
      />
      <SearchFilterBar placeholder="Qidiruv" value={search} onChange={setSearch} />
      {!rows.length ? (
        <EmptyState description="Yozuvlar yo‘q." />
      ) : (
        <Table
          rowKey="id"
          dataSource={rows}
          pagination={{ pageSize: 10 }}
          columns={[
            { title: "Sarlavha", dataIndex: "title" },
            { title: "Faol", dataIndex: "is_active", render: (v) => (v ? "Ha" : "Yo‘q") },
            {
              title: "",
              render: (_, r) => (
                <Space>
                  <Button size="small" onClick={() => openEdit(r)}>
                    Tahrirlash
                  </Button>
                  <Button
                    size="small"
                    danger
                    onClick={() =>
                      confirmDelete({
                        title: "O‘chirilsinmi?",
                        onOk: async () => {
                          await deleteKnowledge(r.id);
                          message.success("O‘chirildi.");
                          load();
                          notifyBusinessDataChanged();
                        },
                      })
                    }
                  >
                    O‘chirish
                  </Button>
                </Space>
              ),
            },
          ]}
        />
      )}
      <Modal title={modal.record ? "Tahrirlash" : "Yangi yozuv"} open={modal.open} onCancel={() => setModal({ open: false, record: null })} onOk={submit} okText="Saqlash" cancelText="Bekor" destroyOnClose width={560}>
        <Form form={form} layout="vertical" initialValues={{ is_active: true }}>
          <Form.Item name="title" label="Sarlavha" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="content" label="Matn" rules={[{ required: true }]}>
            <Input.TextArea rows={6} />
          </Form.Item>
          <Form.Item name="is_active" label="Faol" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
