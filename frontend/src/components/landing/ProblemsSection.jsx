import { AlertTriangle, ClipboardList, Clock, FileSpreadsheet, TrendingDown, Users } from "lucide-react";

const PROBLEMS = [
  {
    icon: FileSpreadsheet,
    title: "Daftar va Excel chalkash",
    text: "Ma'lumotlar turli fayllarda — xato va vaqt yo'qotish kafolatlangan.",
  },
  {
    icon: TrendingDown,
    title: "To'lovlarni nazorat qilish qiyin",
    text: "Kim qancha to'lagani va qancha qarzi borligi aniq emas.",
  },
  {
    icon: AlertTriangle,
    title: "Qarzdorlarni unutib qo'yish",
    text: "Eslatmalar yo'q — tushum kechikadi yoki butunlay yo'qoladi.",
  },
  {
    icon: Clock,
    title: "Davomat tarixi yo'qoladi",
    text: "Kim keldi, kim kelmadi — qo'lda yozib, keyin topib bo'lmaydi.",
  },
  {
    icon: ClipboardList,
    title: "Hisobotlar qo'lda tayyorlanadi",
    text: "Rahbar uchun raqamlar har safar alohida hisoblanadi.",
  },
  {
    icon: Users,
    title: "Xodimlar ishini nazorat qilish qiyin",
    text: "Har bir xodim o'z usulida ishlaydi — standart yo'q.",
  },
];

export default function ProblemsSection() {
  return (
    <section className="lp-section" style={{ background: "var(--lp-bg-2)" }}>
      <div className="lp-container">
        <h2 className="lp-section-title lp-reveal">Biznes egalarining eng katta muammolari</h2>
        <p className="lp-section-sub lp-reveal">
          Ko&apos;p bizneslar hali ham eski usulda ishlaydi. CityBot CRM bu muammolarni bir joyda hal qiladi.
        </p>
        <div className="lp-grid-3">
          {PROBLEMS.map((p, i) => {
            const Icon = p.icon;
            return (
              <div key={p.title} className="lp-glass lp-card lp-reveal" style={{ transitionDelay: `${i * 0.06}s` }}>
                <div className="lp-card__icon">
                  <Icon size={22} />
                </div>
                <h3 className="lp-card__title">{p.title}</h3>
                <p className="lp-card__text">{p.text}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
