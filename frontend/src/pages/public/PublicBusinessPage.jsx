import { Button, Card, Col, DatePicker, Form, Input, Rate, Row, Select, Space, Typography, message } from "antd";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import LoadingScreen from "../../components/ui/LoadingScreen";
import EmptyState from "../../components/ui/EmptyState";
import DynamicItemCard from "../../components/dynamic/DynamicItemCard";
import { getBusinessBySlug } from "../../services/businessService";
import { getItems } from "../../services/itemService";
import { createLead } from "../../services/leadService";
import { createBooking } from "../../services/bookingService";
import { formatPhone, mediaUrl } from "../../utils/formatters";
import { notifyBusinessDataChanged } from "../../utils/businessEvents";

const FITNESS_TRAINING_TYPES = [
  "Fitness",
  "Bodybuilding",
  "Crossfit",
  "Yoga",
  "Cardio",
  "Personal training",
];

const TELEGRAM_BOT_URL =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_TELEGRAM_BOT_URL) ||
  "https://t.me/citybotuz_bot";

export default function PublicBusinessPage() {
  const { businessSlug } = useParams();
  const [biz, setBiz] = useState(null);
  const [courseItems, setCourseItems] = useState([]);
  const [materialItems, setMaterialItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form] = Form.useForm();
  const [bookingForm] = Form.useForm();
  const isFitnessCenter = biz?.business_type === "fitness_center";
  const fitnessTrainers = useMemo(() => {
    if (!isFitnessCenter) return [];
    const map = new Map();
    courseItems.forEach((it) => {
      const m = it.metadata || {};
      const name = (m.trainer_name || "").trim();
      if (!name) return;
      const entry = map.get(name) || { name, types: new Set(), schedules: new Set() };
      if (m.training_type) entry.types.add(m.training_type);
      if (m.schedule) entry.schedules.add(m.schedule);
      map.set(name, entry);
    });
    return Array.from(map.values()).slice(0, 12);
  }, [isFitnessCenter, courseItems]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const b = await getBusinessBySlug(businessSlug);
        setBiz(b);
        const it = await getItems({ business_id: b.id });
        if (b.business_type === "education_center") {
          const courses = it.filter((i) => i.education_catalog_kind === "course" || !i.education_catalog_kind);
          const mats = it.filter((i) => i.education_catalog_kind === "book" || i.education_catalog_kind === "product");
          setCourseItems(courses.slice(0, 24));
          setMaterialItems(mats.slice(0, 24));
        } else {
          setCourseItems(it.slice(0, 12));
          setMaterialItems([]);
        }
      } catch {
        message.error("Biznes ma’lumotlari yuklanmadi.");
        setBiz(null);
        setCourseItems([]);
        setMaterialItems([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [businessSlug]);

  const onLead = async (values) => {
    if (!biz) return;
    try {
      const isFitness = biz.business_type === "fitness_center";
      await createLead({
        city: biz.city,
        business: biz.id,
        category: biz.category,
        name: values.name,
        phone: values.phone,
        message: values.message,
        source: "public_page",
        lead_type: isFitness ? "membership_request" : "general",
        item: values.interested_abonement || undefined,
      });
      message.success("So‘rovingiz yuborildi.");
      form.resetFields();
      notifyBusinessDataChanged();
    } catch (err) {
      message.error(err.response?.data?.detail || "Yuborib bo‘lmadi.");
    }
  };

  const onTrialBooking = async (values) => {
    if (!biz) return;
    try {
      const preferredDate = values.preferred_date
        ? values.preferred_date.format("YYYY-MM-DD")
        : null;
      const preferredTime = values.preferred_time
        ? values.preferred_time.format("HH:mm")
        : null;
      await createBooking({
        city: biz.city,
        business: biz.id,
        booking_type: "trial_lesson",
        name: values.name,
        phone: values.phone,
        preferred_date: preferredDate,
        preferred_time: preferredTime,
        note: values.note || "",
        metadata: {
          training_type: values.training_type || "Fitness",
          source: "fitness_trial",
        },
      });
      message.success("Sinov mashg‘ulot arizangiz qabul qilindi.");
      bookingForm.resetFields();
      notifyBusinessDataChanged();
    } catch (err) {
      message.error(err.response?.data?.detail || "Yuborib bo‘lmadi.");
    }
  };

  if (loading) return <LoadingScreen />;
  if (!biz) return <EmptyState description="Biznes topilmadi." />;

  return (
    <div>
      <div
        className="cs-business-cover"
        style={{
          height: 220,
          background: biz.cover_image ? `url(${mediaUrl(biz.cover_image)}) center/cover` : "linear-gradient(120deg,#2563eb,#7c3aed)",
        }}
      />
      <div style={{ padding: "24px", maxWidth: 1100, margin: "0 auto" }}>
        <Row gutter={24} align="middle">
          <Col>
            {biz.logo ? (
              <img src={mediaUrl(biz.logo)} alt="" style={{ width: 96, height: 96, borderRadius: 16, objectFit: "cover", marginTop: -48, border: "4px solid #fff" }} />
            ) : (
              <div style={{ width: 96, height: 96, borderRadius: 16, background: "#f0f0f0", marginTop: -48 }} />
            )}
          </Col>
          <Col flex={1}>
            <Typography.Title level={2} style={{ marginBottom: 4 }}>
              {biz.name}
            </Typography.Title>
            <Rate disabled value={Number(biz.rating || 0)} allowHalf style={{ fontSize: 16 }} />
            <Typography.Paragraph style={{ marginTop: 8 }}>{biz.description}</Typography.Paragraph>
            <Typography.Paragraph>
              <strong>Telefon:</strong> {formatPhone(biz.phone)}
            </Typography.Paragraph>
            <Typography.Paragraph>
              <strong>Manzil:</strong> {biz.address || "—"}
            </Typography.Paragraph>
            <Typography.Paragraph>
              <strong>Ish vaqti:</strong> {biz.working_hours || "—"}
            </Typography.Paragraph>
          </Col>
        </Row>
        {isFitnessCenter ? (
          <>
            <Space wrap style={{ marginTop: 16 }}>
              <Button
                type="primary"
                size="large"
                onClick={() => {
                  const el = document.getElementById("fitness-trial-form");
                  if (el) el.scrollIntoView({ behavior: "smooth" });
                }}
              >
                Sinov mashg‘ulotga yozilish
              </Button>
              <Button
                size="large"
                href={TELEGRAM_BOT_URL}
                target="_blank"
                rel="noreferrer"
              >
                Telegram botga o‘tish
              </Button>
            </Space>
            <Typography.Title level={4} style={{ marginTop: 32 }}>
              Abonementlar
            </Typography.Title>
            <Row gutter={[16, 16]}>
              {courseItems.map((item) => (
                <Col xs={24} sm={12} md={8} key={item.id}>
                  <DynamicItemCard item={item} businessType={biz.business_type} />
                </Col>
              ))}
            </Row>
            {!courseItems.length && <EmptyState description="Abonementlar hozircha yo‘q." />}
            <Typography.Title level={4} style={{ marginTop: 32 }}>
              Trenerlar
            </Typography.Title>
            {fitnessTrainers.length ? (
              <Row gutter={[16, 16]}>
                {fitnessTrainers.map((t) => (
                  <Col xs={24} sm={12} md={8} key={t.name}>
                    <Card title={`👨‍🏫 ${t.name}`}>
                      <div>🏷 Yo‘nalish: {Array.from(t.types).join(", ") || "—"}</div>
                      <div>📅 Jadval: {Array.from(t.schedules).join(" · ") || "—"}</div>
                    </Card>
                  </Col>
                ))}
              </Row>
            ) : (
              <Typography.Paragraph type="secondary">
                Hozircha trenerlar haqida ma’lumot kiritilmagan.
              </Typography.Paragraph>
            )}
            <Card
              id="fitness-trial-form"
              title="Bepul sinov mashg‘ulotga yozilish"
              style={{ marginTop: 32 }}
            >
              <Form form={bookingForm} layout="vertical" onFinish={onTrialBooking} style={{ maxWidth: 480 }}>
                <Form.Item name="name" label="Ism" rules={[{ required: true }]}>
                  <Input />
                </Form.Item>
                <Form.Item name="phone" label="Telefon" rules={[{ required: true }]}>
                  <Input placeholder="+998 ..." />
                </Form.Item>
                <Form.Item
                  name="training_type"
                  label="Yo‘nalish"
                  initialValue="Fitness"
                  rules={[{ required: true }]}
                >
                  <Select options={FITNESS_TRAINING_TYPES.map((t) => ({ value: t, label: t }))} />
                </Form.Item>
                <Form.Item name="preferred_date" label="Qulay sana" rules={[{ required: true }]}>
                  <DatePicker style={{ width: "100%" }} format="DD.MM.YYYY" />
                </Form.Item>
                <Form.Item name="preferred_time" label="Qulay vaqt" rules={[{ required: true }]}>
                  <DatePicker.TimePicker style={{ width: "100%" }} format="HH:mm" minuteStep={5} />
                </Form.Item>
                <Form.Item name="note" label="Izoh">
                  <Input.TextArea rows={3} />
                </Form.Item>
                <Form.Item>
                  <Button type="primary" htmlType="submit">
                    Yuborish
                  </Button>
                </Form.Item>
              </Form>
            </Card>
          </>
        ) : biz.business_type === "education_center" ? (
          <>
            <Typography.Title level={4} style={{ marginTop: 32 }}>
              Kurslar
            </Typography.Title>
            <Row gutter={[16, 16]}>
              {courseItems.map((item) => (
                <Col xs={24} sm={12} md={8} key={item.id}>
                  <DynamicItemCard item={item} businessType={biz.business_type} />
                </Col>
              ))}
            </Row>
            {!courseItems.length && <EmptyState description="Kurslar hozircha yo‘q." />}
            <Typography.Title level={4} style={{ marginTop: 32 }}>
              Materiallar (kitob va mahsulotlar)
            </Typography.Title>
            <Row gutter={[16, 16]}>
              {materialItems.map((item) => (
                <Col xs={24} sm={12} md={8} key={item.id}>
                  <DynamicItemCard item={item} businessType={biz.business_type} />
                </Col>
              ))}
            </Row>
            {!materialItems.length && (
              <Typography.Paragraph type="secondary">Materiallar ro‘yxati bo‘sh.</Typography.Paragraph>
            )}
          </>
        ) : (
          <>
            <Typography.Title level={4} style={{ marginTop: 32 }}>
              Xizmatlar / mahsulotlar
            </Typography.Title>
            <Row gutter={[16, 16]}>
              {courseItems.map((item) => (
                <Col xs={24} sm={12} md={8} key={item.id}>
                  <DynamicItemCard item={item} businessType={biz.business_type} />
                </Col>
              ))}
            </Row>
            {!courseItems.length && <EmptyState description="Pozitsiyalar hozircha yo‘q." />}
          </>
        )}
        <Card
          title={isFitnessCenter ? "Abonement bo‘yicha so‘rov qoldirish" : "Murojaat qoldirish"}
          style={{ marginTop: 32 }}
        >
          <Form form={form} layout="vertical" onFinish={onLead} style={{ maxWidth: 480 }}>
            <Form.Item name="name" label="Ism" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item name="phone" label="Telefon" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            {isFitnessCenter && (
              <Form.Item name="interested_abonement" label="Qiziqtirgan abonement">
                <Select
                  allowClear
                  options={courseItems.map((it) => ({ value: it.id, label: it.title }))}
                  placeholder="Tanlang (ixtiyoriy)"
                />
              </Form.Item>
            )}
            <Form.Item name="message" label="Xabar">
              <Input.TextArea rows={4} />
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit">
                Yuborish
              </Button>
            </Form.Item>
          </Form>
        </Card>
      </div>
    </div>
  );
}
