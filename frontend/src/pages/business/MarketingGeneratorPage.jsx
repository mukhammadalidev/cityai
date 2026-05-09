import { Alert, Button, Card, Form, Input, Select, Space, Table, Typography, message } from "antd";
import { CopyOutlined } from "@ant-design/icons";
import { useCallback, useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import PageHeader from "../../components/ui/PageHeader";
import LoadingScreen from "../../components/ui/LoadingScreen";
import UpgradeCard from "../../components/ui/UpgradeCard";
import { generateContent, getHistory } from "../../services/marketingService";
import { getSubscriptions, getPlans } from "../../services/subscriptionService";
import { getItems } from "../../services/itemService";
import { formatDateTime } from "../../utils/formatters";
import { useWindowEvent } from "../../hooks/useWindowEvent";
import { BUSINESS_DATA_CHANGED } from "../../utils/businessEvents";

const CONTENT_TYPES = [
  { value: "instagram_post", label: "Instagram post" },
  { value: "telegram_post", label: "Telegram post" },
  { value: "reels_script", label: "Reels ssenariy" },
  { value: "ad_copy", label: "Reklama matni" },
  { value: "story", label: "Story matni" },
  { value: "product_desc", label: "Mahsulot/xizmat tavsifi" },
];

export default function MarketingGeneratorPage() {
  const { businessId } = useOutletContext();
  const [allowed, setAllowed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [history, setHistory] = useState([]);
  const [result, setResult] = useState("");
  const [form] = Form.useForm();

  const checkPlan = useCallback(async () => {
    if (!businessId) return;
    setLoading(true);
    try {
      const [subs, plans] = await Promise.all([getSubscriptions({ business_id: businessId }), getPlans()]);
      const sub = subs[0];
      const plan = plans.find((p) => p.id === sub?.plan);
      setAllowed(Boolean(plan?.has_marketing_generator));
      const it = await getItems({ business_id: businessId });
      setItems(it);
      const h = await getHistory({ business_id: businessId });
      setHistory(h);
    } catch {
      setAllowed(false);
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  useEffect(() => {
    checkPlan();
  }, [checkPlan]);

  useWindowEvent("business-changed", checkPlan);
  useWindowEvent(BUSINESS_DATA_CHANGED, checkPlan);

  const onGenerate = async () => {
    const v = await form.validateFields();
    try {
      const item = items.find((i) => i.id === v.item_id);
      const prompt = [item && `Pozitsiya: ${item.title}`, v.extra].filter(Boolean).join("\n");
      const res = await generateContent({
        business_id: businessId,
        content_type: v.content_type,
        prompt,
      });
      setResult(res.result || res.text || JSON.stringify(res));
      message.success("Generatsiya tayyor.");
      await checkPlan();
    } catch (e) {
      const d = e.response?.data?.detail;
      const text = typeof d === "string" ? d : Array.isArray(d) ? d[0] : d ? String(d) : null;
      message.error(text || "Xatolik.");
    }
  };

  const copy = async () => {
    await navigator.clipboard.writeText(result);
    message.success("Nusxa olindi.");
  };

  if (!businessId) return null;
  if (loading) return <LoadingScreen />;

  if (!allowed) {
    return (
      <>
        <PageHeader title="Marketing generator" description="Kontent yaratish vositalari." />
        <UpgradeCard title="Marketing generator" description="Marketing generator faqat Business va Premium tariflarda mavjud." />
      </>
    );
  }

  return (
    <>
      <PageHeader title="Marketing generator" description="Ijtimoiy tarmoqlar va reklama matnlari." />
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
        message="Matn OpenAI orqali yaratiladi. Serverda «OPENAI_API_KEY» bo‘lmasa, tizim ogohlantirish matnini qaytaradi — .env ni tekshiring."
      />
      <Card>
        <Form form={form} layout="vertical" onFinish={onGenerate} style={{ maxWidth: 520 }}>
          <Form.Item name="content_type" label="Kontent turi" rules={[{ required: true }]}>
            <Select options={CONTENT_TYPES} />
          </Form.Item>
          <Form.Item name="item_id" label="Pozitsiya tanlash">
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              options={items.map((i) => ({ value: i.id, label: i.title }))}
            />
          </Form.Item>
          <Form.Item name="extra" label="Qo‘shimcha prompt">
            <Input.TextArea rows={3} placeholder="Uslub, auditoriya, chegirma..." />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit">
              Generatsiya
            </Button>
          </Form.Item>
        </Form>
        {result && (
          <Space direction="vertical" style={{ width: "100%" }}>
            <Typography.Title level={5}>Natija</Typography.Title>
            <Typography.Paragraph style={{ whiteSpace: "pre-wrap", background: "#f5f7fb", padding: 12, borderRadius: 8 }}>{result}</Typography.Paragraph>
            <Button icon={<CopyOutlined />} onClick={copy}>
              Nusxa olish
            </Button>
          </Space>
        )}
      </Card>
      <Card title="Tarix" style={{ marginTop: 16 }}>
        <Table
          size="small"
          rowKey="id"
          dataSource={history}
          pagination={{ pageSize: 8 }}
          columns={[
            { title: "Vaqt", dataIndex: "created_at", render: formatDateTime },
            { title: "Tur", dataIndex: "content_type" },
            { title: "Natija", dataIndex: "result", ellipsis: true },
          ]}
        />
      </Card>
    </>
  );
}
