import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { ClipboardList, Plus, Search, FileText, Send, CheckCircle, Hash, Eye, Calendar, Trash2, Cloud, Sun, CloudRain } from "lucide-react";
import { StackedBar, DistributionBar } from "@/components/dashboard/DistributionBar";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FilterBar } from "@/components/ui/filter-bar";
import { ModuleKPICard } from "@/components/ModuleKPICard";
import { NoProjectBanner } from "@/components/NoProjectBanner";
import { EmptyState } from "@/components/EmptyState";
import { ArchivedBanner } from "@/components/ArchivedBanner";
import { ShareButton } from "@/components/ui/share-button";
import { CopyableCode } from "@/components/ui/copyable-code";
import { RowActionMenu } from "@/components/ui/row-action-menu";
import { useKeyboardShortcut } from "@/hooks/useKeyboardShortcut";
import { useProject } from "@/contexts/ProjectContext";
import { useArchivedProject } from "@/hooks/useArchivedProject";
import { usePermissions } from "@/hooks/usePermissions";
import { useDailyReports } from "@/hooks/useDailyReports";
import { dailyReportService } from "@/lib/services/dailyReportService";
import { DailyReportFormDialog } from "@/components/daily-reports/DailyReportFormDialog";
import { toast } from "@/hooks/use-toast";

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  submitted: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  validated: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
};

export default function DailyReportsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { activeProject } = useProject();
  const isArchived = useArchivedProject();
  const { canDelete } = usePermissions();
  const { data, loading, refetch } = useDailyReports();

  const handleDelete = async (id: string) => {
    if (!confirm(t("common.confirmDelete"))) return;
    try {
      await dailyReportService.update(id, { is_deleted: true });
      toast({ title: t("common.softDeleted") });
      refetch();
    } catch {
      toast({ title: "Erro ao eliminar", variant: "destructive" });
    }
  };

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);

  const filtered = useMemo(() => {
    let list = data;
    if (statusFilter !== "all") list = list.filter(r => r.status === statusFilter);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(r =>
        r.report_number.toLowerCase().includes(q) ||
        r.report_date.includes(q) ||
        (r.weather ?? "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [data, statusFilter, search]);

  const kpis = useMemo(() => ({
    total: data.length,
    draft: data.filter(r => r.status === "draft").length,
    submitted: data.filter(r => r.status === "submitted").length,
    validated: data.filter(r => r.status === "validated").length,
  }), [data]);

  // Keyboard shortcut: N → new report
  useKeyboardShortcut("n", () => { if (!isArchived && activeProject) setDialogOpen(true); }, { enabled: !isArchived && !!activeProject });

  if (!activeProject) return <NoProjectBanner />;

  return (
    <div className="space-y-6 p-6">
      {isArchived && <ArchivedBanner />}

      <PageHeader
        icon={ClipboardList}
        title={t("dailyReports.title")}
        subtitle={t("dailyReports.subtitle")}
        actions={!isArchived ? (
          <div className="flex items-center gap-2">
            <ShareButton />
            <Button onClick={() => setDialogOpen(true)} size="sm">
              <Plus className="h-4 w-4 mr-1" /> {t("dailyReports.new")}
            </Button>
          </div>
        ) : undefined}
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <ModuleKPICard label="Total" value={kpis.total} icon={Hash} />
        <ModuleKPICard label={t("dailyReports.status.draft")} value={kpis.draft} icon={FileText} />
        <ModuleKPICard label={t("dailyReports.status.submitted")} value={kpis.submitted} icon={Send} />
        <ModuleKPICard label={t("dailyReports.status.validated")} value={kpis.validated} icon={CheckCircle} />
      </div>

      {/* Distribution Charts */}
      {data.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <StackedBar
            title={t("common.status")}
            icon={ClipboardList}
            segments={[
              { key: "draft", label: t("dailyReports.status.draft"), value: kpis.draft, color: "hsl(var(--muted-foreground))" },
              { key: "submitted", label: t("dailyReports.status.submitted"), value: kpis.submitted, color: "hsl(var(--primary))" },
              { key: "validated", label: t("dailyReports.status.validated"), value: kpis.validated, color: "hsl(var(--chart-2))" },
            ]}
          />
          <DistributionBar
            title={t("dailyReports.fields.weather")}
            icon={Cloud}
            entries={(() => {
              const map: Record<string, number> = {};
              data.forEach(r => { const w = r.weather ?? "—"; map[w] = (map[w] ?? 0) + 1; });
              return Object.entries(map).map(([k, v]) => ({ key: k, label: k, value: v }));
            })()}
          />
        </div>
      )}

      {/* Filters */}
      <FilterBar>
        <div className="relative flex-1 min-w-[180px] max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input className="pl-8 h-8 text-sm" placeholder={t("common.search")} value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px] h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("dailyReports.filters.allStatuses")}</SelectItem>
            <SelectItem value="draft">{t("dailyReports.status.draft")}</SelectItem>
            <SelectItem value="submitted">{t("dailyReports.status.submitted")}</SelectItem>
            <SelectItem value="validated">{t("dailyReports.status.validated")}</SelectItem>
          </SelectContent>
        </Select>
        <span className="ml-auto text-xs text-muted-foreground tabular-nums">
          {filtered.length} / {data.length}
        </span>
      </FilterBar>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">{t("common.loading")}</div>
          ) : filtered.length === 0 ? (
            <EmptyState titleKey="common.noData" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("dailyReports.fields.reportNumber")}</TableHead>
                  <TableHead>{t("dailyReports.fields.reportDate")}</TableHead>
                  <TableHead>{t("dailyReports.fields.weather")}</TableHead>
                  <TableHead>{t("common.status")}</TableHead>
                   <TableHead>{t("dailyReports.signatures.title")}</TableHead>
                   <TableHead className="w-[60px]" />
                 </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(r => (
                  <TableRow key={r.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/daily-reports/${r.id}`)}>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <CopyableCode value={r.report_number} />
                    </TableCell>
                    <TableCell>{r.report_date}</TableCell>
                    <TableCell>{r.weather ?? "—"}</TableCell>
                    <TableCell>
                      <Badge className={STATUS_COLORS[r.status] ?? ""} variant="secondary">
                        {t(`dailyReports.status.${r.status}`)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {r.signed_contractor && <Badge variant="outline" className="text-[10px]">E</Badge>}
                        {r.signed_supervisor && <Badge variant="outline" className="text-[10px]">F</Badge>}
                        {r.signed_ip && <Badge variant="outline" className="text-[10px]">IP</Badge>}
                      </div>
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <RowActionMenu
                        shareUrl={`${window.location.origin}/daily-reports/${r.id}`}
                        actions={[
                          { key: "view", label: t("common.view"), icon: Eye, onClick: () => navigate(`/daily-reports/${r.id}`) },
                          ...(canDelete && r.status === "draft" ? [{ key: "delete", label: t("common.delete"), icon: Trash2, onClick: () => handleDelete(r.id), variant: "destructive" as const }] : []),
                        ]}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <DailyReportFormDialog open={dialogOpen} onOpenChange={setDialogOpen} onCreated={refetch} />
    </div>
  );
}
