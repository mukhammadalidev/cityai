/** Frontend ko‘rsatmalar — backend rejalar bilan mos kelishi uchun kodlar: demo, start, business, premium */
export const PLAN_LABELS = {
  demo: "Demo",
  start: "Start",
  business: "Business",
  premium: "Premium",
};

export function planFeatureList(plan) {
  if (!plan) return [];
  return [
    plan.has_ai_chat && "AI chat-bot",
    plan.has_analytics && "Analitika",
    plan.has_public_page && "Ochiq sahifa",
    plan.has_marketing_generator && "Marketing generator",
    plan.has_auto_followup && "Avto follow-up",
    plan.has_white_label && "White label",
    plan.has_edu_attendance && "O‘quv markaz: davomat",
    plan.has_edu_materials && "O‘quv markaz: materiallar (kitob/mahsulot)",
    plan.has_edu_portals && "O‘quv markaz: ustoz/o‘quvchi/ota-ona kabinetlari",
    plan.parent_can_create_student_portal &&
      "Premium: ota-ona farzand uchun o‘quvchi loginini kabinetdan yaratadi",
  ].filter(Boolean);
}
