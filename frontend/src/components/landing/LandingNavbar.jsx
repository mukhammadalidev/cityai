import { useState } from "react";
import { Link } from "react-router-dom";
import { Menu, X } from "lucide-react";

const LINKS = [
  { href: "#bosh", label: "Bosh sahifa" },
  { href: "#mahsulotlar", label: "Mahsulotlar" },
  { href: "#imkoniyatlar", label: "Imkoniyatlar" },
  { href: "#narxlar", label: "Narxlar" },
  { href: "#demo", label: "Demo" },
  { href: "#aloqa", label: "Aloqa" },
];

export default function LandingNavbar() {
  const [open, setOpen] = useState(false);

  const scrollTo = (href) => {
    setOpen(false);
    const el = document.querySelector(href);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <header className="lp-nav">
      <div className="lp-container lp-nav__inner">
        <a href="#bosh" className="lp-nav__brand" onClick={(e) => { e.preventDefault(); scrollTo("#bosh"); }}>
          <span className="lp-nav__logo">CB</span>
          CityBot CRM
        </a>

        <ul className="lp-nav__links">
          {LINKS.map((l) => (
            <li key={l.href}>
              <a href={l.href} onClick={(e) => { e.preventDefault(); scrollTo(l.href); }}>{l.label}</a>
            </li>
          ))}
        </ul>

        <div className="lp-nav__actions">
          <Link to="/login" className="lp-btn lp-btn--ghost">Kabinet</Link>
          <a href="#aloqa" className="lp-btn lp-btn--primary" onClick={(e) => { e.preventDefault(); scrollTo("#aloqa"); }}>
            Demo so&apos;rash
          </a>
          <button type="button" className="lp-nav__burger" aria-label="Menyu" onClick={() => setOpen(!open)}>
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      <div className={`lp-mobile-menu${open ? " lp-mobile-menu--open" : ""}`}>
        {LINKS.map((l) => (
          <a key={l.href} href={l.href} onClick={(e) => { e.preventDefault(); scrollTo(l.href); }}>{l.label}</a>
        ))}
        <Link to="/login" onClick={() => setOpen(false)}>Kabinetga kirish</Link>
        <a href="#aloqa" className="lp-btn lp-btn--primary" onClick={(e) => { e.preventDefault(); scrollTo("#aloqa"); }}>
          Demo so&apos;rash
        </a>
      </div>
    </header>
  );
}
