import { Button, Card, Col, DatePicker, Descriptions, Row, Space, Statistic, Table, Tag, Typography, message } from "antd";
import dayjs from "dayjs";
import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import LoadingScreen from "../../components/ui/LoadingScreen";
import { getStudentCrmSummary } from "../../services/studentService";
import { formatPhone } from "../../utils/formatters";

const STUDENT_STATUS = {
  active: { label: "Faol", color: "green" },
  paused: { label: "Tanaffus", color: "orange" },
  graduated: { label: "Bitirgan", color: "default" },
};

const ATT_LABELS = {
  present: "Keldi",
  absent: "Kelmadi",
  late: "Kechikdi",
  excused: "Sababli",
};

const COURSE_META_LABELS = {
  duration: "Davomiyligi",
  level: "Daraja",
  teacher: "O‘qituvchi",
  lesson_days: "Dars kunlari",
  lesson_time: "Vaqt",
  format: "Format",
};

/** Ustoz kabineti: guruhdagi o‘quvchi uchun qisqa dashboard (CRM summary). */
export default function PortalTeacherStudentPage() {
  const { id } = useParams();
  const [month, setMonth] = useState(() => dayjs());
  const [allTime, setAllTime] = useState(false);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const params = allTime ? {} : { month: month.format("YYYY-MM") };
      setData(await getStudentCrmSummary(id, params));
    } catch {
      message.error("Ma’lumot yuklanmadi yoki ruxsat yo‘q.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [id, month, allTime]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading && !data) return <LoadingScreen />;
  if (!data?.student) {
    return (
      <>
        <Typography.Paragraph>O‘quvchi topilmadi yoki sizning guruhingizga tegishli emas.</Typography.Paragraph>
        <Link to="/portal/teacher">
          <Button type="primary">Orqaga — guruhlar</Button>
        </Link>
      </>
    );
  }

  const st = data.student;
  const stTag = STUDENT_STATUS[st.status] || { label: st.status, color: "default" };
  const meta = data.course?.metadata || {};
  const metaEntries = Object.entries(COURSE_META_LABELS)
    .map(([key, label]) => (meta[key] != null && meta[key] !== "" ? [label, String(meta[key])] : null))
    .filter(Boolean);

  return (
    <>
      <Space wrap style={{ marginBottom: 16 }} align="center">
        <Link to="/portal/teacher">
          <Button>← Barcha o‘quvchilar</Button>
        </Link>
        <Typography.Title level={4} style={{ margin: 0 }}>
          {st.name}
        </Typography.Title>
      </Space>
      <Typography.Text type="secondary" style={{ display: "block", marginBottom: 16 }}>
        Davomat va baholar — faqat ko‘rish (tahrirlash markaz kabinetida).
      </Typography.Text>

      <Space wrap style={{ marginBottom: 16 }}>
        <Typography.Text type="secondary">Davr:</Typography.Text>
        <Button type={allTime ? "primary" : "default"} size="small" onClick={() => setAllTime(true)}>
          Barcha davr
        </Button>
        <Button type={!allTime ? "primary" : "default"} size="small" onClick={() => setAllTime(false)}>
          Oy bo‘yicha
        </Button>
        {!allTime ? (
          <DatePicker picker="month" value={month} onChange={(v) => v && setMonth(v)} format="MM.YYYY" />
        ) : null}
      </Space>

      <Card size="small" style={{ marginBottom: 16 }}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm="auto">
            <Typography.Text type="secondary">Holat</Typography.Text>
            <div style={{ marginTop: 8 }}>
              <Tag color={stTag.color}>{stTag.label}</Tag>
            </div>
          </Col>
          <Col xs={24} sm={12} md={10}>
            <Descriptions column={1} size="small">
              <Descriptions.Item label="Telefon">{formatPhone(st.phone) || "—"}</Descriptions.Item>
              <Descriptions.Item label="Guruh">{st.group_name || "—"}</Descriptions.Item>
              <Descriptions.Item label="Kurs">{st.course_title || "—"}</Descriptions.Item>
            </Descriptions>
          </Col>
        </Row>
      </Card>

      {data.course ? (
        <Card title="Kurs / dars" size="small" style={{ marginBottom: 16 }}>
          <Typography.Paragraph strong>{data.course.title}</Typography.Paragraph>
          {data.course.description ? (
            <Typography.Paragraph type="secondary" style={{ marginBottom: metaEntries.length ? 12 : 0 }}>
              {data.course.description}
            </Typography.Paragraph>
          ) : null}
          {metaEntries.length ? (
            <Descriptions size="small" column={{ xs: 1, sm: 2 }} bordered>
              {metaEntries.map(([label, val], i) => (
                <Descriptions.Item key={`${label}-${i}`} label={label}>
                  {val}
                </Descriptions.Item>
              ))}
            </Descriptions>
          ) : null}
        </Card>
      ) : null}

      {data.ratings ? (
        <Card title="Baholar" size="small" style={{ marginBottom: 16 }}>
          <Row gutter={16}>
            <Col xs={12} sm={8}>
              <Statistic title="Yozuvlar" value={data.ratings.count ?? 0} />
            </Col>
            <Col xs={12} sm={8}>
              <Statistic
                title="O‘rtacha ball"
                value={data.ratings.avg_points != null ? data.ratings.avg_points : "—"}
              />
            </Col>
          </Row>
          {data.ratings.recent?.length ? (
            <Table
              size="small"
              style={{ marginTop: 12 }}
              rowKey="id"
              pagination={{ pageSize: 8 }}
              dataSource={data.ratings.recent}
              columns={[
                {
                  title: "Sana",
                  dataIndex: "rated_at",
                  render: (d) => (d ? dayjs(d).format("DD.MM.YYYY") : "—"),
                },
                { title: "Sarlavha", dataIndex: "title", ellipsis: true },
                { title: "Ball", dataIndex: "points", width: 72 },
                { title: "Izoh", dataIndex: "comment", ellipsis: true, render: (v) => v || "—" },
              ]}
            />
          ) : (
            <Typography.Text type="secondary" style={{ display: "block", marginTop: 12 }}>
              Baho yozuvi yo‘q.
            </Typography.Text>
          )}
        </Card>
      ) : null}

      <Card title="Davomat" size="small" style={{ marginBottom: 16 }}>
        <Row gutter={[16, 16]}>
          <Col xs={12} sm={6}>
            <Statistic title="Belgilangan kunlar" value={data.totals.marked_days} />
          </Col>
          <Col xs={12} sm={6}>
            <Statistic title="Keldi (+ kechikdi)" value={data.totals.present_days} />
          </Col>
          <Col xs={12} sm={6}>
            <Statistic title="Kelmadi" value={data.totals.absent_days} />
          </Col>
          <Col xs={12} sm={6}>
            <Statistic
              title="Foiz"
              value={data.totals.rate_percent != null ? `${data.totals.rate_percent}%` : "—"}
            />
          </Col>
        </Row>
      </Card>

      <Card title="Davomat jadvali" size="small">
        <Table
          size="small"
          rowKey="id"
          loading={loading}
          dataSource={data.recent_attendance || []}
          pagination={{ pageSize: 12 }}
          locale={{ emptyText: "Yozuv yo‘q" }}
          columns={[
            {
              title: "Sana",
              dataIndex: "date",
              render: (d) => (d ? dayjs(d).format("DD.MM.YYYY") : "—"),
            },
            { title: "Holat", dataIndex: "status", render: (s) => ATT_LABELS[s] || s },
            { title: "Izoh", dataIndex: "note", ellipsis: true, render: (v) => v || "—" },
          ]}
        />
      </Card>
    </>
  );
}
