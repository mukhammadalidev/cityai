import { useState } from "react";
import { ChevronDown } from "lucide-react";

const FAQ = [
  {
    q: "CityBot CRM kimlar uchun?",
    a: "O'quv markazlar, fitness zallar, xizmat ko'rsatuvchi va savdo bizneslari uchun. Har bir soha uchun mos modullar mavjud.",
  },
  {
    q: "O'rnatish qancha vaqt oladi?",
    a: "Asosiy sozlash 1–2 kun ichida tugaydi. Demo va o'qitish bilan birga tez ishga tushirasiz.",
  },
  {
    q: "Telefon orqali ishlaydimi?",
    a: "Ha. Interfeys mobil qurilmalarga mos — telefondan ham boshqarish mumkin.",
  },
  {
    q: "Telegram eslatmalar bormi?",
    a: "Ha. To'lov, qarzdorlik va abonement tugashi haqida Telegram orqali xabar yuboriladi.",
  },
  {
    q: "Ma'lumotlar xavfsizmi?",
    a: "Ma'lumotlar himoyalangan serverda saqlanadi. Rollar bo'yicha kirish cheklovlari mavjud.",
  },
  {
    q: "7 kun test qilish mumkinmi?",
    a: "Ha. Demo so'rov qoldiring — 7 kun bepul sinab ko'rishingiz mumkin.",
  },
  {
    q: "Narxlar qanday?",
    a: "START 199 000 so'm/oy dan boshlanadi. PRO va PREMIUM tariflar biznes hajmiga qarab tanlanadi.",
  },
];

export default function FAQSection() {
  const [open, setOpen] = useState(0);

  return (
    <section className="lp-section">
      <div className="lp-container" style={{ maxWidth: 760 }}>
        <h2 className="lp-section-title lp-reveal">Ko&apos;p so&apos;raladigan savollar</h2>
        <div className="lp-reveal">
          {FAQ.map((item, i) => (
            <div
              key={item.q}
              className="lp-glass lp-faq-item"
              onClick={() => setOpen(open === i ? -1 : i)}
              onKeyDown={(e) => e.key === "Enter" && setOpen(open === i ? -1 : i)}
              role="button"
              tabIndex={0}
            >
              <div className="lp-faq-item__q">
                {item.q}
                <ChevronDown
                  size={20}
                  style={{
                    transform: open === i ? "rotate(180deg)" : "none",
                    transition: "transform 0.2s",
                    flexShrink: 0,
                  }}
                />
              </div>
              {open === i ? <p className="lp-faq-item__a">{item.a}</p> : null}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
