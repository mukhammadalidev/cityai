import {
  Alert,
  Card,
  Col,
  Descriptions,
  Empty,
  Progress,
  Row,
  Statistic,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import dayjs from "dayjs";
import { useCallback, useEffect, useState } from "react";
import LoadingScreen from "../../components/ui/LoadingScreen";
import { getFitnessClientPortalSummary } from "../../services/authService";
import { formatPhone } from "../../utils/formatters";

const STATUS_LABEL = {
  active: "Faol",
  paused: "Vaqtincha pauza",
  blocked: "Bloklangan",
};
const CLIENT_TYPE_LABEL = { monthly: "Oylik", daily: "Kunlik" };
const PAYMENT_STATUS_LABEL = {
  paid: { label: "To'liq to'langan", color: "green" },
  partial: { label: "Qisman to'langan", color: "gold" },
  unpaid: { label: "To'lanmagan", color: "red" },
};
const PAYMENT_METHOD_LABEL = {
  cash: "Naqd",
  card: "Karta",
  transfer: "Pul o'tkazma",
  other: "Boshqa",
};

function fmtMoney(value, currency) {
  if (value === null || value === undefined || value === "") return "—";
  const n = Number(value);
  if (Number.isNaN(n)) return String(value);
  return `${n.toLocaleString("ru-RU")} ${currency || "so'm"}`;
}

export default function PortalFitnessClientPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await getFitnessClientPortalSummary());
    } catch {
      message.error("Ma'lumot yuklanmadi.");
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

  const c = data.client || {};
  const am = data.active_membership;
  const totalSessions = am?.sessions_total || 0;
  const usedSessions = am?.sessions_used || 0;
  const sessionsLeft = am?.sessions_left;
  const daysLeft = am?.days_left;

  return (
    <>
      <Typography.Title level={3} style={{ marginTop: 0 }}>
        {data.business?.name}
      </Typography.Title>
      <Typography.Text type="secondary">
        {data.business?.city ? `${data.business.city} · ` : null}
        Salom, {c.full_name}! Bu yerda abonement va davomatingizni kuzatib borishingiz mumkin.
      </Typography.Text>

      {c.announcement ? (
        <Alert
          style={{ marginTop: 16 }}
          type="info"
          showIcon
          message={<strong>Markazdan eslatma</strong>}
          description={c.announcement}
        />
      ) : null}

      {am ? (
        <Card
          title="Joriy abonement"
          size="small"
          style={{ marginTop: 16 }}
          extra={
            am.payment_status ? (
              <Tag color={PAYMENT_STATUS_LABEL[am.payment_status]?.color || "default"}>
                {PAYMENT_STATUS_LABEL[am.payment_status]?.label || am.payment_status}
              </Tag>
            ) : null
          }
        >
          <Typography.Title level={4} style={{ marginTop: 0 }}>
            {am.title}
          </Typography.Title>

          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} md={6}>
              <Statistic
                title="Boshlanishi"
                value={am.start_date ? dayjs(am.start_date).format("DD.MM.YYYY") : "—"}
              />
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Statistic
                title="Tugashi"
                value={am.end_date ? dayjs(am.end_date).format("DD.MM.YYYY") : "—"}
                valueStyle={am.is_expired ? { color: "#cf1322" } : undefined}
              />
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Statistic
                title="Qolgan kun"
                value={daysLeft === null || daysLeft === undefined ? "—" : daysLeft}
                suffix={daysLeft !== null && daysLeft !== undefined ? "kun" : null}
                valueStyle={
                  am.is_expired
                    ? { color: "#cf1322" }
                    : daysLeft !== null && daysLeft !== undefined && daysLeft <= 5
                      ? { color: "#fa8c16" }
                      : { color: "#3f8600" }
                }
              />
              {am.is_expired ? (
                <Typography.Text type="danger" style={{ fontSize: 12 }}>
                  Muddati tugagan
                </Typography.Text>
              ) : null}
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Statistic
                title="Qolgan mashg'ulot"
                value={
                  totalSessions === 0
                    ? "Cheksiz"
                    : sessionsLeft === null || sessionsLeft === undefined
                      ? "—"
                      : sessionsLeft
                }
                suffix={totalSessions > 0 ? `/ ${totalSessions}` : null}
              />
              {totalSessions > 0 ? (
                <Progress
                  size="small"
                  percent={Math.min(100, Math.round(((sessionsLeft || 0) / totalSessions) * 100))}
                  status={sessionsLeft === 0 ? "exception" : "active"}
                  showInfo={false}
                  style={{ marginTop: 4 }}
                />
              ) : null}
            </Col>
          </Row>

          <Descriptions column={{ xs: 1, sm: 2, md: 3 }} size="small" style={{ marginTop: 12 }}>
            <Descriptions.Item label="Narxi">
              {fmtMoney(am.expected_amount, am.currency)}
            </Descriptions.Item>
            <Descriptions.Item label="To'langan">
              {fmtMoney(am.paid_amount, am.currency)}
            </Descriptions.Item>
            <Descriptions.Item label="Qarz">
              {Number(am.debt_amount || 0) > 0 ? (
                <Typography.Text type="danger" strong>
                  {fmtMoney(am.debt_amount, am.currency)}
                </Typography.Text>
              ) : (
                <Typography.Text type="success">Qarzdorlik yo'q</Typography.Text>
              )}
            </Descriptions.Item>
          </Descriptions>
        </Card>
      ) : (
        <Card size="small" style={{ marginTop: 16 }}>
          <Empty
            description={
              c.client_type === "daily"
                ? "Siz kunlik mijozsiz — abonement biriktirilmagan."
                : "Faol abonement yo'q. Iltimos, markaz ma'muriyatiga murojaat qiling."
            }
          />
        </Card>
      )}

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} md={12}>
          <Card title="Davomat" size="small">
            <Row gutter={16}>
              <Col span={12}>
                <Statistic title="Bu oyda tashriflar" value={data.attendance_summary?.this_month ?? 0} />
              </Col>
              <Col span={12}>
                <Statistic title="Jami tashriflar" value={data.attendance_summary?.total ?? 0} />
              </Col>
            </Row>
            <Table
              size="small"
              style={{ marginTop: 12 }}
              dataSource={data.recent_attendance || []}
              rowKey="id"
              pagination={{ pageSize: 8, size: "small" }}
              locale={{ emptyText: "Hozircha tashrif yo'q" }}
              columns={[
                {
                  title: "Sana",
                  dataIndex: "visit_date",
                  render: (v) => (v ? dayjs(v).format("DD.MM.YYYY") : "—"),
                },
                {
                  title: "Vaqt",
                  dataIndex: "visit_time",
                  render: (v) => v || "—",
                },
                {
                  title: "Turi",
                  dataIndex: "client_type",
                  render: (v) => (
                    <Tag color={v === "daily" ? "blue" : "green"}>
                      {CLIENT_TYPE_LABEL[v] || v}
                    </Tag>
                  ),
                },
              ]}
            />
          </Card>
        </Col>

        <Col xs={24} md={12}>
          <Card title="To'lovlar" size="small">
            <Row gutter={16}>
              <Col span={12}>
                <Statistic title="Jami to'langan" value={fmtMoney(data.total_paid, am?.currency || "UZS")} />
              </Col>
              <Col span={12}>
                <Statistic
                  title="Jami qarz"
                  value={fmtMoney(data.total_debt, am?.currency || "UZS")}
                  valueStyle={Number(data.total_debt || 0) > 0 ? { color: "#cf1322" } : undefined}
                />
              </Col>
            </Row>
            <Table
              size="small"
              style={{ marginTop: 12 }}
              dataSource={data.recent_payments || []}
              rowKey="id"
              pagination={{ pageSize: 8, size: "small" }}
              locale={{ emptyText: "Hozircha to'lov yo'q" }}
              columns={[
                {
                  title: "Sana",
                  dataIndex: "payment_date",
                  render: (v) => (v ? dayjs(v).format("DD.MM.YYYY") : "—"),
                },
                {
                  title: "Summa",
                  dataIndex: "amount",
                  render: (v, row) => fmtMoney(v, row.currency),
                },
                {
                  title: "Usul",
                  dataIndex: "method",
                  render: (v) => PAYMENT_METHOD_LABEL[v] || v,
                },
              ]}
            />
          </Card>
        </Col>
      </Row>

      <Card title="Abonementlar tarixi" size="small" style={{ marginTop: 16 }}>
        <Table
          size="small"
          dataSource={data.memberships || []}
          rowKey="id"
          pagination={false}
          locale={{ emptyText: "Hozircha abonement yo'q" }}
          columns={[
            { title: "Abonement", dataIndex: "title" },
            {
              title: "Boshlanishi",
              dataIndex: "start_date",
              render: (v) => (v ? dayjs(v).format("DD.MM.YYYY") : "—"),
            },
            {
              title: "Tugashi",
              dataIndex: "end_date",
              render: (v) => (v ? dayjs(v).format("DD.MM.YYYY") : "—"),
            },
            {
              title: "Holat",
              dataIndex: "status",
              render: (v) => <Tag>{STATUS_LABEL[v] || v}</Tag>,
            },
            {
              title: "To'lov",
              dataIndex: "payment_status",
              render: (v) => (
                <Tag color={PAYMENT_STATUS_LABEL[v]?.color || "default"}>
                  {PAYMENT_STATUS_LABEL[v]?.label || v}
                </Tag>
              ),
            },
            {
              title: "Qarz",
              dataIndex: "debt_amount",
              render: (v, row) =>
                Number(v || 0) > 0 ? (
                  <Typography.Text type="danger">{fmtMoney(v, row.currency)}</Typography.Text>
                ) : (
                  <Typography.Text type="success">0</Typography.Text>
                ),
            },
          ]}
        />
      </Card>

      <Card title="Markaz kontakt ma'lumotlari" size="small" style={{ marginTop: 16 }}>
        <Descriptions column={{ xs: 1, sm: 2 }} size="small">
          <Descriptions.Item label="Telefon">
            {formatPhone(data.business?.phone) || "—"}
          </Descriptions.Item>
          <Descriptions.Item label="Manzil">{data.business?.address || "—"}</Descriptions.Item>
          <Descriptions.Item label="Ish vaqti">
            {data.business?.working_hours || "—"}
          </Descriptions.Item>
          <Descriptions.Item label="Mening telefonim">
            {formatPhone(c.phone) || "—"}
          </Descriptions.Item>
        </Descriptions>
      </Card>
    </>
  );
}
