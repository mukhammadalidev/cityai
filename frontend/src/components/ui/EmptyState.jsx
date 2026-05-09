import { Empty } from "antd";

export default function EmptyState({ description }) {
  return (
    <div className="cs-empty">
      <Empty description={description || "Ma’lumot yo‘q"} />
    </div>
  );
}
