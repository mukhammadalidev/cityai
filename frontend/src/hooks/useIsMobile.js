import { useEffect, useState } from "react";

/** Telefon / kichik ekran: jadval o‘rniga kartochka UI. */
const MOBILE_MQ = "(max-width: 767px)";

export default function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia(MOBILE_MQ).matches : false,
  );

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_MQ);
    const onChange = () => setIsMobile(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return isMobile;
}
