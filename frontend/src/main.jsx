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
          colorPrimary: "#4f46e5",
          colorInfo: "#0ea5e9",
          colorSuccess: "#059669",
          colorWarning: "#d97706",
          colorError: "#dc2626",
          colorText: "#0f1117",
          colorTextSecondary: "#5c6578",
          colorTextTertiary: "#8b94a8",
          colorBorder: "rgba(15, 23, 42, 0.09)",
          colorBorderSecondary: "rgba(15, 23, 42, 0.055)",
          colorBgLayout: "transparent",
          colorBgContainer: "#ffffff",
          borderRadius: 12,
          borderRadiusLG: 16,
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
            borderRadiusLG: 16,
            boxShadowTertiary:
              "0 1px 2px rgba(15, 23, 42, 0.04), 0 10px 32px rgba(15, 23, 42, 0.07)",
          },
          Table: {
            headerBg: "rgba(79, 70, 229, 0.05)",
            headerSplitColor: "rgba(15, 23, 42, 0.06)",
            rowHoverBg: "rgba(79, 70, 229, 0.045)",
            borderColor: "rgba(15, 23, 42, 0.06)",
            borderRadius: 14,
          },
          Button: {
            primaryShadow: "0 2px 8px rgba(79, 70, 229, 0.35)",
            fontWeight: 600,
            controlHeight: 38,
          },
          Menu: {
            itemBorderRadius: 12,
            subMenuItemBorderRadius: 10,
            itemSelectedBg: "rgba(165, 180, 252, 0.14)",
            itemHoverBg: "rgba(148, 163, 184, 0.1)",
          },
          Form: { labelFontSize: 14, verticalLabelPadding: "0 0 6px", labelFontWeight: 600 },
          Input: { activeBorderColor: "#4f46e5", hoverBorderColor: "#6366f1" },
          Select: { optionSelectedBg: "rgba(79, 70, 229, 0.08)" },
          Tabs: { inkBarColor: "#4f46e5", itemSelectedColor: "#4f46e5", titleFontSize: 15 },
          Statistic: { titleFontSize: 13 },
        },
      }}
    >
      <App />
    </ConfigProvider>
  </React.StrictMode>,
);
