import { Carousel, Typography } from "antd";
import { Link } from "react-router-dom";

export default function PromoSlider({ city, citySlug, categories = [], featured = [] }) {
  const cat = categories[0];
  const biz = featured[0];

  const slides = [
    {
      key: "featured",
      title: "Top bizneslar bannerda chiqadi",
      description: biz
        ? `${biz.name} kabi tavsiya etilgan bizneslar ko'proq ko'rinadi va tezroq lead oladi.`
        : "Biznesingizni tavsiya etilgan ro'yxatga chiqaring va ko'rinishni oshiring.",
      cta: <Link to="/login">Kabinetdan reklama sozlash</Link>,
    },
    {
      key: "category",
      title: "Kategoriya bo'yicha aniq auditoriya",
      description: cat
        ? `${cat.name} kategoriyasida reklama qilib, aynan qidirayotgan mijozlarga chiqasiz.`
        : "Sizga mos kategoriya tanlab, maqsadli mijozlarga reklama chiqaring.",
      cta: citySlug && cat ? <Link to={`/c/${citySlug}/${cat.slug}`}>Kategoriyani ko'rish</Link> : null,
    },
  ];

  return (
    <div className="cs-promo-slider">
      <Carousel autoplay dots>
        {slides.map((s) => (
          <div key={s.key}>
            <div className="cs-promo-slide">
              <Typography.Title level={3} style={{ color: "#fff", marginTop: 0, marginBottom: 8 }}>
                {s.title}
              </Typography.Title>
              <Typography.Paragraph style={{ color: "rgba(255,255,255,0.9)", marginBottom: 12 }}>
                {s.description}
              </Typography.Paragraph>
              {s.cta}
            </div>
          </div>
        ))}
      </Carousel>
    </div>
  );
}
