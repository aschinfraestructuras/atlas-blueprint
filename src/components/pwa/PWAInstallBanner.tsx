/// <reference types="vite-plugin-pwa/react" />
import { useEffect } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

export function PWAInstallBanner() {
  const { t } = useTranslation();
  const { needRefresh, updateServiceWorker } = useRegisterSW({
    onRegistered() {
      // SW registered
    },
  });

  const [needsRefresh] = needRefresh;

  useEffect(() => {
    if (needsRefresh) {
      toast(t("pwa.updateAvailable"), {
        duration: Infinity,
        action: {
          label: t("pwa.updateNow"),
          onClick: () => updateServiceWorker(true),
        },
      });
    }
  }, [needsRefresh, t, updateServiceWorker]);

  return null;
}
