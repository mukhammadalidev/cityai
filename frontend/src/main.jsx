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
        token: { colorPrimary: "#1677ff", borderRadiusLG: 12, fontFamily: "Inter, system-ui, sans-serif" },
      }}
    >
      <App />
    </ConfigProvider>
  </React.StrictMode>,
);
