import { Button, Card, Descriptions, Form, Input, Row, Col, Statistic, Table, Typography, message } from "antd";
import { useCallback, useEffect, useState } from "react";
import dayjs from "dayjs";
import LoadingScreen from "../../components/ui/LoadingScreen";
import { createEduPortalUser, fetchMe, patchParentTelegram } from "../../services/authService";
import { getParentPortalSummary } from "../../services/portalService";
import { formatPhone } from "../../utils/formatters";

const ATT_UZ = { present: "Keldi", absent: "Kelmadi", late: "Kechikdi", excused: "Sababli" };
const STATUS_UZ = { active: "Faol", paused: "Tanaffus", graduated: "Bitirgan" };

export default function PortalParentPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tgForm] = Form.useForm();
  const [tgSaving, setTgSaving] = useState(false);
  const [childPortalForm] = Form.useForm();
  const [childPortalSaving, setChildPortalSaving] = useState(false);

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

  useEffect(() => {
    (async () => {
      try {
        const u = await fetchMe();
        tgForm.setFieldsValue({ telegram_id: u.telegram_id || "" });
      } catch {
        /* sessiya yo‘q bo‘lsa — form bo‘sh */
      }
    })();
  }, [tgForm]);

  if (loading && !data) return <LoadingScreen />;
  if (!data) return <Typography.Text>Yuklash muvaffaqiyatsiz.</Typography.Text>;

  const s = data.student;

  return (
    <>
      <Typography.Title level={4} style={{ marginTop: 0 }}>
        {data.business?.name}
      </Typography.Title>
      <Typography.Title level={3} style={{ marginTop: 8, marginBottom: 4 }}>
        Farzand:{" "}
        <Typography.Text strong style={{ fontSize: "1.15em" }}>
          {s.name || "—"}
        </Typography.Text>
      </Typography.Title>
      <Typography.Text type="secondary">
        {data.business?.city ? `${data.business.city} · ` : null}
        O‘qish va davomat — faqat shu farzand va shu markaz bo‘yicha.
      </Typography.Text>

      <Card title="Telegram bildirishnomalar" size="small" style={{ marginTop: 16 }}>
        <Typography.Paragraph type="secondary" style={{ marginBottom: 12 }}>
          Farzandingiz davomati o‘zgarganda shu yerga kiritilgan <b>Telegram chat ID</b> ga xabar ketadi. ID ni
          Telegramda <Typography.Text code>@userinfobot</Typography.Text> ga yozib olishingiz yoki markaz
          tavsiya qilgan bot orqali bilishingiz mumkin (faqat raqam, masalan:{" "}
          <Typography.Text code>123456789</Typography.Text>).
        </Typography.Paragraph>
        <Form
          form={tgForm}
          layout="vertical"
          onFinish={async (v) => {
            setTgSaving(true);
            try {
              await patchParentTelegram((v.telegram_id || "").trim());
              message.success("Telegram ID saqlandi. Endi davomat xabarlari shu akkauntga yuboriladi.");
            } catch (e) {
              const msg = e?.response?.data?.telegram_id?.[0] || e?.response?.data?.detail;
              message.error(msg || "Saqlanmadi. Chat ID faqat raqam bo‘lishi kerak.");
            } finally {
              setTgSaving(false);
            }
          }}
        >
          <Form.Item
            name="telegram_id"
            label="Telegram chat ID"
            rules={[
              {
                validator: (_, value) => {
                  const s = (value || "").trim();
                  if (!s) return Promise.resolve();
                  if (!/^-?\d{1,20}$/.test(s)) {
                    return Promise.reject(new Error("Faqat raqam kiriting (5–15 ta raqam odatda)."));
                  }
                  return Promise.resolve();
                },
              },
            ]}
          >
            <Input placeholder="Masalan: 591234567" inputMode="numeric" autoComplete="off" />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={tgSaving}>
            Saqlash
          </Button>
        </Form>
      </Card>

      <Card title="Farzandning o‘quvchi kabineti" size="small" style={{ marginTop: 16 }}>
        {data.child_portal?.username ? (
          <>
            <Typography.Paragraph style={{ marginBottom: 8 }}>
              Login:{" "}
              <Typography.Text copyable strong>
                {data.child_portal.username}
              </Typography.Text>
            </Typography.Paragraph>
            <Typography.Text type="secondary">
              Parolni farzand o‘zi bilishi kerak. Uni tiklash yoki almashtirish uchun markazga murojaat qiling.
            </Typography.Text>
          </>
        ) : data.parent_can_create_child_portal ? (
          <>
            <Typography.Paragraph type="secondary" style={{ marginBottom: 12 }}>
              <b>Premium</b> tarif: farzandingiz o‘zi <b>/login</b> orqali kiradigan o‘quvchi kabineti uchun login va
              parolni shu yerda belgilashingiz mumkin (markazning «admin» kabineti funksiyasi — faqat sizning
              farzandingiz uchun).
            </Typography.Paragraph>
            <Form
              form={childPortalForm}
              layout="vertical"
              onFinish={async (v) => {
                setChildPortalSaving(true);
                try {
                  await createEduPortalUser({
                    kind: "student",
                    student_id: s.id,
                    username: v.username.trim(),
                    password: v.password,
                  });
                  message.success("O‘quvchi kabineti yaratildi. Farzand /login sahifasidan kiradi.");
                  childPortalForm.resetFields();
                  await load();
                } catch (e) {
                  message.error(e.response?.data?.detail || "Yaratilmadi.");
                } finally {
                  setChildPortalSaving(false);
                }
              }}
            >
              <Form.Item name="username" label="Login" rules={[{ required: true, message: "Login kiriting" }]}>
                <Input autoComplete="off" />
              </Form.Item>
              <Form.Item
                name="password"
                label="Parol"
                rules={[{ required: true, min: 6, message: "Kamida 6 belgi" }]}
              >
                <Input.Password autoComplete="new-password" />
              </Form.Item>
              <Button type="primary" htmlType="submit" loading={childPortalSaving}>
                Kabinet yaratish
              </Button>
            </Form>
          </>
        ) : (
          <Typography.Text type="secondary">
            Farzand uchun o‘quvchi kabinetini odatda <b>markaz administratori</b> (biznes kabineti) yaratadi.
            Ota-ona kabinetidan login/parolni <b>o‘zingiz belgilash</b> imkoniyati <b>Premium</b> tarifidagi
            o‘quv markazlar uchun yoqilgan. Markaz bilan bog‘laning.
          </Typography.Text>
        )}
      </Card>

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

      <Card title="Baholar — joriy oy" size="small" style={{ marginTop: 16 }}>
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
              title="Reyting"
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
            {data.ratings_rank_month.scope_label}
          </Typography.Text>
        ) : null}
      </Card>

      <Card title="So‘nggi baholar" size="small" style={{ marginTop: 16 }}>
        <Table
          size="small"
          rowKey="id"
          pagination={{ pageSize: 8 }}
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
