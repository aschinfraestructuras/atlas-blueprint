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
import { HardHat, Plus, Pencil, Trash2, Search, Eye, Users, AlertTriangle, CheckCircle, Clock } from "lucide-react";
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
import { SubcontractorFormDialog } from "@/components/subcontractors/SubcontractorFormDialog";
import { ReportExportMenu } from "@/components/reports/ReportExportMenu";
import { exportSubcontractorsCsv, exportSubcontractorsPdf } from "@/lib/services/subcontractorExportService";
import { useReportMeta } from "@/hooks/useReportMeta";
import { cn } from "@/lib/utils";
import type { Subcontractor } from "@/lib/services/subcontractorService";
import type { ReportMeta } from "@/lib/services/reportService";

const STATUS_COLORS: Record<string, string> = {
  active: "bg-primary/20 text-primary",
  suspended: "bg-destructive/10 text-destructive",
  concluded: "bg-muted text-muted-foreground",
  archived: "bg-muted text-muted-foreground",
};

const SUB_STATUSES = ["active", "suspended", "concluded"];

// Railway specialty trades that require F/IP approval (PG-PF17A-05)
const RAILWAY_TRADES = ["via_ferrea", "catenaria", "sinalizacao_st", "soldadura", "gsmr_telecom"];

const TRADE_BADGES: Record<string, { label: string; className: string }> = {
  via_ferrea: { label: "Via Férrea", className: "bg-blue-500/15 text-blue-700 dark:text-blue-400" },
  catenaria: { label: "Catenária 25kV", className: "bg-orange-500/15 text-orange-700 dark:text-orange-400" },
  sinalizacao_st: { label: "S&T", className: "bg-purple-500/15 text-purple-700 dark:text-purple-400" },
  soldadura: { label: "Soldadura", className: "bg-red-500/15 text-red-700 dark:text-red-400" },
  gsmr_telecom: { label: "GSM-R", className: "bg-green-500/15 text-green-700 dark:text-green-400" },
};

export default function SubcontractorsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { activeProject } = useProject();
  const { user } = useAuth();
  const { data: subcontractors, loading, error, refetch } = useSubcontractors();
  const { canCreate, canDelete } = useProjectRole();
  const reportMeta = useReportMeta();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSub, setEditingSub] = useState<Subcontractor | null>(null);
  const [deletingSub, setDeletingSub] = useState<Subcontractor | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("__all__");
  const [filterDocStatus, setFilterDocStatus] = useState("__all__");
  const [filterTrade, setFilterTrade] = useState("__all__");

  // Dynamic unique trades
  const uniqueTrades = useMemo(() => {
    const trades = new Set<string>();
    subcontractors.forEach(s => { if (s.trade) trades.add(s.trade); });
    return Array.from(trades).sort();
  }, [subcontractors]);

  const filtered = useMemo(() => {
    let list = subcontractors;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(s => s.name.toLowerCase().includes(q) || (s.trade ?? "").toLowerCase().includes(q) || (s.contact_email ?? "").toLowerCase().includes(q));
    }
    if (filterStatus !== "__all__") list = list.filter(s => s.status === filterStatus);
    if (filterDocStatus !== "__all__") list = list.filter(s => s.documentation_status === filterDocStatus);
    if (filterTrade !== "__all__") list = list.filter(s => s.trade === filterTrade);
    return list;
  }, [subcontractors, search, filterStatus, filterDocStatus, filterTrade]);

  const kpis = useMemo(() => {
    const total = subcontractors.length;
    const active = subcontractors.filter(s => s.status === "active").length;
    const docsExpired = subcontractors.filter(s => s.documentation_status === "expired").length;
    const docsPending = subcontractors.filter(s => s.documentation_status === "pending").length;
    const scores = subcontractors.map(s => s.performance_score).filter((v): v is number => v != null);
    const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
    return { total, active, docsExpired, docsPending, avgScore };
  }, [subcontractors]);

  if (!activeProject) return <NoProjectBanner />;

  const meta: ReportMeta = useReportMeta() ?? {
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
      await subcontractorService.softDelete(deletingSub.id, activeProject.id);
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

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="border-border/60">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">{t("subcontractors.kpi.total")}</span>
            </div>
            <p className="text-2xl font-bold text-foreground mt-1">{kpis.total}</p>
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-primary" />
              <span className="text-xs font-medium text-muted-foreground">{t("subcontractors.kpi.active")}</span>
            </div>
            <p className="text-2xl font-bold text-primary mt-1">{kpis.active}</p>
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <span className="text-xs font-medium text-muted-foreground">{t("subcontractors.kpi.docsExpired")}</span>
            </div>
            <p className="text-2xl font-bold text-destructive mt-1">{kpis.docsExpired}</p>
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-600" />
              <span className="text-xs font-medium text-muted-foreground">{t("subcontractors.kpi.docsPending")}</span>
            </div>
            <p className="text-2xl font-bold text-yellow-600 mt-1">{kpis.docsPending}</p>
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <HardHat className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">{t("subcontractors.kpi.avgScore")}</span>
            </div>
            <p className="text-2xl font-bold text-foreground mt-1">{kpis.avgScore != null ? `${kpis.avgScore}/100` : "—"}</p>
          </CardContent>
        </Card>
      </div>

      <FilterBar>
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder={t("subcontractors.searchPlaceholder")}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[160px] h-8 text-sm">
            <SelectValue placeholder={t("subcontractors.filters.allStatuses")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">{t("subcontractors.filters.allStatuses")}</SelectItem>
            {SUB_STATUSES.map(s => (
              <SelectItem key={s} value={s}>{t(`subcontractors.status.${s}`)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterDocStatus} onValueChange={setFilterDocStatus}>
          <SelectTrigger className="w-[160px] h-8 text-sm">
            <SelectValue placeholder={t("subcontractors.filters.allDocStatuses")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">{t("subcontractors.filters.allDocStatuses")}</SelectItem>
            <SelectItem value="pending">{t("subcontractors.docStatus.pending")}</SelectItem>
            <SelectItem value="valid">{t("subcontractors.docStatus.valid")}</SelectItem>
            <SelectItem value="expired">{t("subcontractors.docStatus.expired")}</SelectItem>
          </SelectContent>
        </Select>
        {uniqueTrades.length > 0 && (
          <Select value={filterTrade} onValueChange={setFilterTrade}>
            <SelectTrigger className="w-[170px] h-8 text-sm">
              <SelectValue placeholder={t("subcontractors.filters.allTrades")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">{t("subcontractors.filters.allTrades")}</SelectItem>
              {uniqueTrades.map(tr => (
                <SelectItem key={tr} value={tr}>{TRADE_BADGES[tr]?.label ?? tr}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
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
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("subcontractors.table.specialty")}</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("common.status")}</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("subcontractors.table.fipApproval")}</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("subcontractors.table.docStatus")}</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("subcontractors.table.score")}</TableHead>
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
                  <TableCell>
                    {sub.trade && TRADE_BADGES[sub.trade] ? (
                      <Badge variant="secondary" className={cn("text-xs", TRADE_BADGES[sub.trade].className)}>
                        {TRADE_BADGES[sub.trade].label}
                      </Badge>
                    ) : (
                      <span className="text-sm text-muted-foreground">{sub.trade ?? "—"}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={cn("text-xs", STATUS_COLORS[sub.status] ?? "")}>
                      {t(`subcontractors.status.${sub.status}`, { defaultValue: sub.status })}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {sub.trade && RAILWAY_TRADES.includes(sub.trade) ? (
                      <Badge variant="secondary" className="text-xs bg-yellow-500/15 text-yellow-700 dark:text-yellow-400">
                        {t("subcontractors.fipPending")}
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={cn("text-xs", sub.documentation_status === "valid" ? "bg-primary/20 text-primary" : sub.documentation_status === "expired" ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground")}>
                      {t(`subcontractors.docStatus.${sub.documentation_status}`, { defaultValue: sub.documentation_status })}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{sub.performance_score != null ? `${sub.performance_score}` : "—"}</TableCell>
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
