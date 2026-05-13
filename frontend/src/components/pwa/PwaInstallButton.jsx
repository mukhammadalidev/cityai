import { useEffect, useMemo, useState } from "react";
import { Button, Modal, Typography } from "antd";
import { DownloadOutlined } from "@ant-design/icons";

const INSTALL_DISMISSED_KEY = "citybot:pwa-install-dismissed-v2";

const mobileQuery = "(max-width: 767px), (pointer: coarse)";

function isStandalone() {
  return window.matchMedia?.("(display-mode: standalone)").matches || window.navigator.standalone === true;
}

function isMobileDevice() {
  return window.matchMedia?.(mobileQuery).matches || /Android|iPhone|iPad|iPod/i.test(window.navigator.userAgent);
}

function isAppleDevice() {
  return /iPhone|iPad|iPod/i.test(window.navigator.userAgent);
}

export default function PwaInstallButton() {
  const [installPrompt, setInstallPrompt] = useState(null);
  const [showFallback, setShowFallback] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [hidden, setHidden] = useState(() => {
    if (typeof window === "undefined") return true;
    return isStandalone() || localStorage.getItem(INSTALL_DISMISSED_KEY) === "1";
  });

  const canInstall = useMemo(() => (Boolean(installPrompt) || showFallback) && !hidden, [hidden, installPrompt, showFallback]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const fallbackTimer = window.setTimeout(() => {
      setShowFallback(isMobileDevice() && !isStandalone());
    }, 1200);

    const onBeforeInstallPrompt = (event) => {
      event.preventDefault();
      setInstallPrompt(event);
      setShowFallback(false);
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
      window.clearTimeout(fallbackTimer);
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, []);

  if (!canInstall) return null;

  const install = async () => {
    if (!installPrompt) {
      setHelpOpen(true);
      return;
    }

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
    <>
      <div className="cs-pwa-install">
        <Button type="primary" icon={<DownloadOutlined />} onClick={install}>
          Ilovani yuklash
        </Button>
        <button className="cs-pwa-install__close" type="button" aria-label="Yopish" onClick={dismiss}>
          ×
        </button>
      </div>

      <Modal
        title="Ilovani telefonga qo‘shish"
        open={helpOpen}
        okText="Tushunarli"
        cancelButtonProps={{ style: { display: "none" } }}
        onOk={() => setHelpOpen(false)}
        onCancel={() => setHelpOpen(false)}
      >
        {isAppleDevice() ? (
          <Typography.Paragraph className="cs-pwa-install__help">
            Safari brauzerida ulashish tugmasini bosing, keyin “Add to Home Screen” ni tanlang.
          </Typography.Paragraph>
        ) : (
          <Typography.Paragraph className="cs-pwa-install__help">
            Chrome menyusini oching va “Install app” yoki “Add to Home screen” ni tanlang. Agar menyuda chiqmasa,
            sayt HTTPS domen orqali ochilganini tekshiring.
          </Typography.Paragraph>
        )}
      </Modal>
    </>
  );
}
