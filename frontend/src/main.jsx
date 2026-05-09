import React from "react";
import ReactDOM from "react-dom/client";
import { ConfigProvider, theme } from "antd";
import uzUZ from "antd/locale/uz_UZ";
import App from "./App";
import "./styles/global.css";
import "./styles/layouts.css";
import "./styles/components.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ConfigProvider
      locale={uzUZ}
      theme={{
        algorithm: theme.defaultAlgorithm,
        token: {
          colorPrimary: "#2563eb",
          colorInfo: "#2563eb",
          colorSuccess: "#059669",
          colorWarning: "#d97706",
          colorError: "#dc2626",
          colorText: "#1a1d24",
          colorTextSecondary: "#64748b",
          colorTextTertiary: "#94a3b8",
          colorBorder: "rgba(15, 23, 42, 0.1)",
          colorBorderSecondary: "rgba(15, 23, 42, 0.06)",
          colorBgLayout: "#f5f7fb",
          colorBgContainer: "#ffffff",
          borderRadius: 10,
          borderRadiusLG: 12,
          fontFamily: "Inter, system-ui, -apple-system, sans-serif",
          controlHeightLG: 44,
        },
        components: {
          Layout: { bodyBg: "#f5f7fb" },
          Card: {
            headerFontSize: 15,
            headerFontSizeSM: 14,
            paddingLG: 22,
          },
          Table: {
            headerBg: "rgba(15, 23, 42, 0.03)",
            headerSplitColor: "rgba(15, 23, 42, 0.06)",
            rowHoverBg: "rgba(37, 99, 235, 0.04)",
            borderColor: "rgba(15, 23, 42, 0.06)",
          },
          Button: { primaryShadow: "0 2px 0 rgba(5, 5, 5, 0.02)" },
          Menu: { itemBorderRadius: 10, subMenuItemBorderRadius: 8 },
          Form: { labelFontSize: 14, verticalLabelPadding: "0 0 6px" },
          Input: { activeBorderColor: "#2563eb", hoverBorderColor: "#3b82f6" },
        },
      }}
    >
      <App />
    </ConfigProvider>
  </React.StrictMode>,
);
