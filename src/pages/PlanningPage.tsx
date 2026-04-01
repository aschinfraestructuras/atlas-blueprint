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
  ChevronRight, ChevronDown, FolderPlus, ChevronsUpDown, AlertTriangle,
  CheckCircle2, Clock, Ban, PieChart as PieChartIcon,
} from "lucide-react";
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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
  const { canCreate, isAdmin } = useProjectRole();
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
    return { totalWbs, totalAct, inProgress, completed, blocked, avgProgress };
  }, [wbs, activities]);

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
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(a => a.description.toLowerCase().includes(q) || (a.zone ?? "").toLowerCase().includes(q) || (a.wbs_code ?? "").toLowerCase().includes(q));
    }
    if (filterStatus !== "__all__") list = list.filter(a => a.status === filterStatus);
    return list;
  }, [activities, search, filterStatus]);

  const wbsCodes = useMemo(() => new Set(wbs.map(w => w.wbs_code.toLowerCase())), [wbs]);

  if (!activeProject) return <NoProjectBanner />;

  const meta = reportMeta ?? { projectName: activeProject.name, projectCode: activeProject.code, locale: i18n.language?.startsWith("es") ? "es" : "pt", generatedBy: user?.email ?? undefined };

  const handleNewWbs = (pId?: string) => { setEditWbs(null); setParentWbs(pId ?? null); setWbsDialogOpen(true); };
  const handleEditWbs = (n: WbsNode) => { setEditWbs(n); setParentWbs(null); setWbsDialogOpen(true); };
  const handleNewAct = () => { setEditAct(null); setActDialogOpen(true); };
  const handleEditAct = (a: Activity) => { setEditAct(a); setActDialogOpen(true); };

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
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
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
      </div>

      {/* Activity Status Distribution */}
      {activities.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <StackedBar
            title={t("planning.kpi.activityStatus", { defaultValue: "Estado das Atividades" })}
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
            <div className="rounded-xl border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground w-8"></TableHead>
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
                    <TableRow key={n.id} className="hover:bg-muted/20 transition-colors">
                      <TableCell className="w-8 px-1">
                        {hasChildren(n.id) ? (
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => toggleWbsExpand(n.id)}>
                            {expandedWbs.has(n.id) ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                          </Button>
                        ) : <span className="w-6 inline-block" />}
                      </TableCell>
                      <TableCell className="font-mono text-xs font-medium" style={{ paddingLeft: `${(n.depth || 0) * 20 + 4}px` }}>
                        {n.wbs_code}
                      </TableCell>
                      <TableCell className="text-sm text-foreground">{n.description}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{n.zone || "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{n.planned_start || "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{n.planned_end || "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{n.responsible || "—"}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <RoleGate action="create">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleNewWbs(n.id)} title={t("planning.wbs.addChild")}>
                              <FolderPlus className="h-3.5 w-3.5" />
                            </Button>
                          </RoleGate>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEditWbs(n)}><Pencil className="h-3.5 w-3.5" /></Button>
                          {isAdmin && <DeleteButton onConfirm={() => handleDeleteWbs(n.id)} />}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="activities" className="space-y-4">
          <div className="flex justify-end">
            <RoleGate action="create">
              <Button size="sm" className="gap-1.5" onClick={handleNewAct}><Plus className="h-3.5 w-3.5" /> {t("planning.activity.add")}</Button>
            </RoleGate>
          </div>
          {loading ? (
            <div className="rounded-xl border border-border overflow-hidden divide-y divide-border">
              {Array.from({ length: 4 }).map((_, i) => <div key={i} className="flex items-center gap-4 px-5 py-3"><Skeleton className="h-4 w-16" /><Skeleton className="h-4 w-1/3" /><Skeleton className="h-4 w-12" /></div>)}
            </div>
          ) : filteredActivities.length === 0 ? (
            <EmptyState icon={ListChecks} subtitleKey={activities.length === 0 ? "emptyState.planning.activities" : "emptyState.noResults"} />
          ) : (
            <div className="rounded-xl border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("common.description")}</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">WBS</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("planning.fields.zone")}</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("common.status")}</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("planning.fields.progress")}</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("planning.fields.dates")}</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("planning.fields.requirements")}</TableHead>
                    <TableHead className="w-28">{t("common.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredActivities.map((a) => {
                    const reqBadges = getRequirementBadges(a);
                    return (
                      <TableRow key={a.id} className="hover:bg-muted/20 transition-colors">
                        <TableCell className="text-sm font-medium text-foreground max-w-[200px] truncate">{a.description}</TableCell>
                        <TableCell className="text-xs font-mono text-muted-foreground">{a.wbs_code || "—"}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{a.zone || "—"}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={cn("text-xs", STATUS_COLORS[a.status] ?? "")}>
                            {t(`planning.status.${a.status}`, { defaultValue: a.status })}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 min-w-[80px]">
                            <Progress value={a.progress_pct} className="h-2 flex-1" />
                            <span className="text-xs text-muted-foreground">{a.progress_pct}%</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{a.planned_start || "?"} → {a.planned_end || "?"}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {reqBadges.map(b => (
                              <Badge key={b.label} variant="outline" className="text-[10px]">{b.label}</Badge>
                            ))}
                            {reqBadges.length === 0 && <span className="text-xs text-muted-foreground">—</span>}
                          </div>
                        </TableCell>
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
          )}
        </TabsContent>
      </Tabs>

      <WbsFormDialog open={wbsDialogOpen} onOpenChange={setWbsDialogOpen} wbsNodes={wbs} editNode={editWbs} defaultParentId={parentWbs} onSuccess={refetch} />
      <ActivityFormDialog open={actDialogOpen} onOpenChange={setActDialogOpen} wbsNodes={wbs} editActivity={editAct} onSuccess={refetch} />
      <CompletionCheckDialog open={checkDialog.open} onOpenChange={(v) => setCheckDialog(p => ({ ...p, open: v }))} activityId={checkDialog.id} activityDesc={checkDialog.desc} />
    </div>
  );
}
