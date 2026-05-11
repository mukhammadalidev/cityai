import { Alert, Card, Descriptions, Row, Col, Statistic, Table, Typography, message } from "antd";
import { useCallback, useEffect, useState } from "react";
import LoadingScreen from "../../components/ui/LoadingScreen";
import StudentMockTestsSection from "./StudentMockTestsSection";
import { getStudentPortalSummary } from "../../services/portalService";
import { formatPhone } from "../../utils/formatters";
import dayjs from "dayjs";

const ATT_UZ = { present: "Keldi", absent: "Kelmadi", late: "Kechikdi", excused: "Sababli" };
const STATUS_UZ = { active: "Faol", paused: "Tanaffus", graduated: "Bitirgan" };

export default function PortalStudentPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await getStudentPortalSummary());
    } catch {
      message.error("Ma’lumot yuklanmadi.");
      setData((prev) => prev ?? null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading && !data) return <LoadingScreen />;
  if (!data) return <Typography.Text>Yuklash muvaffaqiyatsiz.</Typography.Text>;

  const s = data.student;

  return (
    <>
      <Typography.Title level={4} style={{ marginTop: 0 }}>
        {data.business?.name}
      </Typography.Title>
      <Typography.Text type="secondary">
        {data.business?.city ? `${data.business.city} · ` : null}
        Faqat o‘zingizning ma’lumotlaringiz.
      </Typography.Text>

      {data.tuition_payment ? (
        <Alert
          style={{ marginTop: 16 }}
          type={data.tuition_payment.status === "paid" ? "success" : data.tuition_payment.status === "unpaid" ? "error" : "info"}
          showIcon
          message={<strong>Abonement (to‘lov holati)</strong>}
          description={
            <>
              <div>{data.tuition_payment.message}</div>
              {data.tuition_payment.note ? (
                <Typography.Text type="secondary" style={{ display: "block", marginTop: 6 }}>
                  Markaz izohi: {data.tuition_payment.note}
                </Typography.Text>
              ) : null}
            </>
          }
        />
      ) : null}

      <Card title="Mening profilim" size="small" style={{ marginTop: 16 }}>
        <Descriptions column={1} size="small">
          <Descriptions.Item label="Ism">{s.name}</Descriptions.Item>
          <Descriptions.Item label="Telefon">{formatPhone(s.phone)}</Descriptions.Item>
          <Descriptions.Item label="Guruh">{s.group_name || "—"}</Descriptions.Item>
          <Descriptions.Item label="Ustoz">{data.group_teacher_name || "—"}</Descriptions.Item>
          <Descriptions.Item label="Kurs">{s.course_title || "—"}</Descriptions.Item>
          <Descriptions.Item label="Holat">{STATUS_UZ[s.status] || s.status}</Descriptions.Item>
        </Descriptions>
      </Card>

      <StudentMockTestsSection
        portalQuizzes={Array.isArray(data.portal_quizzes) ? data.portal_quizzes : []}
        portalQuizScores={Array.isArray(data.portal_quiz_scores) ? data.portal_quiz_scores : []}
        onCenterQuizSubmitted={load}
      />

      <Card title="Baholar (joriy oy)" size="small" style={{ marginTop: 16 }}>
        <Row gutter={16}>
          <Col xs={12} sm={8}>
            <Statistic title="Baho yozuvlari" value={data.ratings_month?.count ?? 0} />
          </Col>
          <Col xs={12} sm={8}>
            <Statistic
              title="O‘rtacha ball"
              value={
                data.ratings_month?.avg_points != null ? `${data.ratings_month.avg_points}` : "—"
              }
            />
          </Col>
          <Col xs={12} sm={8}>
            <Statistic
              title="Reyting (joriy oy)"
              value={
                data.ratings_rank_month?.rank != null
                  ? `${data.ratings_rank_month.rank} / ${data.ratings_rank_month.peers_graded}`
                  : "—"
              }
            />
          </Col>
        </Row>
        {data.ratings_rank_month?.scope_label ? (
          <Typography.Text type="secondary" style={{ display: "block", marginTop: 8 }}>
            {data.ratings_rank_month.scope_label}: bahosi bo‘lgan o‘quvchilar orasida.
          </Typography.Text>
        ) : null}
      </Card>

      <Card title="So‘nggi baholar" size="small" style={{ marginTop: 16 }}>
        <Table
          size="small"
          rowKey="id"
          pagination={{ pageSize: 8 }}
          scroll={{ x: "max-content" }}
          dataSource={data.recent_ratings || []}
          locale={{ emptyText: "Hozircha baho yo‘q" }}
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
      </Card>

      <Card title="Davomat (joriy oy)" size="small" style={{ marginTop: 16 }}>
        <Row gutter={16}>
          <Col xs={12} sm={8}>
            <Statistic title="Belgilangan kunlar" value={data.attendance_month?.marked_days ?? 0} />
          </Col>
          <Col xs={12} sm={8}>
            <Statistic title="Keldi (+ kechikdi)" value={data.attendance_month?.present_days ?? 0} />
          </Col>
          <Col xs={12} sm={8}>
            <Statistic
              title="Foiz"
              value={
                data.attendance_month?.rate_percent != null ? `${data.attendance_month.rate_percent}%` : "—"
              }
            />
          </Col>
        </Row>
      </Card>

      <Card title="Davomat jadvali" size="small" style={{ marginTop: 16 }}>
        <Table
          size="small"
          rowKey="id"
          pagination={{ pageSize: 12 }}
          scroll={{ x: "max-content" }}
          dataSource={data.recent_attendance || []}
          locale={{ emptyText: "Yozuv yo‘q" }}
          columns={[
            {
              title: "Sana",
              dataIndex: "date",
              render: (d) => (d ? dayjs(d).format("DD.MM.YYYY") : "—"),
            },
            { title: "Holat", dataIndex: "status", render: (x) => ATT_UZ[x] || x },
            { title: "Izoh", dataIndex: "note", ellipsis: true, render: (v) => v || "—" },
          ]}
        />
      </Card>
    </>
  );
}
