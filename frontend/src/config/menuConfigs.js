/** Telegram bot menyusi uchun demo konfig (preview) */
export const BOT_MENU_BY_TYPE = {
  auto_salon: ["Mashinalar", "Kredit", "Test drive", "Aloqa"],
  education_center: ["Kurslar", "Ro‘yxatdan o‘tish", "Narxlash", "Aloqa"],
  shop: ["Katalog", "Yetkazib berish", "Aloqa"],
  restaurant: ["Menyu", "Bron", "Aloqa"],
  fitness_center: [
    "🏋️ Abonementlar",
    "👨‍🏫 Trenerlar",
    "🧪 Bepul sinov mashg‘ulot",
    "📅 Mashg‘ulot jadvali",
    "💰 Narxlar",
    "📍 Manzil",
    "☎️ Admin bilan bog‘lanish",
  ],
  default: ["Xizmatlar", "Buyurtma", "Aloqa"],
};

export function getBotMenuPreview(type) {
  return BOT_MENU_BY_TYPE[type] || BOT_MENU_BY_TYPE.default;
}
