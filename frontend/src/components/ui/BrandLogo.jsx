import logo from "../../assets/citybot-logo.png";

/**
 * @param {"onDark"|"onLight"|"plain"} variant
 *   onDark — qorong‘u sidebar / mobil menyu (oq karta fon)
 *   onLight — login, landing (yengil soya)
 *   plain — fon yo‘q
 */
export default function BrandLogo({ height = 52, className = "", variant = "onLight" }) {
  const wrap =
    variant === "onDark"
      ? "cs-brand-logo-wrap cs-brand-logo-wrap--on-dark"
      : variant === "plain"
        ? "cs-brand-logo-wrap cs-brand-logo-wrap--plain"
        : "cs-brand-logo-wrap cs-brand-logo-wrap--on-light";

  return (
    <span className={`${wrap} ${className}`.trim()}>
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
