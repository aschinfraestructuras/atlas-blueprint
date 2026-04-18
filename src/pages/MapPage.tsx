import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useProject } from "@/contexts/ProjectContext";
import { ProjectMap, type ProjectMapHandle, type MapPoint } from "@/components/map/ProjectMap";
import { MapPointsTable } from "@/components/map/MapPointsTable";
import { NoProjectBanner } from "@/components/NoProjectBanner";
import { Map, ListFilter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function MapPage() {
  const { t } = useTranslation();
  const { activeProject } = useProject();
  const mapRef = useRef<ProjectMapHandle>(null);
  const [points, setPoints] = useState<MapPoint[]>([]);
  const [activeFilters, setActiveFilters] = useState<Set<MapPoint["entity_type"]>>(
    new Set(["work_item", "non_conformity", "ppi", "test_result"])
  );
  const [showTable, setShowTable] = useState(true);

  if (!activeProject) return <NoProjectBanner />;

  const handleFocusPoint = (p: MapPoint) => {
    mapRef.current?.focusPoint(p);
  };

  return (
    <div className="space-y-5 max-w-[1400px] mx-auto">
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
        <Button
          variant={showTable ? "default" : "outline"}
          size="sm"
          onClick={() => setShowTable((v) => !v)}
          className="gap-2"
        >
          <ListFilter className="h-3.5 w-3.5" />
          {showTable
            ? t("map.hideTable", { defaultValue: "Ocultar lista" })
            : t("map.showTable", { defaultValue: "Mostrar lista" })}
        </Button>
      </div>

      <div className={cn("grid gap-4", showTable ? "lg:grid-cols-[1fr_360px]" : "grid-cols-1")}>
        <ProjectMap
          ref={mapRef}
          height={showTable ? 640 : 720}
          showControls
          onPointsLoaded={setPoints}
          onActiveFiltersChange={setActiveFilters}
        />
        {showTable && (
          <div className="border border-border/60 rounded-lg overflow-hidden" style={{ height: 640 }}>
            <MapPointsTable
              points={points}
              activeFilters={activeFilters}
              onFocusPoint={handleFocusPoint}
            />
          </div>
        )}
      </div>
    </div>
  );
}
