export const BUSINESS_STATUS = {
  pending: { label: "Kutilmoqda", color: "orange" },
  active: { label: "Faol", color: "green" },
  blocked: { label: "Bloklangan", color: "red" },
  archived: { label: "Arxiv", color: "default" },
};

export const LEAD_STATUS = {
  new: { label: "Yangi", color: "blue" },
  contacted: { label: "Bog‘lanildi", color: "cyan" },
  interested: { label: "Qiziqmoqda", color: "geekblue" },
  negotiation: { label: "Kelishuvda", color: "purple" },
  completed: { label: "Yakunlangan", color: "green" },
  won: { label: "Sotildi", color: "success" },
  lost: { label: "Yo‘qotildi", color: "default" },
  cancelled: { label: "Bekor", color: "default" },
};

export const ITEM_STATUS = {
  active: { label: "Faol", color: "green" },
  hidden: { label: "Yashirin", color: "default" },
  sold: { label: "Sotilgan", color: "blue" },
  out_of_stock: { label: "Tugagan", color: "orange" },
  unavailable: { label: "Mavjud emas", color: "red" },
};

export const INVOICE_STATUS = {
  unpaid: { label: "To‘lanmagan", color: "orange" },
  paid: { label: "To‘langan", color: "green" },
  overdue: { label: "Muddati o‘tgan", color: "red" },
};

export const BOOKING_STATUS = {
  new: { label: "Yangi", color: "blue" },
  confirmed: { label: "Tasdiqlandi", color: "green" },
  rejected: { label: "Rad etildi", color: "red" },
  completed: { label: "Bajarildi", color: "purple" },
  cancelled: { label: "Bekor qilindi", color: "default" },
  contacted: { label: "Bog‘lanildi", color: "cyan" },
};

export const ORDER_STATUS = {
  new: { label: "Yangi", color: "blue" },
  accepted: { label: "Qabul qilindi", color: "cyan" },
  preparing: { label: "Tayyorlanmoqda", color: "orange" },
  delivering: { label: "Yetkazilmoqda", color: "purple" },
  completed: { label: "Yakunlandi", color: "green" },
  cancelled: { label: "Bekor", color: "default" },
};

export const SUBSCRIPTION_STATUS = {
  trial: { label: "Sinov", color: "blue" },
  active: { label: "Faol", color: "green" },
  overdue: { label: "Muddati o‘tgan", color: "red" },
  cancelled: { label: "Bekor", color: "default" },
};
