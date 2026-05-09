import { Button, Col, Form, Input, InputNumber, Modal, Row, Select, Space, Switch, Table, Tag, message } from "antd";
import { AppstoreOutlined, UnorderedListOutlined } from "@ant-design/icons";
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PageHeader from "../../components/ui/PageHeader";
import SearchFilterBar from "../../components/ui/SearchFilterBar";
import LoadingScreen from "../../components/ui/LoadingScreen";
import EmptyState from "../../components/ui/EmptyState";
import { confirmDelete } from "../../components/ui/ConfirmDelete";
import BusinessCard from "../../components/cards/BusinessCard";
import StatusTag from "../../components/ui/StatusTag";
import { BUSINESS_STATUS } from "../../config/statusConfigs";
import { createBusiness, deleteBusiness, getBusinesses, updateBusiness } from "../../services/businessService";
import { getCities } from "../../services/cityService";
import { getCategories } from "../../services/categoryService";
import { BUSINESS_TYPE_CONFIG } from "../../config/businessTypes";
import { formatPhone } from "../../utils/formatters";

const typeOptions = Object.keys(BUSINESS_TYPE_CONFIG).map((k) => ({ value: k, label: BUSINESS_TYPE_CONFIG[k].label }));

export default function BusinessesPage() {
  const [rows, setRows] = useState([]);
  const [cities, setCities] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("cards");
  const [search, setSearch] = useState("");
  const [cityId, setCityId] = useState();
  const [categoryId, setCategoryId] = useState();
  const [status, setStatus] = useState();
  const [featured, setFeatured] = useState();
  const [modal, setModal] = useState({ open: false, record: null });
  const [form] = Form.useForm();

  const loadMeta = useCallback(async () => {
    try {
      const [c, cats] = await Promise.all([getCities({}), getCategories({})]);
      setCities(c);
      setCategories(cats);
    } catch {
      setCities([]);
      setCategories([]);
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await getBusinesses({
        search: search || undefined,
        city_id: cityId,
        category_id: categoryId,
        status: status || undefined,
      });
      let f = list;
      if (featured === "1") f = f.filter((b) => b.is_featured);
      if (featured === "0") f = f.filter((b) => !b.is_featured);
      setRows(f);
    } catch {
      message.error("Bizneslar yuklanmadi.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [search, cityId, categoryId, status, featured]);

  useEffect(() => {
    loadMeta();
  }, [loadMeta]);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    form.resetFields();
    form.setFieldsValue({ is_featured: false, status: "pending" });
    setModal({ open: true, record: null });
  };

  const openEdit = (r) => {
    form.setFieldsValue({
      ...r,
      city: r.city,
      category: r.category,
      owner: r.owner,
    });
    setModal({ open: true, record: r });
  };

  const onSubmit = async () => {
    const v = await form.validateFields();
    if (!modal.record) {
      if (v.owner && v.owner_login) {
        message.error("Owner ID yoki yangi login — bittasini tanlang.");
        return;
      }
      if (!v.owner && !v.owner_login) {
        message.error("Owner ID yoki yangi login/parol kiriting.");
        return;
      }
      if (v.owner_login && !v.owner_password) {
        message.error("Yangi login uchun parol kiriting.");
        return;
      }
    }
    try {
      if (modal.record) await updateBusiness(modal.record.id, v);
      else {
        const created = await createBusiness(v);
        if (created?.owner_credentials) {
          Modal.success({
            title: "Owner login yaratildi",
            content: (
              <div>
                <div>
                  <strong>Login:</strong> {created.owner_credentials.username}
                </div>
                <div>
                  <strong>Parol:</strong> {created.owner_credentials.password}
                </div>
              </div>
            ),
          });
        }
      }
      message.success("Saqlandi.");
      setModal({ open: false, record: null });
      load();
    } catch (e) {
      message.error(e.response?.data?.detail || JSON.stringify(e.response?.data) || "Xatolik.");
    }
  };

  if (loading && !rows.length) return <LoadingScreen />;

  return (
    <>
      <PageHeader
        title="Bizneslar"
        description="Moderatsiya, tavsiya va holat boshqaruvi."
        extra={
          <Space>
            <Button icon={view === "cards" ? <UnorderedListOutlined /> : <AppstoreOutlined />} onClick={() => setView(view === "cards" ? "table" : "cards")}>
              {view === "cards" ? "Jadval" : "Kartalar"}
            </Button>
            <Button type="primary" onClick={openCreate}>
              Yangi biznes
            </Button>
          </Space>
        }
      />
      <SearchFilterBar
        placeholder="Nom, telefon"
        value={search}
        onChange={setSearch}
        extra={
          <Space wrap>
            <Select allowClear placeholder="Shahar" style={{ width: 160 }} value={cityId} onChange={setCityId} options={cities.map((c) => ({ value: c.id, label: c.name }))} />
            <Select
              allowClear
              placeholder="Kategoriya"
              style={{ width: 180 }}
              value={categoryId}
              onChange={setCategoryId}
              options={categories.map((c) => ({ value: c.id, label: `${c.name}` }))}
            />
            <Select
              allowClear
              placeholder="Holat"
              style={{ width: 140 }}
              value={status}
              onChange={setStatus}
              options={Object.keys(BUSINESS_STATUS).map((k) => ({ value: k, label: BUSINESS_STATUS[k].label }))}
            />
            <Select
              allowClear
              placeholder="Tavsiya"
              style={{ width: 140 }}
              value={featured}
              onChange={setFeatured}
              options={[
                { value: "1", label: "Tavsiya" },
                { value: "0", label: "Oddiy" },
              ]}
            />
          </Space>
        }
      />
      {!rows.length ? (
        <EmptyState description="Bizneslar topilmadi." />
      ) : view === "cards" ? (
        <Row gutter={[16, 16]}>
          {rows.map((b) => (
            <Col xs={24} md={12} xl={8} key={b.id}>
              <div className="cs-business-card" style={{ height: "100%" }}>
                <BusinessCard business={b} showAdminActions onEdit={openEdit} />
                <div style={{ padding: "0 16px 16px" }}>
                  <Space wrap>
                    <Link to={`/admin/businesses/${b.id}`}>
                      <Button size="small" type="link">
                        Batafsil
                      </Button>
                    </Link>
                    <Button
                      size="small"
                      danger
                      onClick={() =>
                        confirmDelete({
                          title: `${b.name} o‘chirilsinmi?`,
                          onOk: async () => {
                            await deleteBusiness(b.id);
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
            { title: "Kategoriya", dataIndex: "category_name" },
            { title: "Shahar", dataIndex: "city_name" },
            { title: "Telefon", dataIndex: "phone", render: (p) => formatPhone(p) },
            {
              title: "Holat",
              dataIndex: "status",
              render: (v) => <StatusTag map={BUSINESS_STATUS} value={v} />,
            },
            {
              title: "Tavsiya",
              dataIndex: "is_featured",
              render: (v) => (v ? <Tag color="gold">Ha</Tag> : "—"),
            },
            {
              title: "",
              render: (_, r) => (
                <Space>
                  <Link to={`/admin/businesses/${r.id}`}>
                    <Button size="small">Ko‘rish</Button>
                  </Link>
                  <Button size="small" onClick={() => openEdit(r)}>
                    Tahrirlash
                  </Button>
                </Space>
              ),
            },
          ]}
        />
      )}
      <Modal
        title={modal.record ? "Biznesni tahrirlash" : "Yangi biznes"}
        open={modal.open}
        onCancel={() => setModal({ open: false, record: null })}
        onOk={onSubmit}
        okText="Saqlash"
        cancelText="Bekor"
        width={640}
        destroyOnClose
      >
        <Form form={form} layout="vertical" initialValues={{ is_featured: false, status: "pending" }}>
          {!modal.record && (
            <>
              <Form.Item name="owner" label="Egasi (user ID, ixtiyoriy)">
                <InputNumber min={1} style={{ width: "100%" }} placeholder="Mavjud foydalanuvchi ID" />
              </Form.Item>
              <Form.Item name="owner_login" label="Yoki yangi login (ixtiyoriy)">
                <Input placeholder="Masalan: itcenter_kogon" />
              </Form.Item>
              <Form.Item name="owner_password" label="Yangi parol (login bersangiz majburiy)">
                <Input.Password placeholder="Kamida 6 ta belgi" />
              </Form.Item>
            </>
          )}
          <Form.Item name="city" label="Shahar" rules={[{ required: true }]}>
            <Select options={cities.map((c) => ({ value: c.id, label: c.name }))} />
          </Form.Item>
          <Form.Item name="category" label="Kategoriya" rules={[{ required: true }]}>
            <Select
              showSearch
              optionFilterProp="label"
              options={categories.map((c) => ({
                value: c.id,
                label: `${c.name} (${c.city_name || c.city})`,
              }))}
            />
          </Form.Item>
          <Form.Item name="name" label="Nomi" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="business_type" label="Biznes turi">
            <Select allowClear options={typeOptions} />
          </Form.Item>
          <Form.Item name="phone" label="Telefon">
            <Input />
          </Form.Item>
          <Form.Item name="address" label="Manzil">
            <Input />
          </Form.Item>
          <Form.Item name="description" label="Tavsif">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item name="working_hours" label="Ish vaqti">
            <Input placeholder="09:00–18:00" />
          </Form.Item>
          <Form.Item name="status" label="Holat">
            <Select options={Object.keys(BUSINESS_STATUS).map((k) => ({ value: k, label: BUSINESS_STATUS[k].label }))} />
          </Form.Item>
          <Form.Item name="is_featured" label="Tavsiya" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
