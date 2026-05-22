import { api } from "./api";
import { downloadAuthenticatedExport } from "../utils/downloadExport";

export async function getEduReportDashboard(params) {
  const { data } = await api.get("/edu-reports/dashboard/", { params });
  return data;
}

export function downloadEduPaymentsReport(params, format) {
  const ext = format === "pdf" ? "pdf" : format === "xlsx" ? "xlsx" : "csv";
  const month = params.month || "";
  return downloadAuthenticatedExport(
    "/edu-reports/payments/",
    { ...params, export: format === "xlsx" ? "xlsx" : format },
    `tolovlar_${month}.${ext}`,
  );
}

export function downloadEduAttendanceReport(params, format) {
  const ext = format === "pdf" ? "pdf" : format === "xlsx" ? "xlsx" : "csv";
  const month = params.month || "";
  return downloadAuthenticatedExport(
    "/edu-reports/attendance/",
    { ...params, export: format === "xlsx" ? "xlsx" : format },
    `davomat_${month}.${ext}`,
  );
}
