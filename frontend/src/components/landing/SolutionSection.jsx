import DashboardMockup from "./DashboardMockup";

const LEFT = ["Mijozlar bazasi", "To'lovlar", "Qarzdorlik", "Davomat"];
const RIGHT = ["Telegram eslatmalar", "Hisobotlar", "Dashboard analytics", "Xodimlar nazorati"];

export default function SolutionSection() {
  return (
    <section id="demo" className="lp-section">
      <div className="lp-container">
        <h2 className="lp-section-title lp-reveal">CityBot CRM — barcha jarayonlar bitta tizimda</h2>
        <p className="lp-section-sub lp-reveal">
          Platforma biznesingizdagi asosiy jarayonlarni bog&apos;laydi va rahbar uchun yagona panel beradi.
        </p>
        <div className="lp-solution lp-reveal">
          <div className="lp-solution__side">
            {LEFT.map((t) => (
              <div key={t} className="lp-glass lp-solution__pill">{t}</div>
            ))}
          </div>
          <DashboardMockup />
          <div className="lp-solution__side">
            {RIGHT.map((t) => (
              <div key={t} className="lp-glass lp-solution__pill">{t}</div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
