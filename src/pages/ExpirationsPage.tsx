import { useState, useEffect, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useProject } from "@/contexts/ProjectContext";
import { expirationService, type ExpiringItem } from "@/lib/services/expirationService";
import { NoProjectBanner } from "@/components/NoProjectBanner";
import { EmptyState } from "@/components/EmptyState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FilterBar } from "@/components/ui/filter-bar";
import { ReportExportMenu } from "@/components/reports/ReportExportMenu";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Clock, AlertTriangle, Truck, HardHat, Crosshair, Package, Eye, Users } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  expired: "bg-destructive/10 text-destructive",
  expiring_7d: "bg-destructive/10 text-destructive",
  expiring_30d: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
  expiring_60d: "bg-primary/10 text-primary",
  expiring_90d: "bg-muted text-muted-foreground",
};

const STATUS_LABELS: Record<string, string> = {
  expired: "Expirado",
  expiring_7d: "≤ 7 dias",
  expiring_30d: "≤ 30 dias",
  expiring_60d: "≤ 60 dias",
  expiring_90d: "≤ 90 dias",
};

const DOMAIN_ICONS: Record<string, React.ElementType> = {
  supplier: Truck,
  subcontractor: HardHat,
  calibration: Crosshair,
  material: Package,
  personnel: Users,
};

const DOMAIN_ROUTES: Record<string, string> = {
  supplier: "/suppliers",
  subcontractor: "/subcontractors",
  calibration: "/topography",
  material: "/materials",
  personnel: "/documents",
};

type DomainTab = "all" | "supplier" | "subcontractor" | "calibration" | "material" | "personnel";

export default function ExpirationsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { activeProject } = useProject();

  const [items, setItems] = useState<ExpiringItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<DomainTab>("all");
  const [urgencyFilter, setUrgencyFilter] = useState("all");

  const fetch = useCallback(async () => {
    if (!activeProject) { setItems([]); setLoading(false); return; }
    setLoading(true);
    try {
      const result = await expirationService.getAll(activeProject.id, 90);
      setItems(result);
    } catch { /* swallow */ }
    finally { setLoading(false); }
  }, [activeProject]);

  useEffect(() => { fetch(); }, [fetch]);

  const filtered = useMemo(() => {
    let result = items;
    if (tab !== "all") result = result.filter(i => i.domain === tab);
    if (urgencyFilter !== "all") result = result.filter(i => i.status === urgencyFilter);
    return result;
  }, [items, tab, urgencyFilter]);

  const summary = useMemo(() => {
    const s: Record<string, number> = { all: 0, supplier: 0, subcontractor: 0, calibration: 0, material: 0, personnel: 0 };
    items.forEach(i => { s[i.domain]++; s.all++; });
    return s;
  }, [items]);

  const expiredCount = items.filter(i => i.status === "expired").length;
  const expiringCount = items.filter(i => i.status !== "expired").length;

  if (!activeProject) return <NoProjectBanner />;

  const { toast } = useToast();
  
  const handleNavigate = (item: ExpiringItem) => {
    const base = DOMAIN_ROUTES[item.domain] ?? "/";
    const id = item.entity_id;
    const isValid = id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    if (isValid) {
      navigate(`${base}/${id}`);
    } else {
      toast({ title: t("common.idInvalid", { defaultValue: "ID inválido" }), description: t("common.idInvalidDesc", { defaultValue: "Este registo não pode ser aberto." }), variant: "destructive" });
      navigate(base);
    }
  };

  const handleExportCsv = () => {
    const headers = ["Domínio", "Entidade", "Documento", "Tipo", "Validade", "Dias", "Estado"];
    const rows = filtered.map(i => [
      i.domain, i.entity_name, i.doc_title, i.doc_type,
      i.valid_to, String(i.days_remaining), STATUS_LABELS[i.status] ?? i.status,
    ]);
    const csv = [headers.join(";"), ...rows.map(r => r.join(";"))].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `EXP_${activeProject.code}.csv`; a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">{t("expirations.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("expirations.subtitle")}</p>
        </div>
        <ReportExportMenu options={[{ label: "CSV", icon: "csv" as const, action: handleExportCsv }]} />
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="border-0 bg-card shadow-card">
          <CardContent className="p-4 text-center">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{t("expirations.summary.total")}</p>
            <p className="text-2xl font-black tabular-nums text-foreground mt-1">{items.length}</p>
          </CardContent>
        </Card>
        <Card className="border-0 bg-card shadow-card">
          <CardContent className="p-4 text-center">
            <p className="text-[10px] font-bold uppercase tracking-widest text-destructive">{t("expirations.summary.expired")}</p>
            <p className={cn("text-2xl font-black tabular-nums mt-1", expiredCount > 0 ? "text-destructive" : "text-foreground")}>{expiredCount}</p>
          </CardContent>
        </Card>
        <Card className="border-0 bg-card shadow-card">
          <CardContent className="p-4 text-center">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{t("expirations.summary.expiring")}</p>
            <p className="text-2xl font-black tabular-nums text-foreground mt-1">{expiringCount}</p>
          </CardContent>
        </Card>
        <Card className="border-0 bg-card shadow-card">
          <CardContent className="p-4 text-center">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{t("expirations.summary.domains")}</p>
            <p className="text-2xl font-black tabular-nums text-foreground mt-1">{Object.values(summary).filter((v, i) => i > 0 && v > 0).length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={v => setTab(v as DomainTab)} className="space-y-4">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="all">
            {t("expirations.tabs.all")}
            {summary.all > 0 && <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5 py-0">{summary.all}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="supplier">
            {t("expirations.tabs.suppliers")}
            {summary.supplier > 0 && <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5 py-0">{summary.supplier}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="subcontractor">
            {t("expirations.tabs.subcontractors")}
            {summary.subcontractor > 0 && <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5 py-0">{summary.subcontractor}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="calibration">
            {t("expirations.tabs.calibrations")}
            {summary.calibration > 0 && <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5 py-0">{summary.calibration}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="material">
            {t("expirations.tabs.materials")}
            {summary.material > 0 && <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5 py-0">{summary.material}</Badge>}
          </TabsTrigger>
        </TabsList>

        <FilterBar>
          <Select value={urgencyFilter} onValueChange={setUrgencyFilter}>
            <SelectTrigger className="w-[160px] h-9 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("expirations.filters.allUrgency")}</SelectItem>
              <SelectItem value="expired">{t("expirations.filters.expired")}</SelectItem>
              <SelectItem value="expiring_7d">{t("expirations.filters.7days")}</SelectItem>
              <SelectItem value="expiring_30d">{t("expirations.filters.30days")}</SelectItem>
              <SelectItem value="expiring_60d">{t("expirations.filters.60days")}</SelectItem>
              <SelectItem value="expiring_90d">{t("expirations.filters.90days")}</SelectItem>
            </SelectContent>
          </Select>
        </FilterBar>

        {/* Shared table content for all tabs */}
        {["all", "supplier", "subcontractor", "calibration", "material", "personnel"].map(tabValue => (
          <TabsContent key={tabValue} value={tabValue}>
            {loading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : filtered.length === 0 ? (
              <EmptyState icon={Clock} subtitleKey="expirations.empty" />
            ) : (
              <div className="rounded-xl border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40">
                      <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground w-8" />
                      <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("expirations.table.entity")}</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("expirations.table.document")}</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("expirations.table.validTo")}</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("expirations.table.days")}</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("common.status")}</TableHead>
                      <TableHead className="w-12" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map(item => {
                      const Icon = DOMAIN_ICONS[item.domain] ?? Clock;
                      return (
                        <TableRow key={`${item.domain}-${item.id}`} className="hover:bg-muted/20">
                          <TableCell><Icon className="h-3.5 w-3.5 text-muted-foreground" /></TableCell>
                          <TableCell className="text-sm font-medium text-foreground">{item.entity_name}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{item.doc_title}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{new Date(item.valid_to).toLocaleDateString()}</TableCell>
                          <TableCell className={cn("text-sm font-bold tabular-nums", item.days_remaining < 0 ? "text-destructive" : item.days_remaining <= 7 ? "text-destructive" : item.days_remaining <= 30 ? "text-yellow-600 dark:text-yellow-400" : "text-foreground")}>
                            {item.days_remaining}d
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className={cn("text-xs", STATUS_COLORS[item.status] ?? "")}>
                              {STATUS_LABELS[item.status] ?? item.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleNavigate(item)} title={t("common.view")}>
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
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
