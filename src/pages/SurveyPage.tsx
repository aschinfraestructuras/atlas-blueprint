import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useProject } from "@/contexts/ProjectContext";
import { useAuth } from "@/contexts/AuthContext";
import { useSurveys } from "@/hooks/useSurveys";
import { useProjectRole } from "@/hooks/useProjectRole";
import { surveyService } from "@/lib/services/surveyService";
import { classifySupabaseError } from "@/lib/utils/supabaseError";
import { Map, Plus, Pencil, Trash2, Search } from "lucide-react";
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
import { SurveyFormDialog } from "@/components/survey/SurveyFormDialog";
import { ReportExportMenu } from "@/components/reports/ReportExportMenu";
import { exportSurveysCsv, exportSurveysPdf } from "@/lib/services/surveyExportService";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import type { SurveyRecord } from "@/lib/services/surveyService";
import type { ReportMeta } from "@/lib/services/reportService";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-muted text-muted-foreground",
  validated: "bg-primary/20 text-primary",
  rejected: "bg-destructive/10 text-destructive",
};

const SURVEY_STATUSES = ["pending", "validated", "rejected"];

export default function SurveyPage() {
  const { t } = useTranslation();
  const { activeProject } = useProject();
  const { user } = useAuth();
  const { data: records, loading, error, refetch } = useSurveys();
  const { canCreate, canDelete } = useProjectRole();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<SurveyRecord | null>(null);
  const [deletingRecord, setDeletingRecord] = useState<SurveyRecord | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("__all__");

  const filtered = useMemo(() => {
    let list = records;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(r => r.area_or_pk.toLowerCase().includes(q) || (r.description ?? "").toLowerCase().includes(q));
    }
    if (filterStatus !== "__all__") list = list.filter(r => r.status === filterStatus);
    return list;
  }, [records, search, filterStatus]);

  if (!activeProject) return <NoProjectBanner />;

  const meta: ReportMeta = {
    projectName: activeProject.name,
    projectCode: activeProject.code,
    locale: "pt",
    generatedBy: user?.email ?? undefined,
  };

  const handleNew = () => { setEditingRecord(null); setDialogOpen(true); };
  const handleEdit = (r: SurveyRecord) => { setEditingRecord(r); setDialogOpen(true); };

  const handleDeleteConfirm = async () => {
    if (!deletingRecord || !activeProject) return;
    setDeleting(true);
    try {
      await surveyService.delete(deletingRecord.id, activeProject.id);
      toast({ title: t("survey.toast.deleted", { defaultValue: "Registo eliminado." }) });
      refetch();
    } catch (err) {
      const { title, description } = classifySupabaseError(err, t);
      toast({ variant: "destructive", title, description });
    } finally {
      setDeleting(false);
      setDeletingRecord(null);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">{t("pages.survey.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("pages.survey.subtitle")}</p>
        </div>
        <div className="flex items-center gap-2">
          <ReportExportMenu options={[
            { label: "CSV", icon: "csv", action: () => exportSurveysCsv(filtered, meta) },
            { label: "PDF", icon: "pdf", action: () => exportSurveysPdf(filtered, meta) },
          ]} />
          {canCreate && (
            <Button onClick={handleNew} size="sm" className="gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              {t("survey.newRecord")}
            </Button>
          )}
        </div>
      </div>

      <FilterBar>
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder={t("survey.searchPlaceholder", { defaultValue: "Pesquisar área, PK, descrição…" })}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[160px] h-8 text-sm">
            <SelectValue placeholder={t("survey.filters.allStatuses", { defaultValue: "Todos os estados" })} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">{t("survey.filters.allStatuses", { defaultValue: "Todos os estados" })}</SelectItem>
            {SURVEY_STATUSES.map(s => (
              <SelectItem key={s} value={s}>{t(`survey.status.${s}`, { defaultValue: s })}</SelectItem>
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
              <Skeleton className="h-4 w-24" /><Skeleton className="h-4 w-1/3" /><Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={Map} subtitleKey={records.length === 0 ? "emptyState.survey.subtitle" : "emptyState.noResults"} />
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("survey.table.areaPk")}</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("common.description")}</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("common.date")}</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("common.status")}</TableHead>
                <TableHead className="w-20">{t("common.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((record) => (
                <TableRow key={record.id} className="hover:bg-muted/20 transition-colors">
                  <TableCell className="font-medium text-sm text-foreground font-mono">{record.area_or_pk}</TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-xs truncate">{record.description ?? "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{new Date(record.date).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={cn("text-xs", STATUS_COLORS[record.status] ?? "")}>
                      {t(`survey.status.${record.status}`, { defaultValue: record.status })}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => handleEdit(record)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      {canDelete && (
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => setDeletingRecord(record)}>
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

      <SurveyFormDialog open={dialogOpen} onOpenChange={setDialogOpen} record={editingRecord} onSuccess={refetch} />

      <AlertDialog open={!!deletingRecord} onOpenChange={(v) => { if (!v) setDeletingRecord(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("survey.deleteConfirm.title", { defaultValue: "Eliminar registo?" })}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("survey.deleteConfirm.description", { defaultValue: "O registo «{{name}}» será eliminado permanentemente.", name: deletingRecord?.area_or_pk ?? "" })}
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
