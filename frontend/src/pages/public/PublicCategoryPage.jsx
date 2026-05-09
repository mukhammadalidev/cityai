import { Button, Col, Input, Row, Select, Space, Typography, message } from "antd";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import LoadingScreen from "../../components/ui/LoadingScreen";
import EmptyState from "../../components/ui/EmptyState";
import BusinessCard from "../../components/cards/BusinessCard";
import PromoSlider from "../../components/public/PromoSlider";
import { getCities } from "../../services/cityService";
import { getCategories } from "../../services/categoryService";
import { getBusinesses } from "../../services/businessService";

export default function PublicCategoryPage() {
  const { citySlug, categorySlug } = useParams();
  const [city, setCity] = useState(null);
  const [category, setCategory] = useState(null);
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [featuredOnly, setFeaturedOnly] = useState();
  const [minRating, setMinRating] = useState();
  const [openNow, setOpenNow] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const cities = await getCities({});
        const c = cities.find((x) => x.slug === citySlug);
        setCity(c || null);
        if (!c) {
          setCategory(null);
          setBusinesses([]);
          return;
        }
        const cats = await getCategories({ city_id: c.id });
        const cat = cats.find((x) => x.slug === categorySlug) || null;
        setCategory(cat);
        if (cat) {
          const b = await getBusinesses({ city_id: c.id, category_id: cat.id });
          setBusinesses(b);
        } else setBusinesses([]);
      } catch {
        message.error("Yuklanmadi.");
        setCity(null);
        setCategory(null);
        setBusinesses([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [citySlug, categorySlug]);

  const filtered = useMemo(() => {
    let f = businesses;
    if (search) {
      const q = search.toLowerCase();
      f = f.filter((b) => `${b.name} ${b.phone}`.toLowerCase().includes(q));
    }
    if (featuredOnly === "1") f = f.filter((b) => b.is_featured);
    if (minRating) f = f.filter((b) => Number(b.rating || 0) >= Number(minRating));
    if (openNow) f = f.filter((b) => Boolean(b.working_hours));
    const feat = f.filter((b) => b.is_featured);
    const rest = f.filter((b) => !b.is_featured);
    return [...feat, ...rest];
  }, [businesses, search, featuredOnly, minRating, openNow]);

  if (loading) return <LoadingScreen />;
  if (!city || !category) return <EmptyState description="Kategoriya topilmadi." />;

  return (
    <div style={{ padding: "24px" }}>
      <section className="cs-public-hero" style={{ margin: "-24px -24px 24px", padding: "32px 24px" }}>
        <Typography.Title level={2} style={{ color: "#fff", margin: 0 }}>
          {category.name}
        </Typography.Title>
        <Typography.Paragraph style={{ color: "rgba(255,255,255,0.85)" }}>{city.name}</Typography.Paragraph>
        <PromoSlider
          city={city}
          citySlug={city.slug}
          categories={category ? [category] : []}
          featured={businesses.filter((b) => b.is_featured).slice(0, 3)}
          botUrl={import.meta.env.VITE_TELEGRAM_BOT_URL || "https://t.me/city_services_ai_bot"}
        />
      </section>
      <Space wrap style={{ marginBottom: 16 }}>
        <Input placeholder="Qidiruv" value={search} onChange={(e) => setSearch(e.target.value)} style={{ width: 220 }} />
        <Select
          allowClear
          placeholder="Tavsiya"
          style={{ width: 140 }}
          value={featuredOnly}
          onChange={setFeaturedOnly}
          options={[
            { value: "1", label: "Faqat tavsiya" },
            { value: "0", label: "Hammasi" },
          ]}
        />
        <Select
          allowClear
          placeholder="Min. reyting"
          style={{ width: 140 }}
          value={minRating}
          onChange={setMinRating}
          options={[
            { value: 3, label: "3+" },
            { value: 4, label: "4+" },
            { value: 4.5, label: "4.5+" },
          ]}
        />
        <Button type={openNow ? "primary" : "default"} onClick={() => setOpenNow(!openNow)}>
          Ish vaqti ko‘rsatilgan
        </Button>
      </Space>
      {!filtered.length ? (
        <EmptyState description="Bizneslar topilmadi." />
      ) : (
        <Row gutter={[16, 16]}>
          {filtered.map((b) => (
            <Col xs={24} md={12} xl={8} key={b.id}>
              <BusinessCard business={b} />
            </Col>
          ))}
        </Row>
      )}
    </div>
  );
}
