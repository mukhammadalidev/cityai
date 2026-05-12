/** Dinamik item metadata maydonlari (ItemFormPage uchun) */
export const METADATA_FIELDS_BY_TYPE = {
  auto_salon: [
    { name: "brand", label: "Brend", type: "string" },
    { name: "model", label: "Model", type: "string" },
    { name: "year", label: "Yil", type: "number" },
    { name: "mileage", label: "Yurgan masofa (km)", type: "number" },
    { name: "fuel_type", label: "Yonilg‘i", type: "string" },
    { name: "transmission", label: "Transmissiya", type: "string" },
    { name: "color", label: "Rang", type: "string" },
    { name: "condition", label: "Holat", type: "string" },
    { name: "has_credit", label: "Kredit", type: "bool" },
    { name: "has_trade_in", label: "Trade-in", type: "bool" },
  ],
  education_center: [
    { name: "duration", label: "Davomiyligi", type: "string" },
    { name: "level", label: "Daraja", type: "string" },
    { name: "teacher", label: "O‘qituvchi", type: "string" },
    { name: "lesson_days", label: "Dars kunlari", type: "string" },
    { name: "lesson_time", label: "Vaqt", type: "string" },
    { name: "format", label: "Format", type: "string" },
  ],
  shop: [
    { name: "stock", label: "Ombor", type: "number" },
    { name: "discount", label: "Chegirma", type: "string" },
    { name: "brand", label: "Brend", type: "string" },
    { name: "delivery_available", label: "Yetkazib berish", type: "bool" },
  ],
  restaurant: [
    { name: "category", label: "Kategoriya", type: "string" },
    { name: "ingredients", label: "Tarkibi", type: "string" },
    { name: "preparation_time", label: "Tayyorlash (daq)", type: "string" },
    { name: "is_spicy", label: "Achchiq", type: "bool" },
    { name: "available", label: "Mavjud", type: "bool" },
  ],
  clinic: [
    { name: "doctor_name", label: "Shifokor", type: "string" },
    { name: "specialty", label: "Mutaxassislik", type: "string" },
    { name: "duration", label: "Davomiyligi", type: "string" },
    { name: "available_days", label: "Kunlar", type: "string" },
    { name: "consultation_price", label: "Konsultatsiya narxi", type: "string" },
  ],
  fitness_center: [
    { name: "duration", label: "Davomiyligi", type: "string" },
    { name: "sessions_count", label: "Mashg‘ulotlar soni", type: "number" },
    { name: "trainer_name", label: "Trener", type: "string" },
    {
      name: "training_type",
      label: "Mashg‘ulot turi",
      type: "select",
      options: [
        "Fitness",
        "Bodybuilding",
        "Crossfit",
        "Yoga",
        "Cardio",
        "Personal training",
        "Group training",
      ],
    },
    { name: "schedule", label: "Jadval", type: "string" },
    {
      name: "level",
      label: "Daraja",
      type: "select",
      options: ["Beginner", "Intermediate", "Advanced"],
    },
    {
      name: "gender_group",
      label: "Guruh turi",
      type: "select",
      options: ["Erkaklar", "Ayollar", "Aralash"],
    },
    { name: "has_personal_trainer", label: "Personal trener bormi?", type: "switch" },
    { name: "available", label: "Mavjudmi?", type: "switch" },
  ],
  default: [
    { name: "note", label: "Izoh", type: "string" },
  ],
};

export function getMetadataFields(businessType) {
  return METADATA_FIELDS_BY_TYPE[businessType] || METADATA_FIELDS_BY_TYPE.default;
}
