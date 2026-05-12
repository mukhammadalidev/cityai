import {
  Button,
  Card,
  Col,
  DatePicker,
  Drawer,
  Form,
  Input,
  Modal,
  Popconfirm,
  Row,
  Select,
  Space,
  Statistic,
  Table,
  Tabs,
  Tag,
  Typography,
  message,
} from "antd";
import dayjs from "dayjs";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, Navigate, useOutletContext, useSearchParams } from "react-router-dom";
import PageHeader from "../../components/ui/PageHeader";
import LoadingScreen from "../../components/ui/LoadingScreen";
import EmptyState from "../../components/ui/EmptyState";
import { createEduPortalUser } from "../../services/authService";
import { getItems } from "../../services/itemService";
import { getStudentGroups } from "../../services/studentGroupService";
import {
  bulkAttendanceDay,
  createStudent,
  deleteStudent,
  getAttendanceStats,
  getStudentAttendance,
  getStudents,
  updateStudent,
} from "../../services/studentService";
import { formatDateTime, formatPhone } from "../../utils/formatters";
import { BUSINESS_DATA_CHANGED, notifyBusinessDataChanged } from "../../utils/businessEvents";
import { tuitionPaymentTagProps } from "../../utils/tuitionPayment";
import { useWindowEvent } from "../../hooks/useWindowEvent";

const STUDENT_STATUS = {
  active: { label: "Faol", color: "green" },
  paused: { label: "Tanaffus", color: "orange" },
  graduated: { label: "Bitirgan", color: "default" },
};

const ATT_OPTIONS = [
  { value: "present", label: "Keldi" },
  { value: "absent", label: "Kelmadi" },
  { value: "late", label: "Kechikdi" },
  { value: "excused", label: "Sababli" },
];

export default function StudentsPage() {
  const { businessId, business, plan } = useOutletContext();
  const isEdu = business?.business_type === "education_center";
  const hasEduAttendance = Boolean(plan?.has_edu_attendance);
  const hasEduPortals = Boolean(plan?.has_edu_portals);
  const [searchParams, setSearchParams] = useSearchParams();
  const groupFromUrl = searchParams.get("group");
  const tabFromUrl = searchParams.get("tab");

  const [tab, setTab] = useState(() => {
    if (typeof window === "undefined") return "students";
    const t = new URLSearchParams(window.location.search).get("tab");
    return t === "attendance" ? "attendance" : "students";
  });
  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [groups, setGroups] = useState([]);
  const [groupFilter, setGroupFilter] = useState();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [month, setMonth] = useState(() => dayjs());
  const [selectedDay, setSelectedDay] = useState(() => dayjs());
  const [statusByStudent, setStatusByStudent] = useState({});
  const [savingDay, setSavingDay] = useState(false);
  const [drawer, setDrawer] = useState({ open: false, record: null });
  const [form] = Form.useForm();
  const [portalOpen, setPortalOpen] = useState(false);
  const [portalStudentId, setPortalStudentId] = useState(null);
  const [portalForm] = Form.useForm();
  const [parentPortalOpen, setParentPortalOpen] = useState(false);
  const [parentPortalStudentId, setParentPortalStudentId] = useState(null);
  const [parentPortalForm] = Form.useForm();

  useEffect(() => {
    if (groupFromUrl) {
      setGroupFilter(groupFromUrl === "none" ? "none" : groupFromUrl);
    }
  }, [groupFromUrl]);

  useEffect(() => {
    if (tabFromUrl === "attendance" && hasEduAttendance) {
      setTab("attendance");
    }
    if (tabFromUrl === "students") {
      setTab("students");
    }
  }, [tabFromUrl, hasEduAttendance]);

  const loadStudents = useCallback(async () => {
    if (!businessId) return;
    setLoading(true);
    try {
      const params = { business_id: businessId };
      if (groupFilter) {
        params.group_id = groupFilter;
      }
      const itemParams = { business_id: businessId };
      if (business?.business_type === "education_center") itemParams.education_catalog_kind = "course";
      const [list, items, grp] = await Promise.all([
        getStudents(params),
        getItems(itemParams),
        getStudentGroups({ business_id: businessId }),
      ]);
      setStudents(list);
      setGroups(grp);
      setCourses(items.filter((i) => i.status === "active" || !i.status));
    } catch {
      message.error("O‘quvchilar yuklanmadi.");
      setStudents([]);
    } finally {
      setLoading(false);
    }
  }, [businessId, business?.business_type, groupFilter]);

  const loadStats = useCallback(async () => {
    if (!businessId || !hasEduAttendance) {
      setStats(null);
      return;
    }
    setStatsLoading(true);
    try {
      const data = await getAttendanceStats({
        business_id: businessId,
        month: month.format("YYYY-MM"),
      });
      setStats(data);
    } catch {
      setStats(null);
    } finally {
      setStatsLoading(false);
    }
  }, [businessId, month, hasEduAttendance]);

  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useWindowEvent("business-changed", loadStudents);
  useWindowEvent(BUSINESS_DATA_CHANGED, loadStudents);

  useEffect(() => {
    if (!hasEduAttendance && tab === "attendance") {
      setTab("students");
      setSearchParams(
        (prev) => {
          const p = new URLSearchParams(prev);
          p.delete("tab");
          return p;
        },
        { replace: true },
      );
    }
  }, [hasEduAttendance, tab, setSearchParams]);

  const onTabChange = (key) => {
    setTab(key);
    setSearchParams(
      (prev) => {
        const p = new URLSearchParams(prev);
        if (key === "attendance") {
          p.set("tab", "attendance");
        } else {
          p.delete("tab");
        }
        return p;
      },
      { replace: true },
    );
  };

  const loadDayStatuses = useCallback(async () => {
    if (!hasEduAttendance || !businessId || !students.length) {
      setStatusByStudent({});
      return;
    }
    const d = selectedDay.format("YYYY-MM-DD");
    try {
      const recs = await getStudentAttendance({ business_id: businessId, date: d });
      const next = {};
      for (const s of students) {
        const r = recs.find((x) => {
          const sid = x.student_id ?? x.student;
          return Number(sid) === Number(s.id);
        });
        next[s.id] = r?.status ?? "present";
      }
      setStatusByStudent(next);
    } catch {
      message.error("Davomat yuklanmadi.");
    }
  }, [businessId, students, selectedDay, hasEduAttendance]);

  useEffect(() => {
    loadDayStatuses();
  }, [loadDayStatuses]);

  const openCreate = () => {
    form.resetFields();
    form.setFieldsValue({ status: "active" });
    setDrawer({ open: true, record: null });
  };

  const openEdit = (row) => {
    form.setFieldsValue({
      ...row,
      course: row.course ?? undefined,
      group: row.group ?? undefined,
      tuition_paid_until: row.tuition_paid_until ? dayjs(row.tuition_paid_until) : undefined,
      tuition_payment_note: row.tuition_payment_note || "",
    });
    setDrawer({ open: true, record: row });
  };

  const saveStudent = async () => {
    const v = await form.validateFields();
    const payload = {
      ...v,
      course: v.course ?? null,
      group: v.group ?? null,
      tuition_paid_until: v.tuition_paid_until ? v.tuition_paid_until.format("YYYY-MM-DD") : null,
      tuition_payment_note: (v.tuition_payment_note || "").trim(),
    };
    try {
      if (drawer.record) {
        await updateStudent(drawer.record.id, payload);
        message.success("Yangilandi.");
      } else {
        await createStudent({ ...payload, business: businessId });
        message.success("Qo‘shildi.");
      }
      setDrawer({ open: false, record: null });
      loadStudents();
      loadStats();
      notifyBusinessDataChanged();
    } catch (e) {
      message.error(e.response?.data?.detail || "Xatolik.");
    }
  };

  const removeStudent = async (row) => {
    try {
      await deleteStudent(row.id);
      message.success("O‘chirildi.");
      loadStudents();
      loadStats();
      notifyBusinessDataChanged();
    } catch {
      message.error("O‘chirib bo‘lmadi.");
    }
  };

  const saveDayAttendance = async () => {
    if (!hasEduAttendance || !businessId || !students.length) return;
    setSavingDay(true);
    try {
      const rows = students.map((s) => ({
        student_id: s.id,
        status: statusByStudent[s.id] || "present",
      }));
      await bulkAttendanceDay({
        business_id: businessId,
        date: selectedDay.format("YYYY-MM-DD"),
        rows,
      });
      message.success("Davomat saqlandi.");
      loadStats();
      loadDayStatuses();
      notifyBusinessDataChanged();
    } catch (e) {
      message.error(e.response?.data?.detail || "Saqlashda xatolik.");
    } finally {
      setSavingDay(false);
    }
  };

  const courseOptions = useMemo(
    () => courses.map((c) => ({ value: c.id, label: c.title })),
    [courses],
  );

  const filterGroupOptions = useMemo(
    () => [
      ...groups.map((g) => ({ value: String(g.id), label: g.name })),
      { value: "none", label: "Faqat guruhsiz" },
    ],
    [groups],
  );

  const formGroupOptions = useMemo(() => groups.map((g) => ({ value: g.id, label: g.name })), [groups]);

  const studentColumns = useMemo(
    () => [
      {
        title: "Ism",
        dataIndex: "name",
        render: (text, row) => <Link to={`/business/students/${row.id}`}>{text}</Link>,
      },
      { title: "Telefon", dataIndex: "phone", render: formatPhone },
      { title: "Kurs", dataIndex: "course_title", render: (v) => v || "—" },
      { title: "Guruh", dataIndex: "group_name", render: (v) => v || "—" },
      {
        title: "Holat",
        dataIndex: "status",
        render: (v) => STUDENT_STATUS[v]?.label ?? v,
      },
      {
        title: "Abonement",
        key: "tuition",
        width: 130,
        render: (_, row) => {
          const p = tuitionPaymentTagProps(row);
          return <Tag color={p.color}>{p.children}</Tag>;
        },
      },
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
                      setPortalStudentId(row.id);
                      portalForm.resetFields();
                      setPortalOpen(true);
                    }}
                  >
                    Yaratish
                  </Button>
                ),
            },
            {
              title: "Ota-ona",
              key: "parent_portal",
              width: 168,
              render: (_, row) => (
                <Space direction="vertical" size={4}>
                  <Space wrap size={4}>
                    {(row.parent_portal_users ||
                      (row.parent_portal_usernames || []).map((u) => ({ username: u, last_login: null }))).map(
                      (p) => (
                        <Typography.Text key={p.username} copyable style={{ fontSize: 12 }}>
                          {p.username}
                          {p.last_login ? ` — ${formatDateTime(p.last_login)}` : " — —"}
                        </Typography.Text>
                      )
                    )}
                  </Space>
                  <Button
                    size="small"
                    onClick={() => {
                      setParentPortalStudentId(row.id);
                      parentPortalForm.resetFields();
                      setParentPortalOpen(true);
                    }}
                  >
                    Ota-ona login
                  </Button>
                </Space>
              ),
            },
          ]
        : []),
      {
        title: "",
        key: "act",
        width: 220,
        render: (_, row) => (
          <Space>
            <Link to={`/business/students/${row.id}`}>Profil</Link>
            <Button type="link" size="small" onClick={() => openEdit(row)}>
              Tahrirlash
            </Button>
            <Popconfirm title="O‘chirilsinmi?" onConfirm={() => removeStudent(row)}>
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
  if (loading && !students.length) return <LoadingScreen />;

  return (
    <>
      <PageHeader
        title="O‘quvchilar va davomat"
        description="CRM: ro‘yxat. Davomat va kabinetlar tarifga qarab (Start — davomat+materiallar; Business+ — kabinetlar)."
        extra={
          <Link to="/business/student-groups">
            <Button>O‘quv guruhlari</Button>
          </Link>
        }
      />

      <Space wrap style={{ marginBottom: 16 }}>
        <span>Guruh bo‘yicha:</span>
        <Select
          allowClear
          placeholder="Barcha guruhlar"
          style={{ minWidth: 240 }}
          value={groupFilter}
          onChange={(v) => setGroupFilter(v)}
          options={filterGroupOptions}
        />
      </Space>

      {hasEduAttendance ? (
        <Card size="small" style={{ marginBottom: 16 }} loading={statsLoading}>
          <Row gutter={[16, 16]} align="middle">
            <Col xs={24} sm={12} md={6}>
              <Statistic title="O‘quvchilar" value={stats?.totals?.students ?? students.length} />
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Statistic
                title="Oylik davomat yozuvlari"
                value={stats?.totals?.marked_records ?? "—"}
              />
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Statistic
                title="Kelgan / jami belgilangan"
                value={
                  stats?.totals?.marked_records != null
                    ? `${stats.totals.present_records ?? 0} / ${stats.totals.marked_records}`
                    : "—"
                }
              />
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Space direction="vertical" size={0}>
                <span style={{ color: "rgba(0,0,0,0.45)", fontSize: 14 }}>Oylik o‘rtacha davomat</span>
                <Statistic
                  value={
                    stats?.totals?.avg_rate_percent != null
                      ? `${stats.totals.avg_rate_percent}%`
                      : "—"
                  }
                />
              </Space>
              <DatePicker
                picker="month"
                value={month}
                onChange={(v) => v && setMonth(v)}
                format="YYYY-MM"
                style={{ marginTop: 8 }}
              />
            </Col>
          </Row>
        </Card>
      ) : (
        <Card size="small" style={{ marginBottom: 16 }}>
          <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
            Davomat moduli joriy tarifda yo‘q.{" "}
            <Link to="/business/billing">Billing</Link> orqali Start yoki yuqori tarifga o‘ting.
          </Typography.Paragraph>
        </Card>
      )}

      {hasEduAttendance && stats?.by_student?.length ? (
        <Card title="O‘quvchi bo‘yicha oylik ko‘rsatkichlar" size="small" style={{ marginBottom: 16 }}>
          <Table
            size="small"
            rowKey="student_id"
            pagination={false}
            dataSource={stats.by_student}
            columns={[
              {
                title: "Ism",
                dataIndex: "name",
                render: (text, row) => (
                  <Link to={`/business/students/${row.student_id}`}>{text}</Link>
                ),
              },
              { title: "Guruh", dataIndex: "group_name", render: (v) => v || "—" },
              { title: "Kunlar (belgilangan)", dataIndex: "marked_days" },
              { title: "Keldi (+ kechikdi)", dataIndex: "present_days" },
              { title: "Kelmadi", dataIndex: "absent_days" },
              { title: "Sababli", dataIndex: "excused_days" },
              {
                title: "Foiz",
                dataIndex: "rate_percent",
                render: (v) => (v != null ? `${v}%` : "—"),
              },
            ]}
          />
        </Card>
      ) : null}

      <Tabs
        activeKey={tab}
        onChange={onTabChange}
        tabBarExtraContent={
          tab === "students" ? (
            <Button type="primary" onClick={openCreate}>
              O‘quvchi qo‘shish
            </Button>
          ) : null
        }
        items={[
          {
            key: "students",
            label: "O‘quvchilar",
            children:
              students.length === 0 ? (
                <EmptyState title="Hozircha o‘quvchi yo‘q" description="Yangi o‘quvchi qo‘shing." />
              ) : (
                <Table
                  rowKey="id"
                  dataSource={students}
                  pagination={false}
                  columns={studentColumns}
                  scroll={{ x: "max-content" }}
                />
              ),
          },
          ...(hasEduAttendance
            ? [
                {
                  key: "attendance",
                  label: "Kunlik davomat",
                  children: (
                    <Space direction="vertical" style={{ width: "100%" }} size="middle">
                      <Space wrap>
                        <span>Sana:</span>
                        <DatePicker value={selectedDay} onChange={(v) => v && setSelectedDay(v)} />
                        <Button
                          type="primary"
                          onClick={saveDayAttendance}
                          loading={savingDay}
                          disabled={!students.length}
                        >
                          Kun davomatini saqlash
                        </Button>
                      </Space>
                      {!students.length ? (
                        <EmptyState title="Avval o‘quvchi qo‘shing" />
                      ) : (
                        <Table
                          rowKey="id"
                          dataSource={students}
                          pagination={false}
                          scroll={{ x: "max-content" }}
                          columns={[
                            {
                              title: "O‘quvchi",
                              dataIndex: "name",
                              render: (text, row) => <Link to={`/business/students/${row.id}`}>{text}</Link>,
                            },
                            { title: "Guruh", dataIndex: "group_name", render: (v) => v || "—" },
                            {
                              title: "Ota-ona oxirgi kirishi",
                              dataIndex: "parent_portal_last_login",
                              render: (v) => (v ? formatDateTime(v) : "—"),
                            },
                            {
                              title: "Davomat",
                              key: "att",
                              render: (_, row) => (
                                <Select
                                  style={{ minWidth: 140 }}
                                  options={ATT_OPTIONS}
                                  value={statusByStudent[row.id] ?? "present"}
                                  onChange={(v) => setStatusByStudent((prev) => ({ ...prev, [row.id]: v }))}
                                />
                              ),
                            },
                          ]}
                        />
                      )}
                    </Space>
                  ),
                },
              ]
            : []),
        ]}
      />

      <Drawer
        title={drawer.record ? "O‘quvchini tahrirlash" : "Yangi o‘quvchi"}
        open={drawer.open}
        onClose={() => setDrawer({ open: false, record: null })}
        width={520}
        styles={{ body: { paddingBottom: 24 } }}
        extra={
          <Space>
            <Button onClick={() => setDrawer({ open: false, record: null })}>Bekor</Button>
            <Button type="primary" onClick={saveStudent}>
              Saqlash
            </Button>
          </Space>
        }
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="Ism" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="phone" label="Telefon">
            <Input />
          </Form.Item>
          <Form.Item name="course" label="Kurs (ixtiyoriy)">
            <Select allowClear options={courseOptions} placeholder="Tanlang" />
          </Form.Item>
          <Form.Item name="group" label="O‘quv guruhi">
            <Select allowClear options={formGroupOptions} placeholder="Guruhsiz" />
          </Form.Item>
          <Form.Item name="status" label="Holat" initialValue="active">
            <Select
              options={[
                { value: "active", label: "Faol" },
                { value: "paused", label: "Tanaffus" },
                { value: "graduated", label: "Bitirgan" },
              ]}
            />
          </Form.Item>
          <Form.Item name="notes" label="Izoh">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item name="tuition_paid_until" label="Abonement muddati (shu kungacha to‘langan)">
            <DatePicker style={{ width: "100%" }} format="DD.MM.YYYY" allowClear />
          </Form.Item>
          <Form.Item name="tuition_payment_note" label="To‘lov izohi (ota-onaga ko‘rinadi)">
            <Input.TextArea rows={2} maxLength={500} showCount placeholder="Masalan: yanvar uchun qabul qilindi" />
          </Form.Item>
        </Form>
      </Drawer>

      {hasEduPortals ? (
        <>
      <Modal
        title="O‘quvchi kabineti — login va parol"
        open={portalOpen}
        onCancel={() => {
          setPortalOpen(false);
          setPortalStudentId(null);
        }}
        okText="Yaratish"
        onOk={async () => {
          const v = await portalForm.validateFields();
          try {
            await createEduPortalUser({
              kind: "student",
              student_id: portalStudentId,
              username: v.username,
              password: v.password,
            });
            message.success("Kabinet yaratildi. O‘quvchi /login orqali kiradi.");
            setPortalOpen(false);
            setPortalStudentId(null);
            loadStudents();
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

      <Modal
        title="Ota-ona kabineti — login va parol"
        open={parentPortalOpen}
        onCancel={() => {
          setParentPortalOpen(false);
          setParentPortalStudentId(null);
        }}
        okText="Yaratish"
        onOk={async () => {
          const v = await parentPortalForm.validateFields();
          try {
            const body = {
              kind: "parent",
              student_id: parentPortalStudentId,
              username: v.username,
              password: v.password,
            };
            const label = v.parent_display_name?.trim();
            if (label) body.parent_display_name = label;
            await createEduPortalUser(body);
            message.success("Ota-ona kabineti yaratildi. /login orqali kirish mumkin.");
            setParentPortalOpen(false);
            setParentPortalStudentId(null);
            loadStudents();
          } catch (e) {
            message.error(e.response?.data?.detail || "Xatolik.");
          }
        }}
      >
        <Form form={parentPortalForm} layout="vertical">
          <Form.Item
            name="parent_display_name"
            label="Ism (ixtiyoriy, profilda)"
            extra="Bo‘sh qoldirsangiz, farzand ismi + «ota-ona» deb saqlanadi."
          >
            <Input placeholder="Masalan: Ona — Dilnoza" autoComplete="off" />
          </Form.Item>
          <Form.Item name="username" label="Login" rules={[{ required: true }]}>
            <Input autoComplete="off" />
          </Form.Item>
          <Form.Item name="password" label="Parol" rules={[{ required: true, min: 6 }]}>
            <Input.Password autoComplete="new-password" />
          </Form.Item>
        </Form>
      </Modal>
        </>
      ) : null}
    </>
  );
}
