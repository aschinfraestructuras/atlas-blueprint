import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useProject } from "@/contexts/ProjectContext";
import { usePlanning } from "@/hooks/usePlanning";
import { useProjectRole } from "@/hooks/useProjectRole";
import { Plus, Pencil, Network, ListChecks, ShieldCheck } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/EmptyState";
import { NoProjectBanner } from "@/components/NoProjectBanner";
import { WbsFormDialog } from "@/components/planning/WbsFormDialog";
import { ActivityFormDialog } from "@/components/planning/ActivityFormDialog";
import { CompletionCheckDialog } from "@/components/planning/CompletionCheckDialog";
import { cn } from "@/lib/utils";
import type { WbsNode, Activity } from "@/lib/services/planningService";

const STATUS_COLORS: Record<string, string> = {
  planned: "bg-muted text-muted-foreground",
  in_progress: "bg-primary/10 text-primary",
  blocked: "bg-destructive/10 text-destructive",
  completed: "bg-primary/20 text-primary",
  cancelled: "bg-muted text-muted-foreground line-through",
};

export default function PlanningPage() {
  const { t } = useTranslation();
  const { activeProject } = useProject();
  const { wbs, activities, loading, error, refetch } = usePlanning();
  const { canCreate } = useProjectRole();

  const [wbsDialogOpen, setWbsDialogOpen] = useState(false);
  const [editWbs, setEditWbs] = useState<WbsNode | null>(null);
  const [actDialogOpen, setActDialogOpen] = useState(false);
  const [editAct, setEditAct] = useState<Activity | null>(null);
  const [checkDialog, setCheckDialog] = useState<{ open: boolean; id: string; desc: string }>({ open: false, id: "", desc: "" });

  if (!activeProject) return <NoProjectBanner />;

  const handleNewWbs = () => { setEditWbs(null); setWbsDialogOpen(true); };
  const handleEditWbs = (n: WbsNode) => { setEditWbs(n); setWbsDialogOpen(true); };
  const handleNewAct = () => { setEditAct(null); setActDialogOpen(true); };
  const handleEditAct = (a: Activity) => { setEditAct(a); setActDialogOpen(true); };

  const LoadingSkeleton = () => (
    <div className="rounded-xl border border-border overflow-hidden divide-y divide-border">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-5 py-3">
          <Skeleton className="h-4 w-16" /><Skeleton className="h-4 w-1/3" /><Skeleton className="h-4 w-12" />
        </div>
      ))}
    </div>
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">{t("planning.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("planning.subtitle")}</p>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">{error}</div>
      )}

      <Tabs defaultValue="activities">
        <TabsList>
          <TabsTrigger value="wbs" className="gap-1.5"><Network className="h-3.5 w-3.5" /> WBS</TabsTrigger>
          <TabsTrigger value="activities" className="gap-1.5"><ListChecks className="h-3.5 w-3.5" /> {t("planning.tabs.activities")}</TabsTrigger>
        </TabsList>

        {/* ── WBS ── */}
        <TabsContent value="wbs" className="space-y-4">
          <div className="flex justify-end">
            {canCreate && <Button size="sm" className="gap-1.5" onClick={handleNewWbs}><Plus className="h-3.5 w-3.5" /> {t("planning.wbs.add")}</Button>}
          </div>
          {loading ? <LoadingSkeleton /> : wbs.length === 0 ? (
            <EmptyState icon={Network} subtitleKey="emptyState.planning.wbs" />
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
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {wbs.map((n) => (
                    <TableRow key={n.id} className="hover:bg-muted/20 transition-colors">
                      <TableCell className="font-mono text-xs font-medium">{n.wbs_code}</TableCell>
                      <TableCell className="text-sm text-foreground">{n.description}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{n.zone || "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{n.planned_start || "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{n.planned_end || "—"}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEditWbs(n)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        {/* ── Activities ── */}
        <TabsContent value="activities" className="space-y-4">
          <div className="flex justify-end">
            {canCreate && <Button size="sm" className="gap-1.5" onClick={handleNewAct}><Plus className="h-3.5 w-3.5" /> {t("planning.activity.add")}</Button>}
          </div>
          {loading ? <LoadingSkeleton /> : activities.length === 0 ? (
            <EmptyState icon={ListChecks} subtitleKey="emptyState.planning.activities" />
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
                    <TableHead className="w-20" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activities.map((a) => (
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
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {a.planned_start || "?"} → {a.planned_end || "?"}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {a.requires_topography && <Badge variant="outline" className="text-[10px]">Topo</Badge>}
                          {a.requires_tests && <Badge variant="outline" className="text-[10px]">Ensaios</Badge>}
                          {a.requires_ppi && <Badge variant="outline" className="text-[10px]">PPI</Badge>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEditAct(a)} title={t("common.edit")}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setCheckDialog({ open: true, id: a.id, desc: a.description })} title={t("planning.completion.title")}>
                            <ShieldCheck className="h-3.5 w-3.5" />
                          </Button>
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
