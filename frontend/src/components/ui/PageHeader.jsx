export default function PageHeader({ eyebrow, title, description, extra, accent }) {
  const style = accent ? { "--page-accent": accent } : undefined;
  return (
    <div
      className={`cs-page-header cs-page-header--split${accent ? " cs-page-header--accent" : ""}${extra ? "" : " cs-page-header--no-extra"}`}
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        gap: 16,
        flexWrap: "wrap",
        ...style,
      }}
    >
      <div style={{ flex: "1 1 220px", minWidth: 0 }}>
        {eyebrow && <div className="cs-page-header__eyebrow">{eyebrow}</div>}
        <h1 className="cs-page-header__title">{title}</h1>
        {description && <p className="cs-page-header__desc">{description}</p>}
      </div>
      {extra ? <div style={{ flex: "0 1 auto" }}>{extra}</div> : null}
    </div>
  );
}
