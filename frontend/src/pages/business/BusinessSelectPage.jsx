import { Button, Card, Col, Row, Typography, message } from "antd";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import PageHeader from "../../components/ui/PageHeader";
import EmptyState from "../../components/ui/EmptyState";
import LoadingScreen from "../../components/ui/LoadingScreen";
import { getStoredUser, setSelectedBusinessId } from "../../utils/storage";
import { getBusinesses } from "../../services/businessService";

export default function BusinessSelectPage() {
  const nav = useNavigate();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const isSuperAdmin = getStoredUser()?.role === "super_admin";

  const load = () => {
    setLoading(true);
    getBusinesses(isSuperAdmin ? {} : { mine: 1 })
      .then(setList)
      .catch(() => {
        message.error("Bizneslar ro‘yxati yuklanmadi.");
        setList([]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  if (loading) return <LoadingScreen />;

  if (!list.length) {
    return (
      <>
        <PageHeader
          title="Biznes tanlash"
          description={
            isSuperAdmin
              ? "Super admin: istalgan biznesni kabinet rejimida boshqarish uchun tanlang."
              : "Platformadagi o‘z biznesingizni tanlang."
          }
        />
        <EmptyState description={isSuperAdmin ? "Bizneslar ro‘yxati bo‘sh." : "Sizga biriktirilgan biznes topilmadi."} />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Biznes tanlash"
        description={
          isSuperAdmin
            ? "Super admin: istalgan biznesni tanlang — kurslar, lidlar, sozlamalar kabinetdan."
            : "Davom etish uchun kartani bosing."
        }
      />
      <Row gutter={[16, 16]}>
        {list.map((b) => (
          <Col xs={24} sm={12} md={8} key={b.id}>
            <Card className="cs-card-hover" title={b.name} hoverable>
              <Typography.Text type="secondary">
                {b.category_name} · {b.city_name}
              </Typography.Text>
              <Button
                type="primary"
                block
                style={{ marginTop: 16 }}
                onClick={() => {
                  setSelectedBusinessId(b.id);
                  window.dispatchEvent(new Event("business-changed"));
                  nav("/business/dashboard");
                }}
              >
                Tanlash
              </Button>
            </Card>
          </Col>
        ))}
      </Row>
    </>
  );
}
