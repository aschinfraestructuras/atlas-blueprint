import { useTranslation } from "react-i18next";
import { Settings } from "lucide-react";

export default function SettingsPage() {
  const { t } = useTranslation();

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          {t("pages.settings.title")}
        </h1>
        <p className="text-sm text-muted-foreground">{t("pages.settings.subtitle")}</p>
      </div>

      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card py-20 px-6 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-4">
          <Settings className="h-5 w-5 text-muted-foreground" />
        </div>
        <h3 className="text-sm font-semibold text-foreground mb-1">{t("emptyState.title")}</h3>
        <p className="text-sm text-muted-foreground max-w-xs">{t("pages.settings.subtitle")}</p>
      </div>
    </div>
  );
}
