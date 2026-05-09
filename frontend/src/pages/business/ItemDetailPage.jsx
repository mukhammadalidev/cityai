import { Button, Card, Descriptions, Space, Typography, message } from "antd";
import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useOutletContext, useParams } from "react-router-dom";
import PageHeader from "../../components/ui/PageHeader";
import LoadingScreen from "../../components/ui/LoadingScreen";
import DynamicItemCard from "../../components/dynamic/DynamicItemCard";
import { getItem } from "../../services/itemService";
import { formatPrice, mediaUrl } from "../../utils/formatters";
import StatusTag from "../../components/ui/StatusTag";
import { ITEM_STATUS } from "../../config/statusConfigs";
import { useWindowEvent } from "../../hooks/useWindowEvent";
import { BUSINESS_DATA_CHANGED } from "../../utils/businessEvents";

export default function ItemDetailPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const { business } = useOutletContext();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchItem = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      setItem(await getItem(id));
    } catch {
      message.error("Topilmadi.");
      setItem(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchItem();
  }, [fetchItem]);

  useWindowEvent(BUSINESS_DATA_CHANGED, fetchItem);

  if (loading) return <LoadingScreen />;
  if (!item) return <Typography.Text>Pozitsiya topilmadi.</Typography.Text>;

  return (
    <>
      <PageHeader
        title={item.title}
        extra={
          <Space>
            <Link to={`/business/items/${id}/edit`}>
              <Button type="primary">Tahrirlash</Button>
            </Link>
            <Button onClick={() => nav("/business/items")}>Orqaga</Button>
          </Space>
        }
      />
      {item.image && (
        <div style={{ marginBottom: 16 }}>
          <img src={mediaUrl(item.image)} alt="" style={{ maxWidth: 360, borderRadius: 12 }} />
        </div>
      )}
      <Card>
        <Descriptions bordered size="small" column={1}>
          <Descriptions.Item label="Narx">{formatPrice(item.price, item.currency)}</Descriptions.Item>
          <Descriptions.Item label="Holat">
            <StatusTag map={ITEM_STATUS} value={item.status} />
          </Descriptions.Item>
          <Descriptions.Item label="Tavsif">{item.description || "—"}</Descriptions.Item>
        </Descriptions>
      </Card>
      <div style={{ marginTop: 16 }}>
        <DynamicItemCard item={item} businessType={business?.business_type} />
      </div>
    </>
  );
}
