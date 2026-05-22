export default function DashboardHero({
  eyebrow,
  title,
  description,
  actions,
  gradient,
  className = "",
}) {
  return (
    <section
      className={`cs-dash-hero ${className}`.trim()}
      style={gradient ? { background: gradient } : undefined}
    >
      <div className="cs-dash-hero__inner">
        <div>
          {eyebrow ? <div className="cs-dash-hero__eyebrow">{eyebrow}</div> : null}
          <h1 className="cs-dash-hero__title">{title}</h1>
          {description ? <p className="cs-dash-hero__desc">{description}</p> : null}
        </div>
        {actions ? <div className="cs-dash-hero__actions">{actions}</div> : null}
      </div>
    </section>
  );
}
