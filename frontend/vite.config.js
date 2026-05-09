import path from "path";
import { fileURLToPath } from "url";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
  const rootDir = path.resolve(__dirname, "..");
  const env = loadEnv(mode, rootDir, "");

  /** Ngrok / Cloudflare tunnel orqali ochganda WebSocket (HMR) to‘g‘ri hostga ulansin */
  const tunnelHost = (env.VITE_TUNNEL_HMR_HOST || "").trim().replace(/^https?:\/\//, "").split("/")[0];

  return {
    envDir: "..",
    plugins: [react()],
    build: {
      chunkSizeWarningLimit: 650,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes("node_modules")) return;
            if (id.includes("@ant-design/icons")) return "vendor-antd-icons";
            if (id.includes("antd")) return "vendor-antd";
            if (id.includes("recharts")) return "vendor-recharts";
            if (id.includes("react-router") || id.includes("@remix-run")) return "vendor-router";
            if (id.includes("react-dom") || id.includes("/react/") || id.includes("scheduler"))
              return "vendor-react-core";
            if (id.includes("axios")) return "vendor-axios";
            if (id.includes("dayjs")) return "vendor-dayjs";
            if (id.includes("lucide-react")) return "vendor-lucide";
            if (id.includes("lodash-es") || id.includes("lodash")) return "vendor-lodash";
            if (id.includes("@floating-ui")) return "vendor-floating-ui";
            if (id.includes("@babel/runtime")) return "vendor-babel-runtime";
            return "vendor-utils";
          },
        },
      },
    },
    server: {
      port: 5173,
      host: true,
      allowedHosts: true,
      ...(tunnelHost
        ? {
            hmr: {
              protocol: "wss",
              host: tunnelHost,
              clientPort: 443,
            },
          }
        : {}),
      proxy: {
        "/api": { target: "http://127.0.0.1:8000", changeOrigin: true },
        "/media": { target: "http://127.0.0.1:8000", changeOrigin: true },
      },
    },
    test: {
      environment: "jsdom",
      setupFiles: "./src/test/setup.js",
      globals: true,
    },
  };
});
