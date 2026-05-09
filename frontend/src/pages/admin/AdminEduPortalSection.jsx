import { Button, Card, Divider, Form, Input, Modal, Space, Table, Typography, message } from "antd";
import { useCallback, useEffect, useState } from "react";
import { createEduPortalUser } from "../../services/authService";
import { getStudents } from "../../services/studentService";
import { getTeachers } from "../../services/teacherService";
import { formatPhone } from "../../utils/formatters";

/**
 * Super admin: o‘quv markaz biznesida ustoz / o‘quvchi / ota-ona uchun login yaratish.
 */
export default function AdminEduPortalSection({ businessId }) {
  const [teachers, setTeachers] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState({ open: false, kind: null, recordId: null });
  const [form] = Form.useForm();

  const load = useCallback(async () => {
    if (!businessId) return;
    setLoading(true);
    try {
      const [t, s] = await Promise.all([
        getTeachers({ business_id: businessId }),
        getStudents({ business_id: businessId }),
      ]);
      setTeachers(t);
      setStudents(s);
    } catch {
      message.error("Ustoz / o‘quvchi ro‘yxati yuklanmadi.");
      setTeachers([]);
      setStudents([]);
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = (kind, recordId) => {
    form.resetFields();
    setModal({ open: true, kind, recordId });
  };

  const closeModal = () => {
    setModal({ open: false, kind: null, recordId: null });
  };

  const submit = async () => {
    const v = await form.validateFields();
    const { kind, recordId } = modal;
    const body = {
      kind,
      username: v.username,
      password: v.password,
    };
    if (kind === "teacher") body.teacher_id = recordId;
    if (kind === "student" || kind === "parent") body.student_id = recordId;
    const label = v.parent_display_name?.trim();
    if (kind === "parent" && label) body.parent_display_name = label;
    try {
      await createEduPortalUser(body);
      message.success("Login yaratildi.");
      closeModal();
      load();
    } catch (e) {
      message.error(e.response?.data?.detail || "Xatolik.");
    }
  };

  const modalTitle =
    modal.kind === "teacher"
      ? "Ustoz kabineti — login va parol"
      : modal.kind === "student"
        ? "O‘quvchi kabineti — login va parol"
        : modal.kind === "parent"
          ? "Ota-ona kabineti — login va parol"
          : "";

  return (
    <>
      <Card
        title="Ta’lim kabinetlari (login / parol)"
        loading={loading}
        style={{ marginTop: 16 }}
      >
        <Typography.Paragraph type="secondary" style={{ marginBottom: 16 }}>
          Platforma admini sifatida bu markaz uchun ustoz, o‘quvchi va ota-ona kabinetlarini yaratishingiz
          mumkin (xuddi biznes kabinetidagi kabi API).
        </Typography.Paragraph>

        <Typography.Title level={5}>Ustozlar</Typography.Title>
        <Table
          size="small"
          rowKey="id"
          pagination={false}
          dataSource={teachers}
          locale={{ emptyText: "Ustoz yo‘q" }}
          columns={[
            { title: "F.I.Sh.", dataIndex: "full_name" },
            { title: "Telefon", dataIndex: "phone", render: formatPhone },
            {
              title: "Kabinet login",
              key: "portal",
              width: 200,
              render: (_, row) =>
                row.portal_username ? (
                  <Typography.Text copyable>{row.portal_username}</Typography.Text>
                ) : (
                  <Button size="small" type="primary" onClick={() => openCreate("teacher", row.id)}>
                    Login yaratish
                  </Button>
                ),
            },
          ]}
        />

        <Divider />

        <Typography.Title level={5}>O‘quvchilar</Typography.Title>
        <Table
          size="small"
          rowKey="id"
          pagination={{ pageSize: 15 }}
          dataSource={students}
          locale={{ emptyText: "O‘quvchi yo‘q" }}
          columns={[
            { title: "Ism", dataIndex: "name" },
            { title: "Telefon", dataIndex: "phone", render: formatPhone },
            {
              title: "O‘quvchi kabineti",
              key: "st_portal",
              width: 180,
              render: (_, row) =>
                row.portal_username ? (
                  <Typography.Text copyable>{row.portal_username}</Typography.Text>
                ) : (
                  <Button size="small" onClick={() => openCreate("student", row.id)}>
                    Yaratish
                  </Button>
                ),
            },
            {
              title: "Ota-ona",
              key: "par",
              width: 220,
              render: (_, row) => (
                <Space direction="vertical" size={4}>
                  <Space wrap size={4}>
                    {(row.parent_portal_usernames || []).map((u) => (
                      <Typography.Text key={u} copyable style={{ fontSize: 12 }}>
                        {u}
                      </Typography.Text>
                    ))}
                  </Space>
                  <Button size="small" onClick={() => openCreate("parent", row.id)}>
                    Ota-ona login
                  </Button>
                </Space>
              ),
            },
          ]}
        />
      </Card>

      <Modal title={modalTitle} open={modal.open} onCancel={closeModal} onOk={submit} okText="Yaratish" destroyOnClose>
        <Form form={form} layout="vertical">
          {modal.kind === "parent" ? (
            <Form.Item
              name="parent_display_name"
              label="Ota-ona ismi (ixtiyoriy)"
              extra="Bo‘sh qoldirsangiz, farzand ismi + «ota-ona» deb saqlanadi."
            >
              <Input placeholder="Masalan: Ona — Dilnoza" autoComplete="off" />
            </Form.Item>
          ) : null}
          <Form.Item name="username" label="Login" rules={[{ required: true }]}>
            <Input autoComplete="off" />
          </Form.Item>
          <Form.Item name="password" label="Parol" rules={[{ required: true, min: 6 }]}>
            <Input.Password autoComplete="new-password" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
