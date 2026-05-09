import { Typography } from "antd";
import { Link } from "react-router-dom";
import { getBusinessTypeConfig } from "../../config/businessTypes";

export default function CategoryCard({ citySlug, category }) {
  const cfg = getBusinessTypeConfig(category.category_type);
  return (
    <Link to={`/c/${citySlug}/${category.slug}`} style={{ textDecoration: "none", color: "inherit" }}>
      <div className="cs-category-card">
        <div style={{ fontSize: 28, marginBottom: 8 }}>{category.icon || "📁"}</div>
        <Typography.Title level={5} style={{ margin: 0 }}>
          {category.name}
        </Typography.Title>
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          {cfg.label}
        </Typography.Text>
      </div>
    </Link>
  );
}
