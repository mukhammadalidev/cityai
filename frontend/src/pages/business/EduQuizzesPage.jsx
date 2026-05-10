import {
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Switch,
  Table,
  Tabs,
  Tag,
  Typography,
  message,
} from "antd";
import { useCallback, useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import PageHeader from "../../components/ui/PageHeader";
import LoadingScreen from "../../components/ui/LoadingScreen";
import {
  createEduQuiz,
  createEduQuizCategory,
  deleteEduQuiz,
  deleteEduQuizCategory,
  getEduQuiz,
  getEduQuizCategories,
  getEduQuizzes,
  updateEduQuiz,
} from "../../services/eduQuizService";
import { useWindowEvent } from "../../hooks/useWindowEvent";
import { BUSINESS_DATA_CHANGED } from "../../utils/businessEvents";

const ASSESSMENT_OPTIONS = [
  { value: "quiz", label: "Quiz (baho / nazorat)" },
  { value: "mock", label: "Mock test (mashq)" },
];

function buildQuestionsPayload(rows) {
  const out = [];
  for (let i = 0; i < rows.length; i += 1) {
    const r = rows[i];
    const opts = [r.o0, r.o1, r.o2, r.o3, r.o4, r.o5]
      .map((s) => String(s || "").trim())
      .filter(Boolean);
    if (!String(r.prompt || "").trim()) continue;
    if (opts.length < 2) {
      throw new Error(`Savol ${i + 1}: kamida 2 ta variant kiriting.`);
    }
    const ci = Number(r.correct_index);
    if (Number.isNaN(ci) || ci < 0 || ci >= opts.length) {
      throw new Error(`Savol ${i + 1}: to‘g‘ri javob indeksi noto‘g‘ri.`);
    }
    out.push({
      prompt: String(r.prompt).trim(),
      options: opts,
      correct_index: ci,
      sort_order: i,
    });
  }
  if (!out.length) throw new Error("Kamida bitta to‘liq savol kiriting.");
  return out;
}

export default function EduQuizzesPage() {
  const { businessId, business } = useOutletContext();
  const isEdu = business?.business_type === "education_center";

  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([]);
  const [quizzes, setQuizzes] = useState([]);

  const [catModal, setCatModal] = useState(false);
  const [catForm] = Form.useForm();

  const [quizModal, setQuizModal] = useState(false);
  const [quizEditingId, setQuizEditingId] = useState(null);
  const [quizForm] = Form.useForm();

  const load = useCallback(async () => {
    if (!businessId || !isEdu) return;
    setLoading(true);
    try {
      const [cats, qz] = await Promise.all([
        getEduQuizCategories({ business_id: businessId }),
        getEduQuizzes({ business_id: businessId }),
      ]);
      setCategories(cats);
      setQuizzes(qz);
    } catch {
      message.error("Testlar ro‘yxati yuklanmadi.");
      setCategories([]);
      setQuizzes([]);
    } finally {
      setLoading(false);
    }
  }, [businessId, isEdu]);

  useEffect(() => {
    load();
  }, [load]);

  useWindowEvent("business-changed", load);
  useWindowEvent(BUSINESS_DATA_CHANGED, load);

  const openCreateCategory = () => {
    catForm.resetFields();
    setCatModal(true);
  };

  const saveCategory = async () => {
    try {
      const v = await catForm.validateFields();
      await createEduQuizCategory({ business: businessId, name: v.name.trim() });
      message.success("Kategoriya qo‘shildi.");
      setCatModal(false);
      load();
    } catch (e) {
      if (e?.errorFields) return;
      message.error(e?.response?.data?.detail || "Saqlanmadi.");
    }
  };

  const removeCategory = async (row) => {
    Modal.confirm({
      title: "Kategoriyani o‘chirish?",
      content: row.name,
      okText: "O‘chirish",
      okType: "danger",
      cancelText: "Bekor",
      onOk: async () => {
        try {
          await deleteEduQuizCategory(row.id);
          message.success("O‘chirildi.");
          load();
        } catch (e) {
          message.error(e?.response?.data?.detail || e?.message || "Xato.");
        }
      },
    });
  };

  const openCreateQuiz = () => {
    setQuizEditingId(null);
    quizForm.resetFields();
    quizForm.setFieldsValue({
      assessment_type: "quiz",
      time_limit_minutes: 20,
      is_published: false,
      questions: [{ prompt: "", o0: "", o1: "", o2: "", o3: "", o4: "", o5: "", correct_index: 0 }],
    });
    setQuizModal(true);
  };

  const openEditQuiz = async (row) => {
    setQuizEditingId(row.id);
    quizForm.resetFields();
    try {
      const full = await getEduQuiz(row.id);
      const padded = (full.questions || []).map((q) => {
        const o = [...(q.options || []), "", "", "", "", "", ""].slice(0, 6);
        return {
          prompt: q.prompt,
          o0: o[0] || "",
          o1: o[1] || "",
          o2: o[2] || "",
          o3: o[3] || "",
          o4: o[4] || "",
          o5: o[5] || "",
          correct_index: q.correct_index ?? 0,
        };
      });
      quizForm.setFieldsValue({
        category: full.category,
        assessment_type: full.assessment_type,
        time_limit_minutes: full.time_limit_minutes,
        title: full.title,
        description: full.description || "",
        is_published: full.is_published,
        questions: padded.length
          ? padded
          : [{ prompt: "", o0: "", o1: "", o2: "", o3: "", o4: "", o5: "", correct_index: 0 }],
      });
      setQuizModal(true);
    } catch {
      message.error("Test yuklanmadi.");
    }
  };

  const saveQuiz = async () => {
    try {
      const v = await quizForm.validateFields();
      let questionsPayload;
      try {
        questionsPayload = buildQuestionsPayload(v.questions || []);
      } catch (err) {
        message.error(err.message);
        return;
      }
      const body = {
        business: businessId,
        category: v.category,
        assessment_type: v.assessment_type,
        title: String(v.title || "").trim(),
        description: (v.description || "").trim(),
        time_limit_minutes: v.time_limit_minutes,
        is_published: Boolean(v.is_published),
        questions: questionsPayload,
      };
      if (!body.title) {
        message.error("Sarlavha kiriting.");
        return;
      }
      if (quizEditingId) {
        await updateEduQuiz(quizEditingId, body);
        message.success("Yangilandi.");
      } else {
        await createEduQuiz(body);
        message.success("Test yaratildi.");
      }
      setQuizModal(false);
      load();
    } catch (e) {
      if (e?.errorFields) return;
      message.error(e?.response?.data?.detail || "Saqlanmadi.");
    }
  };

  const removeQuiz = (row) => {
    Modal.confirm({
      title: "Testni o‘chirish?",
      content: row.title,
      okType: "danger",
      okText: "O‘chirish",
      cancelText: "Bekor",
      onOk: async () => {
        try {
          await deleteEduQuiz(row.id);
          message.success("O‘chirildi.");
          load();
        } catch {
          message.error("O‘chirishda xato.");
        }
      },
    });
  };

  if (!businessId) return null;
  if (!isEdu) {
    return (
      <>
        <PageHeader title="Testlar / quizlar" description="Faqat o‘quv markazlari uchun." />
        <Typography.Paragraph>Bu biznes turi uchun bo‘lim mavjud emas.</Typography.Paragraph>
      </>
    );
  }
  if (loading) return <LoadingScreen />;

  const catTab = (
    <Space direction="vertical" size="middle" style={{ width: "100%" }}>
      <Button type="primary" onClick={openCreateCategory}>
        Yangi kategoriya
      </Button>
      <Table
        size="small"
        rowKey="id"
        pagination={false}
        dataSource={categories}
        columns={[
          { title: "Nomi", dataIndex: "name" },
          {
            title: "",
            width: 100,
            render: (_, row) => (
              <Button danger type="link" size="small" onClick={() => removeCategory(row)}>
                O‘chirish
              </Button>
            ),
          },
        ]}
      />
    </Space>
  );

  const quizTab = (
    <Space direction="vertical" size="middle" style={{ width: "100%" }}>
      <Button type="primary" onClick={openCreateQuiz} disabled={!categories.length}>
        Yangi test / quiz
      </Button>
      {!categories.length ? (
        <Typography.Text type="warning">Avval kamida bitta kategoriya yarating.</Typography.Text>
      ) : null}
      <Table
        size="small"
        rowKey="id"
        dataSource={quizzes}
        pagination={{ pageSize: 12 }}
        columns={[
          { title: "Sarlavha", dataIndex: "title", ellipsis: true },
          { title: "Kategoriya", dataIndex: "category_name", width: 140 },
          {
            title: "Tur",
            dataIndex: "assessment_type",
            width: 110,
            render: (t) => (
              <Tag color={t === "mock" ? "geekblue" : "green"}>{t === "mock" ? "Mock" : "Quiz"}</Tag>
            ),
          },
          { title: "Vaqt (daq.)", dataIndex: "time_limit_minutes", width: 100 },
          {
            title: "Holat",
            dataIndex: "is_published",
            width: 100,
            render: (p) => (p ? <Tag color="success">Ochiq</Tag> : <Tag>Yopiq</Tag>),
          },
          { title: "Savollar", dataIndex: "question_count", width: 90 },
          {
            title: "",
            width: 160,
            render: (_, row) => (
              <Space>
                <Button size="small" onClick={() => openEditQuiz(row)}>
                  Tahrirlash
                </Button>
                <Button danger size="small" onClick={() => removeQuiz(row)}>
                  O‘chirish
                </Button>
              </Space>
            ),
          },
        ]}
      />
    </Space>
  );

  return (
    <>
      <PageHeader
        title="Testlar va quizlar"
        description="Kategoriya yarating, so‘ng mock yoki quiz turini, vaqtni va savollarni belgilang. Ochiq testlar o‘quvchi kabinetida ko‘rinadi."
      />

      <Card size="small">
        <Tabs
          items={[
            { key: "cats", label: "Kategoriyalar", children: catTab },
            { key: "quizzes", label: "Testlar / quizlar", children: quizTab },
          ]}
        />
      </Card>

      <Modal title="Kategoriya" open={catModal} onOk={saveCategory} onCancel={() => setCatModal(false)} okText="Saqlash">
        <Form form={catForm} layout="vertical">
          <Form.Item name="name" label="Nomi" rules={[{ required: true, message: "Kiriting" }]}>
            <Input placeholder="Masalan: Matematika" maxLength={120} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={quizEditingId ? "Testni tahrirlash" : "Yangi test / quiz"}
        open={quizModal}
        onOk={saveQuiz}
        onCancel={() => setQuizModal(false)}
        width={720}
        okText="Saqlash"
        destroyOnClose
        styles={{ body: { maxHeight: "70vh", overflowY: "auto" } }}
      >
        <Form form={quizForm} layout="vertical">
          <Form.Item name="category" label="Kategoriya" rules={[{ required: true, message: "Tanlang" }]}>
            <Select
              placeholder="Fan yoki bo‘lim"
              options={categories.map((c) => ({ value: c.id, label: c.name }))}
            />
          </Form.Item>
          <Form.Item name="assessment_type" label="Tur" rules={[{ required: true }]}>
            <Select options={ASSESSMENT_OPTIONS} />
          </Form.Item>
          <Form.Item
            name="time_limit_minutes"
            label="Vaqt (daqiqa)"
            rules={[{ required: true, type: "number", min: 1, max: 480 }]}
          >
            <InputNumber min={1} max={480} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="title" label="Sarlavha" rules={[{ required: true, message: "Kiriting" }]}>
            <Input maxLength={255} />
          </Form.Item>
          <Form.Item name="description" label="Izoh (ixtiyoriy)">
            <Input.TextArea rows={2} maxLength={2000} />
          </Form.Item>
          <Form.Item name="is_published" label="O‘quvchilar uchun ochiq" valuePropName="checked">
            <Switch />
          </Form.Item>

          <Typography.Title level={5}>Savollar</Typography.Title>
          <Form.List name="questions">
            {(fields, { add, remove }) => (
              <Space direction="vertical" style={{ width: "100%" }} size="middle">
                {fields.map((field, index) => (
                  <Card key={field.key} size="small" title={`Savol ${index + 1}`}>
                    <Form.Item name={[field.name, "prompt"]} label="Matn" rules={[{ required: true, message: "Savol matni" }]}>
                      <Input.TextArea rows={2} />
                    </Form.Item>
                    <Typography.Text type="secondary">
                      Variantlar (kamida 2 ta to‘ldirib, keyin to‘g‘ri indeksni tanlang: 0 = birinchi variant).
                    </Typography.Text>
                    <Space wrap style={{ marginTop: 8 }}>
                      {[0, 1, 2, 3, 4, 5].map((i) => (
                        <Form.Item key={i} label={`${i}`} name={[field.name, `o${i}`]} style={{ width: 200, marginBottom: 0 }}>
                          <Input maxLength={500} />
                        </Form.Item>
                      ))}
                    </Space>
                    <Form.Item
                      name={[field.name, "correct_index"]}
                      label="To‘g‘ri javob indeksi (0 dan)"
                      rules={[{ required: true, type: "number", min: 0, max: 5 }]}
                    >
                      <InputNumber min={0} max={5} />
                    </Form.Item>
                    {fields.length > 1 ? (
                      <Button danger type="link" onClick={() => remove(field.name)}>
                        Savolni olib tashlash
                      </Button>
                    ) : null}
                  </Card>
                ))}
                <Button
                  type="dashed"
                  onClick={() =>
                    add({ prompt: "", o0: "", o1: "", o2: "", o3: "", o4: "", o5: "", correct_index: 0 })
                  }
                >
                  Savol qo‘shish
                </Button>
              </Space>
            )}
          </Form.List>
        </Form>
      </Modal>
    </>
  );
}
