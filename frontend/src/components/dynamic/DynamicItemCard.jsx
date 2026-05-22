import { Card, Space, Tag } from "antd";
import { formatPrice, mediaUrl } from "../../utils/formatters";

export default function DynamicItemCard({ item, businessType, onClick }) {
  const m = item.metadata || {};
  const cover = item.image ? mediaUrl(item.image) : null;
  let extra = null;
  if (businessType === "auto_salon") {
    extra = (
      <Space wrap size={4}>
        {[m.brand, m.model, m.year].filter(Boolean).join(" · ")}
        {m.mileage != null && <Tag>{m.mileage} km</Tag>}
        {m.fuel_type && <Tag>{m.fuel_type}</Tag>}
        {m.has_credit && <Tag color="blue">Kredit</Tag>}
        {m.has_trade_in && <Tag color="purple">Trade-in</Tag>}
      </Space>
    );
  } else if (businessType === "education_center") {
    extra = (
      <Space direction="vertical" size={0}>
        <span>{m.duration && `Davomiylik: ${m.duration}`}</span>
        <span>{m.teacher && `O‘qituvchi: ${m.teacher}`}</span>
        {m.level && <Tag>{m.level}</Tag>}
      </Space>
    );
  } else if (businessType === "shop") {
    extra = (
      <Space>
        {m.stock != null && <Tag>Ombor: {m.stock}</Tag>}
        {m.discount && <Tag color="red">{m.discount}</Tag>}
        {m.brand && <Tag>{m.brand}</Tag>}
      </Space>
    );
  } else if (businessType === "restaurant") {
    const available = m.available !== false;
    extra = (
      <Space direction="vertical" size={4} style={{ width: "100%" }}>
        <Space wrap size={4}>
          <Tag color={available ? "green" : "default"}>{available ? "Mavjud" : "Mavjud emas"}</Tag>
          {m.is_spicy && <Tag color="red">Achchiq</Tag>}
          {m.category && <Tag>{m.category}</Tag>}
          {m.preparation_time && <Tag color="blue">{m.preparation_time} daq</Tag>}
        </Space>
        {m.ingredients && (
          <span style={{ fontSize: 12, color: "var(--cs-muted)" }}>{m.ingredients}</span>
        )}
      </Space>
    );
  } else if (businessType === "clinic") {
    extra = (
      <Space direction="vertical" size={0}>
        {m.doctor_name && <span>{m.doctor_name}</span>}
        {m.specialty && <Tag>{m.specialty}</Tag>}
        {m.consultation_price && <span>Narx: {m.consultation_price}</span>}
      </Space>
    );
  } else if (businessType === "fitness_center") {
    const available = m.available !== false;
    extra = (
      <Space direction="vertical" size={4} style={{ width: "100%" }}>
        <Space wrap size={4}>
          <Tag color={available ? "green" : "default"}>{available ? "Mavjud" : "Vaqtincha yo‘q"}</Tag>
          {m.training_type && <Tag color="geekblue">{m.training_type}</Tag>}
          {m.level && <Tag>{m.level}</Tag>}
          {m.gender_group && <Tag>{m.gender_group}</Tag>}
          {m.has_personal_trainer && <Tag color="purple">Personal trener</Tag>}
        </Space>
        <div style={{ fontSize: 13, color: "var(--cs-muted)" }}>
          {m.duration && <div>⏳ Davomiyligi: {m.duration}</div>}
          {m.sessions_count != null && <div>🔢 Mashg‘ulotlar: {m.sessions_count}</div>}
          {m.trainer_name && <div>👨‍🏫 Trener: {m.trainer_name}</div>}
          {m.schedule && <div>📅 Jadval: {m.schedule}</div>}
        </div>
      </Space>
    );
  } else {
    extra = m.note ? <span style={{ fontSize: 12 }}>{m.note}</span> : null;
  }

  return (
    <Card
      className="cs-premium-item-card cs-card-hover"
      hoverable
      onClick={onClick}
      cover={
        cover ? (
          <img src={cover} alt={item.title} />
        ) : (
          <div
            style={{
              height: 180,
              background: "var(--gradient-soft)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--muted)",
              fontSize: 13,
            }}
          >
            Rasm yo&apos;q
          </div>
        )
      }
      title={<span style={{ fontWeight: 700 }}>{item.title}</span>}
    >
      <div className="cs-premium-item-card__price">{formatPrice(item.price, item.currency)}</div>
      {extra}
    </Card>
  );
}
