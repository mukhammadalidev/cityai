import { Avatar, Button, Card, Descriptions, List, Space, Tag, Typography, message } from "antd";
import { useCallback, useEffect, useState } from "react";
import { Link, Navigate, useOutletContext, useParams } from "react-router-dom";
import PageHeader from "../../components/ui/PageHeader";
import LoadingScreen from "../../components/ui/LoadingScreen";
import { getTeacherCrmSummary } from "../../services/teacherService";
import { formatPhone, mediaUrl } from "../../utils/formatters";
import { useWindowEvent } from "../../hooks/useWindowEvent";
import { BUSINESS_DATA_CHANGED } from "../../utils/businessEvents";

const STATUS_TAG = {
  active: { label: "Faol", color: "green" },
  inactive: { label: "Nofaol", color: "default" },
};

export default function TeacherDetailPage() {
  const { id } = useParams();
  const { businessId, business } = useOutletContext();
  const isEdu = business?.business_type === "education_center";

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      setData(await getTeacherCrmSummary(id));
    } catch {
      message.error("Profil yuklanmadi.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  useWindowEvent(BUSINESS_DATA_CHANGED, load);

  if (!isEdu) {
    return <Navigate to="/business/dashboard" replace />;
  }
  if (!businessId) return null;
  if (loading && !data) return <LoadingScreen />;
  if (!data?.teacher) {
    return <Typography.Text>Ustoz topilmadi.</Typography.Text>;
  }

  const t = data.teacher;
  if (Number(t.business) !== Number(businessId)) {
    return <Navigate to="/business/teachers" replace />;
  }

  const st = STATUS_TAG[t.status] || { label: t.status, color: "default" };
  const photo = mediaUrl(t.photo);

  return (
    <>
      <PageHeader
        title={t.full_name}
        description="Ustoz profili"
        extra={
          <Space wrap>
            <Link to="/business/teachers">
              <Button>Ro‘yxat</Button>
            </Link>
            <Link to="/business/student-groups">
              <Button type="default">Guruhlar</Button>
            </Link>
          </Space>
        }
      />

      <Card size="small" style={{ marginBottom: 16 }}>
        <Space align="start" size="large" wrap>
          <Avatar src={photo || undefined} size={96} style={{ backgroundColor: "#722ed1" }}>
            {!photo ? t.full_name?.slice(0, 1) : null}
          </Avatar>
          <div>
            <Tag color={st.color} style={{ marginBottom: 8 }}>
              {st.label}
            </Tag>
            <Descriptions column={1} size="small">
              <Descriptions.Item label="Telefon">{formatPhone(t.phone) || "—"}</Descriptions.Item>
              <Descriptions.Item label="Email">{t.email || "—"}</Descriptions.Item>
              <Descriptions.Item label="Telegram">
                {t.telegram_username ? (
                  <a href={`https://t.me/${t.telegram_username}`} target="_blank" rel="noreferrer">
                    @{t.telegram_username}
                  </a>
                ) : (
                  "—"
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Fanlar / yo‘nalish">{t.subjects || "—"}</Descriptions.Item>
            </Descriptions>
          </div>
        </Space>
      </Card>

      {t.bio ? (
        <Card title="Bio" size="small" style={{ marginBottom: 16 }}>
          <Typography.Paragraph style={{ marginBottom: 0, whiteSpace: "pre-wrap" }}>{t.bio}</Typography.Paragraph>
        </Card>
      ) : null}

      <Card title="Boshqaradigan guruhlar" size="small">
        {data.groups?.length ? (
          <List
            size="small"
            dataSource={data.groups}
            renderItem={(g) => (
              <List.Item
                actions={[
                  <Link key="list" to={`/business/students?group=${g.id}`}>
                    Ro‘yxat
                  </Link>,
                  <Link key="att" to={`/business/students?group=${g.id}&tab=attendance`}>
                    Davomat
                  </Link>,
                ]}
              >
                <List.Item.Meta
                  title={g.name}
                  description={
                    <>
                      {g.course_title ? `${g.course_title} · ` : null}
                      o‘quvchilar: {g.students_count}
                    </>
                  }
                />
              </List.Item>
            )}
          />
        ) : (
          <Typography.Text type="secondary">
            Hozircha guruh biriktirilmagan.{" "}
            <Link to="/business/student-groups">O‘quv guruhlari</Link> bo‘limida «Asosiy ustoz»ni tanlang.
          </Typography.Text>
        )}
      </Card>
    </>
  );
}
