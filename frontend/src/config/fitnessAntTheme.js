import { theme } from "antd";

/** Ant Design dark theme — fitness zal kabineti (matn ko'rinishi uchun) */
export const fitnessAntTheme = {
  algorithm: theme.darkAlgorithm,
  token: {
    colorPrimary: "#0ea5e9",
    colorInfo: "#38bdf8",
    colorSuccess: "#34d399",
    colorWarning: "#fbbf24",
    colorError: "#f87171",
    colorText: "#f1f5f9",
    colorTextSecondary: "#94a3b8",
    colorTextTertiary: "#64748b",
    colorTextQuaternary: "#475569",
    colorTextHeading: "#f8fafc",
    colorBgLayout: "#020617",
    colorBgContainer: "rgba(15, 23, 42, 0.92)",
    colorBgElevated: "#0f172a",
    colorBorder: "rgba(148, 163, 184, 0.2)",
    colorBorderSecondary: "rgba(148, 163, 184, 0.12)",
    colorFillAlter: "rgba(30, 41, 59, 0.5)",
    colorFillSecondary: "rgba(51, 65, 85, 0.45)",
    borderRadius: 12,
    fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif',
  },
  components: {
    Card: {
      colorBgContainer: "rgba(15, 23, 42, 0.88)",
      colorTextHeading: "#f1f5f9",
    },
    Table: {
      colorBgContainer: "transparent",
      headerBg: "rgba(14, 165, 233, 0.1)",
      headerColor: "#94a3b8",
      rowHoverBg: "rgba(56, 189, 248, 0.08)",
      borderColor: "rgba(148, 163, 184, 0.12)",
      colorText: "#f1f5f9",
    },
    Modal: {
      contentBg: "#0f172a",
      headerBg: "#0f172a",
      titleColor: "#f1f5f9",
    },
    Drawer: {
      colorBgElevated: "#0f172a",
      colorText: "#f1f5f9",
    },
    Form: {
      labelColor: "#cbd5e1",
    },
    Input: {
      colorBgContainer: "rgba(2, 6, 23, 0.7)",
      colorText: "#f1f5f9",
      colorTextPlaceholder: "#64748b",
      activeBorderColor: "#0ea5e9",
    },
    Select: {
      colorBgContainer: "rgba(2, 6, 23, 0.7)",
      colorText: "#f1f5f9",
      optionSelectedBg: "rgba(14, 165, 233, 0.2)",
    },
    DatePicker: {
      colorBgContainer: "rgba(2, 6, 23, 0.7)",
      colorText: "#f1f5f9",
    },
    Button: {
      defaultBg: "rgba(15, 23, 42, 0.8)",
      defaultColor: "#f1f5f9",
      defaultBorderColor: "rgba(148, 163, 184, 0.25)",
    },
    Statistic: {
      titleFontSize: 13,
      contentFontSize: 24,
    },
    Typography: {
      colorText: "#f1f5f9",
      colorTextSecondary: "#94a3b8",
    },
    Tag: {
      defaultBg: "rgba(51, 65, 85, 0.5)",
      defaultColor: "#e2e8f0",
    },
    Alert: {
      colorInfoBg: "rgba(14, 165, 233, 0.12)",
      colorInfoBorder: "rgba(56, 189, 248, 0.3)",
    },
    Pagination: {
      itemBg: "rgba(15, 23, 42, 0.8)",
      itemActiveBg: "rgba(14, 165, 233, 0.25)",
    },
    Empty: {
      colorText: "#94a3b8",
    },
    Tabs: {
      itemColor: "#94a3b8",
      itemSelectedColor: "#38bdf8",
      inkBarColor: "#0ea5e9",
    },
  },
};
