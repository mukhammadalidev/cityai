import { Button, Col, Row, Tag } from "antd";
import dayjs from "dayjs";
import {
  AlertTriangle,
  CalendarDays,
  CreditCard,
  Dumbbell,
  LogIn,
  TrendingUp,
  UserCheck,
  Users,
  Wallet,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link, Navigate, useOutletContext } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import DashboardHero from "../../components/ui/DashboardHero";
import LoadingScreen from "../../components/ui/LoadingScreen";
import SectionCard from "../../components/ui/SectionCard";
import StatCard from "../../components/ui/StatCard";
import { getBusinessTypeConfig } from "../../config/businessTypes";
import { getFitnessDashboard } from "../../services/fitnessService";
import { formatPrice } from "../../utils/formatters";

const PIE_COLORS = ["#2563EB", "#16A34A", "#F59E0B", "#DC2626"];
const PAYMENT_LABELS = {
  paid: "To'langan",
  partial: "Qisman",
  debt: "Qarz",
  unpaid: "To'lanmagan",
};

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="cs-chart-tooltip">
      {label ? <div className="cs-chart-tooltip__label">{label}</div> : null}
      {payload.map((p) => (
        <div key={p.name} className="cs-chart-tooltip__row">
          <span>{p.name}</span>
          <strong>{typeof p.value === "number" ? p.value.toLocaleString("uz-UZ") : p.value}</strong>
        </div>
      ))}
    </div>
  );
}

function MemberRow({ name, sub, amount, badge }) {
  const initial = (name || "?").charAt(0).toUpperCase();
  return (
    <div className="cs-list-row">
      <span className="cs-list-row__avatar">{initial}</span>
      <div className="cs-list-row__main">
        <div className="cs-list-row__name">{name}</div>
        {sub ? <div className="cs-list-row__sub">{sub}</div> : null}
      </div>
      <div className="cs-list-row__end">
        {amount ? <div className="cs-list-row__amount">{amount}</div> : null}
        {badge}
      </div>
    </div>
  );
}

export default function FitnessDashboardPage() {
  const { businessId, business } = useOutletContext();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const typeCfg = getBusinessTypeConfig("fitness_center");

  const load = useCallback(async () => {
    if (!businessId) return;
    setLoading(true);
    try {
      setData(
        await getFitnessDashboard({
          business_id: businessId,
          month: dayjs().format("YYYY-MM"),
        })
      );
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  useEffect(() => {
    load();
  }, [load]);

  if (business?.business_type !== "fitness_center") {
    return <Navigate to="/business/dashboard" replace />;
  }
  if (loading) return <LoadingScreen />;
  if (!data) {
    return (
      <SectionCard title="Ma'lumot yuklanmadi">
        <p style={{ color: "var(--muted)", marginBottom: 16 }}>Internet yoki serverni tekshiring.</p>
        <Button type="primary" onClick={load}>
          Qayta yuklash
        </Button>
      </SectionCard>
    );
  }

  const c = data.cards || {};
  const incomeChart = (data.charts?.monthly_income || []).map((x) => ({
    month: x.month?.slice(5) || x.month,
    sum: Number(x.income || 0),
  }));
  const paymentPie = (data.charts?.payment_status || [])
    .filter((x) => Number(x.total || x.value || 0) > 0)
    .map((x) => ({
      name: PAYMENT_LABELS[x.status] || x.status || "—",
      value: Number(x.total || x.value || 0),
    }));

  const monthLabel = dayjs().format("MMMM YYYY");

  return (
    <>
      <DashboardHero
        eyebrow={
          <>
            <Dumbbell size={14} style={{ verticalAlign: -2, marginRight: 6 }} />
            {typeCfg.label}
          </>
        }
        title={business?.name || "Fitness zal"}
        description={`${monthLabel} · bugungi holat va moliyaviy ko'rsatkichlar`}
        gradient={typeCfg.gradient}
        actions={
          <>
            <Link to="/business/fitness/attendance">
              <Button type="primary" size="large" icon={<LogIn size={16} />}>
                Check-in
              </Button>
            </Link>
            <Link to="/business/fitness/clients">
              <Button size="large">A&apos;zo qo&apos;shish</Button>
            </Link>
          </>
        }
      />

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            title="Bugungi tushum"
            value={formatPrice(c.today_income)}
            hint="Kassa"
            icon={Wallet}
            iconColor="#16A34A"
            iconBg="rgba(22, 163, 74, 0.1)"
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            title="Bugungi check-in"
            value={c.today_checkins ?? 0}
            hint="Zalga kelganlar"
            icon={LogIn}
            iconColor="#2563EB"
            iconBg="rgba(37, 99, 235, 0.1)"
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            title="Oylik daromad"
            value={formatPrice(c.month_income)}
            hint={monthLabel}
            icon={TrendingUp}
            iconColor="#06B6D4"
            iconBg="rgba(6, 182, 212, 0.12)"
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            title="Faol a'zolar"
            value={c.members_active ?? 0}
            hint={`Jami ${c.members_total ?? 0} ta`}
            icon={Users}
            iconColor="#7C3AED"
            iconBg="rgba(124, 58, 237, 0.1)"
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            title="Qarzdorlar"
            value={c.debtors_count ?? 0}
            hint={formatPrice(c.debt_total)}
            icon={AlertTriangle}
            iconColor="#DC2626"
            iconBg="rgba(220, 38, 38, 0.1)"
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            title="Tugayotgan abonement"
            value={c.expiring_subscriptions ?? 0}
            hint="7 kun ichida"
            icon={CreditCard}
            iconColor="#F59E0B"
            iconBg="rgba(245, 158, 11, 0.12)"
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            title="Faol trenerlar"
            value={c.active_trainers ?? 0}
            icon={UserCheck}
            iconColor="#2563EB"
            iconBg="rgba(37, 99, 235, 0.1)"
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            title="Bugungi mashg'ulot"
            value={c.today_sessions_count ?? 0}
            icon={CalendarDays}
            iconColor="#64748B"
            iconBg="rgba(100, 116, 139, 0.12)"
          />
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={15}>
          <SectionCard title="Oylik daromad">
            <div className="cs-chart-wrap">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={incomeChart} barCategoryGap="20%">
                  <CartesianGrid stroke="rgba(15,23,42,0.06)" vertical={false} />
                  <XAxis dataKey="month" tick={{ fill: "#64748b", fontSize: 12 }} />
                  <YAxis
                    tick={{ fill: "#64748b", fontSize: 11 }}
                    tickFormatter={(v) => `${(v / 1e6).toFixed(0)}M`}
                  />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(37,99,235,0.06)" }} />
                  <Bar dataKey="sum" name="Tushum" fill="#2563EB" radius={[8, 8, 0, 0]} maxBarSize={48} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </SectionCard>
        </Col>
        <Col xs={24} lg={9}>
          <SectionCard title="To'lov holati (oy)">
            <div className="cs-chart-wrap">
              {paymentPie.length ? (
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie
                      data={paymentPie}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={58}
                      outerRadius={88}
                      paddingAngle={3}
                    >
                      {paymentPie.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} stroke="transparent" />
                      ))}
                    </Pie>
                    <Tooltip content={<ChartTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p style={{ color: "var(--muted)", textAlign: "center", padding: 48 }}>Bu oyda to&apos;lovlar yo&apos;q</p>
              )}
              <ul className="cs-chart-legend">
                {paymentPie.map((p, i) => (
                  <li key={p.name}>
                    <span className="cs-chart-legend__dot" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                    {p.name}
                  </li>
                ))}
              </ul>
            </div>
          </SectionCard>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} md={12}>
          <SectionCard
            title="Qarzdorlar"
            extra={
              <Link to="/business/fitness/debtors" className="cs-link-muted">
                Barchasi →
              </Link>
            }
          >
            {(data.debtors || []).length ? (
              (data.debtors || []).map((d) => (
                <MemberRow
                  key={d.membership_id}
                  name={d.member_name}
                  sub={d.plan_name}
                  amount={formatPrice(d.debt_amount)}
                  badge={<Tag color="error">Qarz</Tag>}
                />
              ))
            ) : (
              <p style={{ color: "var(--muted)" }}>Qarzdor yo&apos;q — ajoyib!</p>
            )}
          </SectionCard>
        </Col>
        <Col xs={24} md={12}>
          <SectionCard title="Muddati tugayotgan (7 kun)">
            {(data.expiring_subscriptions_list || []).length ? (
              (data.expiring_subscriptions_list || []).map((e) => (
                <MemberRow
                  key={e.membership_id}
                  name={e.member_name}
                  sub={e.end_date}
                  badge={
                    <Tag color={(e.remaining_days ?? 99) <= 3 ? "error" : "warning"}>
                      {e.remaining_days} kun
                    </Tag>
                  }
                />
              ))
            ) : (
              <p style={{ color: "var(--muted)" }}>Yaqin kunlarda tugaydigan abonement yo&apos;q</p>
            )}
          </SectionCard>
        </Col>
      </Row>

      <SectionCard
        title="Bugungi mashg'ulotlar"
        extra={
          <Link to="/business/fitness/schedule" className="cs-link-muted">
            Jadval →
          </Link>
        }
        className="cs-mt-16"
      >
        {(data.today_sessions || []).length ? (
          <div className="cs-mini-table">
            <div className="cs-mini-table__head">
              <span>Mashg&apos;ulot</span>
              <span>Trener</span>
              <span>Vaqt</span>
              <span>Band</span>
            </div>
            {(data.today_sessions || []).map((s) => (
              <div key={s.id} className="cs-mini-table__row">
                <span className="cs-mini-table__title">{s.title}</span>
                <span>{s.trainer_name || "—"}</span>
                <span>
                  {s.start_time?.slice(0, 5)} – {s.end_time?.slice(0, 5)}
                </span>
                <span>
                  <strong>{s.current_members}</strong>/{s.max_members}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: "var(--muted)" }}>Bugun rejalashtirilgan mashg&apos;ulot yo&apos;q</p>
        )}
      </SectionCard>
    </>
  );
}
