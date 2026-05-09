import { Card, Descriptions, Table, Typography, message } from "antd";
import { useCallback, useEffect, useState } from "react";
import LoadingScreen from "../../components/ui/LoadingScreen";
import { getTeacherPortalSummary } from "../../services/portalService";
import { formatPhone } from "../../utils/formatters";

const STATUS_UZ = { active: "Faol", paused: "Tanaffus", graduated: "Bitirgan" };

export default function PortalTeacherPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await getTeacherPortalSummary());
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

      <Card title="Mening profilim" size="small" style={{ marginTop: 16 }}>
        <Descriptions column={1} size="small">
          <Descriptions.Item label="Ism">{t.full_name}</Descriptions.Item>
          <Descriptions.Item label="Telefon">{formatPhone(t.phone)}</Descriptions.Item>
          <Descriptions.Item label="Fanlar">{t.subjects || "—"}</Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title="Mening guruhlarim" size="small" style={{ marginTop: 16 }}>
        <Table
          size="small"
          rowKey="id"
          pagination={false}
          dataSource={data.groups || []}
          locale={{ emptyText: "Guruh biriktirilmagan" }}
          columns={[
            { title: "Guruh", dataIndex: "name" },
            { title: "O‘quvchilar", dataIndex: "students_count" },
            { title: "Kurs", dataIndex: "course_title", render: (v) => v || "—" },
          ]}
        />
      </Card>

      <Card title="Guruhimdagi o‘quvchilar" size="small" style={{ marginTop: 16 }}>
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
          ]}
        />
      </Card>
    </>
  );
}
