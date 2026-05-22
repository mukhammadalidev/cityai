import { Link } from "react-router-dom";
import BrandLogo from "../ui/BrandLogo";

export default function LandingFooter() {
  const scrollTo = (id) => document.querySelector(id)?.scrollIntoView({ behavior: "smooth" });

  return (
    <footer className="lp-footer">
      <div className="lp-container">
        <div className="lp-footer__grid">
          <div>
            <a href="#bosh" className="lp-nav__brand" onClick={(e) => { e.preventDefault(); scrollTo("#bosh"); }}>
              <BrandLogo height={40} className="lp-nav__brand-img" />
            </a>
            <p style={{ color: "var(--lp-muted)", marginTop: 12, fontSize: "0.9rem", lineHeight: 1.6 }}>
              O&apos;quv markazlar, fitness zallar va bizneslar uchun zamonaviy boshqaruv platformasi.
            </p>
          </div>
          <div>
            <strong style={{ color: "var(--lp-text)" }}>Menyu</strong>
            <ul className="lp-footer__links">
              <li><a href="#bosh" onClick={(e) => { e.preventDefault(); scrollTo("#bosh"); }}>Bosh sahifa</a></li>
              <li><a href="#mahsulotlar" onClick={(e) => { e.preventDefault(); scrollTo("#mahsulotlar"); }}>Mahsulotlar</a></li>
              <li><a href="#narxlar" onClick={(e) => { e.preventDefault(); scrollTo("#narxlar"); }}>Narxlar</a></li>
              <li><Link to="/login">Kabinet</Link></li>
            </ul>
          </div>
          <div>
            <strong style={{ color: "var(--lp-text)" }}>Mahsulotlar</strong>
            <ul className="lp-footer__links">
              <li>O&apos;quv markaz CRM</li>
              <li>Fitness zal CRM</li>
              <li>Biznes CRM</li>
            </ul>
          </div>
          <div>
            <strong style={{ color: "var(--lp-text)" }}>Aloqa</strong>
            <ul className="lp-footer__links">
              <li><a href="tel:+998992606296">+998 99 260 62 96</a></li>
              <li><a href="https://t.me/citybotcrm" target="_blank" rel="noopener noreferrer">Telegram</a></li>
              <li><a href="https://citybot.uz">citybot.uz</a></li>
              <li><Link to="/c/buxoro">Shahar katalogi</Link></li>
            </ul>
          </div>
        </div>
        <p className="lp-footer__copy">© {new Date().getFullYear()} CityBot CRM. Barcha huquqlar himoyalangan.</p>
      </div>
    </footer>
  );
}
