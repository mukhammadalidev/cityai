import { useMemo, useState } from "react";
import { Alert, Button, Card, Modal, Radio, Space, Table, Tabs, Tag, Typography, message } from "antd";
import { submitStudentPortalQuiz } from "../../services/portalService";
import { formatDateTime } from "../../utils/formatters";
import { MOCK_TEST_SUBJECTS } from "./studentMockTestsData";

/**
 * @param {{
 *   portalQuizzes?: Array<Record<string, unknown>>;
 *   portalQuizScores?: Array<{
 *     id: number;
 *     quiz_title: string;
 *     category_name?: string;
 *     assessment_type?: string;
 *     correct: number;
 *     total: number;
 *     percent?: number;
 *     created_at: string;
 *   }>;
 *   onCenterQuizSubmitted?: () => void | Promise<void>;
 * }} props
 */
export default function StudentMockTestsSection({
  portalQuizzes = [],
  portalQuizScores = [],
  onCenterQuizSubmitted,
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(null);
  /** @type {'demo' | 'center' | null} */
  const [activeKind, setActiveKind] = useState(null);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [serverScore, setServerScore] = useState(null);

  const totalQuestions = active?.questions?.length ?? 0;

  const demoScore = useMemo(() => {
    if (activeKind !== "demo" || !active?.questions || !submitted) return null;
    let ok = 0;
    active.questions.forEach((q) => {
      if (answers[q.id] === q.correctIndex) ok += 1;
    });
    return { ok, total: active.questions.length };
  }, [active, activeKind, answers, submitted]);

  function openDemoTest(test) {
    setActive({ ...test, questions: test.questions.map((q) => ({ ...q })) });
    setActiveKind("demo");
    setAnswers({});
    setSubmitted(false);
    setServerScore(null);
    setOpen(true);
  }

  function openCenterQuiz(quiz) {
    setActive({
      id: quiz.id,
      title: quiz.title,
      blurb: quiz.description || `${quiz.category?.name || ""} · ${quiz.assessment_type === "mock" ? "Mock" : "Quiz"} · ${quiz.time_limit_minutes || "—"} daq.`,
      questions: quiz.questions || [],
    });
    setActiveKind("center");
    setAnswers({});
    setSubmitted(false);
    setServerScore(null);
    setOpen(true);
  }

  function closeModal() {
    setOpen(false);
    setActive(null);
    setActiveKind(null);
    setAnswers({});
    setSubmitted(false);
    setServerScore(null);
  }

  async function submit() {
    if (activeKind === "center" && active) {
      if (Object.keys(answers).length < totalQuestions) return;
      setSubmitting(true);
      try {
        const payload = {
          quiz_id: active.id,
          answers: active.questions.map((q) => ({
            question_id: q.id,
            selected_index: answers[q.id],
          })),
        };
        const res = await submitStudentPortalQuiz(payload);
        setServerScore({ ok: res.correct, total: res.total });
        setSubmitted(true);
        try {
          await onCenterQuizSubmitted?.();
        } catch {
          /* ignore */
        }
      } catch {
        message.error("Natija yuborilmadi. Qayta urinib ko‘ring.");
      } finally {
        setSubmitting(false);
      }
      return;
    }
    setSubmitted(true);
  }

  const centerColumns = [
    { title: "Kategoriya", dataIndex: ["category", "name"], width: 120, ellipsis: true },
    { title: "Test", dataIndex: "title", ellipsis: true },
    {
      title: "Tur",
      dataIndex: "assessment_type",
      width: 82,
      render: (t) => <Tag color={t === "mock" ? "geekblue" : "green"}>{t === "mock" ? "Mock" : "Quiz"}</Tag>,
    },
    { title: "Vaqt (daq.)", dataIndex: "time_limit_minutes", width: 88 },
    {
      title: "Savollar",
      width: 72,
      render: (_, row) => `${row.questions?.length ?? 0}`,
    },
    {
      title: "So‘nggi ball",
      width: 110,
      render: (_, row) => {
        const sc = row.my_last_score;
        if (!sc) return <Typography.Text type="secondary">—</Typography.Text>;
        return (
          <span>
            <Typography.Text strong>
              {sc.correct}/{sc.total}
            </Typography.Text>
            {sc.percent != null ? (
              <Typography.Text type="secondary" style={{ marginLeft: 6 }}>
                ({sc.percent}%)
              </Typography.Text>
            ) : null}
          </span>
        );
      },
    },
    {
      title: "",
      width: 100,
      render: (_, row) => (
        <Button type="primary" size="small" onClick={() => openCenterQuiz(row)}>
          Boshlash
        </Button>
      ),
    },
  ];

  const scoreColumns = [
    { title: "Vaqt", dataIndex: "created_at", width: 150, render: formatDateTime },
    { title: "Test", dataIndex: "quiz_title", ellipsis: true },
    { title: "Kategoriya", dataIndex: "category_name", width: 120, ellipsis: true },
    {
      title: "Tur",
      dataIndex: "assessment_type",
      width: 80,
      render: (t) => <Tag color={t === "mock" ? "geekblue" : "green"}>{t === "mock" ? "Mock" : "Quiz"}</Tag>,
    },
    {
      title: "Ball",
      width: 100,
      render: (_, row) => (
        <Typography.Text strong>
          {row.correct} / {row.total}
        </Typography.Text>
      ),
    },
    {
      title: "Foiz",
      dataIndex: "percent",
      width: 72,
      render: (p) => (p != null ? `${p}%` : "—"),
    },
  ];

  const demoTabItems = MOCK_TEST_SUBJECTS.map((subj) => ({
    key: subj.key,
    label: subj.label,
    children: (
      <Table
        size="small"
        rowKey="id"
        pagination={false}
        dataSource={subj.tests}
        columns={[
          { title: "Test", dataIndex: "title", ellipsis: true },
          {
            title: "Savollar",
            width: 100,
            render: (_, row) => `${row.questions?.length ?? 0} ta`,
          },
          {
            title: "Taxminiy vaqt",
            width: 120,
            dataIndex: "minutes",
            render: (m) => `${m} daq.`,
          },
          {
            title: "",
            width: 140,
            render: (_, row) => (
              <Button type="primary" size="small" onClick={() => openDemoTest(row)}>
                Boshlash
              </Button>
            ),
          },
        ]}
      />
    ),
  }));

  const tabItems = [];
  if (portalQuizzes.length) {
    tabItems.push({
      key: "center",
      label: `Markaz (${portalQuizzes.length})`,
      children: (
        <Table size="small" rowKey="id" pagination={false} dataSource={portalQuizzes} columns={centerColumns} />
      ),
    });
  }
  tabItems.push({
    key: "samples",
    label: "Namuna fanlar",
    children: <Tabs items={demoTabItems} />,
  });

  const safeScores = Array.isArray(portalQuizScores) ? portalQuizScores : [];
  const latest = safeScores[0];

  return (
    <>
      <Card title="Mening test ballarim (markaz)" size="small" style={{ marginTop: 16 }}>
        {latest ? (
          <Typography.Paragraph style={{ marginTop: 0 }}>
            <Typography.Text type="secondary">So‘nggi topshirish: </Typography.Text>
            <Typography.Text strong>
              {latest.quiz_title} — {latest.correct}/{latest.total}
              {latest.percent != null ? ` (${latest.percent}%)` : ""}
            </Typography.Text>
          </Typography.Paragraph>
        ) : (
          <Typography.Paragraph type="secondary" style={{ marginTop: 0 }}>
            Markaz testlaridan topshirganingizdan keyin ball shu yerda va quyidagi jadvalda ko‘rinadi.
          </Typography.Paragraph>
        )}
        <Table
          size="small"
          rowKey={(row) => row.id ?? `${row.quiz_id}-${row.created_at}`}
          pagination={{ pageSize: 8 }}
          dataSource={safeScores}
          columns={scoreColumns}
          locale={{ emptyText: "Hali markaz testidan topshirish yo‘q — pastdagi «Markaz» yorlig‘idan testni oching va «Natijani ko‘rish» bosing." }}
        />
      </Card>

      <Card title="Mock testlar va quizlar" size="small" style={{ marginTop: 16 }} extra={<Tag color="blue">Mashq</Tag>}>
        <Typography.Paragraph type="secondary" style={{ marginTop: 0 }}>
          Markaz testlari ustozingiz tomonidan yaratiladi; natija serverda saqlanadi. «Namuna fanlar» — umumiy mashq
          (brauzerda lokal tekshiruv).
        </Typography.Paragraph>
        <Tabs items={tabItems} />

        <Modal
          title={active?.title}
          open={open}
          onCancel={closeModal}
          width={560}
          footer={
            <Space>
              <Button onClick={closeModal}>Yopish</Button>
              {!submitted ? (
                <Button
                  type="primary"
                  loading={submitting}
                  onClick={submit}
                  disabled={Object.keys(answers).length < totalQuestions}
                >
                  Natijani ko‘rish
                </Button>
              ) : null}
            </Space>
          }
          destroyOnClose
        >
          {active ? (
            <Space direction="vertical" size="middle" style={{ width: "100%" }}>
              <Typography.Text type="secondary">{active.blurb}</Typography.Text>
              {active.questions.map((q, idx) => {
                const qKey = q.id;
                const prompt = activeKind === "demo" ? q.text : q.prompt;
                const opts = activeKind === "demo" ? q.options : q.options || [];
                return (
                  <div key={qKey}>
                    <Typography.Text strong>
                      {idx + 1}. {prompt}
                    </Typography.Text>
                    <Radio.Group
                      style={{ display: "block", marginTop: 8 }}
                      value={answers[qKey]}
                      disabled={submitted}
                      onChange={(e) => setAnswers((prev) => ({ ...prev, [qKey]: e.target.value }))}
                    >
                      <Space direction="vertical">
                        {opts.map((opt, i) => (
                          <Radio key={i} value={i}>
                            {opt}
                            {activeKind === "demo" && submitted && i === q.correctIndex ? (
                              <Tag color="success" style={{ marginLeft: 8 }}>
                                To‘g‘ri
                              </Tag>
                            ) : null}
                            {activeKind === "demo" && submitted && answers[qKey] === i && i !== q.correctIndex ? (
                              <Tag color="error" style={{ marginLeft: 8 }}>
                                Xato
                              </Tag>
                            ) : null}
                          </Radio>
                        ))}
                      </Space>
                    </Radio.Group>
                  </div>
                );
              })}
              {activeKind === "demo" && submitted && demoScore ? (
                <Alert
                  type="info"
                  showIcon
                  message={`To‘g‘ri javoblar: ${demoScore.ok} / ${demoScore.total}`}
                  description={
                    demoScore.ok === demoScore.total
                      ? "Ajoyib! Barcha savollarga to‘g‘ri javob berdingiz."
                      : "Qiyin joylarni qayta ko‘rib chiqing."
                  }
                />
              ) : null}
              {activeKind === "center" && submitted && serverScore ? (
                <Alert
                  type="info"
                  showIcon
                  message={`To‘g‘ri javoblar: ${serverScore.ok} / ${serverScore.total}`}
                  description="Saqlandi. Ro‘yxat yangilandi — yuqoridagi «Mening test ballarim» jadvalini tekshiring."
                />
              ) : null}
            </Space>
          ) : null}
        </Modal>
      </Card>
    </>
  );
}
