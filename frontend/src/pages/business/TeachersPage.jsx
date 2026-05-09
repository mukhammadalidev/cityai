import {
  Button,
  Card,
  Drawer,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, Navigate, useOutletContext } from "react-router-dom";
import PageHeader from "../../components/ui/PageHeader";
import LoadingScreen from "../../components/ui/LoadingScreen";
import EmptyState from "../../components/ui/EmptyState";
import { createEduPortalUser } from "../../services/authService";
import {
  createTeacher,
  deleteTeacher,
  getTeachers,
  updateTeacher,
} from "../../services/teacherService";
import { formatPhone } from "../../utils/formatters";
import { BUSINESS_DATA_CHANGED, notifyBusinessDataChanged } from "../../utils/businessEvents";
import { useWindowEvent } from "../../hooks/useWindowEvent";

const STATUS_TAG = {
  active: { label: "Faol", color: "green" },
  inactive: { label: "Nofaol", color: "default" },
};

export default function TeachersPage() {
  const { businessId, business, plan } = useOutletContext();
  const isEdu = business?.business_type === "education_center";
  const hasEduPortals = Boolean(plan?.has_edu_portals);

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [drawer, setDrawer] = useState({ open: false, record: null });
  const [form] = Form.useForm();
  const [portalOpen, setPortalOpen] = useState(false);
  const [portalTeacherId, setPortalTeacherId] = useState(null);
  const [portalForm] = Form.useForm();

  const load = useCallback(async () => {
    if (!businessId) return;
    setLoading(true);
    try {
      setRows(await getTeachers({ business_id: businessId }));
    } catch {
      message.error("Ustozlar yuklanmadi.");
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

  const openCreate = () => {
    form.resetFields();
    form.setFieldsValue({ status: "active", sort_order: 0 });
    setDrawer({ open: true, record: null });
  };

  const openEdit = (row) => {
    form.setFieldsValue({
      ...row,
      telegram_username: row.telegram_username?.replace(/^@/, "") || "",
    });
    setDrawer({ open: true, record: row });
  };

  const save = async () => {
    const v = await form.validateFields();
    const tg = v.telegram_username?.trim();
    const payload = {
      ...v,
      telegram_username: tg ? (tg.startsWith("@") ? tg.slice(1) : tg) : "",
    };
    try {
      if (drawer.record) {
        await updateTeacher(drawer.record.id, payload);
        message.success("Saqlandi.");
      } else {
        await createTeacher({ ...payload, business: businessId });
        message.success("Ustoz qo‘shildi.");
      }
      setDrawer({ open: false, record: null });
      load();
      notifyBusinessDataChanged();
    } catch (e) {
      message.error(e.response?.data?.detail || "Xatolik.");
    }
  };

  const remove = async (row) => {
    try {
      await deleteTeacher(row.id);
      message.success("O‘chirildi.");
      load();
      notifyBusinessDataChanged();
    } catch {
      message.error("O‘chirib bo‘lmadi.");
    }
  };

  const columns = useMemo(
    () => [
      { title: "Tartib", dataIndex: "sort_order", width: 72 },
      {
        title: "F.I.Sh.",
        dataIndex: "full_name",
        render: (text, row) => <Link to={`/business/teachers/${row.id}`}>{text}</Link>,
      },
      { title: "Telefon", dataIndex: "phone", render: formatPhone },
      { title: "Fanlar / yo‘nalish", dataIndex: "subjects", ellipsis: true, render: (v) => v || "—" },
      {
        title: "Holat",
        dataIndex: "status",
        width: 100,
        render: (s) => {
          const t = STATUS_TAG[s] || { label: s, color: "default" };
          return <Tag color={t.color}>{t.label}</Tag>;
        },
      },
      { title: "Guruhlar", dataIndex: "groups_count", width: 90 },
      { title: "O‘quvchilar", dataIndex: "students_in_groups_count", width: 110 },
      ...(hasEduPortals
        ? [
            {
              title: "Kabinet login",
              key: "portal",
              width: 140,
              render: (_, row) =>
                row.portal_username ? (
                  <Typography.Text copyable>{row.portal_username}</Typography.Text>
                ) : (
                  <Button
                    size="small"
                    onClick={() => {
                      setPortalTeacherId(row.id);
                      portalForm.resetFields();
                      setPortalOpen(true);
                    }}
                  >
                    Yaratish
                  </Button>
                ),
            },
          ]
        : []),
      {
        title: "",
        key: "act",
        width: 200,
        render: (_, row) => (
          <Space wrap>
            <Link to={`/business/teachers/${row.id}`}>Profil</Link>
            <Button type="link" size="small" onClick={() => openEdit(row)}>
              Tahrirlash
            </Button>
            <Popconfirm title="Ustoz o‘chirilsinmi? Guruhlardan ham uziladi." onConfirm={() => remove(row)}>
              <Button type="link" size="small" danger>
                O‘chirish
              </Button>
            </Popconfirm>
          </Space>
        ),
      },
    ],
    [hasEduPortals],
  );

  if (!isEdu) {
    return <Navigate to="/business/dashboard" replace />;
  }
  if (!businessId) return null;
  if (loading && !rows.length) return <LoadingScreen />;

  return (
    <>
      <PageHeader
        title="Ustozlar"
        description="Ustoz profillari. Kabinet loginlari Business tarif va undan yuqorida."
        extra={
          <Button type="primary" onClick={openCreate}>
            Ustoz qo‘shish
          </Button>
        }
      />

      {rows.length === 0 ? (
        <EmptyState title="Hozircha ustoz yo‘q" description="Birinchi ustoz profilini yarating." />
      ) : (
        <Card size="small">
          <Table rowKey="id" dataSource={rows} pagination={false} columns={columns} />
        </Card>
      )}

      <Drawer
        title={drawer.record ? "Ustozni tahrirlash" : "Yangi ustoz"}
        open={drawer.open}
        onClose={() => setDrawer({ open: false, record: null })}
        width={440}
        extra={
          <Space>
            <Button onClick={() => setDrawer({ open: false, record: null })}>Bekor</Button>
            <Button type="primary" onClick={save}>
              Saqlash
            </Button>
          </Space>
        }
      >
        <Form form={form} layout="vertical">
          <Form.Item name="full_name" label="To‘liq ism" rules={[{ required: true }]}>
            <Input placeholder="Masalan: Aliyeva Malika" />
          </Form.Item>
          <Form.Item name="phone" label="Telefon">
            <Input />
          </Form.Item>
          <Form.Item name="email" label="Email">
            <Input type="email" />
          </Form.Item>
          <Form.Item name="telegram_username" label="Telegram (@siz)">
            <Input placeholder="username" />
          </Form.Item>
          <Form.Item name="subjects" label="Fanlar / yo‘nalish">
            <Input placeholder="Masalan: Ingliz tili, IELTS" />
          </Form.Item>
          <Form.Item name="bio" label="Bio / tajriba">
            <Input.TextArea rows={4} placeholder="Qisqacha ma’lumot, sertifikatlar…" />
          </Form.Item>
          <Form.Item name="status" label="Holat" initialValue="active">
            <Select
              options={[
                { value: "active", label: "Faol" },
                { value: "inactive", label: "Nofaol" },
              ]}
            />
          </Form.Item>
          <Form.Item name="sort_order" label="Tartib raqami" initialValue={0}>
            <InputNumber min={0} style={{ width: "100%" }} />
          </Form.Item>
        </Form>
      </Drawer>

      {hasEduPortals ? (
      <Modal
        title="Ustoz kabineti — login va parol"
        open={portalOpen}
        onCancel={() => {
          setPortalOpen(false);
          setPortalTeacherId(null);
        }}
        okText="Yaratish"
        onOk={async () => {
          const v = await portalForm.validateFields();
          try {
            await createEduPortalUser({
              kind: "teacher",
              teacher_id: portalTeacherId,
              username: v.username,
              password: v.password,
            });
            message.success("Kabinet yaratildi. Ustoz /login orqali kiradi.");
            setPortalOpen(false);
            setPortalTeacherId(null);
            load();
          } catch (e) {
            message.error(e.response?.data?.detail || "Xatolik.");
          }
        }}
      >
        <Form form={portalForm} layout="vertical">
          <Form.Item name="username" label="Login" rules={[{ required: true }]}>
            <Input autoComplete="off" />
          </Form.Item>
          <Form.Item name="password" label="Parol" rules={[{ required: true, min: 6 }]}>
            <Input.Password autoComplete="new-password" />
          </Form.Item>
        </Form>
      </Modal>
      ) : null}
    </>
  );
}
