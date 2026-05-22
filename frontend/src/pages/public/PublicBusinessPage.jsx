import { Button, Col, DatePicker, Form, Input, Rate, Row, Select, Space, Typography, message } from "antd";
import { Clock, MapPin, MessageCircle, Phone } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import LoadingScreen from "../../components/ui/LoadingScreen";
import EmptyState from "../../components/ui/EmptyState";
import DynamicItemCard from "../../components/dynamic/DynamicItemCard";
import { getBusinessTypeConfig } from "../../config/businessTypes";
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
  const [catalogItems, setCatalogItems] = useState([]);
  const [materialItems, setMaterialItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form] = Form.useForm();
  const [bookingForm] = Form.useForm();

  const cfg = getBusinessTypeConfig(biz?.business_type);
  const bt = biz?.business_type;
  const isFitness = bt === "fitness_center";
  const isEducation = bt === "education_center";
  const isRestaurant = bt === "restaurant";
  const isAuto = bt === "auto_salon";

  const fitnessTrainers = useMemo(() => {
    if (!isFitness) return [];
    const map = new Map();
    catalogItems.forEach((it) => {
      const m = it.metadata || {};
      const name = (m.trainer_name || "").trim();
      if (!name) return;
      const entry = map.get(name) || { name, types: new Set(), schedules: new Set() };
      if (m.training_type) entry.types.add(m.training_type);
      if (m.schedule) entry.schedules.add(m.schedule);
      map.set(name, entry);
    });
    return Array.from(map.values()).slice(0, 12);
  }, [isFitness, catalogItems]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const b = await getBusinessBySlug(businessSlug);
        setBiz(b);
        const it = await getItems({ business_id: b.id });
        if (b.business_type === "education_center") {
          setCatalogItems(
            it.filter((i) => i.education_catalog_kind === "course" || !i.education_catalog_kind).slice(0, 24)
          );
          setMaterialItems(
            it.filter((i) => i.education_catalog_kind === "book" || i.education_catalog_kind === "product").slice(0, 24)
          );
        } else {
          setCatalogItems(it.slice(0, 24));
          setMaterialItems([]);
        }
      } catch {
        message.error("Biznes ma'lumotlari yuklanmadi.");
        setBiz(null);
        setCatalogItems([]);
        setMaterialItems([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [businessSlug]);

  const onLead = async (values) => {
    if (!biz) return;
    try {
      await createLead({
        city: biz.city,
        business: biz.id,
        category: biz.category,
        name: values.name,
        phone: values.phone,
        message: values.message,
        source: "public_page",
        lead_type: isFitness ? "membership_request" : isAuto ? "car_interest" : "general",
        item: values.interested_item || undefined,
      });
      message.success("So'rovingiz yuborildi. Tez orada bog'lanamiz!");
      form.resetFields();
      notifyBusinessDataChanged();
    } catch (err) {
      message.error(err.response?.data?.detail || "Yuborib bo'lmadi.");
    }
  };

  const onTrialBooking = async (values) => {
    if (!biz) return;
    try {
      const bookingType = isRestaurant ? "table_booking" : isAuto ? "test_drive" : "trial_lesson";
      await createBooking({
        city: biz.city,
        business: biz.id,
        booking_type: bookingType,
        name: values.name,
        phone: values.phone,
        preferred_date: values.preferred_date ? values.preferred_date.format("YYYY-MM-DD") : null,
        preferred_time: values.preferred_time ? values.preferred_time.format("HH:mm") : null,
        guests_count: values.guests_count,
        note: values.note || "",
        metadata: {
          training_type: values.training_type,
          source: "public_page",
        },
      });
      message.success(
        isRestaurant ? "Stol bron arizangiz qabul qilindi." : isAuto ? "Test drive arizangiz qabul qilindi." : "Arizangiz qabul qilindi."
      );
      bookingForm.resetFields();
      notifyBusinessDataChanged();
    } catch (err) {
      message.error(err.response?.data?.detail || "Yuborib bo'lmadi.");
    }
  };

  const scrollTo = (id) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  if (loading) return <LoadingScreen />;
  if (!biz) return <EmptyState description="Biznes topilmadi." />;

  const catalogTitle = cfg.itemsLabel || "Xizmatlar";
  const coverStyle = {
    background: biz.cover_image
      ? `url(${mediaUrl(biz.cover_image)}) center/cover`
      : cfg.gradient || "linear-gradient(135deg, #2563EB, #06B6D4)",
  };

  const showBookingForm = isFitness || isRestaurant || isAuto || bt === "education_center";

  return (
    <div className="cs-public-biz" style={{ "--section-accent": cfg.color }}>
      <div className="cs-public-biz-cover" style={coverStyle} />

      <div className="cs-public-biz-body">
        <div className="cs-public-biz-profile">
          {biz.logo ? (
            <img src={mediaUrl(biz.logo)} alt="" className="cs-public-biz-logo" />
          ) : (
            <div className="cs-public-biz-logo cs-public-biz-logo--placeholder">
              {(biz.name || "B").charAt(0)}
            </div>
          )}
          <div className="cs-public-biz-info">
            <Typography.Text style={{ color: cfg.color, fontWeight: 700, fontSize: 13 }}>{cfg.label}</Typography.Text>
            <h1>{biz.name}</h1>
            <Rate disabled value={Number(biz.rating || 0)} allowHalf style={{ fontSize: 16 }} />
            {biz.description ? (
              <Typography.Paragraph style={{ marginTop: 12, marginBottom: 0, color: "var(--muted)", maxWidth: 640 }}>
                {biz.description}
              </Typography.Paragraph>
            ) : null}
            <div className="cs-public-biz-chips">
              <span className="cs-public-biz-chip">
                <Phone size={14} />
                {formatPhone(biz.phone)}
              </span>
              {biz.address ? (
                <span className="cs-public-biz-chip">
                  <MapPin size={14} />
                  {biz.address}
                </span>
              ) : null}
              {biz.working_hours ? (
                <span className="cs-public-biz-chip">
                  <Clock size={14} />
                  {biz.working_hours}
                </span>
              ) : null}
            </div>
          </div>
        </div>

        <div className="cs-public-biz-cta">
          {showBookingForm ? (
            <Button type="primary" size="large" onClick={() => scrollTo("public-booking-form")}>
              {isRestaurant ? "Stol bron qilish" : isAuto ? "Test drive" : isFitness ? "Sinov mashg'ulot" : "Sinov dars"}
            </Button>
          ) : null}
          <Button size="large" icon={<MessageCircle size={16} />} href={TELEGRAM_BOT_URL} target="_blank" rel="noreferrer">
            Telegram botga o&apos;tish
          </Button>
          <Button size="large" onClick={() => scrollTo("public-lead-form")}>
            Murojaat qoldirish
          </Button>
        </div>

        <section className="cs-public-biz-section">
          <h2 className="cs-public-biz-section__title">{catalogTitle}</h2>
          {catalogItems.length ? (
            <Row gutter={[16, 16]}>
              {catalogItems.map((item) => (
                <Col xs={24} sm={12} md={8} key={item.id}>
                  <DynamicItemCard item={item} businessType={bt} />
                </Col>
              ))}
            </Row>
          ) : (
            <EmptyState description={`${catalogTitle} hozircha yo'q.`} />
          )}
        </section>

        {isEducation && materialItems.length ? (
          <section className="cs-public-biz-section">
            <h2 className="cs-public-biz-section__title">Materiallar</h2>
            <Row gutter={[16, 16]}>
              {materialItems.map((item) => (
                <Col xs={24} sm={12} md={8} key={item.id}>
                  <DynamicItemCard item={item} businessType={bt} />
                </Col>
              ))}
            </Row>
          </section>
        ) : null}

        {isFitness && fitnessTrainers.length ? (
          <section className="cs-public-biz-section">
            <h2 className="cs-public-biz-section__title">Trenerlar</h2>
            <Row gutter={[16, 16]}>
              {fitnessTrainers.map((t) => (
                <Col xs={24} sm={12} md={8} key={t.name}>
                  <div className="cs-public-biz-chip" style={{ display: "block", padding: 16 }}>
                    <div style={{ fontWeight: 700, marginBottom: 8 }}>{t.name}</div>
                    <div style={{ fontSize: 13, color: "var(--muted)" }}>
                      {Array.from(t.types).join(", ") || "—"}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>
                      {Array.from(t.schedules).join(" · ") || "—"}
                    </div>
                  </div>
                </Col>
              ))}
            </Row>
          </section>
        ) : null}

        {showBookingForm ? (
          <section id="public-booking-form" className="cs-public-biz-section">
            <div className="cs-public-form-card ant-card ant-card-bordered" style={{ padding: 24 }}>
              <h2 className="cs-public-biz-section__title" style={{ marginTop: 0 }}>
                {isRestaurant
                  ? "Stol bron qilish"
                  : isAuto
                    ? "Test drive arizasi"
                    : isFitness
                      ? "Bepul sinov mashg'ulot"
                      : "Sinov darsga yozilish"}
              </h2>
              <Form form={bookingForm} layout="vertical" onFinish={onTrialBooking} style={{ maxWidth: 480 }}>
                <Form.Item name="name" label="Ism" rules={[{ required: true }]}>
                  <Input size="large" />
                </Form.Item>
                <Form.Item name="phone" label="Telefon" rules={[{ required: true }]}>
                  <Input size="large" placeholder="+998 …" />
                </Form.Item>
                {isFitness ? (
                  <Form.Item name="training_type" label="Yo'nalish" initialValue="Fitness" rules={[{ required: true }]}>
                    <Select size="large" options={FITNESS_TRAINING_TYPES.map((t) => ({ value: t, label: t }))} />
                  </Form.Item>
                ) : null}
                {isRestaurant ? (
                  <Form.Item name="guests_count" label="Kishi soni">
                    <Input type="number" min={1} size="large" />
                  </Form.Item>
                ) : null}
                <Form.Item name="preferred_date" label="Sana" rules={[{ required: true }]}>
                  <DatePicker style={{ width: "100%" }} size="large" format="DD.MM.YYYY" />
                </Form.Item>
                <Form.Item name="preferred_time" label="Vaqt" rules={[{ required: true }]}>
                  <DatePicker.TimePicker style={{ width: "100%" }} size="large" format="HH:mm" minuteStep={5} />
                </Form.Item>
                <Form.Item name="note" label="Izoh">
                  <Input.TextArea rows={3} />
                </Form.Item>
                <Button type="primary" htmlType="submit" size="large" block>
                  Yuborish
                </Button>
              </Form>
            </div>
          </section>
        ) : null}

        <section id="public-lead-form" className="cs-public-biz-section">
          <div className="cs-public-form-card ant-card ant-card-bordered" style={{ padding: 24 }}>
            <h2 className="cs-public-biz-section__title" style={{ marginTop: 0 }}>
              {isFitness ? "Abonement bo'yicha so'rov" : cfg.leadsLabel || "Murojaat qoldirish"}
            </h2>
            <Typography.Paragraph type="secondary" style={{ marginBottom: 16 }}>
              Ma&apos;lumotlaringizni qoldiring — biznes siz bilan bog&apos;lanadi.
            </Typography.Paragraph>
            <Form form={form} layout="vertical" onFinish={onLead} style={{ maxWidth: 480 }}>
              <Form.Item name="name" label="Ism" rules={[{ required: true }]}>
                <Input size="large" />
              </Form.Item>
              <Form.Item name="phone" label="Telefon" rules={[{ required: true }]}>
                <Input size="large" />
              </Form.Item>
              {(isFitness || catalogItems.length > 0) && (
                <Form.Item
                  name="interested_item"
                  label={isFitness ? "Qiziqtirgan abonement" : `Qiziqtirgan ${cfg.itemLabel?.toLowerCase() || "xizmat"}`}
                >
                  <Select
                    allowClear
                    size="large"
                    options={catalogItems.map((it) => ({ value: it.id, label: it.title }))}
                    placeholder="Tanlang (ixtiyoriy)"
                  />
                </Form.Item>
              )}
              <Form.Item name="message" label="Xabar">
                <Input.TextArea rows={4} />
              </Form.Item>
              <Button type="primary" htmlType="submit" size="large" block>
                Yuborish
              </Button>
            </Form>
          </div>
        </section>
      </div>
    </div>
  );
}
