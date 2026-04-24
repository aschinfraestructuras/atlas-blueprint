import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useProject } from "@/contexts/ProjectContext";
import { useAuth } from "@/contexts/AuthContext";
import { useReportMeta } from "@/hooks/useReportMeta";
import { useProjectLogo } from "@/hooks/useProjectLogo";
import { usePlanning } from "@/hooks/usePlanning";
import { useProjectRole } from "@/hooks/useProjectRole";
import { planningService } from "@/lib/services/planningService";
import { auditService } from "@/lib/services/auditService";
import { ReportExportMenu } from "@/components/reports/ReportExportMenu";
import { exportWbsCsv, exportWbsPdf, exportActivitiesCsv, exportActivitiesPdf } from "@/lib/services/planningExportService";
import { RoleGate } from "@/components/RoleGate";
import {
  Plus, Pencil, Network, ListChecks, ShieldCheck, Trash2, Search, Eye,
  ChevronRight, ChevronDown, FolderPlus, ChevronsUpDown,
  CheckCircle2, Clock, Ban, PieChart as PieChartIcon, Filter, X,
  Circle, AlertTriangle, PlayCircle, MinusCircle} from "lucide-react";
import { StackedBar } from "@/components/dashboard/DistributionBar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { FilterBar } from "@/components/ui/filter-bar";
import { EmptyState } from "@/components/EmptyState";
import { NoProjectBanner } from "@/components/NoProjectBanner";
import { WbsFormDialog } from "@/components/planning/WbsFormDialog";
import { ActivityFormDialog } from "@/components/planning/ActivityFormDialog";
import { CompletionCheckDialog } from "@/components/planning/CompletionCheckDialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { WbsNode, Activity } from "@/lib/services/planningService";
import { seedWbsPF17A } from "@/lib/services/wbsSeedService";
import { compareWbsCodes } from "@/lib/utils/wbsSort";

const STATUS_COLORS: Record<string, string> = {
  planned: "bg-muted text-muted-foreground",
  in_progress: "bg-primary/10 text-primary",
  blocked: "bg-destructive/10 text-destructive",
  completed: "bg-primary/20 text-primary",
  cancelled: "bg-muted text-muted-foreground line-through",
};

const ACTIVITY_STATUSES = ["planned", "in_progress", "blocked", "completed", "cancelled"];

// ── Semáforo de Prontidão ─────────────────────────────────────────────────────
type ReadinessState = "complete" | "running" | "ready" | "needs_check" | "blocked" | "cancelled";

function getReadinessState(a: Activity): ReadinessState {
  if (a.status === "completed")  return "complete";
  if (a.status === "cancelled")  return "cancelled";
  if (a.status === "blocked")    return "blocked";
  if (a.status === "in_progress") return "running";
  // planned
  const hasReqs = a.requires_ppi || a.requires_tests || a.requires_topography;
  return hasReqs ? "needs_check" : "ready";
}

const READINESS_CONFIG: Record<ReadinessState, {
  label: string; icon: React.ElementType;
  dot: string; badge: string; text: string;
}> = {
  complete:    { label: "complete",    icon: CheckCircle2,  dot: "bg-emerald-500", badge: "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800", text: "text-emerald-700 dark:text-emerald-300" },
  running:     { label: "running",     icon: PlayCircle,    dot: "bg-primary",     badge: "bg-primary/8 border-primary/20",  text: "text-primary" },
  ready:       { label: "ready",       icon: Circle,        dot: "bg-sky-500",     badge: "bg-sky-50 border-sky-200 dark:bg-sky-950/40 dark:border-sky-800", text: "text-sky-700 dark:text-sky-300" },
  needs_check: { label: "needs_check", icon: AlertTriangle, dot: "bg-amber-500",   badge: "bg-amber-50 border-amber-200 dark:bg-amber-950/40 dark:border-amber-800", text: "text-amber-700 dark:text-amber-300" },
  blocked:     { label: "blocked",     icon: Ban,           dot: "bg-destructive", badge: "bg-destructive/8 border-destructive/20", text: "text-destructive" },
  cancelled:   { label: "cancelled",   icon: MinusCircle,   dot: "bg-muted-foreground", badge: "bg-muted border-border", text: "text-muted-foreground" },
};

function ReadinessBadge({ activity }: { activity: Activity }) {
  const { t } = useTranslation();
  const state = getReadinessState(activity);
  const cfg = READINESS_CONFIG[state];
  const Icon = cfg.icon;
  const label = t(`planning.readiness.${
    state === "needs_check" ? "needsCheck" :
    state === "running" ? "running" :
    state === "ready" ? "ready" :
    state === "blocked" ? "blocked" :
    state === "complete" ? "complete" : "cancelled"
  }`, { defaultValue: state });
  return (
    <span className={cn(
      "inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-semibold whitespace-nowrap",
      cfg.badge, cfg.text
    )}>
      <Icon className="h-2.5 w-2.5" />
      {label}
    </span>
  );
}

function DeleteButton({ onConfirm }: { onConfirm: () => void }) {
  const { t } = useTranslation();
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("common.deleteConfirmTitle", { defaultValue: "Confirmar eliminação" })}</AlertDialogTitle>
          <AlertDialogDescription>{t("common.deleteConfirmDesc", { defaultValue: "Este registo será eliminado permanentemente. Tem a certeza?" })}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">{t("common.delete")}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default function PlanningPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { activeProject } = useProject();
  const { user } = useAuth();
  const { wbs, activities, loading, error, refetch } = usePlanning();


  const { isAdmin } = useProjectRole();
  const reportMeta = useReportMeta();
  const { logoBase64 } = useProjectLogo();
  const [activeTab, setActiveTab] = useState("activities");

  const [wbsDialogOpen, setWbsDialogOpen] = useState(false);
  const [editWbs, setEditWbs] = useState<WbsNode | null>(null);
  const [parentWbs, setParentWbs] = useState<string | null>(null);
  const [actDialogOpen, setActDialogOpen] = useState(false);
  const [editAct, setEditAct] = useState<Activity | null>(null);
  const [checkDialog, setCheckDialog] = useState<{ open: boolean; id: string; desc: string }>({ open: false, id: "", desc: "" });
  const [expandedWbs, setExpandedWbs] = useState<Set<string>>(new Set());
  const [selectedWbsId, setSelectedWbsId] = useState<string | null>(null);
  const [drawerWbsId, setDrawerWbsId] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("__all__");

  // KPIs
  const kpis = useMemo(() => {
    const totalWbs = wbs.length;
    const totalAct = activities.length;
    const inProgress = activities.filter(a => a.status === "in_progress").length;
    const completed = activities.filter(a => a.status === "completed").length;
    const blocked = activities.filter(a => a.status === "blocked").length;
    const avgProgress = totalAct > 0 ? Math.round(activities.reduce((s, a) => s + a.progress_pct, 0) / totalAct) : 0;
    const ready      = activities.filter(a => getReadinessState(a) === "ready").length;
    const needsCheck = activities.filter(a => getReadinessState(a) === "needs_check").length;
    return { totalWbs, totalAct, inProgress, completed, blocked, avgProgress, ready, needsCheck };
  }, [wbs, activities]);

  // Helper: get all descendant IDs of a WBS node (including itself)
  const getWbsDescendantIds = (wbsId: string): Set<string> => {
    const ids = new Set<string>([wbsId]);
    const addChildren = (id: string) => {
      wbs.filter(w => w.parent_id === id).forEach(child => {
        ids.add(child.id);
        addChildren(child.id);
      });
    };
    addChildren(wbsId);
    return ids;
  };

  // Build WBS tree
  type TreeNode = WbsNode & { children: TreeNode[]; depth: number };
  const wbsTree = useMemo(() => {
    const map = new Map<string, TreeNode>();
    const roots: TreeNode[] = [];
    let filtered = wbs;
    if (search) {
      const q = search.toLowerCase();
      filtered = wbs.filter(w => w.wbs_code.toLowerCase().includes(q) || w.description.toLowerCase().includes(q) || (w.zone ?? "").toLowerCase().includes(q));
    }
    filtered.forEach(w => map.set(w.id, { ...w, children: [], depth: 0 }));
    if (search) return Array.from(map.values());
    map.forEach(node => {
      if (node.parent_id && map.has(node.parent_id)) {
        const parent = map.get(node.parent_id)!;
        node.depth = parent.depth + 1;
        parent.children.push(node);
      } else {
        roots.push(node);
      }
    });
    // Sort all children + roots numerically
    const sortNodes = (arr: TreeNode[]) => arr.sort((a, b) => compareWbsCodes(a.wbs_code, b.wbs_code));
    sortNodes(roots);
    map.forEach(node => sortNodes(node.children));
    const flat: TreeNode[] = [];
    const walk = (nodes: TreeNode[]) => {
      for (const n of nodes) {
        flat.push(n);
        if (expandedWbs.has(n.id)) walk(n.children);
      }
    };
    walk(roots);
    return flat;
  }, [wbs, search, expandedWbs]);

  const filteredActivities = useMemo(() => {
    let list = activities;
    if (selectedWbsId) {
      const ids = getWbsDescendantIds(selectedWbsId);
      list = list.filter(a => a.wbs_id != null && ids.has(a.wbs_id));
    }
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(a => a.description.toLowerCase().includes(q) || (a.zone ?? "").toLowerCase().includes(q) || (a.wbs_code ?? "").toLowerCase().includes(q));
    }
    if (filterStatus !== "__all__") list = list.filter(a => a.status === filterStatus);
    return list;
  }, [activities, search, filterStatus, selectedWbsId, wbs]);

  // Contador de actividades por WBS (incluindo filhos)
  const actCountByWbs = useMemo(() => {
    const direct = new Map<string, number>();
    activities.forEach(a => {
      if (a.wbs_id) direct.set(a.wbs_id, (direct.get(a.wbs_id) ?? 0) + 1);
    });
    // Propagar para os pais
    const total = new Map<string, number>();
    const calcTotal = (id: string): number => {
      if (total.has(id)) return total.get(id)!;
      const own = direct.get(id) ?? 0;
      const childSum = wbs.filter(w => w.parent_id === id).reduce((s, c) => s + calcTotal(c.id), 0);
      const t = own + childSum;
      total.set(id, t);
      return t;
    };
    wbs.forEach(w => calcTotal(w.id));
    return total;
  }, [activities, wbs]);
  const wbsById = useMemo(() => new Map(wbs.map(w => [w.id, w])), [wbs]);

  // Este useMemo TEM de estar antes do return condicional — Rules of Hooks
  const selectedWbsNode = useMemo(
    () => wbs.find(w => w.id === selectedWbsId),
    [wbs, selectedWbsId]
  );

  if (!activeProject) return <NoProjectBanner />;

  const meta = reportMeta ?? { projectName: activeProject.name, projectCode: activeProject.code, locale: i18n.language?.startsWith("es") ? "es" : "pt", generatedBy: user?.email ?? undefined };

  const handleNewWbs = (pId?: string) => { setEditWbs(null); setParentWbs(pId ?? null); setWbsDialogOpen(true); };
  const handleEditWbs = (n: WbsNode) => { setEditWbs(n); setParentWbs(null); setWbsDialogOpen(true); };
  const handleNewAct = () => { setEditAct(null); setActDialogOpen(true); };
  const handleEditAct = (a: Activity) => { setEditAct(a); setActDialogOpen(true); };

  const handleWbsSelect = (node: TreeNode) => {
    setSelectedWbsId(prev => prev === node.id ? null : node.id);
    setActiveTab("activities");
  };

  const toggleWbsExpand = (id: string) => {
    setExpandedWbs(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const expandAll = () => setExpandedWbs(new Set(wbs.map(w => w.id)));
  const collapseAll = () => setExpandedWbs(new Set());

  const hasChildren = (id: string) => wbs.some(w => w.parent_id === id);

  const handleDeleteWbs = async (id: string) => {
    try { await planningService.deleteWbs(id, activeProject.id); toast.success(t("common.deleted", { defaultValue: "Eliminado" })); refetch(); }
    catch { toast.error(t("common.deleteError", { defaultValue: "Erro ao eliminar" })); }
  };
  const handleDeleteActivity = async (id: string) => {
    try { await planningService.deleteActivity(id, activeProject.id); toast.success(t("common.deleted", { defaultValue: "Eliminado" })); refetch(); }
    catch { toast.error(t("common.deleteError", { defaultValue: "Erro ao eliminar" })); }
  };

  const handleExport = (type: "csv" | "pdf") => {
    if (activeTab === "wbs") {
      if (type === "csv") { exportWbsCsv(wbsTree as WbsNode[], meta); } else { exportWbsPdf(wbsTree as WbsNode[], meta, logoBase64); }
    } else {
      if (type === "csv") { exportActivitiesCsv(filteredActivities, meta); } else { exportActivitiesPdf(filteredActivities, meta, logoBase64); }
    }
    auditService.log({
      projectId: activeProject.id,
      entity: activeTab === "wbs" ? "planning_wbs" : "planning_activities",
      entityId: null as any,
      action: "EXPORT",
      module: "planning",
      description: `${activeTab === "wbs" ? "WBS" : "Activities"} exported as ${type.toUpperCase()}`,
    });
  };

  // Requirement indicators for activities
  const getRequirementBadges = (a: Activity) => {
    const badges: { label: string; color: string }[] = [];
    if (a.requires_topography) badges.push({ label: "Topo", color: "bg-accent text-accent-foreground" });
    if (a.requires_tests) badges.push({ label: t("planning.fields.reqTests", { defaultValue: "Ensaios" }), color: "bg-accent text-accent-foreground" });
    if (a.requires_ppi) badges.push({ label: "PPI", color: "bg-accent text-accent-foreground" });
    return badges;
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">{t("planning.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("planning.subtitle")}</p>
        </div>
        <ReportExportMenu options={[
          { label: "CSV", icon: "csv", action: () => handleExport("csv") },
          { label: "PDF", icon: "pdf", action: () => handleExport("pdf") },
        ]} />
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        <Card><CardContent className="pt-4 pb-3 text-center">
          <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1"><Network className="h-3.5 w-3.5" /><p className="text-xs">{t("planning.kpi.wbsNodes")}</p></div>
          <p className="text-2xl font-bold text-foreground">{kpis.totalWbs}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3 text-center">
          <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1"><ListChecks className="h-3.5 w-3.5" /><p className="text-xs">{t("planning.kpi.activities")}</p></div>
          <p className="text-2xl font-bold text-foreground">{kpis.totalAct}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3 text-center">
          <div className="flex items-center justify-center gap-1 text-primary mb-1"><Clock className="h-3.5 w-3.5" /><p className="text-xs">{t("planning.kpi.inProgress")}</p></div>
          <p className="text-2xl font-bold text-primary">{kpis.inProgress}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3 text-center">
          <div className="flex items-center justify-center gap-1 text-primary mb-1"><CheckCircle2 className="h-3.5 w-3.5" /><p className="text-xs">{t("planning.kpi.completed")}</p></div>
          <p className="text-2xl font-bold text-primary">{kpis.completed}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3 text-center">
          <div className="flex items-center justify-center gap-1 text-destructive mb-1"><Ban className="h-3.5 w-3.5" /><p className="text-xs">{t("planning.kpi.blocked")}</p></div>
          <p className="text-2xl font-bold text-destructive">{kpis.blocked}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3 text-center">
          <p className="text-xs text-muted-foreground mb-1">{t("planning.kpi.avgProgress")}</p>
          <div className="flex items-center gap-2 justify-center">
            <Progress value={kpis.avgProgress} className="h-2 w-12" />
            <span className="text-2xl font-bold text-foreground">{kpis.avgProgress}%</span>
          </div>
        </CardContent></Card>
        {/* Semáforo: Prontas */}
        <Card className="border-sky-200 dark:border-sky-800 bg-sky-50/50 dark:bg-sky-950/20">
          <CardContent className="pt-4 pb-3 text-center">
            <div className="flex items-center justify-center gap-1 text-sky-600 dark:text-sky-400 mb-1">
              <Circle className="h-3.5 w-3.5 fill-sky-500 text-sky-500" />
              <p className="text-xs">{t("planning.kpi.ready", { defaultValue: "Prontas" })}</p>
            </div>
            <p className="text-2xl font-bold text-sky-700 dark:text-sky-300">{kpis.ready}</p>
          </CardContent>
        </Card>
        {/* Semáforo: A Verificar */}
        <Card className={cn("border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20", kpis.needsCheck > 0 && "ring-1 ring-amber-300 dark:ring-amber-700")}>
          <CardContent className="pt-4 pb-3 text-center">
            <div className="flex items-center justify-center gap-1 text-amber-600 dark:text-amber-400 mb-1">
              <AlertTriangle className="h-3.5 w-3.5" />
              <p className="text-xs">{t("planning.kpi.needsCheck", { defaultValue: "A Verificar" })}</p>
            </div>
            <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">{kpis.needsCheck}</p>
          </CardContent>
        </Card>
      </div>

      {/* Activity Status Distribution */}
      {activities.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <StackedBar
            title={t("planning.kpi.activityStatus", { defaultValue: "Estado das Frentes de Trabalho" })}
            icon={PieChartIcon}
            segments={[
              { key: "planned", label: t("planning.status.planned"), value: activities.filter(a => a.status === "planned").length, color: "hsl(var(--muted-foreground))" },
              { key: "in_progress", label: t("planning.status.in_progress"), value: kpis.inProgress, color: "hsl(var(--primary))" },
              { key: "completed", label: t("planning.status.completed"), value: kpis.completed, color: "hsl(var(--chart-2))" },
              { key: "blocked", label: t("planning.status.blocked"), value: kpis.blocked, color: "hsl(var(--destructive))" },
              { key: "cancelled", label: t("planning.status.cancelled", { defaultValue: "Cancelada" }), value: activities.filter(a => a.status === "cancelled").length, color: "hsl(var(--chart-4))" },
            ]}
          />
        </div>
      )}

      {error && <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">{error}</div>}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="wbs" className="gap-1.5"><Network className="h-3.5 w-3.5" /> WBS</TabsTrigger>
          <TabsTrigger value="activities" className="gap-1.5"><ListChecks className="h-3.5 w-3.5" /> {t("planning.tabs.activities")}</TabsTrigger>
        </TabsList>

        <div className="mt-4">
          <FilterBar>
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder={t("planning.searchPlaceholder", { defaultValue: "Pesquisar código, descrição, zona…" })}
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-8 h-8 text-sm"
              />
            </div>
            {activeTab === "activities" && (
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[160px] h-8 text-sm">
                  <SelectValue placeholder={t("planning.filters.allStatuses", { defaultValue: "Todos os estados" })} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">{t("planning.filters.allStatuses", { defaultValue: "Todos os estados" })}</SelectItem>
                  {ACTIVITY_STATUSES.map(s => (
                    <SelectItem key={s} value={s}>{t(`planning.status.${s}`, { defaultValue: s })}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </FilterBar>
        </div>

        <TabsContent value="wbs" className="space-y-4">
          <div className="flex justify-between">
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={expandAll}>
                <ChevronsUpDown className="h-3 w-3" />{t("planning.wbs.expandAll")}
              </Button>
              <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={collapseAll}>
                {t("planning.wbs.collapseAll")}
              </Button>
            </div>
            <div className="flex gap-2">
              {isAdmin && wbs.length === 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs"
                  onClick={async () => {
                    try {
                      const count = await seedWbsPF17A(activeProject.id, user?.id ?? "");
                      toast.success(`WBS PF17A populada com ${count} nós`);
                      refetch();
                    } catch (err) {
                      toast.error(err instanceof Error ? err.message : "Erro ao popular WBS");
                    }
                  }}
                >
                  <Network className="h-3.5 w-3.5" /> Popular WBS PF17A
                </Button>
              )}
              <RoleGate action="create">
                <Button size="sm" className="gap-1.5" onClick={() => handleNewWbs()}><Plus className="h-3.5 w-3.5" /> {t("planning.wbs.add")}</Button>
              </RoleGate>
            </div>
          </div>
          {loading ? (
            <div className="rounded-xl border border-border overflow-hidden divide-y divide-border">
              {Array.from({ length: 4 }).map((_, i) => <div key={i} className="flex items-center gap-4 px-5 py-3"><Skeleton className="h-4 w-16" /><Skeleton className="h-4 w-1/3" /><Skeleton className="h-4 w-12" /></div>)}
            </div>
          ) : wbsTree.length === 0 ? (
            <EmptyState icon={Network} subtitleKey={wbs.length === 0 ? "emptyState.planning.wbs" : "emptyState.noResults"} />
          ) : (
            <>
            {selectedWbsNode && (
              <div className="flex items-center gap-2 px-1 py-2 mb-2 text-sm bg-primary/5 border border-primary/20 rounded-lg">
                <Filter className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                <span className="text-muted-foreground">{t("planning.wbs.filterBy", { defaultValue: "A filtrar por:" })}</span>
                <span className="font-mono text-primary font-semibold">{selectedWbsNode.wbs_code}</span>
                <span className="text-foreground truncate">{selectedWbsNode.description}</span>
                <Button variant="ghost" size="icon" className="h-5 w-5 ml-auto flex-shrink-0" onClick={() => setSelectedWbsId(null)} title={t("common.clear", { defaultValue: "Limpar" })}>
                  <X className="h-3 w-3" />
                </Button>
              </div>
            )}
            <div className="rounded-xl border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground w-8"></TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground w-24">{t("planning.activity.code", { defaultValue: "Código" })}</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("planning.wbs.code")}</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("common.description")}</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("planning.wbs.zone")}</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("planning.fields.plannedStart")}</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("planning.fields.plannedEnd")}</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("planning.wbs.responsible")}</TableHead>
                    <TableHead className="w-28">{t("common.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {wbsTree.map((n: any) => (
                    <TableRow key={n.id} className={cn("hover:bg-muted/20 transition-colors cursor-pointer", selectedWbsId === n.id && "bg-primary/8 border-l-2 border-primary")} onClick={() => handleWbsSelect(n)}>
                      <TableCell className="w-8 px-1">
                        {hasChildren(n.id) ? (
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); toggleWbsExpand(n.id); }}>
                            {expandedWbs.has(n.id) ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                          </Button>
                        ) : <span className="w-6 inline-block" />}
                      </TableCell>
                      <TableCell className="font-mono text-xs font-medium" style={{ paddingLeft: `${(n.depth || 0) * 20 + 4}px` }}>
                        <span className="flex items-center gap-2">
                          {n.wbs_code}
                          {(actCountByWbs.get(n.id) ?? 0) > 0 && (
                            <span className="rounded-full bg-primary/15 text-primary text-[10px] font-semibold px-1.5 py-0.5">
                              {actCountByWbs.get(n.id)}
                            </span>
                          )}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-foreground">{n.description}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{n.zone || "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{n.planned_start || "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{n.planned_end || "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{n.responsible || "—"}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); setDrawerWbsId(n.id); }} title={t("planning.wbs.viewDetail", { defaultValue: "Ver detalhe do WBS" })}>
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); handleWbsSelect(n); }} title={t("planning.wbs.filterActivities", { defaultValue: "Filtrar frentes deste WBS" })}>
                            <ListChecks className="h-3.5 w-3.5" />
                          </Button>
                          <RoleGate action="create">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); handleNewWbs(n.id); }} title={t("planning.wbs.addChild")}>
                              <FolderPlus className="h-3.5 w-3.5" />
                            </Button>
                          </RoleGate>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); handleEditWbs(n); }}><Pencil className="h-3.5 w-3.5" /></Button>
                          {isAdmin && <span onClick={(e) => e.stopPropagation()}><DeleteButton onConfirm={() => handleDeleteWbs(n.id)} /></span>}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
          )}
        </TabsContent>

        <TabsContent value="activities" className="space-y-4">
          <div className="flex justify-end">
            <RoleGate action="create">
              <Button size="sm" className="gap-1.5" onClick={handleNewAct}><Plus className="h-3.5 w-3.5" /> {t("planning.activity.add", { defaultValue: "Nova Frente de Trabalho" })}{selectedWbsNode ? ` (${selectedWbsNode.wbs_code})` : ""}</Button>
            </RoleGate>
          </div>
          {loading ? (
            <div className="rounded-xl border border-border overflow-hidden divide-y divide-border">
              {Array.from({ length: 4 }).map((_, i) => <div key={i} className="flex items-center gap-4 px-5 py-3"><Skeleton className="h-4 w-16" /><Skeleton className="h-4 w-1/3" /><Skeleton className="h-4 w-12" /></div>)}
            </div>
          ) : filteredActivities.length === 0 ? (
            <EmptyState icon={ListChecks} subtitleKey={activities.length === 0 ? "emptyState.planning.activities" : "emptyState.noResults"} />
          ) : (
            <>
            {selectedWbsNode && (
              <div className="flex items-center gap-2 px-1 py-2 mb-2 text-sm bg-primary/5 border border-primary/20 rounded-lg">
                <Filter className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                <span className="text-muted-foreground">{t("planning.wbs.filterBy", { defaultValue: "A filtrar por:" })}</span>
                <span className="font-mono text-primary font-semibold">{selectedWbsNode.wbs_code}</span>
                <span className="text-foreground truncate">{selectedWbsNode.description}</span>
                <Button variant="ghost" size="icon" className="h-5 w-5 ml-auto flex-shrink-0" onClick={() => setSelectedWbsId(null)} title={t("common.clear", { defaultValue: "Limpar" })}>
                  <X className="h-3 w-3" />
                </Button>
              </div>
            )}
            <div className="rounded-xl border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("common.description")}</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">WBS</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("planning.fields.zone")}</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("common.status")}</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("planning.readiness.column", { defaultValue: "Prontidão" })}</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("planning.fields.progress")}</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("planning.fields.dates")}</TableHead>
                    <TableHead className="w-28">{t("common.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredActivities.map((a) => {
                    const reqBadges = getRequirementBadges(a);
                    return (
                      <TableRow key={a.id} className="hover:bg-muted/20 transition-colors">
                        <TableCell className="text-xs font-mono font-semibold text-primary w-24">{a.code || "—"}</TableCell>
                        <TableCell className="text-sm font-medium text-foreground max-w-[200px] truncate">{a.description}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {a.wbs_id && wbsById.get(a.wbs_id)
                            ? <span><span className="font-mono">{a.wbs_code}</span> — {wbsById.get(a.wbs_id)!.description}</span>
                            : <span className="font-mono">{a.wbs_code || "—"}</span>}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{a.zone || "—"}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={cn("text-xs", STATUS_COLORS[a.status] ?? "")}>
                            {t(`planning.status.${a.status}`, { defaultValue: a.status })}
                          </Badge>
                        </TableCell>
                        <TableCell><ReadinessBadge activity={a} /></TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 min-w-[80px]">
                            <Progress value={a.progress_pct} className="h-2 flex-1" />
                            <span className="text-xs text-muted-foreground">{a.progress_pct}%</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{a.planned_start || "?"} → {a.planned_end || "?"}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigate(`/planning/activities/${a.id}`)} title={t("common.view")}><Eye className="h-3.5 w-3.5" /></Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEditAct(a)} title={t("common.edit")}><Pencil className="h-3.5 w-3.5" /></Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setCheckDialog({ open: true, id: a.id, desc: a.description })} title={t("planning.completion.title")}><ShieldCheck className="h-3.5 w-3.5" /></Button>
                            {isAdmin && <DeleteButton onConfirm={() => handleDeleteActivity(a.id)} />}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </>
          )}
        </TabsContent>
      </Tabs>

      <WbsFormDialog open={wbsDialogOpen} onOpenChange={setWbsDialogOpen} wbsNodes={wbs} editNode={editWbs} defaultParentId={parentWbs} onSuccess={refetch} />
      <ActivityFormDialog open={actDialogOpen} onOpenChange={setActDialogOpen} wbsNodes={wbs} editActivity={editAct} onSuccess={refetch} preselectedWbsId={editAct ? null : selectedWbsId} />
      <CompletionCheckDialog open={checkDialog.open} onOpenChange={(v) => setCheckDialog(p => ({ ...p, open: v }))} activityId={checkDialog.id} activityDesc={checkDialog.desc} />

      {/* WBS Detail Drawer */}
      {(() => {
        const node = drawerWbsId ? wbs.find(w => w.id === drawerWbsId) : null;
        const open = !!node;
        const childIds = node ? getWbsDescendantIds(node.id) : new Set<string>();
        const nodeActs = node ? activities.filter(a => a.wbs_id != null && childIds.has(a.wbs_id)) : [];
        const total = nodeActs.length;
        const done = nodeActs.filter(a => a.status === "completed").length;
        const inP = nodeActs.filter(a => a.status === "in_progress").length;
        const blk = nodeActs.filter(a => a.status === "blocked").length;
        const avg = total > 0 ? Math.round(nodeActs.reduce((s, a) => s + a.progress_pct, 0) / total) : 0;
        return (
          <Sheet open={open} onOpenChange={(v) => { if (!v) setDrawerWbsId(null); }}>
            <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
              {node && (
                <>
                  <SheetHeader className="space-y-1 pb-4 border-b">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">{t("planning.wbs.detail", { defaultValue: "Detalhe WBS" })}</p>
                    <SheetTitle className="text-lg flex items-center gap-2">
                      <Network className="h-4 w-4 text-primary" />
                      <span className="font-mono">{node.wbs_code}</span>
                    </SheetTitle>
                    <p className="text-sm text-foreground">{node.description}</p>
                  </SheetHeader>
                  <div className="space-y-4 mt-4">
                    <div className="grid grid-cols-2 gap-3">
                      {node.zone && <InfoCell label={t("planning.fields.zone", { defaultValue: "Zona" })} value={node.zone} />}
                      {node.responsible && <InfoCell label={t("planning.fields.responsible", { defaultValue: "Responsável" })} value={node.responsible} />}
                      {node.planned_start && <InfoCell label={t("planning.fields.start", { defaultValue: "Início" })} value={node.planned_start} />}
                      {node.planned_end && <InfoCell label={t("planning.fields.end", { defaultValue: "Fim" })} value={node.planned_end} />}
                    </div>
                    <div className="rounded-xl border border-border p-4 space-y-3">
                      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">{t("planning.kpis.activities", { defaultValue: "Frentes de Trabalho" })}</p>
                      <div className="grid grid-cols-4 gap-2 text-center">
                        <KpiMini label={t("common.total", { defaultValue: "Total" })} value={total} />
                        <KpiMini label={t("planning.status.in_progress", { defaultValue: "Em curso" })} value={inP} cls="text-primary" />
                        <KpiMini label={t("planning.status.completed", { defaultValue: "Concluídas" })} value={done} cls="text-emerald-600" />
                        <KpiMini label={t("planning.status.blocked", { defaultValue: "Bloqueadas" })} value={blk} cls="text-destructive" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs"><span className="text-muted-foreground">{t("planning.kpis.avgProgress", { defaultValue: "Progresso médio" })}</span><span className="font-semibold">{avg}%</span></div>
                        <Progress value={avg} className="h-1.5" />
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">{t("planning.activity.list", { defaultValue: "Frentes" })} ({total})</p>
                        {total > 0 && (
                          <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5" onClick={() => { handleWbsSelect({ ...node, depth: 0, children: [] } as any); setDrawerWbsId(null); }}>
                            <ListChecks className="h-3 w-3" /> {t("planning.wbs.openInTab", { defaultValue: "Abrir na aba" })}
                          </Button>
                        )}
                      </div>
                      {nodeActs.length === 0 ? (
                        <p className="text-xs text-muted-foreground italic py-3">{t("planning.wbs.noActivities", { defaultValue: "Sem frentes associadas." })}</p>
                      ) : (
                        <ul className="divide-y divide-border rounded-md border border-border max-h-72 overflow-y-auto">
                          {nodeActs.slice(0, 30).map(a => (
                            <li key={a.id} className="flex items-center gap-2 px-3 py-2 hover:bg-muted/40">
                              <ReadinessBadge activity={a} />
                              <button className="flex-1 min-w-0 text-left text-xs truncate hover:text-primary" onClick={() => { setDrawerWbsId(null); navigate(`/planning/activities/${a.id}`); }}>{a.description}</button>
                              <span className="text-[10px] font-mono text-muted-foreground tabular-nums">{a.progress_pct}%</span>
                            </li>
                          ))}
                          {nodeActs.length > 30 && <li className="px-3 py-2 text-[10px] text-muted-foreground text-center">+{nodeActs.length - 30}…</li>}
                        </ul>
                      )}
                    </div>
                  </div>
                </>
              )}
            </SheetContent>
          </Sheet>
        );
      })()}
    </div>
  );
}
