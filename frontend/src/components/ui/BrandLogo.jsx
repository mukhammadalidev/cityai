import logo from "../../assets/citybot-logo.png";

/**
 * @param {"onDark"|"onLight"|"plain"} variant
 * @param {boolean} compact — sidebar: kichik logo, to‘liq kenglik emas
 */
export default function BrandLogo({
  height = 52,
  className = "",
  variant = "onLight",
  compact = false,
}) {
  const wrap =
    variant === "onDark"
      ? "cs-brand-logo-wrap cs-brand-logo-wrap--on-dark"
      : variant === "plain"
        ? "cs-brand-logo-wrap cs-brand-logo-wrap--plain"
        : "cs-brand-logo-wrap cs-brand-logo-wrap--on-light";

  return (
    <span className={`${wrap}${compact ? " cs-brand-logo-wrap--compact" : ""} ${className}`.trim()}>
      <img
        src={logo}
        alt="CityBot CRM"
        className="cs-brand-logo__img"
        style={{ height, width: "auto" }}
        decoding="async"
      />
    </span>
  );
}
