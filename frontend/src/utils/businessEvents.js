/** Biznes kabinetida CRUD dan keyin ro‘yxatlar va dashboardni yangilash */
export const BUSINESS_DATA_CHANGED = "cs-business-data-changed";

export function notifyBusinessDataChanged() {
  window.dispatchEvent(new Event(BUSINESS_DATA_CHANGED));
}
