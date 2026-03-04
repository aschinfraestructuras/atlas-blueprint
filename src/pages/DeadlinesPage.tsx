import { useState, useEffect, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useProject } from "@/contexts/ProjectContext";
import { deadlineService, type DeadlineItem } from "@/lib/services/deadlineService";
import { notificationService } from "@/lib/services/notificationService";
import { NoProjectBanner } from "@/components/NoProjectBanner";
import { EmptyState } from "@/components/EmptyState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FilterBar } from "@/components/ui/filter-bar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import {
  Clock,
  AlertTriangle,
  Truck,
  Package,
  Crosshair,
  Inbox,
  CalendarClock,
  Construction,
  Eye,
  Search,
  RefreshCw,
  Filter,
  Bell,
  ClipboardCheck,
} from "lucide-react";

const SOURCE_ICONS: Record<string, React.ElementType> = {
  supplier_doc: Truck,
  material_doc: Package,
  subcontractor_doc: Truck,       // ← adicionar
  calibration: Crosshair,
  nc_due: AlertTriangle,
  rfi_due: Inbox,
  tech_office_due: Inbox,
  planning_due: CalendarClock,
  ppi_pending: ClipboardCheck,    // ← adicionar
  ppi_approval: ClipboardCheck,   // ← adicionar
};

const SOURCE_ROUTES: Record<string, string> = {
  supplier_doc: "/suppliers",
  material_doc: "/materials",
  subcontractor_doc: "/subcontractors",
  calibration: "/topography",
  nc_due: "/non-conformities",
  rfi_due: "/technical-office/rfis",
  tech_office_due: "/technical-office/items",
  planning_due: "/planning/activities",
  ppi_pending: "/ppi",
  ppi_approval: "/ppi",
};

const SEVERITY_COLORS: Record<string, string> = {
  critical: "bg-destructive/10 text-destructive",
  warning: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
  info: "bg-primary/10 text-primary",
};

const ALL_SOURCES = [
  "supplier_doc",
  "material_doc",
  "calibration",
  "nc_due",
  "rfi_due",
  "tech_office_due",
  "planning_due",
  "ppi_pending",
  "ppi_approval",
  "subcontractor_doc",
] as const;

export default function DeadlinesPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { activeProject } = useProject();

  const [items, setItems] = useState<DeadlineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [daysFilter, setDaysFilter] = useState("30");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSources, setActiveSources] = useState<Set<string>>(new Set(ALL_SOURCES));
  const [generating, setGenerating] = useState(false);

  const fetchData = useCallback(async () => {
    if (!activeProject) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const result = await deadlineService.getAll(activeProject.id, Number(daysFilter));
      setItems(result);
    } catch {
      /* swallow */
    } finally {
      setLoading(false);
    }
  }, [activeProject, daysFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filtered = useMemo(() => {
    let result = items;
    if (activeSources.size < ALL_SOURCES.length) {
      result = result.filter((i) => activeSources.has(i.source));
    }
    if (severityFilter !== "all") {
      result = result.filter((i) => i.severity === severityFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (i) =>
          i.entity_label?.toLowerCase().includes(q) ||
          i.doc_type?.toLowerCase().includes(q) ||
          i.status?.toLowerCase().includes(q),
      );
    }
    return result;
  }, [items, activeSources, severityFilter, searchQuery]);

  // KPIs
  const overdue = items.filter((i) => i.days_remaining < 0).length;
  const in7d = items.filter((i) => i.days_remaining >= 0 && i.days_remaining <= 7).length;
  const in30d = items.filter((i) => i.days_remaining >= 0 && i.days_remaining <= 30).length;

  const toggleSource = (src: string) => {
    setActiveSources((prev) => {
      const next = new Set(prev);
      if (next.has(src)) next.delete(src);
      else next.add(src);
      return next;
    });
  };

  const handleGenerate = async () => {
    if (!activeProject) return;
    setGenerating(true);
    try {
      const count = await notificationService.generateNotifications(activeProject.id, 30);
      toast({ title: t("notifications.generated", { count }) });
    } catch {
      toast({ title: t("notifications.generateError"), variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const handleNavigate = (item: DeadlineItem) => {
    const base = SOURCE_ROUTES[item.source] ?? "/expirations";
    navigate(`${base}/${item.entity_id}`);
  };

  if (!activeProject) return <NoProjectBanner />;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">{t("deadlines.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("deadlines.subtitle")}</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleGenerate} disabled={generating} className="gap-2">
          <Bell className="h-3.5 w-3.5" />
          {t("deadlines.generateAlerts")}
          {generating && <RefreshCw className="h-3 w-3 animate-spin" />}
        </Button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: t("deadlines.kpi.overdue"), value: overdue, color: "text-destructive", bg: "bg-destructive/10" },
          { label: t("deadlines.kpi.in7d"), value: in7d, color: "text-destructive", bg: "bg-destructive/10" },
          {
            label: t("deadlines.kpi.in30d"),
            value: in30d,
            color: "text-yellow-600 dark:text-yellow-400",
            bg: "bg-yellow-500/10",
          },
          { label: t("deadlines.kpi.total"), value: items.length, color: "text-foreground", bg: "bg-muted" },
        ].map((kpi) => (
          <Card key={kpi.label} className="border-0 bg-card shadow-card">
            <CardContent className="p-4 text-center">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{kpi.label}</p>
              <p className={cn("text-2xl font-black tabular-nums mt-1", kpi.value > 0 ? kpi.color : "text-foreground")}>
                {loading ? "—" : kpi.value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <FilterBar>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder={t("deadlines.searchPlaceholder")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-9 w-[200px] text-sm"
          />
        </div>

        <Select value={daysFilter} onValueChange={setDaysFilter}>
          <SelectTrigger className="w-[130px] h-9 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">7 {t("deadlines.days")}</SelectItem>
            <SelectItem value="15">15 {t("deadlines.days")}</SelectItem>
            <SelectItem value="30">30 {t("deadlines.days")}</SelectItem>
            <SelectItem value="60">60 {t("deadlines.days")}</SelectItem>
            <SelectItem value="90">90 {t("deadlines.days")}</SelectItem>
          </SelectContent>
        </Select>

        <Select value={severityFilter} onValueChange={setSeverityFilter}>
          <SelectTrigger className="w-[140px] h-9 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("deadlines.filters.allSeverities")}</SelectItem>
            <SelectItem value="critical">{t("deadlines.severity.critical")}</SelectItem>
            <SelectItem value="warning">{t("deadlines.severity.warning")}</SelectItem>
            <SelectItem value="info">{t("deadlines.severity.info")}</SelectItem>
          </SelectContent>
        </Select>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 gap-1.5 text-sm">
              <Filter className="h-3.5 w-3.5" />
              {t("deadlines.filters.sources")}
              {activeSources.size < ALL_SOURCES.length && (
                <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0">
                  {activeSources.size}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-3">
            <p className="text-xs font-semibold text-muted-foreground mb-2">{t("deadlines.filters.sourceTypes")}</p>
            {ALL_SOURCES.map((src) => (
              <label key={src} className="flex items-center gap-2 py-1 cursor-pointer">
                <Checkbox checked={activeSources.has(src)} onCheckedChange={() => toggleSource(src)} />
                <span className="text-sm">{t(`deadlines.sources.${src}`)}</span>
              </label>
            ))}
          </PopoverContent>
        </Popover>
      </FilterBar>

      {/* Table */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={Clock} subtitleKey="deadlines.empty" />
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground w-8" />
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("deadlines.table.date")}
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("deadlines.table.type")}
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("deadlines.table.entity")}
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("deadlines.table.status")}
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("deadlines.table.days")}
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("deadlines.table.severity")}
                </TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((item) => {
                const Icon = SOURCE_ICONS[item.source] ?? Clock;
                return (
                  <TableRow key={`${item.source}-${item.id}`} className="hover:bg-muted/20">
                    <TableCell>
                      <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {item.due_date ? new Date(item.due_date).toLocaleDateString() : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px]">
                        {t(`deadlines.sources.${item.source}`)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm font-medium text-foreground max-w-[200px] truncate">
                      {item.entity_label}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{item.status}</TableCell>
                    <TableCell
                      className={cn(
                        "text-sm font-bold tabular-nums",
                        item.days_remaining < 0
                          ? "text-destructive"
                          : item.days_remaining <= 7
                            ? "text-destructive"
                            : item.days_remaining <= 30
                              ? "text-yellow-600 dark:text-yellow-400"
                              : "text-foreground",
                      )}
                    >
                      {item.days_remaining}d
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={cn("text-[10px]", SEVERITY_COLORS[item.severity])}>
                        {t(`deadlines.severity.${item.severity}`)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => handleNavigate(item)}
                        title={t("common.view")}
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
