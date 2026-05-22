const PLANS = [
  {
    name: "START",
    price: "199 000",
    period: "so'm / oy",
    features: ["Mijozlar bazasi", "To'lovlar", "Asosiy dashboard", "Telegram yordam"],
    featured: false,
  },
  {
    name: "PRO",
    price: "399 000",
    period: "so'm / oy",
    features: [
      "START dagi hammasi",
      "Davomat",
      "Qarzdorlar",
      "Hisobotlar",
      "Telegram eslatmalar",
    ],
    featured: true,
  },
  {
    name: "PREMIUM",
    price: "Kelishiladi",
    period: "",
    features: [
      "Individual sozlash",
      "Maxsus integratsiyalar",
      "Xodimlarni o'rgatish",
      "Prioritet yordam",
    ],
    featured: false,
  },
];

export default function PricingSection() {
  const scrollTo = () => document.querySelector("#aloqa")?.scrollIntoView({ behavior: "smooth" });

  return (
    <section id="narxlar" className="lp-section">
      <div className="lp-container">
        <h2 className="lp-section-title lp-reveal">Oddiy va tushunarli tariflar</h2>
        <p className="lp-section-sub lp-reveal">
          Biznes hajmiga qarab tanlang. 7 kun bepul sinab ko&apos;rishingiz mumkin.
        </p>
        <div className="lp-grid-3" style={{ alignItems: "stretch" }}>
          {PLANS.map((plan, i) => (
            <div
              key={plan.name}
              className={`lp-glass lp-pricing lp-reveal${plan.featured ? " lp-pricing--featured" : ""}`}
              style={{ transitionDelay: `${i * 0.08}s` }}
            >
              {plan.featured ? <span className="lp-pricing__badge">Tavsiya etiladi</span> : null}
              <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700 }}>{plan.name}</h3>
              <div className="lp-pricing__price">
                {plan.price}
                {plan.period ? (
                  <span style={{ fontSize: "0.85rem", fontWeight: 500, color: "var(--lp-muted)" }}>
                    {" "}
                    {plan.period}
                  </span>
                ) : null}
              </div>
              <ul className="lp-pricing__list">
                {plan.features.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
              <button type="button" className="lp-btn lp-btn--primary" style={{ width: "100%" }} onClick={scrollTo}>
                Demo so&apos;rash
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
