import { useEffect } from "react";

/**
 * @param {string} eventName
 * @param {() => void} handler
 */
export function useWindowEvent(eventName, handler) {
  useEffect(() => {
    window.addEventListener(eventName, handler);
    return () => window.removeEventListener(eventName, handler);
  }, [eventName, handler]);
}
