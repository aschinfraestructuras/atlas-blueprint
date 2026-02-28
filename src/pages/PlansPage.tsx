import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useProject } from "@/contexts/ProjectContext";
import { useAuth } from "@/contexts/AuthContext";
import { usePlans } from "@/hooks/usePlans";
import { useProjectRole } from "@/hooks/useProjectRole";
import { planService } from "@/lib/services/planService";
import { classifySupabaseError } from "@/lib/utils/supabaseError";
import { BookOpen, Plus, Pencil, Trash2, Search } from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { FilterBar } from "@/components/ui/filter-bar";
import { EmptyState } from "@/components/EmptyState";
import { NoProjectBanner } from "@/components/NoProjectBanner";
import { PlanFormDialog } from "@/components/plans/PlanFormDialog";
import { ReportExportMenu } from "@/components/reports/ReportExportMenu";
import { exportPlansCsv, exportPlansPdf } from "@/lib/services/planExportService";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import type { Plan } from "@/lib/services/planService";
import type { ReportMeta } from "@/lib/services/reportService";

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  under_review: "bg-primary/10 text-primary",
  approved: "bg-primary/20 text-primary",
  superseded: "bg-destructive/10 text-destructive",
};

const PLAN_TYPES = ["PQO", "PIE", "PPI", "ITP", "MethodStatement", "TestPlan", "Schedule"];
const PLAN_STATUSES = ["draft", "under_review", "approved", "superseded"];

export default function PlansPage() {
  const { t } = useTranslation();
  const { activeProject } = useProject();
  const { user } = useAuth();
  const { data: plans, loading, error, refetch } = usePlans();
  const { canCreate, canDelete } = useProjectRole();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [deletingPlan, setDeletingPlan] = useState<Plan | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("__all__");
  const [filterStatus, setFilterStatus] = useState("__all__");

  const filtered = useMemo(() => {
    let list = plans;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(p => p.title.toLowerCase().includes(q) || (p.revision ?? "").toLowerCase().includes(q));
    }
    if (filterType !== "__all__") list = list.filter(p => p.plan_type === filterType);
    if (filterStatus !== "__all__") list = list.filter(p => p.status === filterStatus);
    return list;
  }, [plans, search, filterType, filterStatus]);

  if (!activeProject) return <NoProjectBanner />;

  const meta: ReportMeta = {
    projectName: activeProject.name,
    projectCode: activeProject.code,
    locale: "pt",
    generatedBy: user?.email ?? undefined,
  };

  const handleNew = () => { setEditingPlan(null); setDialogOpen(true); };
  const handleEdit = (plan: Plan) => { setEditingPlan(plan); setDialogOpen(true); };

  const handleDeleteConfirm = async () => {
    if (!deletingPlan || !activeProject) return;
    setDeleting(true);
    try {
      await planService.delete(deletingPlan.id, activeProject.id);
      toast({ title: t("plans.toast.deleted", { defaultValue: "Plano eliminado." }) });
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
          <ReportExportMenu options={[
            { label: "CSV", icon: "csv", action: () => exportPlansCsv(filtered, meta) },
            { label: "PDF", icon: "pdf", action: () => exportPlansPdf(filtered, meta) },
          ]} />
          {canCreate && (
            <Button onClick={handleNew} size="sm" className="gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              {t("plans.newPlan")}
            </Button>
          )}
        </div>
      </div>

      <FilterBar>
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder={t("plans.searchPlaceholder", { defaultValue: "Pesquisar título, revisão…" })}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[160px] h-8 text-sm">
            <SelectValue placeholder={t("plans.filters.allTypes", { defaultValue: "Todos os tipos" })} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">{t("plans.filters.allTypes", { defaultValue: "Todos os tipos" })}</SelectItem>
            {PLAN_TYPES.map(pt => (
              <SelectItem key={pt} value={pt}>{t(`plans.types.${pt}`, { defaultValue: pt })}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[160px] h-8 text-sm">
            <SelectValue placeholder={t("plans.filters.allStatuses", { defaultValue: "Todos os estados" })} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">{t("plans.filters.allStatuses", { defaultValue: "Todos os estados" })}</SelectItem>
            {PLAN_STATUSES.map(s => (
              <SelectItem key={s} value={s}>{t(`plans.status.${s}`, { defaultValue: s })}</SelectItem>
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
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("plans.table.type")}</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("plans.table.title")}</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("plans.table.revision")}</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("common.status")}</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("common.date")}</TableHead>
                <TableHead className="w-20">{t("common.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((plan) => (
                <TableRow key={plan.id} className="hover:bg-muted/20 transition-colors">
                  <TableCell>
                    <Badge variant="outline" className="text-xs font-mono">
                      {t(`plans.types.${plan.plan_type}`, { defaultValue: plan.plan_type })}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium text-sm text-foreground">{plan.title}</TableCell>
                  <TableCell className="text-sm text-muted-foreground font-mono text-xs">{plan.revision ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={cn("text-xs", STATUS_COLORS[plan.status] ?? "")}>
                      {t(`plans.status.${plan.status}`, { defaultValue: plan.status })}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(plan.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => handleEdit(plan)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      {canDelete && (
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => setDeletingPlan(plan)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
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
            <AlertDialogTitle>{t("plans.deleteConfirm.title", { defaultValue: "Eliminar plano?" })}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("plans.deleteConfirm.description", { defaultValue: "O plano «{{name}}» será eliminado permanentemente.", name: deletingPlan?.title ?? "" })}
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
