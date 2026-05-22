import { getBusinessTypeConfig } from "../config/businessTypes";

export function getBookingsPageTitle(businessType) {
  const cfg = getBusinessTypeConfig(businessType);
  return cfg.bookingsLabel || "Bronlar";
}

export function getBookingsPageDescription(businessType) {
  const cfg = getBusinessTypeConfig(businessType);
  if (businessType === "restaurant") {
    return "Telegram va veb-sahifadan kelgan stol bron arizalari.";
  }
  if (businessType === "education_center") {
    return "Sinov darslar va qabul arizalarini boshqaring.";
  }
  if (businessType === "fitness_center") {
    return "Sinov mashg'ulot arizalarini boshqaring.";
  }
  if (businessType === "auto_salon") {
    return "Test drive va uchrashuv arizalari.";
  }
  return `${cfg.bookingsLabel || "Bronlar"} — jadval va karta ko'rinishi.`;
}
