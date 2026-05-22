export const MONTHS_UZ = [
  { value: 1, label: "Yanvar", short: "Yan" },
  { value: 2, label: "Fevral", short: "Fev" },
  { value: 3, label: "Mart", short: "Mar" },
  { value: 4, label: "Aprel", short: "Apr" },
  { value: 5, label: "May", short: "May" },
  { value: 6, label: "Iyun", short: "Iyn" },
  { value: 7, label: "Iyul", short: "Iyl" },
  { value: 8, label: "Avgust", short: "Avg" },
  { value: 9, label: "Sentabr", short: "Sen" },
  { value: 10, label: "Oktabr", short: "Okt" },
  { value: 11, label: "Noyabr", short: "Noy" },
  { value: 12, label: "Dekabr", short: "Dek" },
];

export function monthLabelUz(month) {
  return MONTHS_UZ.find((m) => m.value === month)?.label || String(month);
}
