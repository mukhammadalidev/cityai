import { CrownOutlined, TrophyOutlined } from "@ant-design/icons";
import {
  Avatar,
  Button,
  Card,
  Col,
  DatePicker,
  Divider,
  Empty,
  Form,
  Input,
  InputNumber,
  List,
  Modal,
  Popconfirm,
  Progress,
  Row,
  Select,
  Space,
  Spin,
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
import { getStudentGroups } from "../../services/studentGroupService";
import {
  createStudentRating,
  deleteStudentRating,
  getRatingLeaderboard,
  getStudentRatings,
  updateStudentRating,
} from "../../services/studentRatingService";
import { getStudents } from "../../services/studentService";
import { BUSINESS_DATA_CHANGED, notifyBusinessDataChanged } from "../../utils/businessEvents";
import { useWindowEvent } from "../../hooks/useWindowEvent";

const PODIUM = {
  1: {
    h: 168,
    gradient: "linear-gradient(165deg, #fff4d6 0%, #f0c14b 45%, #d4a017 100%)",
    border: "1px solid rgba(212,160,23,0.45)",
    icon: <CrownOutlined style={{ fontSize: 22, color: "#ad7d00" }} />,
    shadow: "0 12px 28px rgba(212, 160, 23, 0.28)",
  },
  2: {
    h: 132,
    gradient: "linear-gradient(165deg, #f4f6f9 0%, #d8dee8 55%, #aeb8c6 100%)",
    border: "1px solid rgba(120, 130, 150, 0.35)",
    icon: <TrophyOutlined style={{ fontSize: 18, color: "#6b7280" }} />,
    shadow: "0 8px 20px rgba(100, 110, 130, 0.18)",
  },
  3: {
    h: 112,
    gradient: "linear-gradient(165deg, #fbdfd0 0%, #d4a27a 50%, #9a6b3f 100%)",
    border: "1px solid rgba(154, 107, 63, 0.4)",
    icon: <TrophyOutlined style={{ fontSize: 16, color: "#7a4e2e" }} />,
    shadow: "0 8px 18px rgba(154, 107, 63, 0.2)",
  },
};

function scoreStrokeColor(p) {
  if (p == null) return "#d9d9d9";
  if (p >= 85) return "#52c41a";
  if (p >= 70) return "#faad14";
  if (p >= 50) return "#1677ff";
  return "#ff4d4f";
}

function RankBadge({ rank }) {
  if (rank == null) return <Tag>—</Tag>;
  const colors = { 1: "gold", 2: "default", 3: "orange" };
  const c = colors[rank] || "blue";
  return (
    <Tag color={c} style={{ margin: 0, fontWeight: 700, minWidth: 36, textAlign: "center" }}>
      #{rank}
    </Tag>
  );
}

function LeaderboardVisual({ leaderboard, month }) {
  if (!leaderboard) return null;
  const rows = leaderboard.rows || [];
  const ranked = rows.filter((r) => r.rank != null).sort((a, b) => a.rank - b.rank);
  const ungraded = rows.filter((r) => r.avg_points == null);
  const top3Places = [2, 1, 3].map((place) => ranked.find((r) => r.rank === place)).filter(Boolean);
  const rest = ranked.filter((r) => r.rank > 3);

  const monthLabel = month ? month.format("YYYY-MM") : "";

  if (!ranked.length && !ungraded.length) {
    return <Empty description="Bu oy va filtr bo‘yicha o‘quvchi yo‘q" />;
  }

  return (
    <div>
      <Typography.Paragraph type="secondary" style={{ marginBottom: 16 }}>
        O‘rtacha ball bo‘yicha tartib. Faqat tanlangan oyda kamida bitta bahosi bor o‘quvchilar reytingga kiradi.
        {monthLabel ? ` · Oy: ${monthLabel}` : ""}
      </Typography.Paragraph>

      {ranked.length > 0 ? (
        <>
          <Typography.Title level={5} style={{ marginBottom: 12 }}>
            <TrophyOutlined style={{ marginRight: 8 }} />
            Yetakchilar
          </Typography.Title>
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "center",
              gap: 14,
              marginBottom: 28,
              flexWrap: "wrap",
            }}
          >
            {top3Places.map((row) => {
              const place = row.rank;
              const cfg = PODIUM[place] || PODIUM[3];
              return (
                <div
                  key={row.student_id}
                  style={{
                    width: place === 1 ? 200 : 168,
                    minHeight: cfg.h,
                    background: cfg.gradient,
                    border: cfg.border,
                    borderRadius: 16,
                    boxShadow: cfg.shadow,
                    padding: "16px 14px",
                    textAlign: "center",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "flex-end",
                  }}
                >
                  <div style={{ marginBottom: 8 }}>{cfg.icon}</div>
                  <Avatar
                    size={place === 1 ? 48 : 40}
                    style={{
                      backgroundColor: "rgba(255,255,255,0.85)",
                      color: "#1f2937",
                      fontWeight: 700,
                      marginBottom: 8,
                    }}
                  >
                    {place}
                  </Avatar>
                  <Typography.Text strong ellipsis style={{ maxWidth: "100%", display: "block" }}>
                    {row.name}
                  </Typography.Text>
                  <Typography.Text type="secondary" ellipsis style={{ fontSize: 12, display: "block", maxWidth: "100%" }}>
                    {row.group_name || "Guruhsiz"}
                  </Typography.Text>
                  <Typography.Title level={3} style={{ margin: "10px 0 0", color: "#111827" }}>
                    {row.avg_points}
                  </Typography.Title>
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    o‘rtacha ball · {row.ratings_count} baho
                  </Typography.Text>
                  <div style={{ width: "100%", marginTop: 10 }}>
                    <Progress
                      percent={row.avg_points}
                      size="small"
                      showInfo={false}
                      strokeColor={scoreStrokeColor(row.avg_points)}
                      trailColor="rgba(255,255,255,0.45)"
                    />
                  </div>
                  <Link to={`/business/students/${row.student_id}`} style={{ marginTop: 10, fontSize: 13 }}>
                    Profil
                  </Link>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Bu oyda bahosi bor o‘quvchi yo‘q" style={{ marginBottom: 24 }} />
      )}

      {rest.length > 0 ? (
        <>
          <Divider orientation="left">Boshqa o‘rinlar</Divider>
          <List
            dataSource={rest}
            renderItem={(row) => (
              <List.Item
                actions={[
                  <Link key="p" to={`/business/students/${row.student_id}`}>
                    Profil
                  </Link>,
                ]}
              >
                <List.Item.Meta
                  avatar={<RankBadge rank={row.rank} />}
                  title={
                    <Space>
                      <span>{row.name}</span>
                      {row.group_name ? <Tag>{row.group_name}</Tag> : null}
                    </Space>
                  }
                  description={
                    <div style={{ maxWidth: 420 }}>
                      <Progress
                        percent={row.avg_points}
                        format={() => `${row.avg_points} ball`}
                        strokeColor={scoreStrokeColor(row.avg_points)}
                        size="small"
                      />
                      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                        {row.ratings_count} ta baho
                      </Typography.Text>
                    </div>
                  }
                />
              </List.Item>
            )}
          />
        </>
      ) : null}

      {ungraded.length > 0 ? (
        <>
          <Divider orientation="left" plain>
            Bu oyda hali baholanmagan
          </Divider>
          <Typography.Text type="secondary" style={{ display: "block", marginBottom: 8 }}>
            Quyidagi o‘quvchilarning tanlangan oyda bahosi kiritilmagan.
          </Typography.Text>
          <Space wrap size={[8, 8]}>
            {ungraded.map((r) => (
              <Tag key={r.student_id} style={{ padding: "4px 10px" }}>
                <Link to={`/business/students/${r.student_id}`}>{r.name}</Link>
              </Tag>
            ))}
          </Space>
        </>
      ) : null}
    </div>
  );
}

export default function StudentRatingsPage() {
  const { businessId, business } = useOutletContext();
  const isEdu = business?.business_type === "education_center";
  const [searchParams] = useSearchParams();
  const studentFromUrl = searchParams.get("student");

  const [tab, setTab] = useState("grades");
  const [month, setMonth] = useState(() => dayjs());
  const [groupFilter, setGroupFilter] = useState();
  const [studentFilter, setStudentFilter] = useState(studentFromUrl ? Number(studentFromUrl) : undefined);
  const [students, setStudents] = useState([]);
  const [groups, setGroups] = useState([]);
  const [ratings, setRatings] = useState([]);
  const [leaderboard, setLeaderboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lbLoading, setLbLoading] = useState(false);
  const [modal, setModal] = useState({ open: false, record: null });
  const [form] = Form.useForm();

  useEffect(() => {
    if (studentFromUrl) setStudentFilter(Number(studentFromUrl));
  }, [studentFromUrl]);

  const loadStudentsGroups = useCallback(async () => {
    if (!businessId) return;
    try {
      const [st, gr] = await Promise.all([
        getStudents({ business_id: businessId }),
        getStudentGroups({ business_id: businessId }),
      ]);
      setStudents(st);
      setGroups(gr);
    } catch {
      message.error("Ro‘yxatlar yuklanmadi.");
    }
  }, [businessId]);

  const loadRatings = useCallback(async () => {
    if (!businessId) return;
    setLoading(true);
    try {
      const list = await getStudentRatings({
        business_id: businessId,
        month: month.format("YYYY-MM"),
        student_id: studentFilter || undefined,
      });
      setRatings(list);
    } catch {
      message.error("Baholar yuklanmadi.");
      setRatings([]);
    } finally {
      setLoading(false);
    }
  }, [businessId, month, studentFilter]);

  const loadLeaderboard = useCallback(async () => {
    if (!businessId) return;
    setLbLoading(true);
    try {
      const data = await getRatingLeaderboard({
        business_id: businessId,
        month: month.format("YYYY-MM"),
        group_id: groupFilter || undefined,
      });
      setLeaderboard(data);
    } catch {
      message.error("Reyting yuklanmadi.");
      setLeaderboard(null);
    } finally {
      setLbLoading(false);
    }
  }, [businessId, month, groupFilter]);

  useEffect(() => {
    loadStudentsGroups();
  }, [loadStudentsGroups]);

  useEffect(() => {
    loadRatings();
  }, [loadRatings]);

  useEffect(() => {
    if (tab === "rank") loadLeaderboard();
  }, [tab, loadLeaderboard]);

  const refreshAll = useCallback(() => {
    loadRatings();
    if (tab === "rank") loadLeaderboard();
  }, [loadRatings, loadLeaderboard, tab]);

  useWindowEvent(BUSINESS_DATA_CHANGED, refreshAll);

  const openCreate = () => {
    form.resetFields();
    form.setFieldsValue({
      student: studentFilter || undefined,
      points: 85,
      rated_at: dayjs(),
    });
    setModal({ open: true, record: null });
  };

  const openEdit = (row) => {
    setModal({ open: true, record: row });
    form.setFieldsValue({
      student: row.student,
      title: row.title,
      points: row.points,
      rated_at: row.rated_at ? dayjs(row.rated_at) : dayjs(),
      comment: row.comment || "",
    });
  };

  const submitModal = async () => {
    try {
      const v = await form.validateFields();
      const body = {
        student: v.student,
        title: v.title.trim(),
        points: v.points,
        rated_at: (v.rated_at || dayjs()).format("YYYY-MM-DD"),
        comment: (v.comment || "").trim(),
      };
      if (modal.record) {
        await updateStudentRating(modal.record.id, body);
        message.success("Yangilandi.");
      } else {
        await createStudentRating(body);
        message.success("Baho qo‘shildi.");
      }
      setModal({ open: false, record: null });
      notifyBusinessDataChanged();
      refreshAll();
    } catch (e) {
      if (e?.errorFields) return;
      message.error("Saqlashda xato.");
    }
  };

  const onDelete = async (id) => {
    try {
      await deleteStudentRating(id);
      message.success("O‘chirildi.");
      notifyBusinessDataChanged();
      refreshAll();
    } catch {
      message.error("O‘chirish muvaffaqiyatsiz.");
    }
  };

  const studentOptions = useMemo(
    () => students.map((s) => ({ value: s.id, label: s.name })),
    [students],
  );

  if (!isEdu) {
    return <Navigate to="/business/dashboard" replace />;
  }
  if (!businessId) return null;

  const gradeColumns = [
    {
      title: "Sana",
      dataIndex: "rated_at",
      width: 110,
      render: (d) => (d ? dayjs(d).format("DD.MM.YYYY") : "—"),
    },
    { title: "O‘quvchi", dataIndex: "student_name", ellipsis: true },
    { title: "Sarlavha", dataIndex: "title", ellipsis: true },
    {
      title: "Ball",
      dataIndex: "points",
      width: 120,
      render: (p) => (
        <div style={{ minWidth: 100 }}>
          <Tag color={p >= 85 ? "success" : p >= 70 ? "warning" : p >= 50 ? "processing" : "error"}>{p}</Tag>
          <Progress percent={p} size="small" showInfo={false} strokeColor={scoreStrokeColor(p)} style={{ marginTop: 4 }} />
        </div>
      ),
    },
    { title: "Izoh", dataIndex: "comment", ellipsis: true, render: (v) => v || "—" },
    {
      title: "",
      key: "actions",
      width: 140,
      render: (_, row) => (
        <Space>
          <Button type="link" size="small" onClick={() => openEdit(row)}>
            Tahrirlash
          </Button>
          <Popconfirm title="O‘chirilsinmi?" onConfirm={() => onDelete(row.id)}>
            <Button type="link" size="small" danger>
              O‘chirish
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Baholar va reyting"
        description="O‘quvchilarni 0–100 ball bilan baholang. O‘quvchi va ota-ona kabinetlarida ko‘rinadi."
        extra={
          <Button type="primary" onClick={openCreate}>
            Baho qo‘shish
          </Button>
        }
      />

      <Card size="small" style={{ marginBottom: 16 }}>
        <Row gutter={[16, 12]}>
          <Col xs={24} sm={8}>
            <Typography.Text type="secondary" style={{ display: "block", marginBottom: 4 }}>
              Oy (filtr)
            </Typography.Text>
            <DatePicker picker="month" value={month} onChange={(v) => v && setMonth(v)} format="YYYY-MM" style={{ width: "100%" }} />
          </Col>
          <Col xs={24} sm={8}>
            <Typography.Text type="secondary" style={{ display: "block", marginBottom: 4 }}>
              O‘quvchi (jadval filtri)
            </Typography.Text>
            <Select
              allowClear
              placeholder="Barchasi"
              style={{ width: "100%" }}
              value={studentFilter}
              onChange={setStudentFilter}
              options={studentOptions}
              showSearch
              optionFilterProp="label"
            />
          </Col>
          <Col xs={24} sm={8}>
            <Typography.Text type="secondary" style={{ display: "block", marginBottom: 4 }}>
              Guruh (faqat reyting varag‘ida)
            </Typography.Text>
            <Select
              allowClear
              placeholder="Barcha guruhlar"
              style={{ width: "100%" }}
              value={groupFilter}
              onChange={setGroupFilter}
              options={groups.map((g) => ({ value: g.id, label: g.name }))}
            />
          </Col>
        </Row>
      </Card>

      <Tabs
        activeKey={tab}
        onChange={setTab}
        items={[
          {
            key: "grades",
            label: "Baholar jadvali",
            children: (
              <Table
                rowKey="id"
                size="small"
                loading={loading}
                dataSource={ratings}
                pagination={{ pageSize: 15 }}
                columns={gradeColumns}
                locale={{ emptyText: "Bu oy uchun baho yo‘q" }}
              />
            ),
          },
          {
            key: "rank",
            label: "Reyting",
            children: (
              <Card
                styles={{ body: { paddingTop: 12 } }}
                style={{
                  borderRadius: 12,
                  background: "linear-gradient(180deg, rgba(248, 250, 252, 0.92) 0%, #ffffff 42%)",
                  border: "1px solid rgba(0,0,0,0.06)",
                }}
              >
                <Spin spinning={lbLoading}>
                  <LeaderboardVisual leaderboard={leaderboard} month={month} />
                </Spin>
              </Card>
            ),
          },
        ]}
      />

      <Modal
        title={modal.record ? "Bahonı tahrirlash" : "Yangi baho"}
        open={modal.open}
        onCancel={() => setModal({ open: false, record: null })}
        onOk={submitModal}
        destroyOnClose
        width={520}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 12 }}>
          <Form.Item name="student" label="O‘quvchi" rules={[{ required: true, message: "Tanlang" }]}>
            <Select options={studentOptions} showSearch optionFilterProp="label" disabled={Boolean(modal.record)} />
          </Form.Item>
          <Form.Item name="title" label="Sarlavha" rules={[{ required: true, message: "Kiriting" }]}>
            <Input placeholder="Masalan: Matematika — oraliq" maxLength={200} />
          </Form.Item>
          <Form.Item name="points" label="Ball (0–100)" rules={[{ required: true, message: "Kiriting" }]}>
            <InputNumber min={0} max={100} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="rated_at" label="Sana" rules={[{ required: true, message: "Tanlang" }]}>
            <DatePicker style={{ width: "100%" }} format="DD.MM.YYYY" />
          </Form.Item>
          <Form.Item name="comment" label="Izoh">
            <Input.TextArea rows={3} maxLength={2000} showCount />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
