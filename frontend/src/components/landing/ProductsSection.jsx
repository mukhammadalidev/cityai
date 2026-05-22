import { BookOpen, Building2, Dumbbell } from "lucide-react";

const PRODUCTS = [
  {
    icon: BookOpen,
    title: "O'quv markaz CRM",
    desc: "O'quvchilar, guruhlar, to'lovlar, davomat va o'qituvchilarni boshqarish.",
    features: ["O'quvchilar bazasi", "Guruhlar", "Davomat", "To'lovlar", "Qarzdorlar", "Hisobotlar"],
    link: "/login",
  },
  {
    icon: Dumbbell,
    title: "Fitness zal CRM",
    desc: "A'zolar, abonementlar, check-in, trenerlar va to'lovlarni boshqarish.",
    features: ["A'zolar bazasi", "Abonementlar", "Check-in", "Trenerlar", "Mashg'ulot jadvali", "Hisobotlar"],
    link: "/login?fitness=1",
  },
  {
    icon: Building2,
    title: "Biznes CRM",
    desc: "Mijozlar, savdo, to'lovlar va xodimlar ishini nazorat qilish.",
    features: ["Mijozlar bazasi", "Savdo", "To'lovlar", "Xodimlar", "Eslatmalar", "Analytics"],
    link: "/login",
  },
];

export default function ProductsSection() {
  return (
    <section id="mahsulotlar" className="lp-section" style={{ background: "var(--lp-bg-2)" }}>
      <div className="lp-container">
        <h2 className="lp-section-title lp-reveal">Qaysi bizneslar uchun mos?</h2>
        <p className="lp-section-sub lp-reveal">
          Har bir soha uchun tayyor modullar — bir platformada, alohida murakkab tizimlar kerak emas.
        </p>
        <div className="lp-grid-3">
          {PRODUCTS.map((p, i) => {
            const Icon = p.icon;
            return (
              <article key={p.title} className="lp-glass lp-product lp-reveal" style={{ transitionDelay: `${i * 0.08}s` }}>
                <div className="lp-card__icon">
                  <Icon size={24} />
                </div>
                <h3 className="lp-card__title">{p.title}</h3>
                <p className="lp-card__text">{p.desc}</p>
                <ul className="lp-product__features">
                  {p.features.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
                <a href={p.link} className="lp-btn lp-btn--outline">
                  Batafsil ko&apos;rish
                </a>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
