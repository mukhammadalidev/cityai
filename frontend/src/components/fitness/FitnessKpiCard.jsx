import { TrendingDown, TrendingUp } from "lucide-react";

const VARIANTS = {
  default: { accent: "#38bdf8", glow: "rgba(56, 189, 248, 0.25)" },
  success: { accent: "#34d399", glow: "rgba(52, 211, 153, 0.25)" },
  warning: { accent: "#fbbf24", glow: "rgba(251, 191, 36, 0.25)" },
  danger: { accent: "#f87171", glow: "rgba(248, 113, 113, 0.25)" },
  violet: { accent: "#a78bfa", glow: "rgba(167, 139, 250, 0.25)" },
};

export default function FitnessKpiCard({
  icon: Icon,
  label,
  value,
  hint,
  variant = "default",
  trend,
  to,
}) {
  const v = VARIANTS[variant] || VARIANTS.default;
  const inner = (
    <div
      className="fit-kpi"
      style={{ "--fit-kpi-accent": v.accent, "--fit-kpi-glow": v.glow }}
    >
      <div className="fit-kpi__top">
        {Icon ? (
          <span className="fit-kpi__icon">
            <Icon size={20} strokeWidth={2} />
          </span>
        ) : null}
        {trend != null ? (
          <span className={`fit-kpi__trend${trend >= 0 ? " fit-kpi__trend--up" : " fit-kpi__trend--down"}`}>
            {trend >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
          </span>
        ) : null}
      </div>
      <div className="fit-kpi__label">{label}</div>
      <div className="fit-kpi__value">{value}</div>
      {hint ? <div className="fit-kpi__hint">{hint}</div> : null}
    </div>
  );

  if (to) {
    return (
      <a href={to} className="fit-kpi-link">
        {inner}
      </a>
    );
  }
  return inner;
}
