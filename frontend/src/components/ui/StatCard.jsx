import { Card, Statistic } from "antd";

export default function StatCard({ title, value, prefix, suffix, loading }) {
  return (
    <Card className="cs-stat-card" loading={loading}>
      <Statistic title={title} value={value} prefix={prefix} suffix={suffix} />
    </Card>
  );
}
