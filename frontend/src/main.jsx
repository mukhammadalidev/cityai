import React from "react";
import ReactDOM from "react-dom/client";
import { ConfigProvider, theme } from "antd";
import uzUZ from "antd/locale/uz_UZ";
import App from "./App";
import { registerServiceWorker } from "./pwa/registerServiceWorker";
import "./styles/design-system.css";
import "./styles/global.css";
import "./styles/layouts.css";
import "./styles/components.css";
import "./styles/business-pages.css";
import "./styles/glass.css";
import "./styles/landing.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ConfigProvider
      locale={uzUZ}
      theme={{
        algorithm: theme.defaultAlgorithm,
        token: {
          colorPrimary: "#2563EB",
          colorInfo: "#06B6D4",
          colorSuccess: "#16A34A",
          colorWarning: "#F59E0B",
          colorError: "#DC2626",
          colorText: "#111827",
          colorTextSecondary: "#64748B",
          colorTextTertiary: "#94A3B8",
          colorBorder: "rgba(15, 23, 42, 0.08)",
          colorBorderSecondary: "rgba(15, 23, 42, 0.05)",
          colorBgLayout: "#F5F7FB",
          colorBgContainer: "#FFFFFF",
          colorBgElevated: "#FFFFFF",
          borderRadius: 12,
          borderRadiusLG: 18,
          borderRadiusSM: 10,
          fontFamily: '"Plus Jakarta Sans", system-ui, -apple-system, sans-serif',
          fontSizeHeading1: 34,
          fontSizeHeading2: 26,
          fontSizeHeading3: 22,
          lineHeightHeading3: 1.35,
          controlHeightLG: 46,
          motionDurationMid: "0.22s",
          boxShadow:
            "0 1px 2px rgba(15, 23, 42, 0.04), 0 8px 28px rgba(15, 23, 42, 0.07)",
          boxShadowSecondary: "0 4px 16px rgba(15, 23, 42, 0.06)",
        },
        components: {
          Layout: { bodyBg: "transparent", headerBg: "transparent", siderBg: "#0a0e1a" },
          Card: {
            headerFontSize: 15,
            headerFontSizeSM: 14,
            paddingLG: 24,
            borderRadiusLG: 18,
            colorBgContainer: "#FFFFFF",
            colorBorderSecondary: "rgba(15, 23, 42, 0.06)",
            boxShadowTertiary: "0 10px 30px rgba(15, 23, 42, 0.06)",
          },
          Table: {
            headerBg: "rgba(37, 99, 235, 0.04)",
            headerSplitColor: "rgba(15, 23, 42, 0.06)",
            rowHoverBg: "rgba(37, 99, 235, 0.04)",
            borderColor: "rgba(15, 23, 42, 0.06)",
            borderRadius: 14,
          },
          Button: {
            primaryShadow: "0 4px 14px rgba(37, 99, 235, 0.3)",
            fontWeight: 600,
            controlHeight: 40,
            borderRadius: 10,
          },
          Menu: {
            itemBorderRadius: 12,
            subMenuItemBorderRadius: 10,
            itemSelectedBg: "rgba(59, 130, 246, 0.2)",
            itemHoverBg: "rgba(148, 163, 184, 0.12)",
          },
          Form: { labelFontSize: 14, verticalLabelPadding: "0 0 6px", labelFontWeight: 600 },
          Input: { activeBorderColor: "#2563EB", hoverBorderColor: "#3B82F6", borderRadius: 10 },
          Select: { optionSelectedBg: "rgba(37, 99, 235, 0.08)" },
          Tabs: { inkBarColor: "#2563EB", itemSelectedColor: "#2563EB", titleFontSize: 15 },
          Statistic: { titleFontSize: 13 },
        },
      }}
    >
      <App />
    </ConfigProvider>
  </React.StrictMode>,
);

registerServiceWorker();
