import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useProject } from "@/contexts/ProjectContext";
import { usePlanning } from "@/hooks/usePlanning";
import { useProjectRole } from "@/hooks/useProjectRole";
import { planningService } from "@/lib/services/planningService";
import { ReportExportMenu } from "@/components/reports/ReportExportMenu";
import { exportWbsCsv, exportWbsPdf, exportActivitiesCsv, exportActivitiesPdf } from "@/lib/services/planningExportService";
import { Plus, Pencil, Network, ListChecks, ShieldCheck, Trash2, Search } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
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
  const { t } = useTranslation();
  const { activeProject } = useProject();
  const { wbs, activities, loading, error, refetch } = usePlanning();
  const { canCreate, isAdmin } = useProjectRole();
  const [activeTab, setActiveTab] = useState("activities");

  const [wbsDialogOpen, setWbsDialogOpen] = useState(false);
  const [editWbs, setEditWbs] = useState<WbsNode | null>(null);
  const [actDialogOpen, setActDialogOpen] = useState(false);
  const [editAct, setEditAct] = useState<Activity | null>(null);
  const [checkDialog, setCheckDialog] = useState<{ open: boolean; id: string; desc: string }>({ open: false, id: "", desc: "" });

  // Filters
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("__all__");

  const filteredWbs = useMemo(() => {
    if (!search) return wbs;
    const q = search.toLowerCase();
    return wbs.filter(w => w.wbs_code.toLowerCase().includes(q) || w.description.toLowerCase().includes(q) || (w.zone ?? "").toLowerCase().includes(q));
  }, [wbs, search]);

  const filteredActivities = useMemo(() => {
    let list = activities;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(a => a.description.toLowerCase().includes(q) || (a.zone ?? "").toLowerCase().includes(q) || (a.wbs_code ?? "").toLowerCase().includes(q));
    }
    if (filterStatus !== "__all__") list = list.filter(a => a.status === filterStatus);
    return list;
  }, [activities, search, filterStatus]);

  if (!activeProject) return <NoProjectBanner />;

  const meta = { projectName: activeProject.name, projectCode: activeProject.code, locale: "pt" };

  const handleNewWbs = () => { setEditWbs(null); setWbsDialogOpen(true); };
  const handleEditWbs = (n: WbsNode) => { setEditWbs(n); setWbsDialogOpen(true); };
  const handleNewAct = () => { setEditAct(null); setActDialogOpen(true); };
  const handleEditAct = (a: Activity) => { setEditAct(a); setActDialogOpen(true); };

  const handleDeleteWbs = async (id: string) => {
    try { await planningService.deleteWbs(id, activeProject.id); toast.success(t("common.deleted", { defaultValue: "Eliminado" })); refetch(); }
    catch { toast.error(t("common.deleteError", { defaultValue: "Erro ao eliminar" })); }
  };
  const handleDeleteActivity = async (id: string) => {
    try { await planningService.deleteActivity(id, activeProject.id); toast.success(t("common.deleted", { defaultValue: "Eliminado" })); refetch(); }
    catch { toast.error(t("common.deleteError", { defaultValue: "Erro ao eliminar" })); }
  };

  const exportData = activeTab === "wbs" ? filteredWbs : filteredActivities;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">{t("planning.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("planning.subtitle")}</p>
        </div>
        <ReportExportMenu options={[
          { label: "CSV", icon: "csv", action: () => activeTab === "wbs" ? exportWbsCsv(filteredWbs, meta) : exportActivitiesCsv(filteredActivities, meta) },
          { label: "PDF", icon: "pdf", action: () => activeTab === "wbs" ? exportWbsPdf(filteredWbs, meta) : exportActivitiesPdf(filteredActivities, meta) },
        ]} />
      </div>

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
          <div className="flex justify-end">
            {canCreate && <Button size="sm" className="gap-1.5" onClick={handleNewWbs}><Plus className="h-3.5 w-3.5" /> {t("planning.wbs.add")}</Button>}
          </div>
          {loading ? (
            <div className="rounded-xl border border-border overflow-hidden divide-y divide-border">
              {Array.from({ length: 4 }).map((_, i) => <div key={i} className="flex items-center gap-4 px-5 py-3"><Skeleton className="h-4 w-16" /><Skeleton className="h-4 w-1/3" /><Skeleton className="h-4 w-12" /></div>)}
            </div>
          ) : filteredWbs.length === 0 ? (
            <EmptyState icon={Network} subtitleKey={wbs.length === 0 ? "emptyState.planning.wbs" : "emptyState.noResults"} />
          ) : (
            <div className="rounded-xl border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("planning.wbs.code")}</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("common.description")}</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("planning.wbs.zone")}</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("planning.fields.plannedStart")}</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("planning.fields.plannedEnd")}</TableHead>
                    <TableHead className="w-20">{t("common.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredWbs.map((n) => (
                    <TableRow key={n.id} className="hover:bg-muted/20 transition-colors">
                      <TableCell className="font-mono text-xs font-medium">{n.wbs_code}</TableCell>
                      <TableCell className="text-sm text-foreground">{n.description}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{n.zone || "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{n.planned_start || "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{n.planned_end || "—"}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
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
            {canCreate && <Button size="sm" className="gap-1.5" onClick={handleNewAct}><Plus className="h-3.5 w-3.5" /> {t("planning.activity.add")}</Button>}
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
                  {filteredActivities.map((a) => (
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
                          {a.requires_topography && <Badge variant="outline" className="text-[10px]">Topo</Badge>}
                          {a.requires_tests && <Badge variant="outline" className="text-[10px]">{t("planning.fields.reqTests", { defaultValue: "Ensaios" })}</Badge>}
                          {a.requires_ppi && <Badge variant="outline" className="text-[10px]">PPI</Badge>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEditAct(a)} title={t("common.edit")}><Pencil className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setCheckDialog({ open: true, id: a.id, desc: a.description })} title={t("planning.completion.title")}><ShieldCheck className="h-3.5 w-3.5" /></Button>
                          {isAdmin && <DeleteButton onConfirm={() => handleDeleteActivity(a.id)} />}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <WbsFormDialog open={wbsDialogOpen} onOpenChange={setWbsDialogOpen} wbsNodes={wbs} editNode={editWbs} onSuccess={refetch} />
      <ActivityFormDialog open={actDialogOpen} onOpenChange={setActDialogOpen} wbsNodes={wbs} editActivity={editAct} onSuccess={refetch} />
      <CompletionCheckDialog open={checkDialog.open} onOpenChange={(v) => setCheckDialog(p => ({ ...p, open: v }))} activityId={checkDialog.id} activityDesc={checkDialog.desc} />
    </div>
  );
}
