import { useTranslation } from "react-i18next";
import { useProject } from "@/contexts/ProjectContext";
import { Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export function NoProjectBanner() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4 max-w-md mx-auto">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
        <Building2 className="h-6 w-6 text-muted-foreground" />
      </div>
      <div className="space-y-1">
        <h3 className="text-base font-semibold text-foreground">
          {t("noProject.title")}
        </h3>
        <p className="text-sm text-muted-foreground">
          {t("noProject.subtitle")}
        </p>
      </div>
      <Button variant="outline" size="sm" onClick={() => navigate("/projects")}>
        {t("noProject.cta")}
      </Button>
    </div>
  );
}
