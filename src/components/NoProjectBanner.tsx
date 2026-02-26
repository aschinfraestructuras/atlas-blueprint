import { useTranslation } from "react-i18next";
import { useProject } from "@/contexts/ProjectContext";
import { Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export function NoProjectBanner() {
  const { t } = useTranslation();
  const { projects } = useProject();
  const navigate = useNavigate();
  const hasProjects = projects.length > 0;

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4 max-w-md mx-auto">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
        <Building2 className="h-6 w-6 text-muted-foreground" />
      </div>
      <div className="space-y-1">
        <h3 className="text-base font-semibold text-foreground">
          {hasProjects ? t("noProject.title") : t("settings.members.noProjectsEmpty")}
        </h3>
        <p className="text-sm text-muted-foreground">
          {hasProjects ? t("noProject.subtitle") : t("settings.members.noProjectsEmptySub")}
        </p>
      </div>
      <Button variant="outline" size="sm" onClick={() => navigate(hasProjects ? "/projects" : "/settings")}>
        {hasProjects ? t("noProject.cta") : t("settings.members.requestAccess")}
      </Button>
    </div>
  );
}
