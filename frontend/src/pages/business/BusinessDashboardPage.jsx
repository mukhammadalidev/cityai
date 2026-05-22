import { Button, Col, Row, Table, Typography, message } from "antd";
import { CreditCard, Receipt, Users, Wallet } from "lucide-react";
import EducationCoursesChart from "../../components/charts/EducationCoursesChart";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, Navigate, useOutletContext } from "react-router-dom";
import DashboardHero from "../../components/ui/DashboardHero";
import SectionCard from "../../components/ui/SectionCard";
import StatCard from "../../components/ui/StatCard";
import LoadingScreen from "../../components/ui/LoadingScreen";
import { getBusinessTypeConfig } from "../../config/businessTypes";
import DynamicBusinessDashboard from "../../components/dynamic/DynamicBusinessDashboard";
import LeadsChart from "../../components/charts/LeadsChart";
import UsageChart from "../../components/charts/UsageChart";
import ConversionChart from "../../components/charts/ConversionChart";
import { getBusinessDashboard } from "../../services/businessService";
import { getBusinessAnalytics } from "../../services/analyticsService";
import { getLeads } from "../../services/leadService";
import { getAIUsage } from "../../services/aiUsageService";
import { getBookings } from "../../services/bookingService";
import { useWindowEvent } from "../../hooks/useWindowEvent";
import { BUSINESS_DATA_CHANGED } from "../../utils/businessEvents";
import { BOOKING_STATUS, LEAD_STATUS } from "../../config/statusConfigs";
import StatusTag from "../../components/ui/StatusTag";
import { formatDate, formatDateTime, formatPhone, formatPrice, formatUsd } from "../../utils/formatters";
import { monthLabelUz } from "../../utils/monthNamesUz";

export default function BusinessDashboardPage() {
  const { businessId, business, plan } = useOutletContext();
  const bt = business?.business_type;
  const isRestaurant = bt === "restaurant";
  const isEducation = bt === "education_center";
  const isFitnessCenter = bt === "fitness_center";
  const typeCfg = getBusinessTypeConfig(bt);

  const [dash, setDash] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [allLeads, setAllLeads] = useState([]);
  const [leadRows, setLeadRows] = useState([]);
  const [aiList, setAiList] = useState([]);
  const [aiMonthSummary, setAiMonthSummary] = useState(null);
  const [recentBookings, setRecentBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!businessId) return;
    setLoading(true);
    try {
      const tasks = [getBusinessDashboard(businessId), getLeads({ business_id: businessId }), getAIUsage({ business_id: businessId })];
      if (isRestaurant) {
        tasks.push(getBookings({ business_id: businessId, booking_type: "table_booking" }));
      }
      const results = await Promise.all(tasks);
      const d = results[0];
      const leads = results[1];
      const aiPack = results[2];
      const bookings = isRestaurant ? results[3] : null;

      let a = null;
      if (plan?.has_analytics) {
        try {
          a = await getBusinessAnalytics(businessId);
        } catch {
          a = null;
        }
      }

      setDash(d);
      setAnalytics(a);
      setAllLeads(leads);
      setLeadRows(leads.slice(0, 8));
      setAiList(aiPack.rows || []);
      setAiMonthSummary(aiPack.monthSummary || null);
      setRecentBookings(isRestaurant ? (bookings || []).slice(0, 8) : []);
    } catch {
      message.error("Ma'lumotlarni yuklashda xatolik yuz berdi.");
      setDash(null);
      setAnalytics(null);
      setAllLeads([]);
      setLeadRows([]);
      setAiList([]);
      setAiMonthSummary(null);
      setRecentBookings([]);
    } finally {
      setLoading(false);
    }
  }, [businessId, isRestaurant, plan?.has_analytics]);

  useEffect(() => {
    load();
  }, [load]);

  useWindowEvent("business-changed", load);
  useWindowEvent(BUSINESS_DATA_CHANGED, load);

  const leadsByDay = useMemo(() => {
    const m = {};
    allLeads.forEach((l) => {
      const d = String(l.created_at || "").slice(0, 10);
      if (!d) return;
      m[d] = (m[d] || 0) + 1;
    });
    return Object.entries(m)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-14)
      .map(([day, c]) => ({ d: day, c }));
  }, [allLeads]);

  const leadTypePie = useMemo(() => {
    const byType = {};
    allLeads.forEach((l) => {
      const k = l.lead_type || "—";
      byType[k] = (byType[k] || 0) + 1;
    });
    return Object.entries(byType).map(([name, value]) => ({ name, value }));
  }, [allLeads]);

  const tokenBars = useMemo(() => {
    const tok = {};
    aiList.forEach((row) => {
      const day = String(row.created_at || "").slice(5, 10);
      if (!day) return;
      tok[day] = (tok[day] || 0) + (row.total_tokens || 0);
    });
    return Object.entries(tok)
      .map(([n, t]) => ({ n, t }))
      .slice(-12);
  }, [aiList]);

  if (!businessId) return null;
  if (isFitnessCenter) {
    return <Navigate to="/business/fitness/dashboard" replace />;
  }
  if (loading && !dash) return <LoadingScreen />;

  const stats = { ...(dash || {}), ...(analytics || {}) };

  const quickLinks = (
    <div className="cs-dash-quick-links">
      <Link to="/business/leads">
        <Button>{typeCfg.leadsLabel || "Lidlar"}</Button>
      </Link>
      <Link to="/business/bookings">
        <Button>{typeCfg.bookingsLabel || "Bronlar"}</Button>
      </Link>
      <Link to="/business/items">
        <Button>{typeCfg.itemsLabel || "Katalog"}</Button>
      </Link>
      {isEducation ? (
        <Link to="/business/student-payments">
          <Button icon={<CreditCard size={14} />}>Oylik to&apos;lovlarni ko&apos;rish</Button>
        </Link>
      ) : null}
      {typeCfg.ordersLabel ? (
        <Link to="/business/orders">
          <Button>{typeCfg.ordersLabel}</Button>
        </Link>
      ) : null}
    </div>
  );

  return (
    <>
      <DashboardHero
        eyebrow={typeCfg.label}
        title={business?.name || typeCfg.dashboardTitle}
        description="Arizalar, bronlar, buyurtmalar va mijozlarni kuzatib boring."
        gradient={typeCfg.gradient}
        actions={quickLinks}
      />

      <DynamicBusinessDashboard stats={stats} businessType={bt} />

      {isEducation && (stats.edu_monthly_paid_count != null || stats.edu_monthly_income) ? (
        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          <Col xs={24} sm={12} lg={6}>
            <Link to="/business/student-payments">
              <StatCard
                title="Shu oy to'laganlar"
                value={stats.edu_monthly_paid_count ?? 0}
                hint={`${stats.edu_monthly_month ? monthLabelUz(stats.edu_monthly_month) : ""} ${stats.edu_monthly_year || ""}`}
                icon={Wallet}
                iconColor="#16A34A"
                iconBg="rgba(22, 163, 74, 0.1)"
              />
            </Link>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Link to="/business/student-payments">
              <StatCard
                title="Shu oy to'lamaganlar"
                value={stats.edu_monthly_unpaid_count ?? 0}
                icon={Receipt}
                iconColor="#DC2626"
                iconBg="rgba(220, 38, 38, 0.1)"
              />
            </Link>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Link to="/business/student-payments">
              <StatCard
                title="Qarzdorlar"
                value={stats.edu_monthly_debt_count ?? 0}
                icon={CreditCard}
                iconColor="#64748B"
                iconBg="rgba(100, 116, 139, 0.12)"
              />
            </Link>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Link to="/business/student-payments">
              <StatCard
                title="Shu oy tushumi"
                value={formatPrice(stats.edu_monthly_income || 0)}
                icon={Wallet}
                iconColor="#7C3AED"
                iconBg="rgba(124, 58, 237, 0.1)"
              />
            </Link>
          </Col>
        </Row>
      ) : null}
      {isEducation ? (
        <>
          <div className="cs-dash-section-label">O&apos;quv markaz — abonement (muddat)</div>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={8}>
              <Link to="/business/students">
                <StatCard
                  title="To'langan"
                  value={stats.edu_tuition_paid_active ?? 0}
                  suffix="faol o'q."
                  hint="Muddat bugun yoki keyin"
                  icon={Wallet}
                  iconColor="#16A34A"
                  iconBg="rgba(22, 163, 74, 0.1)"
                />
              </Link>
            </Col>
            <Col xs={24} sm={8}>
              <Link to="/business/students">
                <StatCard
                  title="To'lanmagan"
                  value={stats.edu_tuition_unpaid_active ?? 0}
                  suffix="faol o'q."
                  hint="Muddat o'tgan"
                  icon={Receipt}
                  iconColor="#DC2626"
                  iconBg="rgba(220, 38, 38, 0.1)"
                />
              </Link>
            </Col>
            <Col xs={24} sm={8}>
              <Link to="/business/students">
                <StatCard
                  title="Kiritilmagan"
                  value={stats.edu_tuition_unset_active ?? 0}
                  suffix="faol o'q."
                  hint="Muddat qo'yilmagan"
                  icon={Users}
                  iconColor="#64748B"
                  iconBg="rgba(100, 116, 139, 0.12)"
                />
              </Link>
            </Col>
          </Row>
          <SectionCard title="Ota-ona kabineti faolligi" className="cs-mt-16">
            <Typography.Paragraph style={{ marginBottom: 4 }}>
              Oxirgi kirish: <b>{formatDateTime(stats.edu_parent_portal_last_login)}</b>
            </Typography.Paragraph>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              Ota-ona portali sahifasiga kirganda vaqt yangilanadi.
            </Typography.Text>
          </SectionCard>
          <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
            <Col xs={24} lg={12}>
              <SectionCard title="Kurslar bo'yicha o'quvchilar">
                <EducationCoursesChart data={stats?.edu_course_breakdown} metric="students" />
              </SectionCard>
            </Col>
            <Col xs={24} lg={12}>
              <SectionCard title="Kurs narxi × faol o'quvchi">
                <EducationCoursesChart data={stats?.edu_course_breakdown} metric="subtotal" />
              </SectionCard>
            </Col>
          </Row>
          {stats?.edu_course_breakdown?.length ? (
            <SectionCard title="Kurslar bo'yicha batafsil" className="cs-mt-16">
              <div className="cs-table-scroll">
                <Table
                  size="small"
                  rowKey="course_id"
                  dataSource={stats.edu_course_breakdown}
                  pagination={false}
                  scroll={{ x: 560 }}
                  columns={[
                    { title: "Kurs", dataIndex: "title" },
                    { title: "O'quvchilar", dataIndex: "students", width: 100 },
                    {
                      title: "Narx",
                      dataIndex: "price",
                      render: (v, r) => formatPrice(v, r.currency || "UZS"),
                    },
                    {
                      title: "Jami",
                      dataIndex: "subtotal",
                      render: (v, r) => formatPrice(v, r.currency || "UZS"),
                    },
                  ]}
                />
              </div>
            </SectionCard>
          ) : null}
        </>
      ) : null}

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={12}>
          <SectionCard title={typeCfg.leadsLabel || "Leadlar"} extra={<Link to="/business/leads">Barchasi →</Link>}>
            <LeadsChart data={leadsByDay} />
          </SectionCard>
        </Col>
        <Col xs={24} lg={12}>
          <SectionCard title="Leadlar turlari">
            <ConversionChart data={leadTypePie.length ? leadTypePie : [{ name: "—", value: 1 }]} />
          </SectionCard>
        </Col>
        <Col xs={24} lg={12}>
          <SectionCard title="AI ishlatilishi">
            {aiMonthSummary ? (
              <Typography.Paragraph type="secondary" style={{ marginBottom: 8, fontSize: 13 }}>
                {aiMonthSummary.month}: {formatUsd(aiMonthSummary.total_estimated_cost_usd)} ·{" "}
                {aiMonthSummary.total_tokens} token
              </Typography.Paragraph>
            ) : null}
            <UsageChart data={tokenBars} />
          </SectionCard>
        </Col>
      </Row>

      {isRestaurant && recentBookings.length ? (
        <SectionCard
          title={typeCfg.bookingsLabel || "Oxirgi bronlar"}
          extra={<Link to="/business/bookings">Barchasi →</Link>}
          className="cs-mt-16"
        >
          <div className="cs-table-scroll">
            <Table
              size="small"
              rowKey="id"
              dataSource={recentBookings}
              pagination={false}
              scroll={{ x: 640 }}
              columns={[
                { title: "Ism", dataIndex: "name" },
                { title: "Telefon", dataIndex: "phone", render: formatPhone },
                { title: "Kishi", dataIndex: "guests_count", width: 70 },
                { title: "Sana", dataIndex: "preferred_date", render: formatDate },
                { title: "Holat", dataIndex: "status", render: (v) => <StatusTag map={BOOKING_STATUS} value={v} /> },
              ]}
            />
          </div>
        </SectionCard>
      ) : null}

      <SectionCard
        title={`Oxirgi ${(typeCfg.leadsLabel || "lidlar").toLowerCase()}`}
        extra={<Link to="/business/leads">Barchasi →</Link>}
        className="cs-mt-16"
      >
        {leadRows.length ? (
          <div className="cs-table-scroll">
            <Table
              size="small"
              rowKey="id"
              dataSource={leadRows}
              pagination={false}
              scroll={{ x: 520 }}
              columns={[
                { title: "Ism", dataIndex: "name" },
                { title: "Telefon", dataIndex: "phone", render: formatPhone },
                { title: "Holat", dataIndex: "status", render: (v) => <StatusTag map={LEAD_STATUS} value={v} /> },
              ]}
            />
          </div>
        ) : (
          <Typography.Text type="secondary">Hozircha lid yo&apos;q.</Typography.Text>
        )}
      </SectionCard>
    </>
  );
}
