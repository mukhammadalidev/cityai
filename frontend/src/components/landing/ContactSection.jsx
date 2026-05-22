import { useState } from "react";
import { MessageCircle, Phone, Globe } from "lucide-react";
import { submitDemoRequest } from "../../services/landingContactService";

const BUSINESS_TYPES = [
  { value: "education", label: "O'quv markaz" },
  { value: "fitness", label: "Fitness zal" },
  { value: "service", label: "Xizmat ko'rsatish" },
  { value: "other", label: "Boshqa" },
];

export default function ContactSection() {
  const [form, setForm] = useState({ name: "", phone: "", business_type: "education", message: "" });
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  const onChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim()) {
      setStatus({ type: "error", text: "Ism va telefon majburiy." });
      return;
    }
    setLoading(true);
    setStatus(null);
    try {
      const res = await submitDemoRequest(form);
      setStatus({
        type: "success",
        text: "So'rovingiz qabul qilindi. Tez orada siz bilan bog'lanamiz.",
        telegramUrl: res.telegramUrl,
      });
      setForm({ name: "", phone: "", business_type: "education", message: "" });
    } catch {
      setStatus({ type: "error", text: "Yuborishda xatolik. Telegram orqali yozing." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <section id="aloqa" className="lp-section" style={{ background: "var(--lp-bg-2)" }}>
      <div className="lp-container">
        <h2 className="lp-section-title lp-reveal">Biznesingizni raqamlashtirishni bugun boshlang</h2>
        <p className="lp-section-sub lp-reveal">Demo so&apos;rov qoldiring — mutaxassisimiz sizga qo&apos;ng&apos;iroq qiladi.</p>

        <div className="lp-contact-grid lp-reveal">
          <div className="lp-glass lp-card">
            <h3 className="lp-card__title">Aloqa</h3>
            <p className="lp-card__text" style={{ marginBottom: 20 }}>
              Savollaringiz bo&apos;lsa, bemalol yozing. O&apos;zbekiston bo&apos;ylab onlayn qo&apos;llab-quvvatlash.
            </p>
            <p style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <Phone size={18} color="#22d3ee" />
              <a href="tel:+998992606296" style={{ color: "var(--lp-text)" }}>+998 99 260 62 96</a>
            </p>
            <p style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <MessageCircle size={18} color="#22d3ee" />
              <a href="https://t.me/citybotcrm" target="_blank" rel="noopener noreferrer" style={{ color: "var(--lp-text)" }}>
                @citybotcrm
              </a>
            </p>
            <p style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Globe size={18} color="#22d3ee" />
              <a href="https://citybot.uz" style={{ color: "var(--lp-text)" }}>citybot.uz</a>
            </p>
          </div>

          <form className="lp-glass lp-card lp-form" onSubmit={onSubmit}>
            <label htmlFor="demo-name">Ism</label>
            <input id="demo-name" name="name" value={form.name} onChange={onChange} placeholder="Ismingiz" required />

            <label htmlFor="demo-phone">Telefon</label>
            <input id="demo-phone" name="phone" value={form.phone} onChange={onChange} placeholder="+998 90 123 45 67" required />

            <label htmlFor="demo-type">Biznes turi</label>
            <select id="demo-type" name="business_type" value={form.business_type} onChange={onChange}>
              {BUSINESS_TYPES.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>

            <label htmlFor="demo-msg">Xabar</label>
            <textarea
              id="demo-msg"
              name="message"
              rows={4}
              value={form.message}
              onChange={onChange}
              placeholder="Qisqacha yozing..."
            />

            {status ? (
              <p
                style={{
                  color: status.type === "success" ? "#22d3ee" : "#f87171",
                  marginBottom: 12,
                  fontSize: "0.9rem",
                }}
              >
                {status.text}
                {status.telegramUrl ? (
                  <>
                    {" "}
                    <a href={status.telegramUrl} target="_blank" rel="noopener noreferrer" style={{ color: "var(--lp-accent)" }}>
                      Telegramda yuborish
                    </a>
                  </>
                ) : null}
              </p>
            ) : null}

            <button type="submit" className="lp-btn lp-btn--primary" style={{ width: "100%" }} disabled={loading}>
              {loading ? "Yuborilmoqda..." : "Demo so'rash"}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
