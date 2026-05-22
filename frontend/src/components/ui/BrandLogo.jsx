import logo from "../../assets/citybot-logo.png";

export default function BrandLogo({ height = 40, className = "" }) {
  return (
    <img
      src={logo}
      alt="CityBot CRM"
      style={{ height, width: "auto", maxWidth: "100%", objectFit: "contain" }}
      className={`cs-brand-logo ${className}`.trim()}
    />
  );
}
