import { useEffect, useState } from "react";

/**
 * True when the Scout browser extension is installed. The extension's
 * mark-installed content script runs on this origin and flags
 * <html data-scout-extension="installed"> plus posts a window message, so the
 * sidebar can drop its "Extension not installed" promo card. Polling covers the
 * case where the page loaded before the extension was (re)installed.
 */
export function useExtensionInstalled(): boolean {
  const [installed, setInstalled] = useState(
    () => document.documentElement.getAttribute("data-scout-extension") === "installed",
  );

  useEffect(() => {
    const mark = () =>
      setInstalled(document.documentElement.getAttribute("data-scout-extension") === "installed");

    const onMessage = (event: MessageEvent) => {
      if (event.source === window && event.data?.source === "scout-extension") mark();
    };

    window.addEventListener("message", onMessage);
    const poll = window.setInterval(mark, 2000);
    return () => {
      window.removeEventListener("message", onMessage);
      window.clearInterval(poll);
    };
  }, []);

  return installed;
}
