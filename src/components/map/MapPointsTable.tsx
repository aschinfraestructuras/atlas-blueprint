import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Search, Crosshair, Calendar, MapPin } from "lucide-react";
import type { MapPoint } from "./ProjectMap";

const TYPE_LABEL: Record<MapPoint["entity_type"], string> = {
  work_item: "WI",
  non_conformity: "NC",
  ppi: "PPI",
  test_result: "ENS",
};

const TYPE_COLOR: Record<MapPoint["entity_type"], string> = {
  work_item: "#185FA5",
  non_conformity: "#E24B4A",
  ppi: "#1D9E75",
  test_result: "#BA7517",
};

const TYPE_ROUTE: Record<MapPoint["entity_type"], (id: string) => string> = {
  work_item: (id) => `/work-items/${id}`,
  non_conformity: (id) => `/non-conformities/${id}`,
  ppi: (id) => `/ppi/${id}`,
  test_result: () => `/tests`,
};

interface Props {
  points: MapPoint[];
  activeFilters: Set<MapPoint["entity_type"]>;
  onFocusPoint?: (point: MapPoint) => void;
  className?: string;
}

export function MapPointsTable({ points, activeFilters, onFocusPoint, className }: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [pkMin, setPkMin] = useState("");
  const [pkMax, setPkMax] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const min = pkMin ? parseFloat(pkMin) : null;
    const max = pkMax ? parseFloat(pkMax) : null;
    return points
      .filter((p) => activeFilters.has(p.entity_type))
      .filter((p) => {
        if (!q) return true;
        return (
          p.title?.toLowerCase().includes(q) ||
          p.subtitle?.toLowerCase().includes(q) ||
          p.disciplina?.toLowerCase().includes(q) ||
          p.pk?.toLowerCase().includes(q)
        );
      })
      .filter((p) => {
        if (min == null && max == null) return true;
        const pkNum = p.pk ? parseFloat(p.pk) : null;
        if (pkNum == null || isNaN(pkNum)) return false;
        if (min != null && pkNum < min) return false;
        if (max != null && pkNum > max) return false;
        return true;
      });
  }, [points, activeFilters, search, pkMin, pkMax]);

  const exportCsv = () => {
    const header = ["Tipo", "Título", "Subtítulo", "PK", "Disciplina", "Estado", "Latitude", "Longitude"];
    const rows = filtered.map((p) => [
      TYPE_LABEL[p.entity_type],
      p.title ?? "",
      p.subtitle ?? "",
      p.pk ?? "",
      p.disciplina ?? "",
      p.status ?? "",
      String(p.latitude),
      String(p.longitude),
    ]);
    const csv = [header, ...rows]
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mapa-pontos-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className={cn("flex flex-col h-full bg-card", className)}>
      {/* Filtros */}
      <div className="p-3 border-b border-border/40 space-y-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("map.table.searchPlaceholder", { defaultValue: "Pesquisar por título, PK, disciplina…" })}
            className="h-8 pl-8 text-xs"
          />
        </div>
        <div className="flex gap-2">
          <Input
            type="number"
            value={pkMin}
            onChange={(e) => setPkMin(e.target.value)}
            placeholder={t("map.table.pkMin", { defaultValue: "PK mín" })}
            className="h-8 text-xs"
          />
          <Input
            type="number"
            value={pkMax}
            onChange={(e) => setPkMax(e.target.value)}
            placeholder={t("map.table.pkMax", { defaultValue: "PK máx" })}
            className="h-8 text-xs"
          />
          <Button variant="outline" size="sm" className="h-8 text-xs px-2.5" onClick={exportCsv} disabled={filtered.length === 0}>
            CSV
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground">
          {t("map.table.count", {
            defaultValue: "{{shown}} de {{total}} pontos",
            shown: filtered.length,
            total: points.length,
          })}
        </p>
      </div>

      {/* Lista */}
      <ScrollArea className="flex-1">
        {filtered.length === 0 ? (
          <div className="p-6 text-center text-xs text-muted-foreground">
            <MapPin className="h-6 w-6 mx-auto mb-2 opacity-40" />
            {t("map.table.empty", { defaultValue: "Nenhum ponto corresponde aos filtros." })}
          </div>
        ) : (
          <ul className="divide-y divide-border/30">
            {filtered.map((p) => (
              <li
                key={`${p.entity_type}-${p.id}`}
                className="px-3 py-2.5 hover:bg-muted/30 transition-colors cursor-pointer group"
                onClick={() => onFocusPoint?.(p)}
              >
                <div className="flex items-start gap-2">
                  <span
                    className="mt-1 inline-flex items-center justify-center text-[9px] font-bold text-white rounded px-1.5 py-0.5 flex-shrink-0"
                    style={{ backgroundColor: TYPE_COLOR[p.entity_type] }}
                  >
                    {TYPE_LABEL[p.entity_type]}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate">{p.title || "—"}</p>
                    {p.subtitle && (
                      <p className="text-[10px] text-muted-foreground truncate">{p.subtitle}</p>
                    )}
                    <div className="flex flex-wrap gap-1 mt-1">
                      {p.pk && (
                        <Badge variant="outline" className="h-4 text-[9px] px-1.5 font-mono">PK {p.pk}</Badge>
                      )}
                      {p.disciplina && (
                        <Badge variant="secondary" className="h-4 text-[9px] px-1.5">{p.disciplina}</Badge>
                      )}
                      {p.status && (
                        <Badge variant="outline" className="h-4 text-[9px] px-1.5">{p.status}</Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      title={t("map.table.focus", { defaultValue: "Focar no mapa" })}
                      onClick={(e) => {
                        e.stopPropagation();
                        onFocusPoint?.(p);
                      }}
                    >
                      <Crosshair className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      title={t("map.table.open", { defaultValue: "Abrir detalhe" })}
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(TYPE_ROUTE[p.entity_type](p.id));
                      }}
                    >
                      <Calendar className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </ScrollArea>
    </div>
  );
}
