export default function PageHeader({ eyebrow, title, description, extra }) {
  return (
    <div className="cs-page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
      <div>
        {eyebrow && <div className="cs-page-header__eyebrow">{eyebrow}</div>}
        <h1 className="cs-page-header__title">{title}</h1>
        {description && <p className="cs-page-header__desc">{description}</p>}
      </div>
      {extra}
    </div>
  );
}
