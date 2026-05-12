import { Card, Col, Row, Space, Tag, Typography } from "antd";
import { Link, Navigate, useOutletContext } from "react-router-dom";
import {
  AlertTriangle,
  BadgeCheck,
  CalendarCheck,
  CreditCard,
  Dumbbell,
  HelpCircle,
  LayoutDashboard,
  Lightbulb,
  Package,
  Sparkles,
} from "lucide-react";
import PageHeader from "../../components/ui/PageHeader";

const { Title, Paragraph, Text } = Typography;

const STEPS = [
  {
    n: 1,
    title: "Abonement turlarini sozlang",
    desc: "Avval zalingizdagi barcha abonement turlarini ro'yxatga oling: 1 oylik, 3 oylik, premium, kunlik tashrif va h.k.",
    actions: [
      {
        to: "/business/items",
        icon: Package,
        label: "Abonementlar (Items)",
        hint: "Abonement nomi, narxi, mashg'ulotlar soni",
      },
    ],
    tip: "Har bir abonementga aniq narx qo'ying — klientga biriktirganda narx avtomatik tortiladi.",
  },
  {
    n: 2,
    title: "Klient qo'shing",
    desc: "Yangi klient kelganda Klientlar sahifasida 'Klient qo'shish' tugmasini bosing. Klient turini tanlang: oylik yoki kunlik.",
    actions: [
      {
        to: "/business/fitness/clients",
        icon: Dumbbell,
        label: "Klientlar",
        hint: "Ism, telefon, oylik yoki kunlik",
      },
    ],
    tip: "Oylik klient — abonement oladi. Kunlik klient — har safar pul to'lab kiradi.",
  },
  {
    n: 3,
    title: "Klientga abonement biriktiring",
    desc: "Klientlar ro'yxatida klient yonida 'Abonement' tugmasini bosing → kerakli abonementni tanlang → sanalarni belgilang.",
    actions: [
      {
        to: "/business/fitness/clients",
        icon: Dumbbell,
        label: "Klientlar → Abonement",
        hint: "Klient ustida 'Abonement' tugmasi",
      },
    ],
    tip: "Klient hozir to'lamoqchi bo'lmasa ham, abonement biriktirib qo'ying — summa qarz sifatida yoziladi.",
  },
  {
    n: 4,
    title: "To'lov qabul qiling",
    desc: "Klient pul to'laganda To'lovlar sahifasida 'To'lov qo'shish' tugmasini bosing. Klient va abonementni tanlang, summani kiriting.",
    actions: [
      {
        to: "/business/fitness/payments",
        icon: CreditCard,
        label: "To'lovlar",
        hint: "Naqd / karta / o'tkazma",
      },
    ],
    tip: "Qarzdor klientlar paneli orqali 'To'lash' tugmasini bossangiz, qarz summasi avtomatik to'ldiriladi.",
  },
  {
    n: 5,
    title: "Davomatni belgilang",
    desc: "Klient zalga kelganda Davomat sahifasida 'Davomat qo'shish' tugmasini bosing. Klient nomini tanlang.",
    actions: [
      {
        to: "/business/fitness/attendance",
        icon: CalendarCheck,
        label: "Davomat",
        hint: "Sana, vaqt, to'lov (kunlik uchun)",
      },
    ],
    tip: "Oylik klient uchun davomat bepul — abonement allaqachon to'langan. Kunlik klient uchun har tashrifda to'lov yoziladi.",
  },
  {
    n: 6,
    title: "Hisobotni kuzating",
    desc: "Dashboard yuqorisida bugungi tashriflar, oy daromadi, qarzdorlik ko'rsatiladi. Abonementlar (hisob) sahifasida har bir abonementga nechta odam yozilganini ko'rishingiz mumkin.",
    actions: [
      {
        to: "/business/dashboard",
        icon: LayoutDashboard,
        label: "Dashboard",
        hint: "Umumiy ko'rinish",
      },
      {
        to: "/business/fitness/abonements",
        icon: BadgeCheck,
        label: "Abonementlar (hisob)",
        hint: "Har bir abonement uchun obunachilar",
      },
    ],
    tip: "Qarzdor klientlar va muddati tugayotgan abonementlar Dashboard pastida jadval ko'rinishida chiqadi.",
  },
  {
    n: 7,
    title: "Klientga shaxsiy kabinet bering",
    desc: "Klient o'zining abonementi, qolgan kunlari, qolgan mashg'ulotlari va to'lovlarini o'zi ko'rib turishi uchun unga login va parol yarating.",
    actions: [
      {
        to: "/business/fitness/clients",
        icon: Dumbbell,
        label: "Klientlar → Kabinet yaratish",
        hint: "Klient ustida 'Kabinet yaratish' tugmasi",
      },
    ],
    tip: "Klientga ichki eslatma (faqat siz ko'rasiz) va kabinet xabari (klient ko'radi) — ikkita alohida maydon mavjud. Klient kabineti orqali siz har bir klientga shaxsiy xabar yetkazishingiz mumkin.",
  },
];

const FAQ = [
  {
    q: "Oylik klient va kunlik klient farqi nima?",
    a: "Oylik klient — abonement sotib oladi, masalan 1 oyga 500 000 so'm. U davomida xohlagancha kelishi mumkin. Kunlik klient esa har safar zalga kirganda alohida pul to'laydi (masalan 30 000 so'm).",
  },
  {
    q: "Qarzdorlik qanday hisoblanadi?",
    a: "Klientga abonement biriktirganingizda kutilayotgan summa belgilanadi. Klient qancha to'lasa, qarz shuncha kamayadi. Qarz = abonement narxi − to'langan summa.",
  },
  {
    q: "Oy daromadi qaerdan kelyapti?",
    a: "Dashboarddagi 'Oy daromadi' — bu joriy oyda kassaga tushgan barcha to'lovlar yig'indisi. Oylik abonementlar uchun to'lovlar + kunlik klientlar to'lovlari.",
  },
  {
    q: "Klient qaytib kelmasa nima qilaman?",
    a: "Klientni o'chirib yubormang — uning tarixi yo'qoladi. Klientni 'Tahrirlash' qilib, holatini 'Arxiv' yoki 'To'xtatilgan' deb belgilang. Keyin qaytib kelsa, qayta 'Faol' qilib qo'yasiz.",
  },
  {
    q: "Bir klient bir nechta abonement olishi mumkinmi?",
    a: "Ha. Klient kartochkasidan 'Abonement' tugmasini bosib istalgancha abonement biriktirsangiz bo'ladi. Har biri alohida hisobga olinadi.",
  },
  {
    q: "Botdan kelgan abonement arizalari nima bo'ladi?",
    a: "Telegram botdan abonement arizasi kelganda u 'Leads' bo'limida saqlanadi. Siz u bilan bog'lanasiz va kelishilsa, Klientlar sahifasidan klient sifatida qo'shasiz.",
  },
  {
    q: "Klient o'zining abonementini ko'ra olishi uchun nima qilaman?",
    a: "Klientlar sahifasida har bir klient qatorida 'Kabinet yaratish' tugmasi bor. Login va parol kiriting → klientga bering. Klient sayt /login orqali kirib o'zining abonementi, qolgan kunlari, mashg'ulotlari, davomati va to'lovlarini ko'radi. Demo: klient_demo / demo12345.",
  },
  {
    q: "Klientga eslatma yozsam, u qaerda ko'radi?",
    a: "Klientni tahrirlashda ikki xil maydon bor: 'Ichki izoh' (faqat admin ko'radi) va 'Kabinet xabari' (klient kabinetiga kirsa ekranning yuqorisida ko'rinadi). Masalan: 'Abonementingiz 3 kundan keyin tugaydi, uzaytiring' deb yozib qo'ying.",
  },
];

const WORKFLOW_DAILY = [
  "Ertalab Dashboard'ni oching — bugun nima bor ko'ring",
  "Klient kelganda Davomat qo'shing",
  "Klient pul to'lasa To'lovlar sahifasidan yozing",
  "Kechqurun Dashboard'da bugungi daromad va tashriflar yig'indisini ko'ring",
];

const WORKFLOW_NEW_CLIENT = [
  "Klientlar → 'Klient qo'shish' (ism, telefon, oylik/kunlik)",
  "Klient yonida 'Abonement' tugmasi → abonement tanlang",
  "To'lov bo'lsa: To'lovlar → 'To'lov qo'shish' (yoki avtomatik 'To'lash' tugmasi)",
  "Klient kelganda: Davomat → 'Davomat qo'shish'",
];

export default function FitnessGuidePage() {
  const { business, businessId } = useOutletContext();
  const isFitness = business?.business_type === "fitness_center";

  if (!business) return null;
  if (!isFitness) return <Navigate to="/business/dashboard" replace />;
  if (!businessId) return null;

  return (
    <>
      <PageHeader
        eyebrow="Qo'llanma"
        title="Fitness zal hisob tizimini qanday ishlatish"
        description="Daftar o'rniga ushbu modulni qanday yuritishni o'rganish uchun qo'llanma."
      />

      {/* Tezkor ish oqimi */}
      <Card
        size="small"
        style={{
          marginBottom: 16,
          background: "linear-gradient(135deg, #f0f9ff 0%, #ecfeff 100%)",
          border: "1px solid #bae6fd",
        }}
      >
        <Space align="start" style={{ width: "100%" }}>
          <Sparkles size={20} color="#0891b2" />
          <div style={{ flex: 1 }}>
            <Title level={5} style={{ margin: 0 }}>
              Birinchi marta ishlatyapsizmi?
            </Title>
            <Paragraph style={{ marginTop: 6, marginBottom: 0, fontSize: 13, color: "#334155" }}>
              Avval bitta klient qo'shib, abonement biriktiring, to'lov yozib davomat qo'shib ko'ring.
              Keyin Dashboard'da raqamlar qanday o'zgarayotganini ko'rasiz va hammasi tushunarli bo'ladi.
            </Paragraph>
          </div>
        </Space>
      </Card>

      {/* 6 qadamli qo'llanma */}
      <Title level={4} style={{ marginTop: 8, marginBottom: 4 }}>
        <Space>
          <HelpCircle size={20} color="#0891b2" />
          6 qadamli qo'llanma
        </Space>
      </Title>
      <Paragraph type="secondary" style={{ marginBottom: 16, fontSize: 13 }}>
        Tartib bo'yicha ishlasangiz hech narsa qiyin bo'lmaydi. Har bir qadam tugmasini bosib mos
        sahifaga o'tishingiz mumkin.
      </Paragraph>
      <Row gutter={[12, 12]}>
        {STEPS.map((s) => (
          <Col xs={24} md={12} xl={8} key={s.n}>
            <Card
              size="small"
              style={{ height: "100%", borderRadius: 10 }}
              styles={{ body: { padding: 16 } }}
            >
              <Space align="start" style={{ marginBottom: 8 }}>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: "50%",
                    background: "#0891b2",
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 700,
                    fontSize: 15,
                    flexShrink: 0,
                  }}
                >
                  {s.n}
                </div>
                <Title level={5} style={{ margin: 0 }}>
                  {s.title}
                </Title>
              </Space>
              <Paragraph style={{ marginBottom: 10, fontSize: 13, color: "#334155" }}>
                {s.desc}
              </Paragraph>
              <Space direction="vertical" size={6} style={{ width: "100%" }}>
                {s.actions.map((a) => {
                  const Icon = a.icon;
                  return (
                    <Link
                      key={a.to + a.label}
                      to={a.to}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "8px 10px",
                        background: "#f8fafc",
                        border: "1px solid #e2e8f0",
                        borderRadius: 8,
                        textDecoration: "none",
                        color: "#0f172a",
                      }}
                    >
                      <Icon size={16} color="#0891b2" />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{a.label}</div>
                        <div style={{ fontSize: 11, color: "#64748b" }}>{a.hint}</div>
                      </div>
                      <span style={{ color: "#0891b2", fontWeight: 700 }}>→</span>
                    </Link>
                  );
                })}
              </Space>
              {s.tip ? (
                <div
                  style={{
                    marginTop: 10,
                    padding: "8px 10px",
                    background: "#fffbeb",
                    border: "1px solid #fde68a",
                    borderRadius: 8,
                    fontSize: 12,
                    color: "#78350f",
                    display: "flex",
                    gap: 6,
                    alignItems: "flex-start",
                  }}
                >
                  <Lightbulb size={14} style={{ marginTop: 1, flexShrink: 0 }} />
                  <span>{s.tip}</span>
                </div>
              ) : null}
            </Card>
          </Col>
        ))}
      </Row>

      {/* Ish oqimlari */}
      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        <Col xs={24} lg={12}>
          <Card
            size="small"
            title={
              <Space>
                <CalendarCheck size={18} color="#0891b2" />
                <span>Har kungi ish oqimi</span>
              </Space>
            }
            style={{ height: "100%" }}
          >
            <ol style={{ paddingLeft: 20, margin: 0 }}>
              {WORKFLOW_DAILY.map((w, i) => (
                <li key={i} style={{ marginBottom: 8, fontSize: 13, color: "#334155" }}>
                  {w}
                </li>
              ))}
            </ol>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card
            size="small"
            title={
              <Space>
                <Dumbbell size={18} color="#0891b2" />
                <span>Yangi klient qabul qilish</span>
              </Space>
            }
            style={{ height: "100%" }}
          >
            <ol style={{ paddingLeft: 20, margin: 0 }}>
              {WORKFLOW_NEW_CLIENT.map((w, i) => (
                <li key={i} style={{ marginBottom: 8, fontSize: 13, color: "#334155" }}>
                  {w}
                </li>
              ))}
            </ol>
          </Card>
        </Col>
      </Row>

      {/* Tez-tez beriladigan savollar */}
      <Title level={4} style={{ marginTop: 32, marginBottom: 12 }}>
        Tez-tez beriladigan savollar
      </Title>
      <Row gutter={[12, 12]}>
        {FAQ.map((f, i) => (
          <Col xs={24} md={12} key={i}>
            <Card size="small" styles={{ body: { padding: 14 } }}>
              <Text strong style={{ display: "block", marginBottom: 6, fontSize: 14 }}>
                {f.q}
              </Text>
              <Text type="secondary" style={{ fontSize: 13 }}>
                {f.a}
              </Text>
            </Card>
          </Col>
        ))}
      </Row>

      {/* Eslatma */}
      <Card
        size="small"
        style={{
          marginTop: 24,
          background: "#fef2f2",
          border: "1px solid #fecaca",
        }}
      >
        <Space align="start">
          <AlertTriangle size={20} color="#dc2626" />
          <div>
            <Text strong style={{ display: "block", color: "#991b1b" }}>
              Eslatma
            </Text>
            <Text style={{ fontSize: 13, color: "#7f1d1d" }}>
              Klientni o'chirib yubormang — uning to'lovlari va davomati ham birga o'chadi.
              Aktiv bo'lmagan klientlarni 'Arxiv' yoki 'To'xtatilgan' holatiga belgilang. Tarix
              saqlanadi va hisobot to'g'ri ko'rinadi.
            </Text>
          </div>
        </Space>
      </Card>

      {/* Tezkor tugmalar */}
      <Card
        size="small"
        style={{ marginTop: 16 }}
        title={<Text strong>Tezkor o'tish</Text>}
      >
        <Space wrap>
          <Link to="/business/items">
            <Tag color="cyan" style={{ padding: "4px 10px", fontSize: 13 }}>
              Abonementlar
            </Tag>
          </Link>
          <Link to="/business/fitness/clients">
            <Tag color="purple" style={{ padding: "4px 10px", fontSize: 13 }}>
              Klientlar
            </Tag>
          </Link>
          <Link to="/business/fitness/attendance">
            <Tag color="blue" style={{ padding: "4px 10px", fontSize: 13 }}>
              Davomat
            </Tag>
          </Link>
          <Link to="/business/fitness/payments">
            <Tag color="green" style={{ padding: "4px 10px", fontSize: 13 }}>
              To'lovlar
            </Tag>
          </Link>
          <Link to="/business/fitness/abonements">
            <Tag color="gold" style={{ padding: "4px 10px", fontSize: 13 }}>
              Abonementlar (hisob)
            </Tag>
          </Link>
          <Link to="/business/dashboard">
            <Tag color="default" style={{ padding: "4px 10px", fontSize: 13 }}>
              Dashboard
            </Tag>
          </Link>
        </Space>
      </Card>
    </>
  );
}
