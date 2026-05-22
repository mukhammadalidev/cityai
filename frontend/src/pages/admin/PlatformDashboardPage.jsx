import { Col, Row, Table, Typography, message } from "antd";
import {
  Building2,
  FolderTree,
  MapPin,
  MessageSquare,
  Package,
  Receipt,
  TrendingUp,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import DashboardHero from "../../components/ui/DashboardHero";
import SectionCard from "../../components/ui/SectionCard";
import StatCard from "../../components/ui/StatCard";
import LoadingScreen from "../../components/ui/LoadingScreen";
import LeadsChart from "../../components/charts/LeadsChart";
import CategoryChart from "../../components/charts/CategoryChart";
import RevenueChart from "../../components/charts/RevenueChart";
import ConversionChart from "../../components/charts/ConversionChart";
import { getPlatformAnalytics } from "../../services/analyticsService";
import { getBusinesses } from "../../services/businessService";
import { getCities } from "../../services/cityService";
import { getLeads } from "../../services/leadService";
import { getSubscriptions } from "../../services/subscriptionService";
import { formatPrice } from "../../utils/formatters";
import { emptyPlatformAnalytics } from "../../utils/emptyAnalytics";
import StatusTag from "../../components/ui/StatusTag";
import { BUSINESS_STATUS, SUBSCRIPTION_STATUS } from "../../config/statusConfigs";

export default function PlatformDashboardPage() {
  const [data, setData] = useState(null);
  const [recentBiz, setRecentBiz] = useState([]);
  const [activeBizCount, setActiveBizCount] = useState(0);
  const [recentLeads, setRecentLeads] = useState([]);
  const [subs, setSubs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [a, cities, b, activeList, l, s] = await Promise.all([
          getPlatformAnalytics(),
          getCities({}),
          getBusinesses({}),
          getBusinesses({ status: "active" }),
          getLeads({}),
          getSubscriptions({}),
        ]);
        setData({ ...a, cities_total: cities.length });
        setRecentBiz(b.slice(0, 6));
        setActiveBizCount(activeList.length);
        setRecentLeads(l.slice(0, 8));
        setSubs(s.slice(0, 200));
      } catch {
        message.error("Ma’lumot yuklanmadi. API va tarmoqni tekshiring.");
        setData({ ...emptyPlatformAnalytics });
        setRecentBiz([]);
        setActiveBizCount(0);
        setRecentLeads([]);
        setSubs([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const planPie = useMemo(() => {
    const m = {};
    subs.forEach((r) => {
      const k = r.plan_name || "—";
      m[k] = (m[k] || 0) + 1;
    });
    return Object.entries(m).map(([name, value]) => ({ name, value }));
  }, [subs]);

  const dueSoon = useMemo(() => {
    const now = new Date();
    const in7 = new Date(now.getTime() + 7 * 86400000);
    return subs.filter((r) => {
      if (!r.next_payment_date) return false;
      const d = new Date(r.next_payment_date);
      return d >= now && d <= in7 && r.status !== "cancelled";
    });
  }, [subs]);

  if (loading) return <LoadingScreen />;

  const bizTotal = data?.businesses_total ?? 0;

  return (
    <>
      <DashboardHero
        eyebrow="CityBot"
        title="CityBot boshqaruv paneli"
        description="Shahar xizmatlari, bizneslar, arizalar va obunalarni bitta joydan boshqaring."
      />
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            title="Jami shaharlar"
            value={data?.cities_total ?? "—"}
            hint="Platformadagi shaharlar"
            icon={MapPin}
            iconColor="#2563EB"
            iconBg="rgba(37, 99, 235, 0.1)"
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            title="Kategoriyalar"
            value={data?.categories_total ?? 0}
            hint="Xizmat yo‘nalishlari"
            icon={FolderTree}
            iconColor="#7C3AED"
            iconBg="rgba(124, 58, 237, 0.1)"
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            title="Jami bizneslar"
            value={bizTotal}
            hint="Ro‘yxatdan o‘tgan"
            icon={Building2}
            iconColor="#0EA5E9"
            iconBg="rgba(14, 165, 233, 0.1)"
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            title="Aktiv bizneslar"
            value={activeBizCount}
            hint="Ishlayotgan"
            icon={TrendingUp}
            iconColor="#16A34A"
            iconBg="rgba(22, 163, 74, 0.1)"
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            title="Jami leadlar"
            value={data?.leads_total ?? 0}
            hint="Barcha murojaatlar"
            icon={MessageSquare}
            iconColor="#F59E0B"
            iconBg="rgba(245, 158, 11, 0.12)"
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            title="Telegram userlar"
            value={data?.customers_total ?? 0}
            hint="Bot foydalanuvchilari"
            icon={Users}
            iconColor="#06B6D4"
            iconBg="rgba(6, 182, 212, 0.12)"
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            title="Aktiv obunalar"
            value={data?.subscriptions_active ?? 0}
            hint="To‘lovli tariflar"
            icon={Receipt}
            iconColor="#2563EB"
            iconBg="rgba(37, 99, 235, 0.1)"
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            title="Mahsulotlar"
            value={data?.items_total ?? 0}
            hint="Kurs, menyu, mashina…"
            icon={Package}
            iconColor="#64748B"
            iconBg="rgba(100, 116, 139, 0.12)"
          />
        </Col>
      </Row>
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={12}>
          <SectionCard title="Leadlar kunlar bo‘yicha">
            <LeadsChart data={data?.leads_by_day} />
          </SectionCard>
        </Col>
        <Col xs={24} lg={12}>
          <SectionCard title="Daromad (demo)">
            <RevenueChart data={[]} />
          </SectionCard>
        </Col>
        <Col xs={24} lg={12}>
          <SectionCard title="Bizneslar kategoriya bo‘yicha">
            <CategoryChart data={data?.businesses_by_category} />
          </SectionCard>
        </Col>
        <Col xs={24} lg={12}>
          <SectionCard title="Obunalar (tarif bo‘yicha)">
            <ConversionChart data={planPie.length ? planPie : [{ name: "—", value: 1 }]} />
          </SectionCard>
        </Col>
      </Row>
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={8}>
          <SectionCard title="Oxirgi bizneslar">
            <Table
              size="small"
              rowKey="id"
              dataSource={recentBiz}
              pagination={false}
              columns={[
                {
                  title: "Nomi",
                  dataIndex: "name",
                  render: (name, row) => <Link to={`/admin/businesses/${row.id}`}>{name}</Link>,
                },
                {
                  title: "Holat",
                  dataIndex: "status",
                  render: (v) => <StatusTag map={BUSINESS_STATUS} value={v} />,
                },
              ]}
            />
          </SectionCard>
        </Col>
        <Col xs={24} lg={8}>
          <SectionCard title="Oxirgi leadlar">
            <Table
              size="small"
              rowKey="id"
              dataSource={recentLeads}
              pagination={false}
              columns={[
                { title: "Ism", dataIndex: "name" },
                { title: "Telefon", dataIndex: "phone" },
              ]}
            />
          </SectionCard>
        </Col>
        <Col xs={24} lg={8}>
          <SectionCard title="To‘lov muddati yaqin (7 kun)">
            <Table
              size="small"
              rowKey="id"
              dataSource={dueSoon}
              pagination={false}
              locale={{ emptyText: "Yaqin muddatli obuna yo‘q" }}
              columns={[
                { title: "Biznes ID", dataIndex: "business" },
                { title: "Keyingi to‘lov", dataIndex: "next_payment_date" },
                {
                  title: "Holat",
                  dataIndex: "status",
                  render: (v) => <StatusTag map={SUBSCRIPTION_STATUS} value={v} />,
                },
              ]}
            />
          </SectionCard>
        </Col>
      </Row>
      <Typography.Paragraph type="secondary" style={{ marginTop: 24 }}>
        * Daromad grafigi demo. Boshqa ko‘rsatkichlar backenddan keladi.
      </Typography.Paragraph>
    </>
  );
}
