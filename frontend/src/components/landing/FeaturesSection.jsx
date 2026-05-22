import {
  BarChart3,
  Bell,
  Cloud,
  Download,
  LayoutDashboard,
  MessageCircle,
  Shield,
  Smartphone,
  UserCog,
  Users,
  Wallet,
} from "lucide-react";

const FEATURES = [
  { icon: LayoutDashboard, title: "Dashboard", text: "Barcha ko'rsatkichlar bir joyda." },
  { icon: Users, title: "Mijozlar bazasi", text: "To'liq profil va tarix." },
  { icon: Wallet, title: "To'lov nazorati", text: "Naqd, karta, Click, Payme." },
  { icon: BarChart3, title: "Qarzdorlik nazorati", text: "Avtomatik hisob va eslatma." },
  { icon: MessageCircle, title: "Telegram bildirishnoma", text: "Mijoz va admin uchun xabar." },
  { icon: Bell, title: "Avtomatik eslatmalar", text: "Muddat va to'lov eslatmalari." },
  { icon: Download, title: "Hisobotlar", text: "PDF va Excel eksport." },
  { icon: UserCog, title: "Rollar va permissions", text: "Xavfsiz kirish huquqlari." },
  { icon: Smartphone, title: "Mobil moslashuvchan", text: "Telefon va planshetda qulay." },
  { icon: Shield, title: "Xavfsizlik", text: "Ma'lumotlar himoyalangan." },
  { icon: Cloud, title: "Bulutda ishlash", text: "Qayerdan bo'lishidan qat'i nazar." },
];

export default function FeaturesSection() {
  return (
    <section id="imkoniyatlar" className="lp-section">
      <div className="lp-container">
        <h2 className="lp-section-title lp-reveal">CityBot CRM imkoniyatlari</h2>
        <p className="lp-section-sub lp-reveal">
          Kundalik ishlar uchun kerakli barcha funksiyalar — ortiqcha murakkabliksiz.
        </p>
        <div className="lp-grid-4">
          {FEATURES.map((f, i) => {
            const Icon = f.icon;
            return (
              <div key={f.title} className="lp-glass lp-card lp-reveal" style={{ transitionDelay: `${(i % 4) * 0.05}s` }}>
                <div className="lp-card__icon">
                  <Icon size={20} />
                </div>
                <h3 className="lp-card__title">{f.title}</h3>
                <p className="lp-card__text">{f.text}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
