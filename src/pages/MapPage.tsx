import { useTranslation } from "react-i18next";
import { useProject } from "@/contexts/ProjectContext";
import { ProjectMap } from "@/components/map/ProjectMap";
import { NoProjectBanner } from "@/components/NoProjectBanner";
import { Map } from "lucide-react";

export default function MapPage() {
  const { t } = useTranslation();
  const { activeProject } = useProject();

  if (!activeProject) return <NoProjectBanner />;

  return (
    <div className="space-y-5 max-w-[1180px] mx-auto">
      <div className="flex items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Map className="h-4 w-4 text-muted-foreground" />
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
              {t("map.pageCategory", { defaultValue: "Georreferenciação" })}
            </p>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
            {t("map.pageTitle", { defaultValue: "Mapa da Obra" })}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {t("map.pageSubtitle", { defaultValue: "Localização geográfica dos work items, NCs, PPIs e ensaios" })}
          </p>
        </div>
      </div>

      <ProjectMap height={600} showControls />
    </div>
  );
}
