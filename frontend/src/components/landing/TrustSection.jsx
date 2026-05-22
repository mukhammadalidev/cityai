import { Quote, Shield, Zap } from "lucide-react";

const TESTIMONIALS = [
  {
    role: "O'quv markaz rahbari",
    name: "Dilnoza K.",
    city: "Buxoro",
    text: "O'quvchilar va to'lovlar endi bir joyda. Qarzdorlarni kuzatish ancha osonlashdi.",
  },
  {
    role: "Fitness zal administratori",
    name: "Jasur A.",
    city: "Toshkent",
    text: "Check-in va abonementlar avtomatik — xodimlar vaqt tejayapti.",
  },
  {
    role: "Biznes egasi",
    name: "Sardor M.",
    city: "Samarqand",
    text: "Dashboard orqali kunlik tushumni darhol ko'raman. Hisobot tayyorlash vaqti qisqardi.",
  },
];

const STATS = [
  { icon: Shield, label: "100% xavfsiz" },
  { icon: Zap, label: "7 kun bepul test" },
  { icon: Quote, label: "Telegram yordam" },
  { label: "Tez o'rnatish" },
];

export default function TrustSection() {
  return (
    <section className="lp-section" style={{ background: "var(--lp-bg-2)" }}>
      <div className="lp-container">
        <h2 className="lp-section-title lp-reveal">Biznesingiz tartibli ishlashi uchun yaratilgan</h2>
        <div className="lp-grid-4 lp-reveal" style={{ marginBottom: 48 }}>
          {STATS.map((s) => (
            <div key={s.label} className="lp-glass lp-card" style={{ textAlign: "center", padding: 20 }}>
              {s.icon ? (
                <div className="lp-card__icon" style={{ margin: "0 auto 10px" }}>
                  <s.icon size={20} />
                </div>
              ) : null}
              <strong>{s.label}</strong>
            </div>
          ))}
        </div>
        <div className="lp-grid-3">
          {TESTIMONIALS.map((t, i) => (
            <blockquote key={t.name} className="lp-glass lp-card lp-reveal" style={{ transitionDelay: `${i * 0.08}s` }}>
              <p className="lp-card__text" style={{ fontStyle: "italic", marginBottom: 16 }}>
                &ldquo;{t.text}&rdquo;
              </p>
              <footer>
                <strong style={{ display: "block" }}>{t.name}</strong>
                <span style={{ color: "var(--lp-muted)", fontSize: "0.88rem" }}>
                  {t.role} · {t.city}
                </span>
              </footer>
            </blockquote>
          ))}
        </div>
      </div>
    </section>
  );
}
