import { Button, Card, Col, DatePicker, Descriptions, Row, Space, Statistic, Table, Typography, message } from "antd";
import dayjs from "dayjs";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import LoadingScreen from "../../components/ui/LoadingScreen";
import { getTeacherPortalSummary } from "../../services/portalService";
import { formatPhone } from "../../utils/formatters";

const STATUS_UZ = { active: "Faol", paused: "Tanaffus", graduated: "Bitirgan" };

export default function PortalTeacherPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [summaryMonth, setSummaryMonth] = useState(() => dayjs().format("YYYY-MM"));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await getTeacherPortalSummary({ month: summaryMonth }));
    } catch {
      message.error("Ma’lumot yuklanmadi.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [summaryMonth]);

  useEffect(() => {
    load();
  }, [load]);

  const groupColumns = useMemo(() => {
    const cols = [
      { title: "Guruh", dataIndex: "name" },
      { title: "O‘quvchilar", dataIndex: "students_count" },
      { title: "Kurs", dataIndex: "course_title", render: (v) => v || "—" },
      {
        title: "Bahoda yetakchi (oy)",
        key: "top_rating_month",
        render: (_, row) => {
          const v = row.top_rating_month;
          if (!v) {
            return <Typography.Text type="secondary">Bu oyda baho yo‘q</Typography.Text>;
          }
          return (
            <Typography.Text>
              <b>{v.name}</b> — o‘rtacha {v.avg_points}
            </Typography.Text>
          );
        },
      },
    ];
    if (data?.attendance_insights_enabled) {
      cols.push({
        title: "Davomatda eng yaxshi (oy)",
        key: "best_attendance",
        render: (_, row) => {
          const v = row.best_attendance;
          if (!v) {
            return (
              <Typography.Text type="secondary">
                Bu oyda belgilangan kun yo‘q yoki guruh bo‘sh
              </Typography.Text>
            );
          }
          return (
            <Typography.Text>
              <b>{v.name}</b> — {v.rate_percent}% ({v.present_days}/{v.marked_days} keldi)
            </Typography.Text>
          );
        },
      });
    }
    return cols;
  }, [data?.attendance_insights_enabled]);

  if (loading && !data) return <LoadingScreen />;
  if (!data) return <Typography.Text>Yuklash muvaffaqiyatsiz.</Typography.Text>;

  const t = data.teacher;

  return (
    <>
      <Typography.Title level={4} style={{ marginTop: 0 }}>
        {data.business?.name}
      </Typography.Title>
      <Typography.Text type="secondary">
        {data.business?.city ? `${data.business.city} · ` : null}
        Boshqa markazlar bilan ma’lumot aralashmaydi.
      </Typography.Text>

      <Space align="center" wrap style={{ marginTop: 12 }}>
        <Typography.Text type="secondary">
          <b>Hisobot oyi</b> (davomat va baholar):
        </Typography.Text>
        <DatePicker
          picker="month"
          allowClear={false}
          value={dayjs(summaryMonth, "YYYY-MM")}
          format="MM.YYYY"
          onChange={(d) => {
            const next = d ? d.format("YYYY-MM") : dayjs().format("YYYY-MM");
            setSummaryMonth(next);
          }}
        />
      </Space>

      <Card title="Baholar va reyting — tanlangan oy" size="small" style={{ marginTop: 16 }}>
        <Typography.Text type="secondary" style={{ display: "block", marginBottom: 12 }}>
          O‘rtacha ball — shu oyda baholangan yozuvlar bo‘yicha. Reyting: har bir o‘quvchi <b>o‘z guruhi</b> ichida,
          faqat shu oyda kamida bitta bahosi bo‘lgan o‘quvchilar orasida.
        </Typography.Text>
        <Row gutter={16}>
          <Col xs={12} sm={8}>
            <Statistic title="Hisobot oyi" value={data.summary_month || data.ratings_summary?.month || "—"} />
          </Col>
          <Col xs={12} sm={8}>
            <Statistic
              title="Baho bor o‘quvchilar"
              value={data.ratings_summary?.students_with_grades ?? 0}
            />
          </Col>
          <Col xs={12} sm={8}>
            <Statistic
              title="Jami o‘rtacha ball"
              value={
                data.ratings_summary?.overall_avg_points != null
                  ? data.ratings_summary.overall_avg_points
                  : "—"
              }
            />
          </Col>
        </Row>
      </Card>

      <Card title="Mening profilim" size="small" style={{ marginTop: 16 }}>
        <Descriptions column={1} size="small">
          <Descriptions.Item label="Ism">{t.full_name}</Descriptions.Item>
          <Descriptions.Item label="Telefon">{formatPhone(t.phone)}</Descriptions.Item>
          <Descriptions.Item label="Fanlar">{t.subjects || "—"}</Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title="Mening guruhlarim" size="small" style={{ marginTop: 16 }}>
        {data.attendance_insights_enabled ? (
          <Typography.Paragraph type="secondary" style={{ marginBottom: 8 }}>
            Tanlangan oy: <b>{data.summary_month}</b>. Davomat: keldi + kechikdi / belgilangan kunlar bo‘yicha eng
            yuqori foiz (teng bo‘lsa, ko‘proq kelgan va ism).
          </Typography.Paragraph>
        ) : null}
        <Table
          size="small"
          rowKey="id"
          pagination={false}
          dataSource={data.groups || []}
          locale={{ emptyText: "Guruh biriktirilmagan" }}
          columns={groupColumns}
          loading={loading}
        />
      </Card>

      <Card title="Guruhimdagi o‘quvchilar" size="small" style={{ marginTop: 16 }}>
        <Typography.Paragraph type="secondary" style={{ marginBottom: 12 }}>
          <b>Baho (oy)</b> — tanlangan oy uchun o‘rtacha ball va yozuvlar soni. <b>Reyting</b> — guruhdagi bahosi
          bo‘lgan o‘quvchilar orasidagi o‘rin. Har bir qator: <b>Profil</b> orqali batafsil.
        </Typography.Paragraph>
        <Table
          size="small"
          rowKey="id"
          pagination={{ pageSize: 15 }}
          dataSource={data.students || []}
          locale={{ emptyText: "O‘quvchi yo‘q" }}
          columns={[
            { title: "Ism", dataIndex: "name" },
            { title: "Telefon", dataIndex: "phone", render: formatPhone },
            { title: "Guruh", dataIndex: "group_name" },
            { title: "Kurs", dataIndex: "course_title", render: (v) => v || "—" },
            { title: "Holat", dataIndex: "status", render: (s) => STATUS_UZ[s] || s },
            {
              title: "Baho (oy)",
              key: "ratings_m",
              render: (_, row) => {
                const rm = row.ratings_month;
                if (!rm?.count) {
                  return <Typography.Text type="secondary">—</Typography.Text>;
                }
                return (
                  <Typography.Text>
                    {rm.avg_points != null ? rm.avg_points : "—"} <Typography.Text type="secondary">({rm.count})</Typography.Text>
                  </Typography.Text>
                );
              },
            },
            {
              title: "Reyting",
              key: "rank",
              width: 110,
              render: (_, row) => {
                const r = row.ratings_rank_month;
                if (!r?.rank) {
                  return <Typography.Text type="secondary">—</Typography.Text>;
                }
                return (
                  <Typography.Text>
                    {r.rank} / {r.peers_graded}
                  </Typography.Text>
                );
              },
            },
            {
              title: "Profil",
              key: "profile",
              width: 100,
              render: (_, row) => (
                <Link to={`/portal/teacher/students/${row.id}`}>
                  <Button type="link" size="small" style={{ padding: 0 }}>
                    Ko‘rish
                  </Button>
                </Link>
              ),
            },
          ]}
        />
      </Card>
    </>
  );
}
