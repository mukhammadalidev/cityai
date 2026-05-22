import { Empty } from "antd";

export default function EmptyState({ description, action }) {
  return (
    <div className="cs-empty">
      <Empty description={description || "Ma'lumot yo'q"}>
        {action || null}
      </Empty>
    </div>
  );
}
