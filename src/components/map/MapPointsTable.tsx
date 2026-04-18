import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  Search, Crosshair, ExternalLink, MapPin, Filter,
  AlertTriangle, ClipboardCheck, FlaskConical, Construction, X,
} from "lucide-react";
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

const TYPE_ICON: Record<MapPoint["entity_type"], React.ElementType> = {
  work_item: Construction,
  non_conformity: AlertTriangle,
  ppi: ClipboardCheck,
  test_result: FlaskConical,
};

const TYPE_ROUTE: Record<MapPoint["entity_type"], (id: string) => string> = {
  work_item: (id) => `/work-items/${id}`,
  non_conformity: (id) => `/non-conformities/${id}`,
  ppi: (id) => `/ppi/${id}`,
  test_result: () => `/tests`,
};

function severityVariant(severity: string | null) {
  if (!severity) return "outline" as const;
  const s = severity.toLowerCase();
  if (s === "critical" || s === "major") return "destructive" as const;
  return "secondary" as const;
}

function statusTone(type: MapPoint["entity_type"], status: string | null): string {
  if (!status) return "bg-muted/40 text-muted-foreground border-border/40";
  const s = status.toLowerCase();
  if (type === "non_conformity") {
    if (s === "closed") return "bg-emerald-500/10 text-emerald-700 border-emerald-500/30 dark:text-emerald-400";
    if (s === "open" || s === "in_progress") return "bg-destructive/10 text-destructive border-destructive/30";
    return "bg-amber-500/10 text-amber-700 border-amber-500/30 dark:text-amber-400";
  }
  if (type === "ppi") {
    if (s === "approved" || s === "closed") return "bg-emerald-500/10 text-emerald-700 border-emerald-500/30 dark:text-emerald-400";
    if (s === "rejected") return "bg-destructive/10 text-destructive border-destructive/30";
    if (s === "in_progress" || s === "submitted") return "bg-primary/10 text-primary border-primary/30";
    return "bg-muted/40 text-muted-foreground border-border/40";
  }
  if (type === "test_result") {
    if (s === "pass" || s === "approved") return "bg-emerald-500/10 text-emerald-700 border-emerald-500/30 dark:text-emerald-400";
    if (s === "fail" || s === "rejected") return "bg-destructive/10 text-destructive border-destructive/30";
  }
  return "bg-muted/40 text-muted-foreground border-border/40";
}

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
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [disciplineFilter, setDisciplineFilter] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);

  // Derive filter option lists from data
  const { allDisciplines, allStatuses, allSeverities } = useMemo(() => {
    const disc = new Set<string>();
    const sts = new Set<string>();
    const sev = new Set<string>();
    points.forEach((p) => {
      if (p.disciplina) disc.add(p.disciplina);
      if (p.status) sts.add(p.status);
      if (p.severity) sev.add(p.severity);
    });
    return {
      allDisciplines: Array.from(disc).sort(),
      allStatuses: Array.from(sts).sort(),
      allSeverities: Array.from(sev).sort(),
    };
  }, [points]);

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
      })
      .filter((p) => statusFilter === "all" || p.status === statusFilter)
      .filter((p) => severityFilter === "all" || p.severity === severityFilter)
      .filter((p) => disciplineFilter === "all" || p.disciplina === disciplineFilter);
  }, [points, activeFilters, search, pkMin, pkMax, statusFilter, severityFilter, disciplineFilter]);

  const exportCsv = () => {
    const header = ["Tipo", "Título", "Subtítulo", "PK", "Disciplina", "Estado", "Severidade", "Latitude", "Longitude"];
    const rows = filtered.map((p) => [
      TYPE_LABEL[p.entity_type],
      p.title ?? "",
      p.subtitle ?? "",
      p.pk ?? "",
      p.disciplina ?? "",
      p.status ?? "",
      p.severity ?? "",
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

  const clearFilters = () => {
    setSearch(""); setPkMin(""); setPkMax("");
    setStatusFilter("all"); setSeverityFilter("all"); setDisciplineFilter("all");
  };

  const activeFilterCount =
    (search ? 1 : 0) + (pkMin ? 1 : 0) + (pkMax ? 1 : 0) +
    (statusFilter !== "all" ? 1 : 0) + (severityFilter !== "all" ? 1 : 0) +
    (disciplineFilter !== "all" ? 1 : 0);

  return (
    <div className={cn("flex flex-col h-full bg-card", className)}>
      {/* Search + filter toggle */}
      <div className="p-3 border-b border-border/40 space-y-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("map.table.searchPlaceholder", { defaultValue: "Pesquisar título, PK, disciplina…" })}
            className="h-8 pl-8 pr-8 text-xs"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="clear"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={showFilters || activeFilterCount > 0 ? "default" : "outline"}
            size="sm"
            className="h-7 text-[10px] px-2 gap-1.5"
            onClick={() => setShowFilters((v) => !v)}
          >
            <Filter className="h-3 w-3" />
            {t("map.table.filters", { defaultValue: "Filtros" })}
            {activeFilterCount > 0 && (
              <span className="rounded-full bg-background/30 px-1.5 py-0 text-[9px] font-bold">{activeFilterCount}</span>
            )}
          </Button>
          {activeFilterCount > 0 && (
            <Button variant="ghost" size="sm" className="h-7 text-[10px] px-2 text-muted-foreground" onClick={clearFilters}>
              {t("map.table.clear", { defaultValue: "Limpar" })}
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-[10px] px-2.5 ml-auto"
            onClick={exportCsv}
            disabled={filtered.length === 0}
          >
            CSV
          </Button>
        </div>

        {showFilters && (
          <div className="space-y-2 pt-1 animate-fade-in">
            <div className="flex gap-2">
              <Input
                type="number"
                value={pkMin}
                onChange={(e) => setPkMin(e.target.value)}
                placeholder={t("map.table.pkMin", { defaultValue: "PK mín" })}
                className="h-7 text-xs"
              />
              <Input
                type="number"
                value={pkMax}
                onChange={(e) => setPkMax(e.target.value)}
                placeholder={t("map.table.pkMax", { defaultValue: "PK máx" })}
                className="h-7 text-xs"
              />
            </div>
            {allStatuses.length > 0 && (
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-7 text-[11px]">
                  <SelectValue placeholder={t("map.table.status", { defaultValue: "Estado" })} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">{t("map.table.allStatuses", { defaultValue: "Todos os estados" })}</SelectItem>
                  {allStatuses.map((s) => (<SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>))}
                </SelectContent>
              </Select>
            )}
            {allSeverities.length > 0 && (
              <Select value={severityFilter} onValueChange={setSeverityFilter}>
                <SelectTrigger className="h-7 text-[11px]">
                  <SelectValue placeholder={t("map.table.severity", { defaultValue: "Severidade" })} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">{t("map.table.allSeverities", { defaultValue: "Todas as severidades" })}</SelectItem>
                  {allSeverities.map((s) => (<SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>))}
                </SelectContent>
              </Select>
            )}
            {allDisciplines.length > 0 && (
              <Select value={disciplineFilter} onValueChange={setDisciplineFilter}>
                <SelectTrigger className="h-7 text-[11px]">
                  <SelectValue placeholder={t("map.table.discipline", { defaultValue: "Disciplina" })} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">{t("map.table.allDisciplines", { defaultValue: "Todas as disciplinas" })}</SelectItem>
                  {allDisciplines.map((d) => (<SelectItem key={d} value={d} className="text-xs">{d}</SelectItem>))}
                </SelectContent>
              </Select>
            )}
          </div>
        )}

        <p className="text-[10px] text-muted-foreground">
          {t("map.table.count", {
            defaultValue: "{{shown}} de {{total}} pontos",
            shown: filtered.length,
            total: points.length,
          })}
        </p>
      </div>

      {/* Rich card list */}
      <ScrollArea className="flex-1">
        {filtered.length === 0 ? (
          <div className="p-6 text-center text-xs text-muted-foreground">
            <MapPin className="h-6 w-6 mx-auto mb-2 opacity-40" />
            {t("map.table.empty", { defaultValue: "Nenhum ponto corresponde aos filtros." })}
          </div>
        ) : (
          <ul className="divide-y divide-border/30">
            {filtered.map((p) => {
              const Icon = TYPE_ICON[p.entity_type];
              const color = TYPE_COLOR[p.entity_type];
              return (
                <li
                  key={`${p.entity_type}-${p.id}`}
                  className="px-3 py-2.5 hover:bg-muted/40 transition-colors cursor-pointer group relative"
                  onClick={() => onFocusPoint?.(p)}
                  style={{ borderLeftWidth: 3, borderLeftStyle: "solid", borderLeftColor: color }}
                >
                  <div className="flex items-start gap-2.5">
                    <div
                      className="mt-0.5 flex-shrink-0 h-7 w-7 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: `${color}18` }}
                    >
                      <Icon className="h-3.5 w-3.5" style={{ color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span
                          className="inline-flex items-center text-[8.5px] font-bold rounded px-1 py-0 tabular-nums tracking-wider"
                          style={{ backgroundColor: `${color}18`, color }}
                        >
                          {TYPE_LABEL[p.entity_type]}
                        </span>
                        {p.pk && (
                          <Badge variant="outline" className="h-4 text-[9px] px-1.5 font-mono">PK {p.pk}</Badge>
                        )}
                      </div>
                      <p className="text-xs font-semibold text-foreground truncate leading-tight">{p.title || "—"}</p>
                      {p.subtitle && (
                        <p className="text-[10px] text-muted-foreground truncate mt-0.5">{p.subtitle}</p>
                      )}
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {p.status && (
                          <span className={cn("inline-flex items-center text-[9px] px-1.5 py-0 rounded border font-medium", statusTone(p.entity_type, p.status))}>
                            {p.status}
                          </span>
                        )}
                        {p.severity && (
                          <Badge variant={severityVariant(p.severity)} className="h-4 text-[9px] px-1.5">
                            {p.severity}
                          </Badge>
                        )}
                        {p.disciplina && (
                          <Badge variant="secondary" className="h-4 text-[9px] px-1.5">{p.disciplina}</Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        title={t("map.table.focus", { defaultValue: "Focar no mapa" })}
                        onClick={(e) => { e.stopPropagation(); onFocusPoint?.(p); }}
                      >
                        <Crosshair className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        title={t("map.table.open", { defaultValue: "Abrir detalhe" })}
                        onClick={(e) => { e.stopPropagation(); navigate(TYPE_ROUTE[p.entity_type](p.id)); }}
                      >
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </ScrollArea>
    </div>
  );
}
