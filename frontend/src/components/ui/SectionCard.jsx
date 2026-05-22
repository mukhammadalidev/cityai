import { Card } from "antd";

/** Premium oq kartochka — jadval/grafik uchun */
export default function SectionCard({ title, extra, children, className = "", bodyStyle }) {
  return (
    <Card
      className={`cs-section-card cs-chart-card ${className}`.trim()}
      title={title}
      extra={extra}
      styles={{ body: bodyStyle }}
    >
      {children}
    </Card>
  );
}
