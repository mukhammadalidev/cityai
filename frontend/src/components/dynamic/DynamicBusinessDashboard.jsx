import { Card, Col, Row, Statistic, Typography } from "antd";
import StatCard from "../ui/StatCard";
import BotMenuPreview from "./BotMenuPreview";
import { formatPrice } from "../../utils/formatters";

function FitnessStatCard({ title, value, hint, color, suffix }) {
  return (
    <Card size="small" className="cs-stat-card" styles={{ body: { padding: 16 } }}>
      <Statistic
        title={
          <span style={{ fontSize: 13, color: "#475569", fontWeight: 600 }}>{title}</span>
        }
        value={value}
        suffix={suffix}
        valueStyle={{ color: color || "#0f172a", fontWeight: 800, fontSize: 24 }}
      />
      {hint ? (
        <Typography.Text type="secondary" style={{ fontSize: 11 }}>
          {hint}
        </Typography.Text>
      ) : null}
    </Card>
  );
}

function fmtNum(v) {
  return Number(v || 0).toLocaleString("uz-UZ");
}

export default function DynamicBusinessDashboard({ stats, businessType }) {
  const isRestaurant = businessType === "restaurant";
  const isAuto = businessType === "auto_salon";
  const isEducation = businessType === "education_center";
  const isShop = businessType === "shop";
  const isFitnessCenter = businessType === "fitness_center";

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

  if (isFitnessCenter) {
    const ledger = stats?.fitness_ledger || {};
    const monthPaid = Number(ledger.month_paid ?? 0);
    const debtTotal = Number(ledger.debt_total ?? 0);
    const expectedTotal = Number(ledger.expected_total ?? 0);
    const dailyRevenue = Number(ledger.month_daily_revenue ?? 0);
    const totalClients = (ledger.active_monthly ?? 0) + (ledger.active_daily ?? 0);

    return (
      <>
        {/* 1-bo'lim: BUGUN */}
        <Typography.Title level={5} style={{ marginTop: 8, marginBottom: 8, color: "#0f172a" }}>
          📅 Bugun
        </Typography.Title>
        <Typography.Paragraph type="secondary" style={{ marginBottom: 12, fontSize: 13 }}>
          Bugun zalga nechta klient keldi va yangi qancha ariza tushdi.
        </Typography.Paragraph>
        <Row gutter={[12, 12]}>
          <Col xs={12} sm={8} lg={6}>
            <FitnessStatCard
              title="Bugungi tashriflar"
              value={ledger.today_attendance ?? 0}
              hint="Bugun zalga kelgan klientlar soni"
              color="#2563eb"
            />
          </Col>
          <Col xs={12} sm={8} lg={6}>
            <FitnessStatCard
              title="Yangi arizalar"
              value={stats?.leads_membership_request ?? 0}
              hint="Botdan kelgan abonement arizalari (jami)"
              color="#7c3aed"
            />
          </Col>
          <Col xs={12} sm={8} lg={6}>
            <FitnessStatCard
              title="Sinov darslar"
              value={stats?.bookings_trial_lesson ?? 0}
              hint="Botdan kelgan sinov mashg'ulot arizalari"
              color="#0891b2"
            />
          </Col>
          <Col xs={12} sm={8} lg={6}>
            <FitnessStatCard
              title="Muddati tugayotgan"
              value={ledger.expiring_soon ?? 0}
              hint="Yaqin 7 kun ichida tugaydigan abonementlar"
              color={Number(ledger.expiring_soon ?? 0) > 0 ? "#d97706" : "#0f172a"}
            />
          </Col>
        </Row>

        {/* 2-bo'lim: KLIENTLAR BAZASI */}
        <Typography.Title level={5} style={{ marginTop: 24, marginBottom: 8, color: "#0f172a" }}>
          👥 Klientlar bazasi
        </Typography.Title>
        <Typography.Paragraph type="secondary" style={{ marginBottom: 12, fontSize: 13 }}>
          Hozir zalingizda nechta faol klient bor.
        </Typography.Paragraph>
        <Row gutter={[12, 12]}>
          <Col xs={12} sm={8} lg={6}>
            <FitnessStatCard
              title="Jami klientlar (faol)"
              value={totalClients}
              hint="Hozir faol bo'lgan barcha klientlar"
              color="#0f172a"
            />
          </Col>
          <Col xs={12} sm={8} lg={6}>
            <FitnessStatCard
              title="Oylik klientlar"
              value={ledger.active_monthly ?? 0}
              hint="Abonement olgan klientlar"
              color="#7c3aed"
            />
          </Col>
          <Col xs={12} sm={8} lg={6}>
            <FitnessStatCard
              title="Kunlik klientlar"
              value={ledger.active_daily ?? 0}
              hint="Har safar pul to'lab kiradigan klientlar"
              color="#2563eb"
            />
          </Col>
          <Col xs={12} sm={8} lg={6}>
            <FitnessStatCard
              title="Faol abonementlar"
              value={ledger.active_memberships ?? 0}
              hint="Hozir kuchda bo'lgan abonementlar"
              color="#16a34a"
            />
          </Col>
        </Row>

        {/* 3-bo'lim: OY MOLIYASI */}
        <Typography.Title level={5} style={{ marginTop: 24, marginBottom: 8, color: "#0f172a" }}>
          💰 Joriy oy moliyasi
        </Typography.Title>
        <Typography.Paragraph type="secondary" style={{ marginBottom: 12, fontSize: 13 }}>
          Bu oyda qancha pul tushdi, qancha qarz qoldi.
        </Typography.Paragraph>
        <Row gutter={[12, 12]}>
          <Col xs={24} sm={12} lg={6}>
            <FitnessStatCard
              title="Oy daromadi (jami)"
              value={fmtNum(monthPaid)}
              suffix="so'm"
              hint="Bu oyda kassaga tushgan barcha to'lovlar"
              color="#16a34a"
            />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <FitnessStatCard
              title="Kunlik klient daromadi"
              value={fmtNum(dailyRevenue)}
              suffix="so'm"
              hint="Bu oydagi kunlik tashriflardan tushgan pul"
              color="#0891b2"
            />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <FitnessStatCard
              title="Qarzdorlik"
              value={fmtNum(debtTotal)}
              suffix="so'm"
              hint="Klientlardan kelishi kerak bo'lgan pul"
              color={debtTotal > 0 ? "#dc2626" : "#16a34a"}
            />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <FitnessStatCard
              title="Kutilayotgan jami"
              value={fmtNum(expectedTotal)}
              suffix="so'm"
              hint="Barcha abonementlar narxi (to'langan + qarz)"
              color="#475569"
            />
          </Col>
        </Row>

        {/* 4-bo'lim: OY DAVOMATI */}
        <Typography.Title level={5} style={{ marginTop: 24, marginBottom: 8, color: "#0f172a" }}>
          📊 Oy davomati
        </Typography.Title>
        <Row gutter={[12, 12]}>
          <Col xs={12} sm={12} lg={8}>
            <FitnessStatCard
              title="Oydagi jami tashriflar"
              value={ledger.month_attendance ?? 0}
              hint="Bu oyda kelgan klientlar tashriflari soni"
              color="#0f172a"
            />
          </Col>
          <Col xs={12} sm={12} lg={8}>
            <FitnessStatCard
              title="Tugagan abonementlar"
              value={ledger.expired_memberships ?? 0}
              hint="Muddati o'tib ketgan abonementlar"
              color="#94a3b8"
            />
          </Col>
        </Row>

        <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
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
