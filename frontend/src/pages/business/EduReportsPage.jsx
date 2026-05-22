import { Button, Card, Col, DatePicker, Row, Select, Space, Statistic, Table, message } from "antd";
import dayjs from "dayjs";
import { Download, FileSpreadsheet, FileText } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Navigate, useOutletContext } from "react-router-dom";
import PageHeader from "../../components/ui/PageHeader";
import LoadingScreen from "../../components/ui/LoadingScreen";
import { getStudentGroups } from "../../services/studentGroupService";
import {
  downloadEduAttendanceReport,
  downloadEduPaymentsReport,
  getEduReportDashboard,
} from "../../services/eduReportService";
import { formatApiError } from "../../utils/apiErrorMessage";
import { formatPrice } from "../../utils/formatters";
import { monthLabelUz } from "../../utils/monthNamesUz";

export default function EduReportsPage() {
  const { businessId, business, plan } = useOutletContext();
  const [month, setMonth] = useState(() => dayjs());
  const [groupId, setGroupId] = useState();
  const [groups, setGroups] = useState([]);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(null);
  const hasAttendance = Boolean(plan?.has_edu_attendance);

  const monthStr = month.format("YYYY-MM");

  const load = useCallback(async () => {
    if (!businessId) return;
    setLoading(true);
    try {
      const params = { business_id: businessId, month: monthStr };
      if (groupId) params.group_id = groupId;
      setData(await getEduReportDashboard(params));
    } catch (e) {
      message.error(formatApiError(e, "Hisobot yuklanmadi."));
    } finally {
      setLoading(false);
    }
  }, [businessId, monthStr, groupId]);

  useEffect(() => {
    if (!businessId) return;
    getStudentGroups({ business_id: businessId })
      .then(setGroups)
      .catch(() => setGroups([]));
  }, [businessId]);

  useEffect(() => {
    load();
  }, [load]);

  const runExport = async (kind, format) => {
    if (!businessId) return;
    const key = `${kind}-${format}`;
    setExporting(key);
    try {
      const params = { business_id: businessId, month: monthStr };
      if (groupId) params.group_id = groupId;
      if (kind === "payments") {
        await downloadEduPaymentsReport(params, format);
      } else {
        await downloadEduAttendanceReport(params, format);
      }
      message.success("Fayl yuklab olindi.");
    } catch (e) {
      message.error(formatApiError(e, "Yuklab olishda xatolik."));
    } finally {
      setExporting(null);
    }
  };

  if (business?.business_type !== "education_center") {
    return <Navigate to="/business/dashboard" replace />;
  }
  if (loading && !data) return <LoadingScreen />;

  const c = data?.cards || data?.summary || {};
  const monthTitle = `${monthLabelUz(month.month() + 1)} ${month.year()}`;

  const debtorColumns = [
    { title: "O'quvchi", dataIndex: "name", key: "name" },
    { title: "Guruh", dataIndex: "group", key: "group" },
    { title: "Qarz (so'm)", dataIndex: "debt_amount", key: "debt", align: "right" },
    { title: "Holat", dataIndex: "status_label", key: "status" },
  ];

  return (
    <div className="cs-page-inner">
      <PageHeader
        title="Hisobotlar"
        description={`${business?.name || ""} — ${monthTitle} bo'yicha jamlangan ko'rsatkichlar va eksport`}
      />

      <Card className="cs-pay-filters" style={{ marginBottom: 20 }}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={12} md={8}>
            <span className="cs-pay-filters__label">Hisobot oyi</span>
            <DatePicker
              picker="month"
              value={month}
              onChange={(v) => v && setMonth(v)}
              style={{ width: "100%" }}
              format="MMMM YYYY"
            />
          </Col>
          <Col xs={24} sm={12} md={8}>
            <span className="cs-pay-filters__label">Guruh</span>
            <Select
              allowClear
              placeholder="Barcha guruhlar"
              style={{ width: "100%" }}
              value={groupId}
              onChange={setGroupId}
              options={[
                { value: "none", label: "Guruhsiz" },
                ...groups.map((g) => ({ value: String(g.id), label: g.name })),
              ]}
            />
          </Col>
          <Col xs={24} md={8}>
            <Button type="primary" onClick={load} loading={loading} block>
              Yangilash
            </Button>
          </Col>
        </Row>
      </Card>

      <Row gutter={[16, 16]}>
        <Col xs={12} md={6}>
          <Card>
            <Statistic title="Faol o'quvchilar" value={c.active_students ?? c.total_students ?? 0} />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card>
            <Statistic title="To'langan" value={c.paid_count ?? 0} suffix={`/ ${c.total_students ?? 0}`} />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card>
            <Statistic title="Oylik tushum" value={formatPrice(c.month_income ?? c.paid_amount)} />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card>
            <Statistic title="Qoldiq qarz" value={formatPrice(c.remaining_debt)} />
          </Card>
        </Col>
      </Row>

      {hasAttendance && data?.attendance ? (
        <Card title="Davomat (shu oy)" style={{ marginTop: 16 }}>
          <Statistic
            title="O'rtacha davomat"
            value={data.attendance.avg_rate_percent != null ? `${data.attendance.avg_rate_percent}%` : "—"}
          />
        </Card>
      ) : null}

      <Card title="Yuklab olish" style={{ marginTop: 16 }}>
        <Space direction="vertical" size={16} style={{ width: "100%" }}>
          <div>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>To'lovlar hisoboti — {monthTitle}</div>
            <Space wrap>
              <Button
                icon={<FileSpreadsheet size={16} />}
                loading={exporting === "payments-xlsx"}
                onClick={() => runExport("payments", "xlsx")}
              >
                Excel (.xlsx)
              </Button>
              <Button
                icon={<Download size={16} />}
                loading={exporting === "payments-csv"}
                onClick={() => runExport("payments", "csv")}
              >
                CSV (Excel)
              </Button>
              <Button
                icon={<FileText size={16} />}
                loading={exporting === "payments-pdf"}
                onClick={() => runExport("payments", "pdf")}
              >
                PDF
              </Button>
            </Space>
          </div>
          {hasAttendance ? (
            <div>
              <div style={{ fontWeight: 600, marginBottom: 8 }}>Davomat hisoboti — {monthTitle}</div>
              <Space wrap>
                <Button
                  icon={<FileSpreadsheet size={16} />}
                  loading={exporting === "attendance-xlsx"}
                  onClick={() => runExport("attendance", "xlsx")}
                >
                  Excel (.xlsx)
                </Button>
                <Button
                  icon={<Download size={16} />}
                  loading={exporting === "attendance-csv"}
                  onClick={() => runExport("attendance", "csv")}
                >
                  CSV (Excel)
                </Button>
                <Button
                  icon={<FileText size={16} />}
                  loading={exporting === "attendance-pdf"}
                  onClick={() => runExport("attendance", "pdf")}
                >
                  PDF
                </Button>
              </Space>
            </div>
          ) : (
            <p style={{ color: "var(--muted)", margin: 0 }}>
              Davomat eksporti joriy tarifda yoqilmagan. Billing orqali davomat modulini ulang.
            </p>
          )}
        </Space>
      </Card>

      {(data?.top_debtors?.length ?? 0) > 0 ? (
        <Card title="Eng katta qarzdorlar" style={{ marginTop: 16 }}>
          <Table
            rowKey="student_id"
            size="small"
            pagination={false}
            dataSource={data.top_debtors}
            columns={debtorColumns}
          />
        </Card>
      ) : null}
    </div>
  );
}
