import { Col, Input, Row, Typography, message } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import LoadingScreen from "../../components/ui/LoadingScreen";
import EmptyState from "../../components/ui/EmptyState";
import CategoryCard from "../../components/cards/CategoryCard";
import BusinessCard from "../../components/cards/BusinessCard";
import PromoSlider from "../../components/public/PromoSlider";
import { getCities } from "../../services/cityService";
import { getCategories } from "../../services/categoryService";
import { getBusinesses } from "../../services/businessService";

export default function PublicCityPage() {
  const { citySlug } = useParams();
  const [city, setCity] = useState(null);
  const [categories, setCategories] = useState([]);
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const cities = await getCities({});
        const c = cities.find((x) => x.slug === citySlug) || null;
        setCity(c);
        if (c) {
          const [cats, biz] = await Promise.all([
            getCategories({ city_id: c.id }),
            getBusinesses({ city_id: c.id }),
          ]);
          setCategories(cats);
          setBusinesses(biz);
        } else {
          setCategories([]);
          setBusinesses([]);
        }
      } catch {
        message.error("Ma’lumot yuklanmadi. Backend ishlayotganini tekshiring.");
        setCity(null);
        setCategories([]);
        setBusinesses([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [citySlug]);

  const featured = useMemo(() => businesses.filter((b) => b.is_featured).slice(0, 6), [businesses]);
  const popular = useMemo(() => businesses.slice(0, 8), [businesses]);

  if (loading) return <LoadingScreen />;
  if (!city) return <EmptyState description="Shahar topilmadi." />;

  return (
    <div>
      <section className="cs-public-hero cs-public-hero--city">
        <Typography.Title level={1} style={{ color: "#fff", marginBottom: 8 }}>
          {city.name}
        </Typography.Title>
        <Typography.Paragraph style={{ color: "rgba(255,255,255,0.85)", maxWidth: 560 }}>
          {city.description || "Shahar xizmatlari va bizneslarni qidiring."}
        </Typography.Paragraph>
        <Input
          className="cs-public-hero-search"
          size="large"
          allowClear
          prefix={<SearchOutlined />}
          placeholder="Xizmat yoki biznes qidirish"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <PromoSlider city={city} citySlug={city.slug} categories={categories} featured={featured} />
      </section>
      <section className="cs-public-page-section">
        <Typography.Title level={3}>Xizmat kategoriyalari</Typography.Title>
        {!categories.length ? (
          <EmptyState description="Kategoriyalar hozircha yo‘q." />
        ) : (
          <Row gutter={[16, 16]}>
            {categories
              .filter((c) => !q || `${c.name}`.toLowerCase().includes(q.toLowerCase()))
              .map((c) => (
                <Col xs={24} sm={12} md={8} lg={6} key={c.id}>
                  <CategoryCard citySlug={city.slug} category={c} />
                </Col>
              ))}
          </Row>
        )}
      </section>
      <section className="cs-public-page-section cs-public-page-section--tight-top">
        <Typography.Title level={3}>Tavsiya etilgan bizneslar</Typography.Title>
        <Row gutter={[16, 16]}>
          {featured.length ? (
            featured.map((b) => (
              <Col xs={24} md={12} xl={8} key={b.id}>
                <BusinessCard business={b} />
              </Col>
            ))
          ) : (
            <EmptyState description="Tavsiya etilgan biznes yo‘q." />
          )}
        </Row>
      </section>
      <section className="cs-public-page-section cs-public-page-section--bottom">
        <Typography.Title level={3}>Mashhur xizmatlar</Typography.Title>
        <Row gutter={[16, 16]}>
          {popular.map((b) => (
            <Col xs={24} md={12} xl={8} key={b.id}>
              <BusinessCard business={b} />
            </Col>
          ))}
        </Row>
        <div style={{ marginTop: 24 }}>
          <Typography.Text type="secondary">Batafsil: kategoriyani tanlang yoki </Typography.Text>
          <Link to="/login">kabinetga kiring</Link>.
        </div>
      </section>
    </div>
  );
}
