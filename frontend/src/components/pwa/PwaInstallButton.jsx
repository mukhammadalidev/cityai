import { useEffect, useMemo, useState } from "react";
import { Button } from "antd";
import { DownloadOutlined } from "@ant-design/icons";

const INSTALL_DISMISSED_KEY = "citybot:pwa-install-dismissed";

function isStandalone() {
  return window.matchMedia?.("(display-mode: standalone)").matches || window.navigator.standalone === true;
}

export default function PwaInstallButton() {
  const [installPrompt, setInstallPrompt] = useState(null);
  const [hidden, setHidden] = useState(() => {
    if (typeof window === "undefined") return true;
    return isStandalone() || localStorage.getItem(INSTALL_DISMISSED_KEY) === "1";
  });

  const canInstall = useMemo(() => Boolean(installPrompt) && !hidden, [hidden, installPrompt]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const onBeforeInstallPrompt = (event) => {
      event.preventDefault();
      setInstallPrompt(event);
      setHidden(isStandalone() || localStorage.getItem(INSTALL_DISMISSED_KEY) === "1");
    };

    const onAppInstalled = () => {
      setInstallPrompt(null);
      setHidden(true);
      localStorage.setItem(INSTALL_DISMISSED_KEY, "1");
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, []);

  if (!canInstall) return null;

  const install = async () => {
    if (!installPrompt) return;

    installPrompt.prompt();
    const choice = await installPrompt.userChoice;

    if (choice.outcome === "accepted") {
      setInstallPrompt(null);
      setHidden(true);
      localStorage.setItem(INSTALL_DISMISSED_KEY, "1");
    }
  };

  const dismiss = () => {
    setHidden(true);
    localStorage.setItem(INSTALL_DISMISSED_KEY, "1");
  };

  return (
    <div className="cs-pwa-install">
      <Button type="primary" icon={<DownloadOutlined />} onClick={install}>
        Ilovani o‘rnatish
      </Button>
      <button className="cs-pwa-install__close" type="button" aria-label="Yopish" onClick={dismiss}>
        ×
      </button>
    </div>
  );
}
