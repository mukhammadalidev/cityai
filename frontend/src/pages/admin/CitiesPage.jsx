import { Button, Form, Input, Modal, Select, Space, Switch, Table, message } from "antd";
import { useCallback, useEffect, useState } from "react";
import PageHeader from "../../components/ui/PageHeader";
import SearchFilterBar from "../../components/ui/SearchFilterBar";
import LoadingScreen from "../../components/ui/LoadingScreen";
import EmptyState from "../../components/ui/EmptyState";
import { confirmDelete } from "../../components/ui/ConfirmDelete";
import { createCity, deleteCity, getCities, updateCity } from "../../services/cityService";

export default function CitiesPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState();
  const [modal, setModal] = useState({ open: false, record: null });
  const [form] = Form.useForm();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await getCities({ search: search || undefined });
      let f = list;
      if (activeFilter === "1") f = f.filter((c) => c.is_active);
      if (activeFilter === "0") f = f.filter((c) => !c.is_active);
      setRows(f);
    } catch {
      message.error("Shaharlar yuklanmadi.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [search, activeFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    form.resetFields();
    setModal({ open: true, record: null });
  };

  const openEdit = (r) => {
    form.setFieldsValue({ ...r });
    setModal({ open: true, record: r });
  };

  const onSubmit = async () => {
    const v = await form.validateFields();
    try {
      if (modal.record) await updateCity(modal.record.id, v);
      else await createCity(v);
      message.success("Saqlandi.");
      setModal({ open: false, record: null });
      load();
    } catch (e) {
      message.error(e.response?.data?.detail || "Xatolik.");
    }
  };

  if (loading && !rows.length) return <LoadingScreen />;

  return (
    <>
      <PageHeader
        title="Shaharlar"
        description="Platforma shaharlari va ularning holati."
        extra={
          <Button type="primary" onClick={openCreate}>
            Yangi shahar
          </Button>
        }
      />
      <SearchFilterBar
        placeholder="Nom yoki slug bo‘yicha qidirish"
        value={search}
        onChange={setSearch}
        extra={
          <Select
            allowClear
            placeholder="Holat"
            style={{ width: 160 }}
            value={activeFilter}
            onChange={setActiveFilter}
            options={[
              { value: "1", label: "Faol" },
              { value: "0", label: "Nofaol" },
            ]}
          />
        }
      />
      {!rows.length ? (
        <EmptyState description="Shaharlar topilmadi." />
      ) : (
        <Table
          rowKey="id"
          dataSource={rows}
          pagination={{ pageSize: 10 }}
          columns={[
            { title: "Nomi", dataIndex: "name" },
            { title: "Slug", dataIndex: "slug" },
            { title: "Viloyat", dataIndex: "region" },
            {
              title: "Faol",
              dataIndex: "is_active",
              render: (v) => (v ? "Ha" : "Yo‘q"),
            },
            {
              title: "",
              key: "a",
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
                        title: `${r.name} o‘chirilsinmi?`,
                        onOk: async () => {
                          await deleteCity(r.id);
                          message.success("O‘chirildi.");
                          load();
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
      <Modal
        title={modal.record ? "Shaharni tahrirlash" : "Yangi shahar"}
        open={modal.open}
        onCancel={() => setModal({ open: false, record: null })}
        onOk={onSubmit}
        okText="Saqlash"
        cancelText="Bekor"
        destroyOnClose
      >
        <Form form={form} layout="vertical" initialValues={{ is_active: true }}>
          <Form.Item name="name" label="Nomi" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="slug" label="Slug">
            <Input placeholder="Bo‘sh qoldirsangiz, backend generatsiya qilishi mumkin" />
          </Form.Item>
          <Form.Item name="region" label="Viloyat">
            <Input />
          </Form.Item>
          <Form.Item name="description" label="Tavsif">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item name="is_active" label="Faol" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
