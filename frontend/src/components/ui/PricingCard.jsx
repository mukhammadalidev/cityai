import { Card, List, Typography } from "antd";
import { planFeatureList } from "../../config/planConfigs";
import { formatPrice } from "../../utils/formatters";

export default function PricingCard({ plan, onSelect }) {
  const feats = planFeatureList(plan);
  return (
    <Card className="cs-card-hover" title={plan?.name} extra={plan?.code}>
      <Typography.Title level={3} style={{ marginTop: 0 }}>
        {formatPrice(plan?.monthly_price)}
        <Typography.Text type="secondary"> / oy</Typography.Text>
      </Typography.Title>
      {Number(plan?.trial_days || 0) > 0 ? (
        <Typography.Text type="warning" style={{ display: "block", marginBottom: 8 }}>
          {plan.trial_days} kun bepul sinov, keyin tarifni tanlash kerak
        </Typography.Text>
      ) : null}
      <List size="small" dataSource={feats} renderItem={(item) => <List.Item>{item}</List.Item>} />
      {onSelect && (
        <Typography.Link onClick={() => onSelect(plan)} style={{ marginTop: 12, display: "block" }}>
          Tanlash
        </Typography.Link>
      )}
    </Card>
  );
}
