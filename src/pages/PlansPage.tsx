import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useProject } from "@/contexts/ProjectContext";
import { useAuth } from "@/contexts/AuthContext";
import { usePlans } from "@/hooks/usePlans";
import { useProjectRole } from "@/hooks/useProjectRole";
import { planService } from "@/lib/services/planService";
import { auditService } from "@/lib/services/auditService";
import { classifySupabaseError } from "@/lib/utils/supabaseError";
import {
  BookOpen, Plus, Pencil, Trash2, Search, Eye, Download, Upload,
  FileCheck, FileClock, FileWarning, Archive, Send, PieChart as PieChartIcon, Loader2,
} from "lucide-react";
import { importPF17APlans, removePF17APlans } from "@/lib/services/planSeedImportService";
import { DistributionBar, StackedBar } from "@/components/dashboard/DistributionBar";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { FilterBar } from "@/components/ui/filter-bar";
import { EmptyState } from "@/components/EmptyState";
import { NoProjectBanner } from "@/components/NoProjectBanner";
import { RoleGate } from "@/components/RoleGate";
import { PlanFormDialog } from "@/components/plans/PlanFormDialog";
import { ReportExportMenu } from "@/components/reports/ReportExportMenu";
import { exportPlansCsv, exportPlansPdf } from "@/lib/services/planExportService";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useProjectLogo } from "@/hooks/useProjectLogo";
import type { Plan } from "@/lib/services/planService";
import type { ReportMeta } from "@/lib/services/reportService";

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  under_review: "bg-primary/10 text-primary",
  approved: "bg-primary/20 text-primary",
  obsolete: "bg-amber-500/15 text-amber-600",
  archived: "bg-muted/60 text-muted-foreground",
  superseded: "bg-destructive/10 text-destructive",
};

const PLAN_TYPES = [
  "MS", "PlanEsc", "PlanBet", "PlanMont", "PlanTraf", "PlanSeg",
  "PlanTopo", "PlanEns", "PlanInsp", "PlanAmb", "PlanQual",
  "Schedule", "Drawing", "Other",
];
const PLAN_STATUSES = ["draft", "under_review", "approved", "obsolete", "archived", "superseded"];
const DISCIPLINES = [
  "geral", "terras", "betao", "ferrovia", "catenaria", "st",
  "drenagem", "estruturas", "telecom", "edificacoes", "ambiente",
  "via", "geotecnia", "outros",
];

export default function PlansPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { activeProject } = useProject();
  const { user } = useAuth();
  const { data: plans, loading, error, refetch } = usePlans();
  const { canCreate, canDelete } = useProjectRole();
  const { toast } = useToast();
  const { logoBase64 } = useProjectLogo();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [deletingPlan, setDeletingPlan] = useState<Plan | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [importing, setImporting] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("__all__");
  const [filterStatus, setFilterStatus] = useState("__all__");
  const [filterDiscipline, setFilterDiscipline] = useState("__all__");

  const filtered = useMemo(() => {
    let list = plans;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(p => p.title.toLowerCase().includes(q) || (p.revision ?? "").toLowerCase().includes(q) || (p.code ?? "").toLowerCase().includes(q));
    }
    if (filterType !== "__all__") list = list.filter(p => p.plan_type === filterType);
    if (filterStatus !== "__all__") list = list.filter(p => p.status === filterStatus);
    if (filterDiscipline !== "__all__") list = list.filter(p => (p as any).discipline === filterDiscipline);
    return list;
  }, [plans, search, filterType, filterStatus, filterDiscipline]);

  // KPIs
  const kpis = useMemo(() => {
    const total = plans.length;
    const draft = plans.filter(p => p.status === "draft").length;
    const inReview = plans.filter(p => p.status === "under_review").length;
    const approved = plans.filter(p => p.status === "approved").length;
    const obsoleteArchived = plans.filter(p => p.status === "obsolete" || p.status === "archived").length;
    return { total, draft, inReview, approved, obsoleteArchived };
  }, [plans]);

  if (!activeProject) return <NoProjectBanner />;

  const meta: ReportMeta = {
    projectName: activeProject.name,
    projectCode: activeProject.code,
    locale: i18n.language?.startsWith("es") ? "es" : "pt",
    generatedBy: user?.email ?? undefined,
  };

  const handleNew = () => { setEditingPlan(null); setDialogOpen(true); };
  const handleEdit = (plan: Plan) => { setEditingPlan(plan); setDialogOpen(true); };

  const handleExport = (type: "csv" | "pdf") => {
    if (type === "csv") exportPlansCsv(filtered, meta);
    else exportPlansPdf(filtered, meta, logoBase64);
    auditService.log({
      projectId: activeProject.id,
      entity: "plans",
      entityId: null as any,
      action: "EXPORT",
      module: "plans",
      description: `Plans list exported as ${type.toUpperCase()}`,
    });
  };

  const handleDeleteConfirm = async () => {
    if (!deletingPlan || !activeProject) return;
    setDeleting(true);
    try {
      await planService.delete(deletingPlan.id, activeProject.id);
      toast({ title: t("plans.toast.deleted") });
      refetch();
    } catch (err) {
      const { title, description } = classifySupabaseError(err, t);
      toast({ variant: "destructive", title, description });
    } finally {
      setDeleting(false);
      setDeletingPlan(null);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">{t("pages.plans.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("pages.plans.subtitle")}</p>
        </div>
        <div className="flex items-center gap-2">
          <RoleGate action="create">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              disabled={importing}
              onClick={async () => {
                if (!activeProject || !user) return;
                setImporting(true);
                try {
                  const res = await importPF17APlans(activeProject.id, user.id);
                  toast({
                    title: t("plans.toast.imported", { defaultValue: "Planos PF17A importados" }),
                    description: `${res.inserted} inseridos, ${res.skipped} já existiam`,
                  });
                  refetch();
                } catch (err) {
                  const { title, description } = classifySupabaseError(err, t);
                  toast({ variant: "destructive", title, description });
                } finally {
                  setImporting(false);
                }
              }}
            >
              {importing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
              {t("plans.importPF17A", { defaultValue: "Importar PF17A" })}
            </Button>
          </RoleGate>
          <ReportExportMenu options={[
            { label: "CSV", icon: "csv", action: () => handleExport("csv") },
            { label: "PDF", icon: "pdf", action: () => handleExport("pdf") },
          ]} />
          <RoleGate action="create">
            <Button onClick={handleNew} size="sm" className="gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              {t("plans.newPlan")}
            </Button>
          </RoleGate>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card><CardContent className="pt-4 pb-3 text-center">
          <p className="text-xs text-muted-foreground">{t("plans.kpi.total")}</p>
          <p className="text-2xl font-bold text-foreground">{kpis.total}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3 text-center">
          <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1"><FileClock className="h-3.5 w-3.5" /><p className="text-xs">{t("plans.kpi.draft")}</p></div>
          <p className="text-2xl font-bold text-foreground">{kpis.draft}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3 text-center">
          <div className="flex items-center justify-center gap-1 text-primary mb-1"><Send className="h-3.5 w-3.5" /><p className="text-xs">{t("plans.kpi.inReview")}</p></div>
          <p className="text-2xl font-bold text-primary">{kpis.inReview}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3 text-center">
          <div className="flex items-center justify-center gap-1 text-primary mb-1"><FileCheck className="h-3.5 w-3.5" /><p className="text-xs">{t("plans.kpi.approved")}</p></div>
          <p className="text-2xl font-bold text-primary">{kpis.approved}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3 text-center">
          <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1"><Archive className="h-3.5 w-3.5" /><p className="text-xs">{t("plans.kpi.obsoleteArchived")}</p></div>
          <p className="text-2xl font-bold text-muted-foreground">{kpis.obsoleteArchived}</p>
        </CardContent></Card>
      </div>

      {/* Distribution Charts */}
      {plans.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <DistributionBar
            title={t("plans.form.type")}
            icon={PieChartIcon}
            entries={(() => {
              const map: Record<string, number> = {};
              plans.forEach(p => { map[p.plan_type] = (map[p.plan_type] ?? 0) + 1; });
              return Object.entries(map).map(([k, v]) => ({ key: k, label: t(`plans.types.${k}`, { defaultValue: k }), value: v }));
            })()}
          />
          <StackedBar
            title={t("common.status")}
            icon={FileCheck}
            segments={[
              { key: "draft", label: t("plans.status.draft"), value: kpis.draft, color: "hsl(var(--muted-foreground))" },
              { key: "under_review", label: t("plans.status.under_review"), value: kpis.inReview, color: "hsl(var(--primary))" },
              { key: "approved", label: t("plans.status.approved"), value: kpis.approved, color: "hsl(var(--chart-2))" },
              { key: "obsolete", label: t("plans.status.obsolete", { defaultValue: "Obsoleto/Arquivo" }), value: kpis.obsoleteArchived, color: "hsl(var(--chart-4))" },
            ]}
          />
        </div>
      )}

      <FilterBar>
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder={t("plans.searchPlaceholder")}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[160px] h-8 text-sm">
            <SelectValue placeholder={t("plans.filters.allTypes")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">{t("plans.filters.allTypes")}</SelectItem>
            {PLAN_TYPES.map(pt => (
              <SelectItem key={pt} value={pt}>{t(`plans.types.${pt}`, { defaultValue: pt })}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[160px] h-8 text-sm">
            <SelectValue placeholder={t("plans.filters.allStatuses")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">{t("plans.filters.allStatuses")}</SelectItem>
            {PLAN_STATUSES.map(s => (
              <SelectItem key={s} value={s}>{t(`plans.status.${s}`, { defaultValue: s })}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterDiscipline} onValueChange={setFilterDiscipline}>
          <SelectTrigger className="w-[160px] h-8 text-sm">
            <SelectValue placeholder={t("plans.filters.allDisciplines")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">{t("plans.filters.allDisciplines")}</SelectItem>
            {DISCIPLINES.map(d => (
              <SelectItem key={d} value={d}>{t(`plans.disciplines.${d}`, { defaultValue: d })}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FilterBar>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">{error}</div>
      )}

      {loading ? (
        <div className="rounded-xl border border-border overflow-hidden divide-y divide-border">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-3">
              <Skeleton className="h-4 w-16" /><Skeleton className="h-4 w-1/3" /><Skeleton className="h-4 w-12" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={BookOpen} subtitleKey={plans.length === 0 ? "emptyState.plans.subtitle" : "emptyState.noResults"} />
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("plans.table.code")}</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("plans.table.type")}</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("plans.table.title")}</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("plans.table.discipline")}</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("plans.table.revision")}</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("common.status")}</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("common.date")}</TableHead>
                <TableHead className="w-24">{t("common.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((plan) => (
                <TableRow key={plan.id} className="hover:bg-muted/20 transition-colors cursor-pointer" onClick={() => navigate(`/plans/${plan.id}`)}>
                  <TableCell className="font-mono text-xs text-muted-foreground">{(plan as any).code ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs font-mono">
                      {t(`plans.types.${plan.plan_type}`, { defaultValue: plan.plan_type })}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium text-sm text-foreground">{plan.title}</TableCell>
                  <TableCell>
                    {(plan as any).discipline ? (
                      <Badge variant="secondary" className="text-[10px]">{t(`plans.disciplines.${(plan as any).discipline}`, { defaultValue: (plan as any).discipline })}</Badge>
                    ) : "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground font-mono text-xs">{plan.revision ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={cn("text-xs", STATUS_COLORS[plan.status] ?? "")}>
                      {t(`plans.status.${plan.status}`, { defaultValue: plan.status })}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(plan.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary" onClick={() => navigate(`/plans/${plan.id}`)}>
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      <RoleGate action="edit">
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => handleEdit(plan)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      </RoleGate>
                      <RoleGate action="delete">
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => setDeletingPlan(plan)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </RoleGate>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <PlanFormDialog open={dialogOpen} onOpenChange={setDialogOpen} plan={editingPlan} onSuccess={refetch} />

      <AlertDialog open={!!deletingPlan} onOpenChange={(v) => { if (!v) setDeletingPlan(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("plans.deleteConfirm.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("plans.deleteConfirm.description", { name: deletingPlan?.title ?? "" })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleting ? t("common.loading") : t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
