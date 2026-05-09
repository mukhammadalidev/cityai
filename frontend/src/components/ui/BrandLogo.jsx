import logo from "../../assets/project-logo.png";

export default function BrandLogo({ height = 40, className = "" }) {
  return <img src={logo} alt="Shahar Xizmatlari AI" style={{ height, width: "auto" }} className={className} />;
}
