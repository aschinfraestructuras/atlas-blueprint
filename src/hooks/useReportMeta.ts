import { useTranslation } from "react-i18next";
import { useProject } from "@/contexts/ProjectContext";
import { useAuth } from "@/contexts/AuthContext";
import { useProjectLogo } from "@/hooks/useProjectLogo";
import type { ReportMeta } from "@/lib/services/reportService";

/**
 * Returns a ready-to-use ReportMeta object for all PDF/CSV exports,
 * including the project logo URL resolved from storage.
 */
export function useReportMeta(): ReportMeta | null {
  const { activeProject } = useProject();
  const { user } = useAuth();
  const { i18n } = useTranslation();
  const { logoUrl } = useProjectLogo();

  if (!activeProject) return null;

  return {
    projectName: activeProject.name,
    projectCode: activeProject.code,
    locale: i18n.language?.startsWith("es") ? "es" : "pt",
    generatedBy: user?.email ?? undefined,
    logoUrl,
  };
}
