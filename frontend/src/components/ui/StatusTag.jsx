import { Tag } from "antd";

export default function StatusTag({ map, value }) {
  const c = map?.[value] || { label: value || "—", color: "default" };
  return <Tag color={c.color}>{c.label}</Tag>;
}
