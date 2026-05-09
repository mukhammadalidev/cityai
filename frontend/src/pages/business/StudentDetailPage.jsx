import { Button, Card, Col, DatePicker, Descriptions, Row, Space, Statistic, Table, Tag, Typography, message } from "antd";
import dayjs from "dayjs";
import { useCallback, useEffect, useState } from "react";
import { Link, Navigate, useOutletContext, useParams } from "react-router-dom";
import PageHeader from "../../components/ui/PageHeader";
import LoadingScreen from "../../components/ui/LoadingScreen";
import { getStudentCrmSummary } from "../../services/studentService";
import { formatPhone } from "../../utils/formatters";
import { useWindowEvent } from "../../hooks/useWindowEvent";
import { BUSINESS_DATA_CHANGED } from "../../utils/businessEvents";

const STUDENT_STATUS = {
  active: { label: "Darslarda faol", color: "green" },
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

export default function StudentDetailPage() {
  const { id } = useParams();
  const { businessId, business } = useOutletContext();
  const isEdu = business?.business_type === "education_center";

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
      message.error("Ma’lumot yuklanmadi.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [id, month, allTime]);

  useEffect(() => {
    load();
  }, [load]);

  useWindowEvent(BUSINESS_DATA_CHANGED, load);

  if (!isEdu) {
    return <Navigate to="/business/dashboard" replace />;
  }
  if (!businessId) return null;
  if (loading && !data) return <LoadingScreen />;
  if (!data?.student) {
    return <Typography.Text>O‘quvchi topilmadi.</Typography.Text>;
  }

  const st = data.student;
  if (Number(st.business) !== Number(businessId)) {
    return <Navigate to="/business/students" replace />;
  }

  const stTag = STUDENT_STATUS[st.status] || { label: st.status, color: "default" };
  const meta = data.course?.metadata || {};
  const metaEntries = Object.entries(COURSE_META_LABELS)
    .map(([key, label]) => (meta[key] != null && meta[key] !== "" ? [label, String(meta[key])] : null))
    .filter(Boolean);

  return (
    <>
      <PageHeader
        title={st.name}
        description="Kurs, dars jadvali va davomat."
        extra={
          <Space wrap>
            <Link to="/business/students">
              <Button>O‘quvchilar ro‘yxati</Button>
            </Link>
            {st.course ? (
              <Link to={`/business/items/${st.course}`}>
                <Button type="link">Kurs sahifasi</Button>
              </Link>
            ) : (
              <Button type="link" disabled>
                Kurs sahifasi
              </Button>
            )}
          </Space>
        }
      />

      <Space wrap style={{ marginBottom: 16 }}>
        <span>Ko‘rinish:</span>
        <Button type={allTime ? "primary" : "default"} onClick={() => setAllTime(true)}>
          Barcha davr
        </Button>
        <Button type={!allTime ? "primary" : "default"} onClick={() => setAllTime(false)}>
          Tanlangan oy
        </Button>
        {!allTime ? (
          <DatePicker picker="month" value={month} onChange={(v) => v && setMonth(v)} format="YYYY-MM" />
        ) : null}
      </Space>

      <Card size="small" style={{ marginBottom: 16 }}>
        <Space size="large" wrap align="start">
          <div>
            <Typography.Text type="secondary">O‘quv holati</Typography.Text>
            <div style={{ marginTop: 8 }}>
              <Tag color={stTag.color}>{stTag.label}</Tag>
            </div>
          </div>
          <Descriptions column={1} size="small" style={{ minWidth: 220 }}>
            <Descriptions.Item label="Telefon">{formatPhone(st.phone) || "—"}</Descriptions.Item>
            <Descriptions.Item label="O‘quv guruhi">
              {st.group ? (
                <Link to={`/business/students?group=${st.group}`}>{st.group_name || `Guruh #${st.group}`}</Link>
              ) : (
                (st.group_name || "—")
              )}
            </Descriptions.Item>
            <Descriptions.Item label="Kurs">{st.course_title || "—"}</Descriptions.Item>
          </Descriptions>
        </Space>
      </Card>

      {data.course ? (
        <Card title="Dars / kurs haqida" size="small" style={{ marginBottom: 16 }}>
          <Typography.Paragraph style={{ marginBottom: 8 }}>{data.course.title}</Typography.Paragraph>
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
          ) : (
            !data.course.description && <Typography.Text type="secondary">Qo‘shimcha jadval kiritilmagan.</Typography.Text>
          )}
        </Card>
      ) : (
        <Card size="small" style={{ marginBottom: 16 }}>
          <Typography.Text type="secondary">Kurs biriktirilmagan — tahrirlashda tanlashingiz mumkin.</Typography.Text>
        </Card>
      )}

      <Card title="Davomat statistikasi" size="small" style={{ marginBottom: 16 }}>
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
        {data.totals.excused_days > 0 ? (
          <Typography.Text type="secondary" style={{ display: "block", marginTop: 8 }}>
            Sababli: {data.totals.excused_days} · Kechikdi (alohida): {data.totals.late_days}
          </Typography.Text>
        ) : data.totals.late_days > 0 ? (
          <Typography.Text type="secondary" style={{ display: "block", marginTop: 8 }}>
            Kechikdi: {data.totals.late_days}
          </Typography.Text>
        ) : null}
      </Card>

      <Card title="Davomat jadvali" size="small">
        <Table
          size="small"
          rowKey="id"
          loading={loading}
          dataSource={data.recent_attendance}
          pagination={{ pageSize: 15 }}
          locale={{ emptyText: "Bu davr uchun davomat yozuvi yo‘q" }}
          columns={[
            {
              title: "Sana",
              dataIndex: "date",
              render: (d) => (d ? dayjs(d).format("DD.MM.YYYY") : "—"),
            },
            {
              title: "Holat",
              dataIndex: "status",
              render: (s) => ATT_LABELS[s] || s,
            },
            { title: "Izoh", dataIndex: "note", ellipsis: true, render: (v) => v || "—" },
          ]}
        />
      </Card>
    </>
  );
}
