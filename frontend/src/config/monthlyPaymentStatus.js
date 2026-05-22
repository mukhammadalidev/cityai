/** Oylik to'lov holati — o'quv markaz */
export const MONTHLY_PAYMENT_STATUS = {
  paid: { label: "To'landi", color: "success", cellClass: "cs-pay-cell--paid" },
  unpaid: { label: "To'lanmagan", color: "error", cellClass: "cs-pay-cell--unpaid" },
  partial: { label: "Qisman to'landi", color: "warning", cellClass: "cs-pay-cell--partial" },
  debt: { label: "Qarzdor", color: "default", cellClass: "cs-pay-cell--debt" },
};

export const MONTHLY_PAYMENT_STATUS_OPTIONS = Object.entries(MONTHLY_PAYMENT_STATUS).map(
  ([value, cfg]) => ({ value, label: cfg.label })
);

export function monthlyPaymentLabel(status) {
  if (!status || status === "unpaid") return MONTHLY_PAYMENT_STATUS.unpaid.label;
  return MONTHLY_PAYMENT_STATUS[status]?.label || status;
}
