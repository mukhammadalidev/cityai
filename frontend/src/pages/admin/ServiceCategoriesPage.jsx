import { Button, Col, Form, Input, InputNumber, Modal, Row, Select, Space, Switch, Table, message } from "antd";
import { AppstoreOutlined, UnorderedListOutlined } from "@ant-design/icons";
import { useCallback, useEffect, useState } from "react";
import PageHeader from "../../components/ui/PageHeader";
import SearchFilterBar from "../../components/ui/SearchFilterBar";
import LoadingScreen from "../../components/ui/LoadingScreen";
import EmptyState from "../../components/ui/EmptyState";
import { confirmDelete } from "../../components/ui/ConfirmDelete";
import { createCategory, deleteCategory, getCategories, updateCategory } from "../../services/categoryService";
import { getCities } from "../../services/cityService";
import { BUSINESS_TYPE_CONFIG } from "../../config/businessTypes";
import CategoryCard from "../../components/cards/CategoryCard";

const typeOptions = Object.keys(BUSINESS_TYPE_CONFIG).map((k) => ({
  value: k,
  label: BUSINESS_TYPE_CONFIG[k].label,
}));

export default function ServiceCategoriesPage() {
  const [rows, setRows] = useState([]);
  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("grid");
  const [search, setSearch] = useState("");
  const [cityId, setCityId] = useState();
  const [catType, setCatType] = useState();
  const [modal, setModal] = useState({ open: false, record: null });
  const [form] = Form.useForm();

  const loadCities = useCallback(async () => {
    try {
      setCities(await getCities({}));
    } catch {
      setCities([]);
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await getCategories({
        city_id: cityId,
        search: search || undefined,
      });
      let f = list;
      if (catType) f = f.filter((c) => c.category_type === catType);
      f = [...f].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
      setRows(f);
    } catch {
      message.error("Kategoriyalar yuklanmadi.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [cityId, search, catType]);

  useEffect(() => {
    loadCities();
  }, [loadCities]);

  useEffect(() => {
    load();
  }, [load]);

  const citySlugMap = useCallback(
    (id) => cities.find((c) => c.id === id)?.slug || "",
    [cities],
  );

  const openCreate = () => {
    form.resetFields();
    form.setFieldsValue({ is_active: true, sort_order: 0 });
    setModal({ open: true, record: null });
  };

  const openEdit = (r) => {
    form.setFieldsValue({ ...r });
    setModal({ open: true, record: r });
  };

  const onSubmit = async () => {
    const v = await form.validateFields();
    try {
      if (modal.record) await updateCategory(modal.record.id, v);
      else await createCategory(v);
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
        title="Xizmat kategoriyalari"
        description="Shaharlar bo‘yicha katalog va ko‘rinishlar."
        extra={
          <Space>
            <Button icon={view === "grid" ? <UnorderedListOutlined /> : <AppstoreOutlined />} onClick={() => setView(view === "grid" ? "table" : "grid")}>
              {view === "grid" ? "Jadval" : "Katak"}
            </Button>
            <Button type="primary" onClick={openCreate}>
              Yangi kategoriya
            </Button>
          </Space>
        }
      />
      <SearchFilterBar
        placeholder="Qidirish"
        value={search}
        onChange={setSearch}
        extra={
          <Space wrap>
            <Select
              allowClear
              placeholder="Shahar"
              style={{ width: 200 }}
              value={cityId}
              onChange={setCityId}
              options={cities.map((c) => ({ value: c.id, label: c.name }))}
            />
            <Select allowClear placeholder="Tur" style={{ width: 200 }} value={catType} onChange={setCatType} options={typeOptions} />
          </Space>
        }
      />
      {!rows.length ? (
        <EmptyState description="Kategoriyalar topilmadi." />
      ) : view === "grid" ? (
        <Row gutter={[16, 16]}>
          {rows.map((c) => (
            <Col xs={24} sm={12} md={8} lg={6} key={c.id}>
              <div style={{ position: "relative" }}>
                <CategoryCard citySlug={citySlugMap(c.city)} category={c} />
                <Space style={{ marginTop: 8 }}>
                  <Button size="small" onClick={() => openEdit(c)}>
                    Tahrirlash
                  </Button>
                  <Button
                    size="small"
                    danger
                    onClick={() =>
                      confirmDelete({
                        title: `${c.name} o‘chirilsinmi?`,
                        onOk: async () => {
                          await deleteCategory(c.id);
                          message.success("O‘chirildi.");
                          load();
                        },
                      })
                    }
                  >
                    O‘chirish
                  </Button>
                </Space>
              </div>
            </Col>
          ))}
        </Row>
      ) : (
        <Table
          rowKey="id"
          dataSource={rows}
          pagination={{ pageSize: 12 }}
          columns={[
            { title: "Nomi", dataIndex: "name" },
            { title: "Slug", dataIndex: "slug" },
            { title: "Icon", dataIndex: "icon" },
            { title: "Tartib", dataIndex: "sort_order" },
            {
              title: "Faol",
              dataIndex: "is_active",
              render: (v) => (v ? "Ha" : "Yo‘q"),
            },
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
                        title: `${r.name} o‘chirilsinmi?`,
                        onOk: async () => {
                          await deleteCategory(r.id);
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
        title={modal.record ? "Kategoriyani tahrirlash" : "Yangi kategoriya"}
        open={modal.open}
        onCancel={() => setModal({ open: false, record: null })}
        onOk={onSubmit}
        okText="Saqlash"
        cancelText="Bekor"
        width={560}
        destroyOnClose
      >
        <Form form={form} layout="vertical" initialValues={{ is_active: true, sort_order: 0 }}>
          <Form.Item name="city" label="Shahar (ID)" rules={[{ required: true }]}>
            <Select
              showSearch
              optionFilterProp="label"
              options={cities.map((c) => ({ value: c.id, label: `${c.name} (#${c.id})` }))}
            />
          </Form.Item>
          <Form.Item name="name" label="Nomi" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="slug" label="Slug">
            <Input />
          </Form.Item>
          <Form.Item name="icon" label="Icon / emoji">
            <Input placeholder="Masalan: 🚗" />
          </Form.Item>
          <Form.Item name="description" label="Tavsif">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="category_type" label="Kategoriya turi" rules={[{ required: true }]}>
            <Select options={typeOptions} />
          </Form.Item>
          <Form.Item name="sort_order" label="Tartib raqami">
            <InputNumber min={0} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="is_active" label="Faol" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
