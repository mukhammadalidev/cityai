import { useEffect } from "react";
import { BrowserRouter } from "react-router-dom";
import PwaInstallButton from "./components/pwa/PwaInstallButton";
import AppRoutes from "./routes/AppRoutes";

function TelegramWebAppInit() {
  useEffect(() => {
    const run = () => {
      const tw = window.Telegram?.WebApp;
      if (!tw) return;
      try {
        tw.ready();
        tw.expand();
      } catch {
        /* WebView xatoliklari */
      }
    };
    run();
    // defer skript Reactdan keyin yuklanishi mumkin
    window.addEventListener("load", run);
    return () => window.removeEventListener("load", run);
  }, []);
  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <TelegramWebAppInit />
      <AppRoutes />
      <PwaInstallButton />
    </BrowserRouter>
  );
}
