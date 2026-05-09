import { Button, Card, Col, Descriptions, Input, Modal, Row, Select, Space, Table, Tag, Typography, message } from "antd";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import PageHeader from "../../components/ui/PageHeader";
import LoadingScreen from "../../components/ui/LoadingScreen";
import StatusTag from "../../components/ui/StatusTag";
import { BUSINESS_STATUS } from "../../config/statusConfigs";
import { formatPhone, formatDate, formatUsd } from "../../utils/formatters";
import { getBusiness, resetBusinessOwnerCredentials, updateBusiness } from "../../services/businessService";
import { getItems } from "../../services/itemService";
import { getLeads } from "../../services/leadService";
import { getSubscriptions, getPlans, upgradeSubscription } from "../../services/subscriptionService";
import { getAIUsage } from "../../services/aiUsageService";
import { PLAN_LABELS } from "../../config/planConfigs";
import AdminEduPortalSection from "./AdminEduPortalSection";

export default function BusinessDetailPage() {
  const { id } = useParams();
  const [biz, setBiz] = useState(null);
  const [items, setItems] = useState([]);
  const [leads, setLeads] = useState([]);
  const [subs, setSubs] = useState([]);
  const [plans, setPlans] = useState([]);
  const [aiRows, setAiRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [subModal, setSubModal] = useState(false);
  const [planCode, setPlanCode] = useState();
  const [credModal, setCredModal] = useState(false);
  const [customUsername, setCustomUsername] = useState("");
  const [customPassword, setCustomPassword] = useState("");
  const [credLoading, setCredLoading] = useState(false);
  const [newCreds, setNewCreds] = useState(null);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const b = await getBusiness(id);
      setBiz(b);
      const [it, ld, sb, pl, ai] = await Promise.all([
        getItems({ business_id: id }),
        getLeads({ business_id: id }),
        getSubscriptions({ business_id: id }),
        getPlans(),
        getAIUsage({ business_id: id }),
      ]);
      setItems(it.slice(0, 8));
      setLeads(ld.slice(0, 8));
      setSubs(sb);
      setPlans(pl);
      setAiRows((ai.rows || []).slice(0, 10));
    } catch {
      message.error("Ma’lumot yuklanmadi.");
      setBiz(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  const patchBiz = async (body) => {
    try {
      await updateBusiness(id, body);
      message.success("Yangilandi.");
      load();
    } catch (e) {
      message.error(e.response?.data?.detail || "Xatolik.");
    }
  };

  const onUpgrade = async () => {
    if (!planCode) return;
    try {
      await upgradeSubscription({ business_id: Number(id), plan_code: planCode });
      message.success("Obuna yangilandi.");
      setSubModal(false);
      load();
    } catch (e) {
      message.error(e.response?.data?.detail || "Xatolik.");
    }
  };

  const onResetOwnerCredentials = async () => {
    try {
      setCredLoading(true);
      const body = {};
      if (customUsername.trim()) body.username = customUsername.trim();
      if (customPassword) body.password = customPassword;
      const data = await resetBusinessOwnerCredentials(id, body);
      setNewCreds(data);
      setCustomPassword("");
      setCustomUsername(data.username || "");
      setBiz((prev) => (prev ? { ...prev, owner_username: data.username } : prev));
      message.success("Login/parol yangilandi.");
    } catch (e) {
      message.error(e.response?.data?.detail || "Xatolik.");
    } finally {
      setCredLoading(false);
    }
  };

  if (loading && !biz) return <LoadingScreen />;
  if (!biz) return <Typography.Text>Topilmadi.</Typography.Text>;

  const currentSub = subs[0];

  return (
    <>
      <PageHeader
        title={biz.name}
        description="Biznes profili va tezkor statistikalar."
        extra={
          <Space wrap>
            <Link to={`/b/${biz.slug}`} target="_blank" rel="noreferrer">
              <Button>Ochiq sahifa</Button>
            </Link>
            <Button
              onClick={() => patchBiz({ status: biz.status === "blocked" ? "active" : "blocked" })}
            >
              {biz.status === "blocked" ? "Faollashtirish" : "Bloklash"}
            </Button>
            <Button onClick={() => patchBiz({ is_featured: !biz.is_featured })}>
              {biz.is_featured ? "Tavsiyadan olib tashlash" : "Tavsiya qilish"}
            </Button>
            <Button type="primary" onClick={() => setSubModal(true)}>
              Obunani o‘zgartirish
            </Button>
            <Button onClick={() => setCredModal(true)}>Login/parolni tiklash</Button>
          </Space>
        }
      />
      <Card style={{ marginBottom: 16 }}>
        <Descriptions column={{ xs: 1, sm: 2, md: 3 }} bordered size="small">
          <Descriptions.Item label="Holat">
            <StatusTag map={BUSINESS_STATUS} value={biz.status} />
          </Descriptions.Item>
          <Descriptions.Item label="Tavsiya">{biz.is_featured ? <Tag color="gold">Ha</Tag> : "Yo‘q"}</Descriptions.Item>
          <Descriptions.Item label="Reyting">{biz.rating}</Descriptions.Item>
          <Descriptions.Item label="Kategoriya">{biz.category_name}</Descriptions.Item>
          <Descriptions.Item label="Shahar">{biz.city_name}</Descriptions.Item>
          <Descriptions.Item label="Telefon">{formatPhone(biz.phone)}</Descriptions.Item>
          <Descriptions.Item label="Manzil" span={3}>
            {biz.address || "—"}
          </Descriptions.Item>
          <Descriptions.Item label="Ish vaqti" span={3}>
            {biz.working_hours || "—"}
          </Descriptions.Item>
          <Descriptions.Item label="Egasi (ID)">{biz.owner}</Descriptions.Item>
          <Descriptions.Item label="Egasi login">{biz.owner_username || "—"}</Descriptions.Item>
          <Descriptions.Item label="Tavsif" span={3}>
            {biz.description || "—"}
          </Descriptions.Item>
          {biz.business_type === "education_center" ? (
            <Descriptions.Item label="Tur" span={3}>
              <Tag color="blue">O‘quv markaz</Tag> — quyida ustoz / o‘quvchi kabinet loginlari
            </Descriptions.Item>
          ) : null}
        </Descriptions>
      </Card>
      {biz.business_type === "education_center" ? <AdminEduPortalSection businessId={Number(id)} /> : null}
      <Row gutter={[16, 16]}>
        <Col xs={24} md={8}>
          <Card title="Obuna">
            {currentSub ? (
              <>
                <div>
                  <strong>{currentSub.plan_name || "Reja"}</strong>
                </div>
                <div>Holat: {currentSub.status}</div>
                <div>Keyingi to‘lov: {formatDate(currentSub.next_payment_date)}</div>
              </>
            ) : (
              <Typography.Text type="secondary">Obuna topilmadi.</Typography.Text>
            )}
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card title="Pozitsiyalar">{items.length} ta (oxirgilari jadvalda)</Card>
        </Col>
        <Col xs={24} md={8}>
          <Card title="AI xabarlari (oxirgi)">{aiRows.length} yozuv</Card>
        </Col>
      </Row>
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={12}>
          <Card title="Oxirgi lidlar">
            <Table
              size="small"
              rowKey="id"
              dataSource={leads}
              pagination={false}
              columns={[
                { title: "Ism", dataIndex: "name" },
                { title: "Telefon", dataIndex: "phone" },
                { title: "Holat", dataIndex: "status" },
              ]}
            />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Oxirgi pozitsiyalar">
            <Table
              size="small"
              rowKey="id"
              dataSource={items}
              pagination={false}
              columns={[
                { title: "Nomi", dataIndex: "title" },
                { title: "Narx", dataIndex: "price" },
                { title: "Holat", dataIndex: "status" },
              ]}
            />
          </Card>
        </Col>
      </Row>
      <Card title="AI ishlatish (oxirgi)" style={{ marginTop: 16 }}>
        <Table
          size="small"
          rowKey="id"
          dataSource={aiRows}
          pagination={false}
            columns={[
                { title: "Vaqt", dataIndex: "created_at", render: formatDate },
                { title: "Tokenlar", dataIndex: "total_tokens" },
                {
                  title: "Sarfi (≈USD)",
                  dataIndex: "estimated_cost",
                  render: (v) => formatUsd(v),
                },
                { title: "Xulosa", dataIndex: "response", ellipsis: true },
              ]}
        />
      </Card>
      <Modal title="Obunani yangilash" open={subModal} onCancel={() => setSubModal(false)} onOk={onUpgrade} okText="Saqlash" cancelText="Bekor">
        <Typography.Paragraph type="secondary">Yangi obuna yozuvi yaratiladi (backend qoidalariga ko‘ra).</Typography.Paragraph>
        <Select
          style={{ width: "100%" }}
          placeholder="Tarif"
          value={planCode}
          onChange={setPlanCode}
          options={plans.map((p) => ({ value: p.code, label: `${p.name} (${PLAN_LABELS[p.code] || p.code})` }))}
        />
      </Modal>
      <Modal
        title="Biznes egasi login/parolini tiklash"
        open={credModal}
        onCancel={() => {
          setCredModal(false);
          setNewCreds(null);
          setCustomUsername("");
          setCustomPassword("");
        }}
        onOk={onResetOwnerCredentials}
        okText="Yangilash"
        confirmLoading={credLoading}
      >
        <Typography.Paragraph type="secondary">
          Username kiritsangiz owner login o‘zgaradi. Parol bo‘sh qoldirilsa, tizim tasodifiy kuchli parol yaratadi.
        </Typography.Paragraph>
        <Input
          style={{ marginBottom: 8 }}
          placeholder={`Username (hozirgi: ${biz.owner_username || "—"})`}
          value={customUsername}
          onChange={(e) => setCustomUsername(e.target.value)}
        />
        <Input.Password
          placeholder="Yangi parol (ixtiyoriy)"
          value={customPassword}
          onChange={(e) => setCustomPassword(e.target.value)}
        />
        {newCreds ? (
          <Card size="small" style={{ marginTop: 12, background: "#fafafa" }}>
            <div>
              <strong>Login:</strong> {newCreds.username}
            </div>
            <div>
              <strong>Parol:</strong> {newCreds.password}
            </div>
          </Card>
        ) : null}
      </Modal>
    </>
  );
}
