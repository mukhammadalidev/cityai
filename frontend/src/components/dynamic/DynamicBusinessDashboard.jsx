import { Col, Row } from "antd";
import StatCard from "../ui/StatCard";
import BotMenuPreview from "./BotMenuPreview";
import { formatPrice } from "../../utils/formatters";

export default function DynamicBusinessDashboard({ stats, businessType }) {
  const isRestaurant = businessType === "restaurant";
  const isAuto = businessType === "auto_salon";
  const isEducation = businessType === "education_center";
  const isShop = businessType === "shop";

  if (isRestaurant) {
    return (
      <>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} lg={8}>
            <StatCard title="Bugungi bronlar" value={stats?.bookings_today ?? 0} />
          </Col>
          <Col xs={24} sm={12} lg={8}>
            <StatCard title="Yangi bronlar" value={stats?.bookings_new ?? 0} />
          </Col>
          <Col xs={24} sm={12} lg={8}>
            <StatCard title="Tasdiqlangan bronlar" value={stats?.bookings_confirmed ?? 0} />
          </Col>
          <Col xs={24} sm={12} lg={8}>
            <StatCard title="Bekor qilingan bronlar" value={stats?.bookings_cancelled ?? 0} />
          </Col>
          <Col xs={24} sm={12} lg={8}>
            <StatCard title="Menyu soni" value={stats?.items_total ?? stats?.items_active ?? 0} />
          </Col>
          <Col xs={24} sm={12} lg={8}>
            <StatCard title="Buyurtmalar" value={stats?.orders_total ?? stats?.orders_new ?? 0} />
          </Col>
        </Row>
        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          <Col xs={24} md={12}>
            <BotMenuPreview businessType={businessType} />
          </Col>
        </Row>
      </>
    );
  }

  if (isAuto) {
    return (
      <>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} lg={8}>
            <StatCard title="Bugungi bronlar" value={stats?.bookings_today ?? 0} />
          </Col>
          <Col xs={24} sm={12} lg={8}>
            <StatCard title="Test drive" value={stats?.bookings_test_drive ?? 0} />
          </Col>
          <Col xs={24} sm={12} lg={8}>
            <StatCard title="Kredit so‘rovlari" value={stats?.leads_credit ?? 0} />
          </Col>
          <Col xs={24} sm={12} lg={8}>
            <StatCard title="Trade-in" value={stats?.leads_trade_in ?? 0} />
          </Col>
          <Col xs={24} sm={12} lg={8}>
            <StatCard title="Faol mashinalar" value={stats?.items_active ?? 0} />
          </Col>
          <Col xs={24} sm={12} lg={8}>
            <StatCard title="Sotilgan" value={stats?.items_sold ?? 0} />
          </Col>
        </Row>
        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          <Col xs={24} md={12}>
            <BotMenuPreview businessType={businessType} />
          </Col>
        </Row>
      </>
    );
  }

  if (isEducation) {
    const sumActive = formatPrice(Number(stats?.edu_potential_active_sum ?? 0));
    const sumMonth = formatPrice(Number(stats?.edu_new_enrollments_sum_month ?? 0));
    const sumYear = formatPrice(Number(stats?.edu_new_enrollments_sum_year ?? 0));
    return (
      <>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} lg={6}>
            <StatCard title="Faol o‘quvchilar" value={stats?.edu_students_active ?? 0} />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <StatCard title="Jami o‘quvchilar" value={stats?.edu_students_total ?? 0} />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <StatCard title="O‘quv guruhlari" value={stats?.edu_groups_total ?? 0} />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <StatCard title="Faol ustozlar" value={stats?.edu_teachers_active ?? 0} />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <StatCard title="Faol kurslar (pozitsiya)" value={stats?.items_active ?? 0} />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <StatCard title="Sinov darslar (bron)" value={stats?.bookings_trial_lesson ?? 0} />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <StatCard title="Yangi lidlar" value={stats?.leads_new ?? 0} />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <StatCard title="Shu oyda yangi o‘quvchi" value={stats?.edu_students_new_month ?? 0} />
          </Col>
        </Row>
        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          <Col xs={24} lg={8}>
            <StatCard title="Faol o‘quvchilar — kurs narxlari yig‘indisi" value={sumActive} />
          </Col>
          <Col xs={24} lg={8}>
            <StatCard title="Shu oy: yangi qo‘shilganlar narxi (kurs bo‘yicha)" value={sumMonth} />
          </Col>
          <Col xs={24} lg={8}>
            <StatCard title="Shu yil: yangi qo‘shilganlar narxi (kurs bo‘yicha)" value={sumYear} />
          </Col>
        </Row>
        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          <Col xs={24} md={12}>
            <BotMenuPreview businessType={businessType} />
          </Col>
        </Row>
      </>
    );
  }

  if (isShop) {
    return (
      <>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} lg={8}>
            <StatCard title="Yangi buyurtmalar" value={stats?.orders_new ?? 0} />
          </Col>
          <Col xs={24} sm={12} lg={8}>
            <StatCard title="Buyurtmalar (jami)" value={stats?.orders_total ?? 0} />
          </Col>
          <Col xs={24} sm={12} lg={8}>
            <StatCard title="Faol mahsulotlar" value={stats?.items_active ?? 0} />
          </Col>
          <Col xs={24} sm={12} lg={8}>
            <StatCard title="Tugagan" value={stats?.items_low_stock ?? 0} />
          </Col>
        </Row>
        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          <Col xs={24} md={12}>
            <BotMenuPreview businessType={businessType} />
          </Col>
        </Row>
      </>
    );
  }

  return (
    <>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <StatCard title="Lidlar (jami)" value={stats?.leads_total ?? 0} />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard title="Yangi lidlar" value={stats?.leads_new ?? 0} />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard title="Faol pozitsiyalar" value={stats?.items_active ?? 0} />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard title="Yangi bronlar" value={stats?.bookings_new ?? 0} />
        </Col>
      </Row>
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} md={12}>
          <BotMenuPreview businessType={businessType} />
        </Col>
      </Row>
    </>
  );
}
