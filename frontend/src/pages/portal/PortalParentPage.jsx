import { Card, Descriptions, Row, Col, Statistic, Table, Typography, message } from "antd";
import { useCallback, useEffect, useState } from "react";
import dayjs from "dayjs";
import LoadingScreen from "../../components/ui/LoadingScreen";
import { getParentPortalSummary } from "../../services/portalService";
import { formatPhone } from "../../utils/formatters";

const ATT_UZ = { present: "Keldi", absent: "Kelmadi", late: "Kechikdi", excused: "Sababli" };
const STATUS_UZ = { active: "Faol", paused: "Tanaffus", graduated: "Bitirgan" };

export default function PortalParentPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await getParentPortalSummary());
    } catch {
      message.error("Ma’lumot yuklanmadi.");
      setData(null);
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
        Farzandingizning o‘qishi va davomati — faqat shu markaz bo‘yicha.
      </Typography.Text>

      <Card title="Farzand profili" size="small" style={{ marginTop: 16 }}>
        <Descriptions column={1} size="small">
          <Descriptions.Item label="Ism">{s.name}</Descriptions.Item>
          <Descriptions.Item label="Telefon">{formatPhone(s.phone)}</Descriptions.Item>
          <Descriptions.Item label="Guruh">{s.group_name || "—"}</Descriptions.Item>
          <Descriptions.Item label="Ustoz">{data.group_teacher_name || "—"}</Descriptions.Item>
          <Descriptions.Item label="Kurs">{s.course_title || "—"}</Descriptions.Item>
          <Descriptions.Item label="Holat">{STATUS_UZ[s.status] || s.status}</Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title="Davomat — joriy oy" size="small" style={{ marginTop: 16 }}>
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

      <Card title="So‘nggi davomat yozuvlari" size="small" style={{ marginTop: 16 }}>
        <Table
          size="small"
          rowKey="id"
          pagination={{ pageSize: 12 }}
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
