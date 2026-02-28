import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useProject } from "@/contexts/ProjectContext";
import { useAuth } from "@/contexts/AuthContext";
import { useSubcontractors } from "@/hooks/useSubcontractors";
import { useProjectRole } from "@/hooks/useProjectRole";
import { subcontractorService } from "@/lib/services/subcontractorService";
import { classifySupabaseError } from "@/lib/utils/supabaseError";
import { useToast } from "@/hooks/use-toast";
import { HardHat, Plus, Pencil, Trash2, Search, Eye } from "lucide-react";
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
import { SubcontractorFormDialog } from "@/components/subcontractors/SubcontractorFormDialog";
import { ReportExportMenu } from "@/components/reports/ReportExportMenu";
import { exportSubcontractorsCsv, exportSubcontractorsPdf } from "@/lib/services/subcontractorExportService";
import { cn } from "@/lib/utils";
import type { Subcontractor } from "@/lib/services/subcontractorService";
import type { ReportMeta } from "@/lib/services/reportService";

const STATUS_COLORS: Record<string, string> = {
  active: "bg-primary/20 text-primary",
  suspended: "bg-destructive/10 text-destructive",
  concluded: "bg-muted text-muted-foreground",
};

const SUB_STATUSES = ["active", "suspended", "concluded"];

export default function SubcontractorsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { activeProject } = useProject();
  const { user } = useAuth();
  const { data: subcontractors, loading, error, refetch } = useSubcontractors();
  const { canCreate, canDelete } = useProjectRole();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSub, setEditingSub] = useState<Subcontractor | null>(null);
  const [deletingSub, setDeletingSub] = useState<Subcontractor | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("__all__");
  const [filterDocStatus, setFilterDocStatus] = useState("__all__");

  const filtered = useMemo(() => {
    let list = subcontractors;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(s => s.name.toLowerCase().includes(q) || (s.trade ?? "").toLowerCase().includes(q) || (s.contact_email ?? "").toLowerCase().includes(q));
    }
    if (filterStatus !== "__all__") list = list.filter(s => s.status === filterStatus);
    if (filterDocStatus !== "__all__") list = list.filter(s => s.documentation_status === filterDocStatus);
    return list;
  }, [subcontractors, search, filterStatus, filterDocStatus]);

  if (!activeProject) return <NoProjectBanner />;

  const meta: ReportMeta = {
    projectName: activeProject.name,
    projectCode: activeProject.code,
    locale: "pt",
    generatedBy: user?.email ?? undefined,
  };

  const handleNew = () => { setEditingSub(null); setDialogOpen(true); };
  const handleEdit = (sub: Subcontractor) => { setEditingSub(sub); setDialogOpen(true); };

  const handleDeleteConfirm = async () => {
    if (!deletingSub || !activeProject) return;
    setDeleting(true);
    try {
      await subcontractorService.delete(deletingSub.id, activeProject.id);
      toast({ title: t("subcontractors.toast.deleted") });
      refetch();
    } catch (err) {
      const { title, description } = classifySupabaseError(err, t);
      toast({ variant: "destructive", title, description });
    } finally {
      setDeleting(false);
      setDeletingSub(null);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">{t("pages.subcontractors.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("pages.subcontractors.subtitle")}</p>
        </div>
        <div className="flex items-center gap-2">
          <ReportExportMenu options={[
            { label: "CSV", icon: "csv", action: () => exportSubcontractorsCsv(filtered, meta) },
            { label: "PDF", icon: "pdf", action: () => exportSubcontractorsPdf(filtered, meta) },
          ]} />
          {canCreate && (
            <Button onClick={handleNew} size="sm" className="gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              {t("subcontractors.newSubcontractor")}
            </Button>
          )}
        </div>
      </div>

      <FilterBar>
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder={t("subcontractors.searchPlaceholder", { defaultValue: "Pesquisar nome, especialidade, e-mail…" })}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[160px] h-8 text-sm">
            <SelectValue placeholder={t("subcontractors.filters.allStatuses", { defaultValue: "Todos os estados" })} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">{t("subcontractors.filters.allStatuses", { defaultValue: "Todos os estados" })}</SelectItem>
            {SUB_STATUSES.map(s => (
              <SelectItem key={s} value={s}>{t(`subcontractors.status.${s}`, { defaultValue: s })}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterDocStatus} onValueChange={setFilterDocStatus}>
          <SelectTrigger className="w-[160px] h-8 text-sm">
            <SelectValue placeholder={t("subcontractors.filters.allDocStatuses", { defaultValue: "Todos doc. status" })} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">{t("subcontractors.filters.allDocStatuses", { defaultValue: "Todos doc. status" })}</SelectItem>
            <SelectItem value="pending">{t("subcontractors.docStatus.pending", { defaultValue: "Pendente" })}</SelectItem>
            <SelectItem value="valid">{t("subcontractors.docStatus.valid", { defaultValue: "Válida" })}</SelectItem>
            <SelectItem value="expired">{t("subcontractors.docStatus.expired", { defaultValue: "Expirada" })}</SelectItem>
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
              <Skeleton className="h-4 w-1/3" /><Skeleton className="h-4 w-1/4" /><Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={HardHat} subtitleKey={subcontractors.length === 0 ? "emptyState.subcontractors.subtitle" : "emptyState.noResults"} />
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("common.name")}</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("subcontractors.table.trade")}</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("common.status")}</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("subcontractors.table.docStatus", { defaultValue: "Doc. Status" })}</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("subcontractors.table.score", { defaultValue: "Score" })}</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("subcontractors.table.contactEmail")}</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("common.date")}</TableHead>
                <TableHead className="w-28">{t("common.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((sub) => (
                <TableRow key={sub.id} className="hover:bg-muted/20 transition-colors cursor-pointer" onClick={() => navigate(`/subcontractors/${sub.id}`)}>
                  <TableCell className="font-medium text-sm text-foreground">
                    <div className="flex items-center gap-2">
                      <HardHat className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                      {sub.name}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{sub.trade ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={cn("text-xs", STATUS_COLORS[sub.status] ?? "")}>
                      {t(`subcontractors.status.${sub.status}`, { defaultValue: sub.status })}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={cn("text-xs", sub.documentation_status === "valid" ? "bg-primary/20 text-primary" : sub.documentation_status === "expired" ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground")}>
                      {t(`subcontractors.docStatus.${sub.documentation_status}`, { defaultValue: sub.documentation_status })}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{sub.performance_score != null ? `${sub.performance_score}` : "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{sub.contact_email ?? "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(sub.updated_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => navigate(`/subcontractors/${sub.id}`)}>
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => handleEdit(sub)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      {canDelete && (
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => setDeletingSub(sub)}>
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

      <SubcontractorFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        subcontractor={editingSub}
        onSuccess={refetch}
      />

      <AlertDialog open={!!deletingSub} onOpenChange={(v) => { if (!v) setDeletingSub(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("subcontractors.deleteConfirm.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("subcontractors.deleteConfirm.description", { name: deletingSub?.name ?? "" })}
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
