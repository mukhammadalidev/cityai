import { Card } from "antd";
import { TrendingDown, TrendingUp } from "lucide-react";

export default function StatCard({
  title,
  value,
  hint,
  suffix,
  icon: Icon,
  iconColor = "#2563EB",
  iconBg = "rgba(37, 99, 235, 0.1)",
  trend,
  loading,
  compact = false,
  className = "",
}) {
  const display =
    suffix != null && value != null && typeof value !== "object"
      ? `${value} ${suffix}`.trim()
      : value ?? "—";

  return (
    <Card
      className={`cs-stat-card-v2${compact ? " cs-stat-card-v2--compact" : ""} ${className}`.trim()}
      loading={loading}
      bordered={false}
    >
      <div className="cs-stat-card-v2__row">
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="cs-stat-card-v2__label">{title}</div>
          <div className="cs-stat-card-v2__value">{display}</div>
          {trend != null ? (
            <div
              className={`cs-stat-card-v2__trend${
                trend >= 0 ? " cs-stat-card-v2__trend--up" : " cs-stat-card-v2__trend--down"
              }`}
            >
              {trend >= 0 ? (
                <TrendingUp size={12} style={{ verticalAlign: -2, marginRight: 4 }} />
              ) : (
                <TrendingDown size={12} style={{ verticalAlign: -2, marginRight: 4 }} />
              )}
              {Math.abs(trend)}%
            </div>
          ) : null}
          {hint ? <div className="cs-stat-card-v2__hint">{hint}</div> : null}
        </div>
        {Icon ? (
          <span className="cs-stat-card-v2__icon" style={{ background: iconBg, color: iconColor }}>
            <Icon size={22} strokeWidth={2} />
          </span>
        ) : null}
      </div>
    </Card>
  );
}
