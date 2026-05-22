import { ArrowRight, Sparkles } from "lucide-react";
import DashboardMockup from "./DashboardMockup";

export default function HeroSection() {
  const scrollTo = (id) => {
    document.querySelector(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section id="bosh" className="lp-hero">
      <div className="lp-hero__bg" />
      <div className="lp-hero__grid" />
      <div className="lp-container lp-hero__layout">
        <div className="lp-reveal">
          <div className="lp-hero__badge">
            <Sparkles size={14} />
            O&apos;zbekiston bizneslari uchun
          </div>
          <h1 className="lp-hero__title">
            Biznesingizni <span>bitta tizim</span> orqali boshqaring
          </h1>
          <p className="lp-hero__sub">
            CityBot CRM — o&apos;quv markazlar, fitness zallar va xizmat ko&apos;rsatish bizneslari uchun
            zamonaviy boshqaruv platformasi.
          </p>
          <div className="lp-hero__cta">
            <button type="button" className="lp-btn lp-btn--primary" onClick={() => scrollTo("#aloqa")}>
              Demo so&apos;rash
              <ArrowRight size={18} />
            </button>
            <button type="button" className="lp-btn lp-btn--outline" onClick={() => scrollTo("#imkoniyatlar")}>
              Imkoniyatlarni ko&apos;rish
            </button>
          </div>
          <div className="lp-hero__trust">
            <span><strong>7 kun</strong> bepul test</span>
            <span><strong>Telegram</strong> eslatmalar</span>
            <span><strong>Tez</strong> o&apos;rnatish</span>
          </div>
        </div>
        <div className="lp-reveal" style={{ transitionDelay: "0.15s" }}>
          <DashboardMockup />
        </div>
      </div>
    </section>
  );
}
