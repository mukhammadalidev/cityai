import {
  Button,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Table,
  Tabs,
  Tooltip,
  Typography,
  message,
} from "antd";
import { Copy, Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import PageHeader from "../../components/ui/PageHeader";
import LoadingScreen from "../../components/ui/LoadingScreen";
import EmptyState from "../../components/ui/EmptyState";
import { MONTHLY_PAYMENT_STATUS } from "../../config/monthlyPaymentStatus";
import { MONTHS_UZ, monthLabelUz } from "../../utils/monthNamesUz";
import { resolveDefaultAmount, debtAmount, effectiveStatus } from "../../utils/studentPaymentDefaults";
import { getStudents } from "../../services/studentService";
import { getStudentGroups } from "../../services/studentGroupService";
import { getItems } from "../../services/itemService";
import { getPayments, getPaymentSummary, quickUpdatePayment } from "../../services/studentPaymentService";
import { formatPhone, formatPrice } from "../../utils/formatters";
import { useWindowEvent } from "../../hooks/useWindowEvent";
import { BUSINESS_DATA_CHANGED, notifyBusinessDataChanged } from "../../utils/businessEvents";

const YEAR_OPTIONS = [2024, 2025, 2026, 2027].map((y) => ({ value: y, label: String(y) }));
function PaymentStatusBadge({ status }) {
  const key = status || "unpaid";
  const cfg = MONTHLY_PAYMENT_STATUS[key] || MONTHLY_PAYMENT_STATUS.unpaid;
  return <span className={`cs-pay-status cs-pay-status--${key}`}>{cfg.label}</span>;
}

/** Bir xil ko‘rinishdagi amal tugmalari */
function PayActions({ children }) {
  return <div className="cs-pay-action-bar">{children}</div>;
}

function PayBtn({ variant = "default", loading, onClick, children, icon }) {
  return (
    <Button
      size="small"
      type={variant === "primary" ? "primary" : "default"}
      danger={variant === "danger"}
      loading={loading}
      icon={icon}
      className={`cs-pay-action-btn${variant === "ghost" ? " cs-pay-action-btn--ghost" : ""}`}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}

function PaymentKpiStrip({ summary, monthLabel }) {
  if (!summary) return null;
  const items = [
    { label: "Jami o'quvchilar", value: summary.total_students ?? summary.students_total ?? 0, tone: "blue" },
    { label: "To'laganlar", value: summary.paid_count ?? 0, tone: "green" },
    { label: "To'lamaganlar", value: summary.unpaid_count ?? 0, tone: "red" },
    { label: "Qisman", value: summary.partial_count ?? 0, tone: "orange" },
    { label: "Qarzdorlar", value: summary.debt_count ?? 0, tone: "gray" },
    { label: `${monthLabel} tushumi`, value: formatPrice(summary.paid_amount ?? summary.month_income), tone: "purple", money: true },
    { label: "Kutilayotgan", value: formatPrice(summary.expected_amount), tone: "blue", money: true },
    { label: "Qolgan qarz", value: formatPrice(summary.remaining_debt), tone: "red", money: true },
  ];
  return (
    <div className="cs-pay-kpi-strip">
      {items.map((item) => (
        <div key={item.label} className={`cs-pay-kpi cs-pay-kpi--${item.tone}`}>
          <span className="cs-pay-kpi__label">{item.label}</span>
          <span className={`cs-pay-kpi__value${item.money ? " cs-pay-kpi__value--money" : ""}`}>{item.value}</span>
        </div>
      ))}
    </div>
  );
}

function PaymentCell({ status, onClick }) {
  const key = status || "unpaid";
  const cfg = MONTHLY_PAYMENT_STATUS[key] || MONTHLY_PAYMENT_STATUS.unpaid;
  return (
    <button type="button" className={`cs-pay-cell ${cfg.cellClass}`} onClick={onClick}>
      {cfg.label}
    </button>
  );
}

function NoteModal({ open, initialNote, onCancel, onSave, loading }) {
  const [note, setNote] = useState("");
  useEffect(() => {
    if (open) setNote(initialNote || "");
  }, [open, initialNote]);
  return (
    <Modal
      title="Izoh"
      open={open}
      onCancel={onCancel}
      onOk={() => onSave(note)}
      confirmLoading={loading}
      okText="Saqlash"
      cancelText="Bekor qilish"
    >
      <Input.TextArea rows={4} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Izoh yozing…" />
    </Modal>
  );
}

export default function StudentPaymentsPage() {
  const { businessId } = useOutletContext();
  const now = new Date();
  const [tab, setTab] = useState("month");
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [groupId, setGroupId] = useState();
  const [courseId, setCourseId] = useState();
  const [search, setSearch] = useState("");
  const [debtorFilter, setDebtorFilter] = useState("all");
  const [students, setStudents] = useState([]);
  const [payments, setPayments] = useState([]);
  const [groups, setGroups] = useState([]);
  const [courses, setCourses] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [partialModal, setPartialModal] = useState({ open: false, student: null, record: null });
  const [matrixModal, setMatrixModal] = useState({ open: false, student: null, month: null, record: null });
  const [noteModal, setNoteModal] = useState({ open: false, student: null, record: null });
  const [partialForm] = Form.useForm();
  const [matrixForm] = Form.useForm();

  const load = useCallback(async () => {
    if (!businessId) return;
    setLoading(true);
    try {
      const payParams = { business_id: businessId, year };
      if (tab === "month") payParams.month = month;
      if (groupId) payParams.group_id = groupId;
      if (courseId) payParams.course_id = courseId;

      const [stList, payList, grpList, itemList, sum] = await Promise.all([
        getStudents({ business_id: businessId, status: "active" }),
        getPayments(payParams),
        getStudentGroups({ business_id: businessId }),
        getItems({ business_id: businessId, education_catalog_kind: "course" }),
        getPaymentSummary({
          business_id: businessId,
          year,
          month,
          group_id: groupId,
          course_id: courseId,
        }),
      ]);
      setStudents(stList);
      setPayments(payList);
      setGroups(grpList);
      setCourses(itemList);
      setSummary(sum);
    } catch (e) {
      if (!e?.response) console.warn("[StudentPayments] API ishlamayapti.");
      message.error("Ma'lumot yuklanmadi.");
      setStudents([]);
      setPayments([]);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, [businessId, year, month, tab, groupId, courseId]);

  useEffect(() => {
    load();
  }, [load]);

  useWindowEvent("business-changed", load);
  useWindowEvent(BUSINESS_DATA_CHANGED, load);

  const coursesById = useMemo(() => new Map(courses.map((c) => [c.id, c])), [courses]);
  const groupsById = useMemo(() => new Map(groups.map((g) => [g.id, g])), [groups]);

  const paymentMap = useMemo(() => {
    const m = new Map();
    payments.forEach((p) => {
      m.set(`${p.student}-${p.month}`, p);
    });
    return m;
  }, [payments]);

  const filteredStudents = useMemo(() => {
    let list = students;
    if (groupId) {
      if (groupId === "none") list = list.filter((s) => !s.group);
      else list = list.filter((s) => s.group === groupId);
    }
    if (courseId) list = list.filter((s) => s.course === courseId);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((s) => `${s.name} ${s.phone} ${s.group_name || ""}`.toLowerCase().includes(q));
    }
    return list;
  }, [students, groupId, courseId, search]);

  const quickSave = async (student, targetMonth, payload, successMsg) => {
    setActing(true);
    try {
      const defaultAmt = resolveDefaultAmount(student, coursesById, groupsById);
      await quickUpdatePayment({
        business: businessId,
        student: student.id,
        year,
        month: targetMonth,
        amount: payload.amount ?? defaultAmt,
        paid_amount: payload.paid_amount ?? 0,
        status: payload.status,
        note: payload.note ?? "",
        group: student.group || null,
        course: student.course || null,
      });
      message.success(successMsg);
      load();
      notifyBusinessDataChanged();
    } catch (e) {
      message.error(e.response?.data?.detail || "Saqlashda xatolik.");
    } finally {
      setActing(false);
    }
  };

  const markPaid = (student, targetMonth = month) => {
    const amt = resolveDefaultAmount(student, coursesById, groupsById);
    const rec = paymentMap.get(`${student.id}-${targetMonth}`);
    quickSave(
      student,
      targetMonth,
      { amount: rec ? Number(rec.amount) : amt, paid_amount: rec ? Number(rec.amount) : amt, status: "paid", note: rec?.note },
      "To'lov to'landi deb belgilandi"
    );
  };

  const markDebt = (student, targetMonth = month) => {
    const amt = resolveDefaultAmount(student, coursesById, groupsById);
    const rec = paymentMap.get(`${student.id}-${targetMonth}`);
    quickSave(
      student,
      targetMonth,
      { amount: rec ? Number(rec.amount) : amt, paid_amount: 0, status: "debt", note: rec?.note },
      "Qarzdor deb belgilandi"
    );
  };

  const markUnpaid = (student, targetMonth = month) => {
    const amt = resolveDefaultAmount(student, coursesById, groupsById);
    const rec = paymentMap.get(`${student.id}-${targetMonth}`);
    quickSave(
      student,
      targetMonth,
      { amount: rec ? Number(rec.amount) : amt, paid_amount: 0, status: "unpaid", note: rec?.note },
      "To'lanmagan deb belgilandi"
    );
  };

  const openPartial = (student, targetMonth = month) => {
    const rec = paymentMap.get(`${student.id}-${targetMonth}`);
    const defaultAmt = resolveDefaultAmount(student, coursesById, groupsById);
    partialForm.setFieldsValue({
      amount: rec ? Number(rec.amount) : defaultAmt,
      paid_amount: rec ? Number(rec.paid_amount) : 0,
      note: rec?.note || "",
    });
    setPartialModal({ open: true, student, month: targetMonth, record: rec });
  };

  const savePartial = async () => {
    const v = await partialForm.validateFields();
    await quickSave(
      partialModal.student,
      partialModal.month,
      {
        amount: v.amount,
        paid_amount: v.paid_amount,
        status: "partial",
        note: v.note,
      },
      "Qisman to'lov saqlandi"
    );
    setPartialModal({ open: false, student: null, record: null, month: null });
  };

  const monthRows = useMemo(() => {
    return filteredStudents.map((st) => {
      const rec = paymentMap.get(`${st.id}-${month}`);
      const defaultAmt = resolveDefaultAmount(st, coursesById, groupsById);
      const amount = rec ? Number(rec.amount) : defaultAmt;
      const paid = rec ? Number(rec.paid_amount) : 0;
      const status = effectiveStatus(rec);
      return {
        key: st.id,
        student: st,
        record: rec,
        name: st.name,
        phone: st.phone,
        group_name: st.group_name,
        course_title: st.course_title,
        amount,
        paid_amount: paid,
        debt: debtAmount(amount, paid),
        status,
      };
    });
  }, [filteredStudents, paymentMap, month, coursesById, groupsById]);

  const debtorRows = useMemo(() => {
    const rows = [];
    const monthsToScan = tab === "debtors" ? MONTHS_UZ : [{ value: month }];
    filteredStudents.forEach((st) => {
      monthsToScan.forEach((mo) => {
        const rec = paymentMap.get(`${st.id}-${mo.value}`);
        const status = effectiveStatus(rec);
        if (status === "paid") return;
        if (debtorFilter === "debt" && status !== "debt") return;
        if (debtorFilter === "partial" && status !== "partial") return;
        if (debtorFilter === "unpaid" && status !== "unpaid") return;
        const defaultAmt = resolveDefaultAmount(st, coursesById, groupsById);
        const amount = rec ? Number(rec.amount) : defaultAmt;
        const paid = rec ? Number(rec.paid_amount) : 0;
        rows.push({
          key: `${st.id}-${mo.value}`,
          student: st,
          month: mo.value,
          record: rec,
          name: st.name,
          phone: st.phone,
          group_name: st.group_name,
          amount,
          paid_amount: paid,
          debt: debtAmount(amount, paid),
          status,
        });
      });
    });
    return rows.sort((a, b) => a.name.localeCompare(b.name));
  }, [filteredStudents, paymentMap, month, tab, debtorFilter, coursesById, groupsById]);

  const renderMonthActions = (_, row) => {
    const { student, status: st } = row;
    if (st === "paid") {
      return (
        <PayActions>
          <PayBtn variant="ghost" onClick={() => markUnpaid(student)}>
            Bekor qilish
          </PayBtn>
          <PayBtn variant="ghost" onClick={() => setNoteModal({ open: true, student, record: row.record })}>
            Izoh
          </PayBtn>
        </PayActions>
      );
    }
    if (st === "partial") {
      return (
        <PayActions>
          <PayBtn variant="primary" onClick={() => markPaid(student)}>
            To'liq to'landi
          </PayBtn>
          <PayBtn variant="ghost" onClick={() => openPartial(student)}>
            Qisman
          </PayBtn>
          <PayBtn variant="danger" onClick={() => markDebt(student)}>
            Qarzdor
          </PayBtn>
        </PayActions>
      );
    }
    return (
      <PayActions>
        <PayBtn variant="primary" loading={acting} onClick={() => markPaid(student)}>
          To'landi
        </PayBtn>
        <PayBtn variant="ghost" onClick={() => openPartial(student)}>
          Qisman
        </PayBtn>
        <PayBtn variant="danger" onClick={() => markDebt(student)}>
          Qarzdor
        </PayBtn>
      </PayActions>
    );
  };

  const renderDebtorActions = (_, row) => {
    const { student, month: m } = row;
    return (
      <PayActions>
        <PayBtn variant="primary" loading={acting} onClick={() => markPaid(student, m)}>
          To'landi
        </PayBtn>
        <PayBtn variant="ghost" onClick={() => openPartial(student, m)}>
          Qisman
        </PayBtn>
        <PayBtn
          variant="ghost"
          icon={<Copy size={12} />}
          onClick={() => {
            if (student.phone) {
              navigator.clipboard.writeText(student.phone);
              message.success("Telefon nusxalandi");
            }
          }}
        >
          Nusxa
        </PayBtn>
        <Tooltip title="Tez orada">
          <Button size="small" disabled className="cs-pay-action-btn cs-pay-action-btn--ghost">
            Telegram
          </Button>
        </Tooltip>
      </PayActions>
    );
  };

  const matrixColumns = useMemo(() => {
    const base = [
      { title: "O'quvchi", dataIndex: "name", fixed: "left", width: 150, ellipsis: true },
      { title: "Guruh", dataIndex: "group_name", width: 100, render: (v) => v || "—" },
    ];
    const monthCols = MONTHS_UZ.map((mo) => ({
      title: mo.short,
      key: `m-${mo.value}`,
      width: 72,
      align: "center",
      render: (_, row) => {
        const rec = paymentMap.get(`${row.id}-${mo.value}`);
        const status = effectiveStatus(rec);
        return (
          <PaymentCell
            status={status}
            onClick={() => {
              const defaultAmt = resolveDefaultAmount(row, coursesById, groupsById);
              matrixForm.setFieldsValue({
                amount: rec ? Number(rec.amount) : defaultAmt,
                paid_amount: rec ? Number(rec.paid_amount) : 0,
                status: status,
                note: rec?.note || "",
              });
              setMatrixModal({ open: true, student: row, month: mo.value, record: rec });
            }}
          />
        );
      },
    }));
    return [...base, ...monthCols];
  }, [paymentMap, coursesById, groupsById]);

  const saveMatrixModal = async () => {
    const v = await matrixForm.validateFields();
    await quickSave(
      matrixModal.student,
      matrixModal.month,
      v,
      "To'lov holati saqlandi"
    );
    setMatrixModal({ open: false, student: null, month: null, record: null });
  };

  const saveNote = async (noteText) => {
    const { student, record } = noteModal;
    const rec = record || paymentMap.get(`${student.id}-${month}`);
    const defaultAmt = resolveDefaultAmount(student, coursesById, groupsById);
    await quickSave(
      student,
      month,
      {
        amount: rec ? Number(rec.amount) : defaultAmt,
        paid_amount: rec ? Number(rec.paid_amount) : 0,
        status: rec?.status || "paid",
        note: noteText,
      },
      "Izoh saqlandi"
    );
    setNoteModal({ open: false, student: null, record: null });
  };

  if (!businessId) return null;
  if (loading && !students.length) return <LoadingScreen />;

  const monthTitle = `${monthLabelUz(month)} ${year} oyi to'lovlari`;
  const sumMonthLabel = monthLabelUz(month);

  const filters = (
    <div className="cs-pay-filters">
      <div className="cs-pay-filters__grid">
        <div className="cs-pay-filters__field">
          <span className="cs-pay-filters__label">Yil</span>
          <Select size="large" value={year} onChange={setYear} options={YEAR_OPTIONS} />
        </div>
        <div className="cs-pay-filters__field">
          <span className="cs-pay-filters__label">Oy</span>
          <Select
            size="large"
            value={month}
            onChange={setMonth}
            options={MONTHS_UZ.map((m) => ({ value: m.value, label: m.label }))}
          />
        </div>
        <div className="cs-pay-filters__field">
          <span className="cs-pay-filters__label">Guruh</span>
          <Select
            allowClear
            size="large"
            placeholder="Barchasi"
            value={groupId}
            onChange={setGroupId}
            options={[
              { value: "none", label: "Guruhsiz" },
              ...groups.map((g) => ({ value: g.id, label: g.name })),
            ]}
          />
        </div>
        <div className="cs-pay-filters__field">
          <span className="cs-pay-filters__label">Kurs</span>
          <Select
            allowClear
            size="large"
            placeholder="Barchasi"
            value={courseId}
            onChange={setCourseId}
            options={courses.map((c) => ({ value: c.id, label: c.title }))}
          />
        </div>
        <div className="cs-pay-filters__field cs-pay-filters__field--search">
          <span className="cs-pay-filters__label">Qidiruv</span>
          <Input
            size="large"
            allowClear
            prefix={<Search size={16} style={{ color: "var(--muted)" }} />}
            placeholder="Ism yoki telefon…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>
    </div>
  );

  return (
    <>
      <PageHeader
        eyebrow="O'quv markaz"
        title="O'quvchilar to'lovi"
        description="Oyma-oy to'lovlarni tez va oson boshqaring."
        accent="#7C3AED"
      />

      {filters}
      <PaymentKpiStrip summary={summary} monthLabel={sumMonthLabel} />

      <div className="cs-pay-panel">
        <Tabs
          activeKey={tab}
          onChange={setTab}
          className="cs-payments-tabs"
          items={[
          {
            key: "month",
            label: "Shu oy",
            children: (
              <>
                <div className="cs-pay-panel__head">
                  <Typography.Title level={5} className="cs-pay-panel__title">
                    {monthTitle}
                  </Typography.Title>
                  <Typography.Text type="secondary">
                    To‘landi tugmasi — bir bosishda saqlanadi. Sana kiritish shart emas.
                  </Typography.Text>
                </div>
                {!monthRows.length ? (
                  <EmptyState description="O'quvchilar topilmadi." />
                ) : (
                  <div className="cs-table-scroll cs-payments-table-wrap">
                    <Table
                      className="cs-payments-table"
                      rowKey="key"
                      dataSource={monthRows}
                      loading={loading}
                      scroll={{ x: 1100 }}
                      pagination={{ pageSize: 20, showSizeChanger: true }}
                      columns={[
                        { title: "O'quvchi", dataIndex: "name", width: 140, ellipsis: true },
                        { title: "Telefon", dataIndex: "phone", width: 120, render: formatPhone },
                        { title: "Guruh", dataIndex: "group_name", width: 100, render: (v) => v || "—" },
                        { title: "Kurs", dataIndex: "course_title", width: 100, ellipsis: true, render: (v) => v || "—" },
                        { title: "To'lov summasi", dataIndex: "amount", width: 120, render: (v) => formatPrice(v) },
                        { title: "To'langan", dataIndex: "paid_amount", width: 110, render: (v) => formatPrice(v) },
                        { title: "Qarz", dataIndex: "debt", width: 100, render: (v) => formatPrice(v) },
                        {
                          title: "Holat",
                          dataIndex: "status",
                          width: 120,
                          render: (v) => <PaymentStatusBadge status={v} />,
                        },
                        { title: "Amal", key: "actions", width: 280, fixed: "right", render: renderMonthActions },
                      ]}
                    />
                  </div>
                )}
              </>
            ),
          },
          {
            key: "matrix",
            label: "Yillik jadval",
            children: (
              <>
                <Typography.Paragraph type="secondary" style={{ marginBottom: 12 }}>
                  {year} yil bo'yicha oylik holat. Ustunni bosing — tez tahrirlash.
                </Typography.Paragraph>
                {!filteredStudents.length ? (
                  <EmptyState description="O'quvchilar topilmadi." />
                ) : (
                  <div className="cs-table-scroll cs-payments-table-wrap cs-payments-matrix-wrap">
                    <Table
                      className="cs-payments-table cs-payments-matrix"
                      rowKey="id"
                      dataSource={filteredStudents}
                      columns={matrixColumns}
                      loading={loading}
                      scroll={{ x: 1400 }}
                      pagination={{ pageSize: 20 }}
                      size="small"
                    />
                  </div>
                )}
              </>
            ),
          },
          {
            key: "debtors",
            label: "Qarzdorlar",
            children: (
              <>
                <div className="cs-pay-debtor-chips">
                  {[
                    { key: "all", label: "Barchasi" },
                    { key: "unpaid", label: "To'lamaganlar" },
                    { key: "partial", label: "Qisman to'laganlar" },
                    { key: "debt", label: "Qarzdorlar ro'yxati" },
                  ].map((chip) => (
                    <button
                      key={chip.key}
                      type="button"
                      className={`cs-pay-chip${debtorFilter === chip.key ? " cs-pay-chip--active" : ""}`}
                      onClick={() => setDebtorFilter(chip.key)}
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>
                <Typography.Paragraph type="secondary" className="cs-pay-panel__hint">
                  {year} yil — to‘lanmagan, qisman va qarzdor yozuvlar (barcha oylar).
                </Typography.Paragraph>
                {!debtorRows.length ? (
                  <EmptyState description="Qarzdor yoki to'lanmagan yozuv yo'q." />
                ) : (
                  <div className="cs-table-scroll cs-payments-table-wrap">
                    <Table
                      className="cs-payments-table"
                      rowKey="key"
                      dataSource={debtorRows}
                      loading={loading}
                      scroll={{ x: 1000 }}
                      pagination={{ pageSize: 20 }}
                      size="small"
                      columns={[
                        { title: "O'quvchi", dataIndex: "name", width: 140 },
                        { title: "Telefon", dataIndex: "phone", width: 120, render: formatPhone },
                        { title: "Guruh", dataIndex: "group_name", width: 100, render: (v) => v || "—" },
                        { title: "Oy", dataIndex: "month", width: 90, render: (m) => monthLabelUz(m) },
                        { title: "Summa", dataIndex: "amount", width: 110, render: (v) => formatPrice(v) },
                        { title: "To'langan", dataIndex: "paid_amount", width: 100, render: (v) => formatPrice(v) },
                        { title: "Qarz", dataIndex: "debt", width: 100, render: (v) => formatPrice(v) },
                        { title: "Holat", dataIndex: "status", width: 120, render: (v) => <PaymentStatusBadge status={v} /> },
                        { title: "Amal", key: "act", width: 300, fixed: "right", render: renderDebtorActions },
                      ]}
                    />
                  </div>
                )}
              </>
            ),
          },
        ]}
        />
      </div>

      <Modal
        title="Qisman to'lov"
        open={partialModal.open}
        onCancel={() => setPartialModal({ open: false, student: null, record: null, month: null })}
        onOk={savePartial}
        confirmLoading={acting}
        okText="Saqlash"
        cancelText="Bekor qilish"
        destroyOnClose
      >
        {partialModal.student ? (
          <Form form={partialForm} layout="vertical">
            <Typography.Text type="secondary">
              {partialModal.student.name} · {monthLabelUz(partialModal.month)} {year}
            </Typography.Text>
            <Form.Item name="amount" label="To'lov summasi" rules={[{ required: true }]}>
              <InputNumber style={{ width: "100%" }} min={0} />
            </Form.Item>
            <Form.Item name="paid_amount" label="To'langan summa" rules={[{ required: true }]}>
              <InputNumber style={{ width: "100%" }} min={0} />
            </Form.Item>
            <Form.Item name="note" label="Izoh">
              <Input.TextArea rows={2} />
            </Form.Item>
          </Form>
        ) : null}
      </Modal>

      <Modal
        title="To'lov holatini o'zgartirish"
        open={matrixModal.open}
        onCancel={() => setMatrixModal({ open: false, student: null, month: null, record: null })}
        onOk={saveMatrixModal}
        confirmLoading={acting}
        okText="Saqlash"
        cancelText="Bekor qilish"
        destroyOnClose
      >
        {matrixModal.student ? (
          <Form form={matrixForm} layout="vertical">
            <Typography.Text type="secondary" style={{ display: "block", marginBottom: 12 }}>
              {matrixModal.student.name} · {monthLabelUz(matrixModal.month)} {year}
            </Typography.Text>
            <Form.Item name="amount" label="To'lov summasi" rules={[{ required: true }]}>
              <InputNumber style={{ width: "100%" }} min={0} />
            </Form.Item>
            <Form.Item name="paid_amount" label="To'langan summa">
              <InputNumber style={{ width: "100%" }} min={0} />
            </Form.Item>
            <Form.Item name="status" label="Holat" rules={[{ required: true }]}>
              <Select
                options={Object.entries(MONTHLY_PAYMENT_STATUS).map(([value, cfg]) => ({
                  value,
                  label: cfg.label,
                }))}
              />
            </Form.Item>
            <Form.Item name="note" label="Izoh">
              <Input.TextArea rows={2} />
            </Form.Item>
          </Form>
        ) : null}
      </Modal>

      <NoteModal
        open={noteModal.open}
        initialNote={noteModal.record?.note}
        loading={acting}
        onCancel={() => setNoteModal({ open: false, student: null, record: null })}
        onSave={saveNote}
      />
    </>
  );
}
