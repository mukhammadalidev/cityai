/** O‘quvchi portali uchun namuna (mock) testlar — backend ulanmagan. */

export const MOCK_TEST_SUBJECTS = [
  {
    key: "math",
    label: "Matematika",
    tests: [
      {
        id: "math-basics",
        title: "Algebra va arifmetika asoslari",
        blurb: "Qavs, tartib, oddiy tenglama.",
        minutes: 12,
        questions: [
          {
            id: "m1",
            text: "(5 + 3) × 2 − 4 = ?",
            options: ["10", "12", "14", "16"],
            correctIndex: 1,
          },
          {
            id: "m2",
            text: "2x + 6 = 14 bo‘lsa, x = ?",
            options: ["2", "3", "4", "5"],
            correctIndex: 2,
          },
          {
            id: "m3",
            text: "√36 + √25 = ?",
            options: ["9", "10", "11", "12"],
            correctIndex: 2,
          },
        ],
      },
      {
        id: "math-geometry",
        title: "Geometriya (asoslar)",
        blurb: "Perimetr va yuzadan qisqa savollar.",
        minutes: 10,
        questions: [
          {
            id: "g1",
            text: "To‘g‘ri to‘rtburchakning tomonlari 4 va 7 bo‘lsa, perimetri necha?",
            options: ["20", "22", "24", "28"],
            correctIndex: 1,
          },
          {
            id: "g2",
            text: "Aylana radiusi 3 bo‘lsa, yuzi taxminan πr² bo‘yicha (π ≈ 3) nechaga yaqin?",
            options: ["18", "24", "27", "36"],
            correctIndex: 2,
          },
        ],
      },
    ],
  },
  {
    key: "english",
    label: "Ingliz tili",
    tests: [
      {
        id: "en-grammar",
        title: "Grammar: Present Simple",
        blurb: "She / works / every day kabi tuzilmalar.",
        minutes: 10,
        questions: [
          {
            id: "e1",
            text: "To‘g‘ri gapni tanlang: My brother ___ in Tashkent.",
            options: ["live", "lives", "living", "lived"],
            correctIndex: 1,
          },
          {
            id: "e2",
            text: "“I don’t like coffee.” — qaysi gap shu ma’noni davom ettiradi?",
            options: ["Me too.", "Neither do I.", "So do I.", "I do too."],
            correctIndex: 1,
          },
          {
            id: "e3",
            text: "Choose the correct article: ___ university near our house is new.",
            options: ["A", "An", "The", "— (no article)"],
            correctIndex: 2,
          },
        ],
      },
      {
        id: "en-vocab",
        title: "Vocabulary: school & daily life",
        blurb: "So‘z boyligi — oddiy kontekst.",
        minutes: 8,
        questions: [
          {
            id: "v1",
            text: "“Homework” so‘zining ma’nosi:",
            options: ["Uy vazifasi", "Darslik", "Sinov", "Dam olish"],
            correctIndex: 0,
          },
          {
            id: "v2",
            text: "“Borrow” so‘zi eng yaqin ma’nosi:",
            options: ["Berish", "Qarzga olish", "Sotish", "Unutish"],
            correctIndex: 1,
          },
        ],
      },
    ],
  },
  {
    key: "arabic",
    label: "Arab tili",
    tests: [
      {
        id: "ar-letters",
        title: "Alifbo va harflar",
        blurb: "Birinchi dars: tanishuv va oddiy o‘qish.",
        minutes: 10,
        questions: [
          {
            id: "a1",
            text: "Quyidagilardan qaysi biri «ba» harfi?",
            options: ["ب", "ت", "ث", "ن"],
            correctIndex: 0,
          },
          {
            id: "a2",
            text: "«Assalomu alaykum» arabcha yozuvda odatda qanday boshlanadi?",
            options: ["السلام", "مرحبا", "صباح", "مساء"],
            correctIndex: 0,
          },
          {
            id: "a3",
            text: "«Kitob» ma’nosidagi so‘z (oddiy lug‘at):",
            options: ["قلم", "كتاب", "باب", "بيت"],
            correctIndex: 1,
          },
        ],
      },
      {
        id: "ar-phrases",
        title: "Oddiy iboralar",
        blurb: "Salomlashish va qisqa gaplar.",
        minutes: 8,
        questions: [
          {
            id: "p1",
            text: "«Rahmat» uchun arabchada keng ishlatiladigan so‘z:",
            options: ["شكرًا", "مع السلامة", "أهلاً", "نعم"],
            correctIndex: 0,
          },
          {
            id: "p2",
            text: "«Xayr / salomat bo‘ling» (xayrlashish) uchun:",
            options: ["أهلاً وسهلاً", "مع السلامة", "كيف حالك؟", "من أنت؟"],
            correctIndex: 1,
          },
        ],
      },
    ],
  },
];
