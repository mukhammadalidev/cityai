import { Card, Col, Form, Input, Rate, Row, Typography, message } from "antd";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import LoadingScreen from "../../components/ui/LoadingScreen";
import EmptyState from "../../components/ui/EmptyState";
import DynamicItemCard from "../../components/dynamic/DynamicItemCard";
import { getBusinessBySlug } from "../../services/businessService";
import { getItems } from "../../services/itemService";
import { createLead } from "../../services/leadService";
import { formatPhone, mediaUrl } from "../../utils/formatters";
import { notifyBusinessDataChanged } from "../../utils/businessEvents";

export default function PublicBusinessPage() {
  const { businessSlug } = useParams();
  const [biz, setBiz] = useState(null);
  const [courseItems, setCourseItems] = useState([]);
  const [materialItems, setMaterialItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form] = Form.useForm();

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
      await createLead({
        city: biz.city,
        business: biz.id,
        category: biz.category,
        name: values.name,
        phone: values.phone,
        message: values.message,
        source: "public_page",
        lead_type: "general",
      });
      message.success("So‘rovingiz yuborildi.");
      form.resetFields();
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
        {biz.business_type === "education_center" ? (
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
        <Card title="Murojaat qoldirish" style={{ marginTop: 32 }}>
          <Form form={form} layout="vertical" onFinish={onLead} style={{ maxWidth: 480 }}>
            <Form.Item name="name" label="Ism" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item name="phone" label="Telefon" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
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
