import { Check } from "lucide-react";
import DashboardMockup from "./DashboardMockup";

const BULLETS = [
  "Bugungi tushum",
  "Oylik daromad",
  "Qarzdorlar",
  "Faol mijozlar",
  "Davomat",
  "Sotuv statistikasi",
];

export default function DashboardPreviewSection() {
  return (
    <section className="lp-section" style={{ background: "var(--lp-bg-2)" }}>
      <div className="lp-container lp-grid-2">
        <div className="lp-reveal">
          <h2 className="lp-section-title" style={{ textAlign: "left" }}>
            Rahbar uchun barcha ko&apos;rsatkichlar bir joyda
          </h2>
          <p className="lp-section-sub" style={{ textAlign: "left", margin: "0 0 28px" }}>
            Telefoningizdan ham biznes holatini ko&apos;ring — qarorlar tezroq va aniqroq qabul qilinadi.
          </p>
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {BULLETS.map((b) => (
              <li
                key={b}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  marginBottom: 14,
                  color: "var(--lp-muted)",
                }}
              >
                <span
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 8,
                    background: "rgba(34, 211, 238, 0.15)",
                    display: "grid",
                    placeItems: "center",
                    color: "var(--lp-accent)",
                  }}
                >
                  <Check size={16} />
                </span>
                {b}
              </li>
            ))}
          </ul>
        </div>
        <div className="lp-reveal" style={{ transitionDelay: "0.12s" }}>
          <DashboardMockup />
        </div>
      </div>
    </section>
  );
}
