import { Card, Col, Row, Table, Typography, message } from "antd";
import EducationCoursesChart from "../../components/charts/EducationCoursesChart";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import PageHeader from "../../components/ui/PageHeader";
import LoadingScreen from "../../components/ui/LoadingScreen";
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
import { BOOKING_STATUS } from "../../config/statusConfigs";
import StatusTag from "../../components/ui/StatusTag";
import { formatDate, formatPhone, formatPrice } from "../../utils/formatters";

export default function BusinessDashboardPage() {
  const { businessId, business, plan } = useOutletContext();
  const isRestaurant = business?.business_type === "restaurant";
  const isEducation = business?.business_type === "education_center";
  const [dash, setDash] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [allLeads, setAllLeads] = useState([]);
  const [leadRows, setLeadRows] = useState([]);
  const [aiList, setAiList] = useState([]);
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
      const ai = results[2];
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
      setAiList(ai);
      setRecentBookings(isRestaurant ? (bookings || []).slice(0, 8) : []);
    } catch {
      message.error("Ma’lumotlarni yuklashda xatolik yuz berdi.");
      setDash(null);
      setAnalytics(null);
      setAllLeads([]);
      setLeadRows([]);
      setAiList([]);
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
  if (loading && !dash) return <LoadingScreen />;

  const stats = { ...(dash || {}), ...(analytics || {}) };

  return (
    <>
      <PageHeader title="Dashboard" description="Biznesingizning real vaqtdagi ko‘rinishi." />
      <DynamicBusinessDashboard stats={stats} businessType={business?.business_type} />
      {isEducation ? (
        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          <Col xs={24} lg={12}>
            <Card title="Analitika: kurslar bo‘yicha o‘quvchilar soni">
              <EducationCoursesChart data={stats?.edu_course_breakdown} metric="students" />
            </Card>
          </Col>
          <Col xs={24} lg={12}>
            <Card title="Analitika: kurs narxi × faol o‘quvchi (yig‘indi)">
              <EducationCoursesChart data={stats?.edu_course_breakdown} metric="subtotal" />
            </Card>
          </Col>
        </Row>
      ) : null}
      {isEducation ? (
        <Typography.Paragraph type="secondary" style={{ marginTop: 8 }}>
          Summa: faol o‘quvchilar biriktirilgan kurs narxlari yig‘indisi. Oy/yil — shu davrda yaratilgan o‘quvchilar
          (kurs biriktirilgan) narxlari yig‘indisi. Haqiqiy to‘lovlar hisobi alohida.
        </Typography.Paragraph>
      ) : null}
      {isEducation && stats?.edu_course_breakdown?.length ? (
        <Card title="Kurslar bo‘yicha batafsil" style={{ marginTop: 16 }}>
          <Table
            size="small"
            rowKey="course_id"
            dataSource={stats.edu_course_breakdown}
            pagination={false}
            columns={[
              { title: "Kurs", dataIndex: "title" },
              { title: "Faol o‘quvchilar", dataIndex: "students" },
              {
                title: "Kurs narxi",
                dataIndex: "price",
                render: (v, r) => formatPrice(v, r.currency || "UZS"),
              },
              {
                title: "Jami (narx × son)",
                dataIndex: "subtotal",
                render: (v, r) => formatPrice(v, r.currency || "UZS"),
              },
            ]}
          />
        </Card>
      ) : null}
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={12}>
          <Card title="Leadlar (kunlar bo‘yicha)">
            <LeadsChart data={leadsByDay} />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Leadlar turlari">
            <ConversionChart data={leadTypePie.length ? leadTypePie : [{ name: "—", value: 1 }]} />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="AI tokenlar (kunlar)">
            <UsageChart data={tokenBars} />
          </Card>
        </Col>
      </Row>
      {isRestaurant && (
        <Card title="Oxirgi bronlar" style={{ marginTop: 16 }}>
          <Table
            size="small"
            rowKey="id"
            dataSource={recentBookings}
            pagination={false}
            columns={[
              { title: "Ism", dataIndex: "name" },
              { title: "Telefon", dataIndex: "phone", render: formatPhone },
              { title: "Kishi soni", dataIndex: "guests_count", render: (v) => v ?? "—" },
              { title: "Sana", dataIndex: "preferred_date", render: formatDate },
              { title: "Vaqt", dataIndex: "preferred_time" },
              {
                title: "Status",
                dataIndex: "status",
                render: (v) => <StatusTag map={BOOKING_STATUS} value={v} />,
              },
            ]}
          />
        </Card>
      )}
      <Card title="Oxirgi leadlar" style={{ marginTop: 16 }}>
        <Table
          size="small"
          rowKey="id"
          dataSource={leadRows}
          pagination={false}
          columns={[
            { title: "Ism", dataIndex: "name" },
            { title: "Telefon", dataIndex: "phone" },
            { title: "Holat", dataIndex: "status" },
          ]}
        />
      </Card>
      <Typography.Paragraph type="secondary" style={{ marginTop: 16 }}>
        * Grafiklar joriy biznes filtriga asoslangan.
      </Typography.Paragraph>
    </>
  );
}
