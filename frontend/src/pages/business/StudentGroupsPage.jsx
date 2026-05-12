import { Button, Card, Drawer, Form, Input, InputNumber, Popconfirm, Select, Space, Table, Typography, message } from "antd";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, Navigate, useOutletContext } from "react-router-dom";
import PageHeader from "../../components/ui/PageHeader";
import LoadingScreen from "../../components/ui/LoadingScreen";
import EmptyState from "../../components/ui/EmptyState";
import { getItems } from "../../services/itemService";
import {
  createStudentGroup,
  deleteStudentGroup,
  getStudentGroups,
  updateStudentGroup,
} from "../../services/studentGroupService";
import { getTeachers } from "../../services/teacherService";
import { BUSINESS_DATA_CHANGED, notifyBusinessDataChanged } from "../../utils/businessEvents";
import { useWindowEvent } from "../../hooks/useWindowEvent";

export default function StudentGroupsPage() {
  const { businessId, business } = useOutletContext();
  const isEdu = business?.business_type === "education_center";

  const [rows, setRows] = useState([]);
  const [courses, setCourses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [drawer, setDrawer] = useState({ open: false, record: null });
  const [form] = Form.useForm();

  const load = useCallback(async () => {
    if (!businessId) return;
    setLoading(true);
    try {
      const itemParams = { business_id: businessId };
      if (business?.business_type === "education_center") itemParams.education_catalog_kind = "course";
      const [list, items, tlist] = await Promise.all([
        getStudentGroups({ business_id: businessId }),
        getItems(itemParams),
        getTeachers({ business_id: businessId }),
      ]);
      setRows(list);
      setTeachers(tlist);
      setCourses(items.filter((i) => i.status === "active" || !i.status));
    } catch {
      message.error("Guruhlar yuklanmadi.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [businessId, business?.business_type]);

  useEffect(() => {
    load();
  }, [load]);

  useWindowEvent("business-changed", load);
  useWindowEvent(BUSINESS_DATA_CHANGED, load);

  const courseOptions = useMemo(
    () => courses.map((c) => ({ value: c.id, label: c.title })),
    [courses],
  );

  const teacherOptions = useMemo(
    () => teachers.map((t) => ({ value: t.id, label: t.full_name })),
    [teachers],
  );

  const openCreate = () => {
    form.resetFields();
    form.setFieldsValue({ sort_order: 0 });
    setDrawer({ open: true, record: null });
  };

  const openEdit = (row) => {
    form.setFieldsValue({
      ...row,
      course: row.course ?? undefined,
      teacher: row.teacher ?? undefined,
    });
    setDrawer({ open: true, record: row });
  };

  const save = async () => {
    const v = await form.validateFields();
    const payload = { ...v, business: businessId, course: v.course ?? null, teacher: v.teacher ?? null };
    try {
      if (drawer.record) {
        await updateStudentGroup(drawer.record.id, payload);
        message.success("Guruh yangilandi.");
      } else {
        await createStudentGroup(payload);
        message.success("Guruh yaratildi.");
      }
      setDrawer({ open: false, record: null });
      load();
      notifyBusinessDataChanged();
    } catch (e) {
      message.error(e.response?.data?.detail || Object.values(e.response?.data || {})[0]?.[0] || "Xatolik.");
    }
  };

  const remove = async (row) => {
    try {
      await deleteStudentGroup(row.id);
      message.success("O‘chirildi.");
      load();
      notifyBusinessDataChanged();
    } catch {
      message.error("O‘chirib bo‘lmadi.");
    }
  };

  if (!isEdu) {
    return <Navigate to="/business/dashboard" replace />;
  }
  if (!businessId) return null;
  if (loading && !rows.length) return <LoadingScreen />;

  return (
    <>
      <PageHeader
        title="O‘quv guruhlari"
        description="Guruhga kurs va asosiy ustozni biriktiring; o‘quvchilar alohida ro‘yxatdan guruhga ulanadi."
        extra={
          <Button type="primary" onClick={openCreate}>
            Guruh yaratish
          </Button>
        }
      />

      {rows.length === 0 ? (
        <EmptyState title="Hozircha guruh yo‘q" description="Birinchi o‘quv guruhini yarating." />
      ) : (
        <Card size="small">
          <Table
            rowKey="id"
            dataSource={rows}
            pagination={false}
            columns={[
              { title: "Tartib", dataIndex: "sort_order", width: 80 },
              { title: "Guruh nomi", dataIndex: "name" },
              {
                title: "Asosiy kurs",
                key: "course",
                render: (_, r) => {
                  const c = courses.find((x) => x.id === r.course);
                  return c?.title || "—";
                },
              },
              {
                title: "Ustoz",
                key: "teacher",
                render: (_, r) =>
                  r.teacher ? (
                    <Link to={`/business/teachers/${r.teacher}`}>{r.teacher_name || "Profil"}</Link>
                  ) : (
                    r.teacher_name || "—"
                  ),
              },
              { title: "O‘quvchilar", dataIndex: "student_count", width: 110 },
              {
                title: "",
                key: "act",
                width: 220,
                render: (_, row) => (
                  <Space wrap>
                    <Link to={`/business/students?group=${row.id}`}>Ro‘yxat</Link>
                    <Link to={`/business/students?group=${row.id}&tab=attendance`}>Davomat</Link>
                    <Button type="link" size="small" onClick={() => openEdit(row)}>
                      Tahrirlash
                    </Button>
                    <Popconfirm title="Guruh o‘chirilsinmi? O‘quvchilar guruhsiz qoladi." onConfirm={() => remove(row)}>
                      <Button type="link" size="small" danger>
                        O‘chirish
                      </Button>
                    </Popconfirm>
                  </Space>
                ),
              },
            ]}
          />
        </Card>
      )}

      <Drawer
        title={drawer.record ? "Guruhni tahrirlash" : "Yangi guruh"}
        open={drawer.open}
        onClose={() => setDrawer({ open: false, record: null })}
        width={420}
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
          <Form.Item name="name" label="Guruh nomi" rules={[{ required: true }]}>
            <Input placeholder="Masalan: Ingliz tili A2 — 1-guruh" />
          </Form.Item>
          <Form.Item name="description" label="Tavsif">
            <Input.TextArea rows={3} placeholder="Vaqt, o‘qituvchi, izoh…" />
          </Form.Item>
          <Form.Item name="course" label="Asosiy kurs (ixtiyoriy)">
            <Select allowClear options={courseOptions} placeholder="Katalogdan kurs" />
          </Form.Item>
          <Form.Item name="teacher" label="Asosiy ustoz">
            <Select allowClear options={teacherOptions} placeholder="Ustoz profilidan tanlang" />
          </Form.Item>
          <Form.Item name="sort_order" label="Tartib raqami" initialValue={0}>
            <InputNumber min={0} style={{ width: "100%" }} />
          </Form.Item>
        </Form>
      </Drawer>

      <Typography.Paragraph type="secondary" style={{ marginTop: 16 }}>
        O‘quvchini guruhga bog‘lash:{" "}
        <Link to="/business/students">O‘quvchilar va davomat</Link> → «Guruh». Ustozlar:{" "}
        <Link to="/business/teachers">Ustozlar</Link>.
      </Typography.Paragraph>
    </>
  );
}
