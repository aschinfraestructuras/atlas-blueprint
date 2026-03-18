import { useState, useMemo, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useProject } from "@/contexts/ProjectContext";
import { actionPlanService, type ActionPlanItem, type ActionOrigin, type ActionStatus } from "@/lib/services/actionPlanService";
import { NoProjectBanner } from "@/components/NoProjectBanner";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/ui/page-header";
import { FilterBar } from "@/components/ui/filter-bar";
import { ModuleKPICard } from "@/components/ModuleKPICard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  ClipboardList, Search, X, ExternalLink, AlertTriangle, Clock,
  CheckCircle2, ListTodo, Shield, FileText, Users,
} from "lucide-react";

const ORIGIN_ICONS: Record<ActionOrigin, React.ElementType> = {
  nc: AlertTriangle,
  meeting: Users,
  audit: Shield,
  ppi: ClipboardList,
};

const ORIGIN_COLORS: Record<ActionOrigin, string> = {
  nc: "bg-destructive/10 text-destructive",
  meeting: "bg-primary/10 text-primary",
  audit: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  ppi: "bg-accent text-accent-foreground",
};

const STATUS_STYLES: Record<ActionStatus, string> = {
  overdue: "bg-destructive/10 text-destructive",
  open: "bg-primary/10 text-primary",
  in_progress: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  closed: "bg-muted text-muted-foreground",
};

const STATUS_DOTS: Record<ActionStatus, string> = {
  overdue: "hsl(var(--destructive))",
  open: "hsl(var(--primary))",
  in_progress: "hsl(38 85% 44%)",
  closed: "hsl(158 45% 36%)",
};

const TYPE_LABELS: Record<string, string> = {
  corrective: "Ação Corretiva",
  preventive: "Ação Preventiva",
  correction: "Correção",
  action: "Ação",
};

export default function ActionPlanPage() {
  const { t } = useTranslation();
  const { activeProject } = useProject();
  const navigate = useNavigate();

  const [data, setData] = useState<ActionPlanItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [filterOrigin, setFilterOrigin] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterType, setFilterType] = useState("all");

  const fetch = useCallback(async () => {
    if (!activeProject) return;
    setLoading(true);
    try {
      const result = await actionPlanService.getByProject(activeProject.id);
      setData(result);
    } catch {
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [activeProject]);

  useEffect(() => { fetch(); }, [fetch]);

  const filtered = useMemo(() => {
    return data.filter(item => {
      const q = search.toLowerCase();
      const matchSearch = !q || item.description.toLowerCase().includes(q) || item.originCode.toLowerCase().includes(q) || (item.responsible ?? "").toLowerCase().includes(q);
      const matchOrigin = filterOrigin === "all" || item.origin === filterOrigin;
      const matchStatus = filterStatus === "all" || item.status === filterStatus;
      const matchType = filterType === "all" || item.type === filterType;
      return matchSearch && matchOrigin && matchStatus && matchType;
    });
  }, [data, search, filterOrigin, filterStatus, filterType]);

  const hasFilters = search || filterOrigin !== "all" || filterStatus !== "all" || filterType !== "all";
  const clearFilters = () => { setSearch(""); setFilterOrigin("all"); setFilterStatus("all"); setFilterType("all"); };

  // KPIs
  const kpis = useMemo(() => {
    const open = data.filter(i => i.status === "open" || i.status === "in_progress").length;
    const overdue = data.filter(i => i.status === "overdue").length;
    const closed = data.filter(i => i.status === "closed").length;
    const fromNc = data.filter(i => i.origin === "nc").length;
    return { total: data.length, open, overdue, closed, fromNc };
  }, [data]);

  if (!activeProject) return <NoProjectBanner />;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <PageHeader
        module={t("actionPlan.module", { defaultValue: "Qualidade" })}
        title={t("actionPlan.title", { defaultValue: "Plano de Ações" })}
        subtitle={t("actionPlan.subtitle", { defaultValue: "Vista consolidada de todas as ações corretivas e preventivas" })}
        icon={ClipboardList}
        iconColor="hsl(var(--primary))"
      />

      {/* KPIs */}
      {!loading && data.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
          <ModuleKPICard label={t("actionPlan.kpi.total", { defaultValue: "Total" })} value={kpis.total} icon={ListTodo} />
          <ModuleKPICard label={t("actionPlan.kpi.open", { defaultValue: "Em Aberto" })} value={kpis.open} icon={Clock} color="hsl(var(--primary))" />
          <ModuleKPICard label={t("actionPlan.kpi.overdue", { defaultValue: "Em Atraso" })} value={kpis.overdue} icon={AlertTriangle} color={kpis.overdue > 0 ? "hsl(var(--destructive))" : undefined} />
          <ModuleKPICard label={t("actionPlan.kpi.closed", { defaultValue: "Fechadas" })} value={kpis.closed} icon={CheckCircle2} color="hsl(158 45% 36%)" />
          <ModuleKPICard label={t("actionPlan.kpi.fromNc", { defaultValue: "Origem NC" })} value={kpis.fromNc} icon={AlertTriangle} />
        </div>
      )}

      {/* Filters */}
      <FilterBar>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input placeholder={t("common.search")} value={search} onChange={e => setSearch(e.target.value)} className="h-8 w-52 pl-8 text-sm bg-background" />
        </div>

        <Select value={filterOrigin} onValueChange={setFilterOrigin}>
          <SelectTrigger className="h-8 w-40 text-sm bg-background"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("actionPlan.filter.allOrigins", { defaultValue: "Todas as origens" })}</SelectItem>
            <SelectItem value="nc">{t("actionPlan.origin.nc", { defaultValue: "Não Conformidade" })}</SelectItem>
            <SelectItem value="meeting">{t("actionPlan.origin.meeting", { defaultValue: "Reunião (ATA)" })}</SelectItem>
            <SelectItem value="audit">{t("actionPlan.origin.audit", { defaultValue: "Auditoria" })}</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="h-8 w-36 text-sm bg-background"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("actionPlan.filter.allStatuses", { defaultValue: "Todos os estados" })}</SelectItem>
            <SelectItem value="open">{t("actionPlan.status.open", { defaultValue: "Em Aberto" })}</SelectItem>
            <SelectItem value="in_progress">{t("actionPlan.status.inProgress", { defaultValue: "Em Curso" })}</SelectItem>
            <SelectItem value="overdue">{t("actionPlan.status.overdue", { defaultValue: "Em Atraso" })}</SelectItem>
            <SelectItem value="closed">{t("actionPlan.status.closed", { defaultValue: "Fechada" })}</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="h-8 w-40 text-sm bg-background"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("actionPlan.filter.allTypes", { defaultValue: "Todos os tipos" })}</SelectItem>
            <SelectItem value="corrective">{t("actionPlan.type.corrective", { defaultValue: "Ação Corretiva" })}</SelectItem>
            <SelectItem value="preventive">{t("actionPlan.type.preventive", { defaultValue: "Ação Preventiva" })}</SelectItem>
            <SelectItem value="correction">{t("actionPlan.type.correction", { defaultValue: "Correção" })}</SelectItem>
            <SelectItem value="action">{t("actionPlan.type.action", { defaultValue: "Ação" })}</SelectItem>
          </SelectContent>
        </Select>

        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 gap-1 text-xs text-muted-foreground">
            <X className="h-3.5 w-3.5" />{t("nc.filters.clear")}
          </Button>
        )}
      </FilterBar>

      {/* Table */}
      {loading ? (
        <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={ClipboardList} subtitleKey="actionPlan.empty" />
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground w-28">{t("actionPlan.col.origin", { defaultValue: "Origem" })}</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground w-28">{t("actionPlan.col.type", { defaultValue: "Tipo" })}</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("common.description")}</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground w-32">{t("actionPlan.col.responsible", { defaultValue: "Responsável" })}</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground w-28">{t("actionPlan.col.dueDate", { defaultValue: "Prazo" })}</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground w-28">{t("common.status")}</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(item => {
                const OriginIcon = ORIGIN_ICONS[item.origin] ?? FileText;
                return (
                  <TableRow key={item.id} className="hover:bg-muted/20 transition-colors">
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <Badge variant="outline" className={cn("text-[10px] gap-1 font-mono", ORIGIN_COLORS[item.origin])}>
                          <OriginIcon className="h-3 w-3" />
                          {item.originCode}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-[10px]">
                        {t(`actionPlan.type.${item.type}`, { defaultValue: TYPE_LABELS[item.type] ?? item.type })}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm max-w-[400px]">
                      <span className="line-clamp-2">{item.description}</span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{item.responsible ?? "—"}</TableCell>
                    <TableCell className="text-sm font-mono tabular-nums">
                      {item.dueDate ? new Date(item.dueDate).toLocaleDateString("pt-PT") : "—"}
                    </TableCell>
                    <TableCell>
                      <span className={cn(
                        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
                        STATUS_STYLES[item.status]
                      )}>
                        <span className="h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ background: STATUS_DOTS[item.status] }} />
                        {t(`actionPlan.status.${item.status}`, { defaultValue: item.status })}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => navigate(item.linkedEntityUrl)}>
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
