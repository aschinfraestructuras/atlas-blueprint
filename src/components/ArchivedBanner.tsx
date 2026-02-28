import { useTranslation } from "react-i18next";
import { Archive } from "lucide-react";

/**
 * Yellow banner displayed when the active project is archived (read-only).
 */
export function ArchivedBanner() {
  const { t } = useTranslation();
  return (
    <div className="rounded-lg border border-yellow-500/40 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-700 dark:text-yellow-400 flex items-center gap-2 mb-4">
      <Archive className="h-4 w-4 flex-shrink-0" />
      <span className="font-medium">{t("projects.archivedBanner")}</span>
    </div>
  );
}
