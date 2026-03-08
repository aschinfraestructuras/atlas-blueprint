import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useProject } from "@/contexts/ProjectContext";
import { useRfis } from "@/hooks/useRfis";
import { useProjectRole } from "@/hooks/useProjectRole";
import { rfiService } from "@/lib/services/rfiService";
import { exportRfisCsv, exportRfisPdf } from "@/lib/services/rfiExportService";
import { ReportExportMenu } from "@/components/reports/ReportExportMenu";
import { RfiFormDialog } from "@/components/technical-office/RfiFormDialog";
import { NoProjectBanner } from "@/components/NoProjectBanner";
import { EmptyState } from "@/components/EmptyState";
import { FilterBar } from "@/components/ui/filter-bar";
import { PageHeader } from "@/components/ui/page-header";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { Rfi } from "@/lib/services/rfiService";

import {
  Inbox, Plus, Search, Eye, AlertTriangle, Clock, CheckCircle, FileText, MessageSquareText, Trash2,
} from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const DISCIPLINES = ["terras", "betao", "ferrovia", "catenaria", "st", "drenagem", "estruturas", "outros"] as const;
const PRIORITIES = ["normal", "urgent", "critical"] as const;

const STATUS_COLORS: Record<string, string> = {
  open: "bg-primary/10 text-primary",
  answered: "bg-emerald-500/15 text-emerald-600",
  closed: "bg-muted text-muted-foreground",
  cancelled: "bg-destructive/10 text-destructive",
  overdue: "bg-destructive/15 text-destructive",
};

const PRIORITY_COLORS: Record<string, string> = {
  normal: "bg-muted text-muted-foreground",
  urgent: "bg-amber-500/15 text-amber-600",
  critical: "bg-destructive/10 text-destructive",
};

const OVERDUE_FILTER = "__overdue__";

export default function RFIsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { activeProject } = useProject();
  const { data: rfis, loading, refetch } = useRfis();
  const { canCreate } = useProjectRole();

  const [formOpen, setFormOpen] = useState(false);
  const [editingRfi, setEditingRfi] = useState<Rfi | null>(null);

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("__all__");
  const [filterDiscipline, setFilterDiscipline] = useState("__all__");
  const [filterPriority, setFilterPriority] = useState("__all__");

  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);

  // Calculate KPIs
  const kpis = useMemo(() => {
    const openCount = rfis.filter((r) => r.status === "open").length;
    const answeredCount = rfis.filter((r) => r.status === "answered").length;
    const closedCount = rfis.filter((r) => r.status === "closed").length;
    const overdueCount = rfis.filter(
      (r) => r.status === "open" && (r as any).response_deadline && (r as any).response_deadline < todayStr
    ).length;
    return { open: openCount, answered: answeredCount, overdue: overdueCount, closed: closedCount };
  }, [rfis, todayStr]);

  // Apply filters
  const filtered = useMemo(() => {
    let list = rfis;

    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (r) =>
          (r.code ?? "").toLowerCase().includes(q) ||
          r.subject.toLowerCase().includes(q)
      );
    }

    if (filterStatus === OVERDUE_FILTER) {
      list = list.filter(
        (r) => r.status === "open" && (r as any).response_deadline && (r as any).response_deadline < todayStr
      );
    } else if (filterStatus !== "__all__") {
      list = list.filter((r) => r.status === filterStatus);
    }

    if (filterDiscipline !== "__all__") {
      list = list.filter((r) => (r as any).discipline === filterDiscipline);
    }

    if (filterPriority !== "__all__") {
      list = list.filter((r) => r.priority === filterPriority);
    }

    // Sort by response_deadline ASC (nulls last)
    return [...list].sort((a, b) => {
      const deadlineA = (a as any).response_deadline;
      const deadlineB = (b as any).response_deadline;
      if (deadlineA && deadlineB) return deadlineA.localeCompare(deadlineB);
      if (deadlineA) return -1;
      if (deadlineB) return 1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [rfis, search, filterStatus, filterDiscipline, filterPriority, todayStr]);

  if (!activeProject) return <NoProjectBanner />;

  const handleNew = () => {
    setEditingRfi(null);
    setFormOpen(true);
  };

  const handleRowClick = (rfi: Rfi) => {
    navigate(`/rfis/${rfi.id}`);
  };

  const handleDelete = async (rfi: Rfi) => {
    try {
      await rfiService.softDelete(rfi.id, activeProject.id);
      toast.success(t("technicalOffice.toast.rfiDeleted"));
      refetch();
    } catch {
      toast.error(t("common.deleteError"));
    }
  };

  const meta = { projectName: activeProject.name, projectCode: activeProject.code, locale: "pt" };

  const handleExport = (fmt: "csv" | "pdf") => {
    if (fmt === "csv") exportRfisCsv(rfis, meta);
    else exportRfisPdf(rfis, meta);
  };

  const getDaysOpen = (createdAt: string) => {
    return Math.max(0, Math.floor((today.getTime() - new Date(createdAt).getTime()) / 86400000));
  };

  const getIsOverdue = (rfi: Rfi) => {
    const responseDeadline = (rfi as any).response_deadline;
    return rfi.status === "open" && responseDeadline && responseDeadline < todayStr;
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <PageHeader
          title={t("rfi.page.title", { defaultValue: "RFIs" })}
          description={t("rfi.page.subtitle", { defaultValue: "Pedidos de Informação e Esclarecimento" })}
        />
        <div className="flex items-center gap-2">
          {canCreate && (
            <Button onClick={handleNew} size="sm" className="gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              {t("technicalOffice.newRfi")}
            </Button>
          )}
          <ReportExportMenu
            options={[
              { label: "CSV", icon: "csv", action: () => handleExport("csv") },
              { label: "PDF", icon: "pdf", action: () => handleExport("pdf") },
            ]}
          />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: t("rfi.kpi.open", { defaultValue: "Em Aberto" }), value: kpis.open, icon: FileText, color: "text-primary" },
          { label: t("rfi.kpi.answered", { defaultValue: "Respondidos" }), value: kpis.answered, icon: CheckCircle, color: "text-emerald-600" },
          { label: t("rfi.kpi.overdue", { defaultValue: "Em Atraso" }), value: kpis.overdue, icon: AlertTriangle, color: "text-destructive" },
          { label: t("rfi.kpi.closed", { defaultValue: "Fechados" }), value: kpis.closed, icon: Clock, color: "text-muted-foreground" },
        ].map((kpi, idx) => (
          <Card key={idx}>
            <CardContent className="pt-4 pb-3 flex items-center gap-3">
              <kpi.icon className={cn("h-5 w-5", kpi.color)} />
              <div>
                <p className="text-2xl font-bold">{kpi.value}</p>
                <p className="text-xs text-muted-foreground">{kpi.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <FilterBar>
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder={t("rfi.searchPlaceholder", { defaultValue: "Pesquisar código, assunto…" })}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[160px] h-8 text-sm">
            <SelectValue placeholder={t("rfi.filters.allStatuses", { defaultValue: "Todos os estados" })} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">{t("rfi.filters.allStatuses", { defaultValue: "Todos os estados" })}</SelectItem>
            <SelectItem value={OVERDUE_FILTER}>{t("rfi.filters.overdue", { defaultValue: "⚠ Em atraso" })}</SelectItem>
            <SelectItem value="open">{t("technicalOffice.status.open")}</SelectItem>
            <SelectItem value="answered">{t("technicalOffice.status.answered")}</SelectItem>
            <SelectItem value="closed">{t("technicalOffice.status.closed")}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterDiscipline} onValueChange={setFilterDiscipline}>
          <SelectTrigger className="w-[150px] h-8 text-sm">
            <SelectValue placeholder={t("rfi.filters.allDisciplines", { defaultValue: "Todas disciplinas" })} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">{t("rfi.filters.allDisciplines", { defaultValue: "Todas disciplinas" })}</SelectItem>
            {DISCIPLINES.map((d) => (
              <SelectItem key={d} value={d}>{t(`nc.discipline.${d}`, { defaultValue: d })}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterPriority} onValueChange={setFilterPriority}>
          <SelectTrigger className="w-[140px] h-8 text-sm">
            <SelectValue placeholder={t("rfi.filters.allPriorities", { defaultValue: "Todas prioridades" })} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">{t("rfi.filters.allPriorities", { defaultValue: "Todas prioridades" })}</SelectItem>
            {PRIORITIES.map((p) => (
              <SelectItem key={p} value={p}>{t(`rfi.priority.${p}`, { defaultValue: p })}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FilterBar>

      {/* Table */}
      {loading ? (
        <div className="rounded-xl border border-border overflow-hidden divide-y divide-border">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-3">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={Inbox} subtitleKey="emptyState.technicalOffice.subtitle" />
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("rfi.table.code", { defaultValue: "Código" })}</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("rfi.table.subject", { defaultValue: "Assunto" })}</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("rfi.table.discipline", { defaultValue: "Disciplina" })}</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("rfi.table.priority", { defaultValue: "Prioridade" })}</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("common.status")}</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("rfi.table.responseDeadline", { defaultValue: "Prazo Resposta" })}</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("rfi.table.daysOpen", { defaultValue: "Dias" })}</TableHead>
                <TableHead className="w-16">{t("common.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((rfi) => {
                const isOverdue = getIsOverdue(rfi);
                const daysOpen = getDaysOpen(rfi.created_at);
                const responseDeadline = (rfi as any).response_deadline;

                return (
                  <TableRow
                    key={rfi.id}
                    className="hover:bg-muted/20 transition-colors cursor-pointer"
                    onClick={() => handleRowClick(rfi)}
                  >
                    <TableCell className="font-mono text-xs font-medium">{rfi.code ?? "—"}</TableCell>
                    <TableCell className="font-medium text-sm text-foreground max-w-[250px] truncate">{rfi.subject}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {(rfi as any).discipline
                        ? t(`nc.discipline.${(rfi as any).discipline}`, { defaultValue: (rfi as any).discipline })
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={cn("text-xs", PRIORITY_COLORS[rfi.priority] ?? "")}>
                        {t(`rfi.priority.${rfi.priority}`, { defaultValue: rfi.priority })}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={cn("text-xs", isOverdue ? STATUS_COLORS.overdue : STATUS_COLORS[rfi.status] ?? "")}
                      >
                        {isOverdue
                          ? t("rfi.status.overdue", { defaultValue: "Atrasado" })
                          : t(`technicalOffice.status.${rfi.status}`, { defaultValue: rfi.status })}
                      </Badge>
                    </TableCell>
                    <TableCell className={cn("text-xs", isOverdue && "text-destructive font-medium")}>
                      {responseDeadline ? new Date(responseDeadline).toLocaleDateString() : "—"}
                    </TableCell>
                    <TableCell className={cn("text-xs font-medium", daysOpen > 14 && "text-destructive")}>
                      {daysOpen}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1">
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => handleRowClick(rfi)}>
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive">
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>{t("technicalOffice.rfi.deleteTitle")}</AlertDialogTitle>
                              <AlertDialogDescription>{t("technicalOffice.rfi.deleteDesc")}</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(rfi)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                {t("common.delete")}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Dialog */}
      <RfiFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        rfi={editingRfi}
        onSuccess={refetch}
      />
    </div>
  );
}
