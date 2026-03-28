import { useState, useEffect, useCallback } from "react";

export function usePWAInstall() {
  const [prompt, setPrompt] = useState<any>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const install = useCallback(() => {
    prompt?.prompt();
    setPrompt(null);
  }, [prompt]);

  return { canInstall: !!prompt, install };
}
