const STATS = [
  { label: "Jami mijozlar", value: "248" },
  { label: "Bugungi tushum", value: "4.2M" },
  { label: "Qarzdorlar", value: "12" },
  { label: "Davomat", value: "86" },
];

const BARS = [45, 72, 58, 90, 65, 82, 95];

export default function DashboardMockup({ compact = false }) {
  return (
    <div className={`lp-dash${compact ? " lp-dash--compact" : ""}`} aria-hidden>
      <div className="lp-dash__bar">
        <span className="lp-dash__dot" />
        <span className="lp-dash__dot" />
        <span className="lp-dash__dot" />
      </div>
      <div className="lp-dash__stats">
        {STATS.map((s) => (
          <div key={s.label} className="lp-dash__stat">
            <div className="lp-dash__stat-label">{s.label}</div>
            <div className="lp-dash__stat-value">{s.value}</div>
          </div>
        ))}
      </div>
      <div style={{ fontSize: "0.75rem", color: "#94a3b8", marginBottom: 8 }}>Oylik daromad</div>
      <div className="lp-dash__chart">
        {BARS.map((h, i) => (
          <div key={i} className="lp-dash__bar-col" style={{ height: `${h}%` }} />
        ))}
      </div>
    </div>
  );
}
