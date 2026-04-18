/**
 * MqtCoverageTab — Cobertura SGQ por rubrica MQT
 *
 * Mostra, para cada rubrica folha do MQT com PK definido, quantos PPIs,
 * ensaios e NCs já existem associados via sobreposição de PK.
 *
 * 100% read-only. Não cria nada, não altera nada — apenas visualiza
 * a vista vw_mqt_quality_coverage.
 */
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/EmptyState";
import {
  Search, Loader2, ShieldCheck, ShieldAlert, ShieldX, AlertTriangle,
  ClipboardCheck, FlaskConical, AlertCircle,
} from "lucide-react";
import { useMqtCoverage } from "@/hooks/useMqt";
import type { MqtCoverageStatus } from "@/lib/services/mqtService";

const STATUS_META: Record<
  MqtCoverageStatus,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline"; className: string; icon: typeof ShieldCheck }
> = {
  covered:   { label: "covered",   variant: "default",     className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30", icon: ShieldCheck },
  partial:   { label: "partial",   variant: "secondary",   className: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30",         icon: ShieldAlert },
  uncovered: { label: "uncovered", variant: "outline",     className: "bg-muted/40 text-muted-foreground border-muted",                                  icon: ShieldX },
  critical:  { label: "critical",  variant: "destructive", className: "bg-destructive/10 text-destructive border-destructive/30",                        icon: AlertTriangle },
};

export function MqtCoverageTab() {
  const { t } = useTranslation();
  const { data: rows = [], isLoading } = useMqtCoverage();

  const [search, setSearch] = useState("");
  const [familyFilter, setFamilyFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const families = useMemo(() => {
    const s = new Set<string>();
    rows.forEach((r) => r.familia && s.add(r.familia));
    return Array.from(s).sort();
  }, [rows]);

  const totals = useMemo(() => {
    const acc = { total: 0, covered: 0, partial: 0, uncovered: 0, critical: 0, withPk: 0 };
    rows.forEach((r) => {
      acc.total++;
      if (r.has_pk) acc.withPk++;
      acc[r.coverage_status]++;
    });
    return acc;
  }, [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (familyFilter !== "all" && r.familia !== familyFilter) return false;
      if (statusFilter !== "all" && r.coverage_status !== statusFilter) return false;
      if (q) {
        const hay = `${r.code_rubrica} ${r.designacao}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [rows, search, familyFilter, statusFilter]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" /> {t("common.loading")}
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <EmptyState
        icon={ShieldCheck}
        title={t("mqt.coverage.empty.title")}
        subtitle={t("mqt.coverage.empty.description")}
      />
    );
  }

  const kpis = [
    { label: t("mqt.coverage.kpi.total"),     value: totals.total,     icon: ClipboardCheck, className: "text-foreground" },
    { label: t("mqt.coverage.kpi.covered"),   value: totals.covered,   icon: ShieldCheck,    className: "text-emerald-600 dark:text-emerald-400" },
    { label: t("mqt.coverage.kpi.partial"),   value: totals.partial,   icon: ShieldAlert,    className: "text-amber-600 dark:text-amber-400" },
    { label: t("mqt.coverage.kpi.uncovered"), value: totals.uncovered, icon: ShieldX,        className: "text-muted-foreground" },
    { label: t("mqt.coverage.kpi.critical"),  value: totals.critical,  icon: AlertTriangle,  className: "text-destructive" },
  ];

  return (
    <div className="space-y-4">
      {/* KPIs de cobertura */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {kpis.map((k) => {
          const Icon = k.icon;
          return (
            <Card key={k.label}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground text-xs">
                  <Icon className={`h-3.5 w-3.5 ${k.className}`} />
                  <span className="uppercase tracking-wide font-medium">{k.label}</span>
                </div>
                <div className={`mt-2 text-xl font-bold tabular-nums ${k.className}`}>{k.value}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Aviso se não houver PKs */}
      {totals.withPk === 0 && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="p-3 flex items-start gap-2 text-sm">
            <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5" />
            <span className="text-muted-foreground">
              {t("mqt.coverage.noPkWarning")}
            </span>
          </CardContent>
        </Card>
      )}

      {/* Filtros */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col md:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("mqt.searchPlaceholder")}
                className="pl-9"
              />
            </div>
            <Select value={familyFilter} onValueChange={setFamilyFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder={t("mqt.filterByFamily")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("mqt.allFamilies")}</SelectItem>
                {families.map((f) => (
                  <SelectItem key={f} value={f}>{f}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("mqt.coverage.allStatus")}</SelectItem>
                <SelectItem value="covered">{t("mqt.coverage.status.covered")}</SelectItem>
                <SelectItem value="partial">{t("mqt.coverage.status.partial")}</SelectItem>
                <SelectItem value="uncovered">{t("mqt.coverage.status.uncovered")}</SelectItem>
                <SelectItem value="critical">{t("mqt.coverage.status.critical")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="text-xs text-muted-foreground">
            {t("mqt.showing", { shown: filtered.length, total: rows.length })}
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              icon={Search}
              title={t("mqt.noResults.title")}
              subtitle={t("mqt.noResults.description")}
            />
          ) : (
            <div className="border rounded-lg overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[180px]">{t("mqt.cols.code")}</TableHead>
                    <TableHead>{t("mqt.cols.designation")}</TableHead>
                    <TableHead className="w-[120px]">{t("mqt.cols.pk")}</TableHead>
                    <TableHead className="w-[90px] text-center">{t("mqt.coverage.cols.ppi")}</TableHead>
                    <TableHead className="w-[90px] text-center">{t("mqt.coverage.cols.tests")}</TableHead>
                    <TableHead className="w-[90px] text-center">{t("mqt.coverage.cols.ncs")}</TableHead>
                    <TableHead className="w-[140px]">{t("mqt.coverage.cols.status")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.slice(0, 1000).map((r) => {
                    const meta = STATUS_META[r.coverage_status];
                    const StatusIcon = meta.icon;
                    return (
                      <TableRow key={r.mqt_item_id}>
                        <TableCell className="font-mono text-xs">{r.code_rubrica}</TableCell>
                        <TableCell className="text-sm">
                          <div>{r.designacao}</div>
                          {r.familia && (
                            <Badge variant="outline" className="text-[10px] mt-1">{r.familia}</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {r.pk_inicio_mqt
                            ? `${r.pk_inicio_mqt}${r.pk_fim_mqt ? ` → ${r.pk_fim_mqt}` : ""}`
                            : "—"}
                        </TableCell>
                        <TableCell className="text-center text-sm tabular-nums">
                          <div className="flex flex-col items-center">
                            <span className="font-semibold">{r.ppi_total}</span>
                            {r.ppi_approved > 0 && (
                              <span className="text-[10px] text-emerald-600 dark:text-emerald-400">
                                ✓ {r.ppi_approved}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center text-sm tabular-nums">
                          <div className="flex flex-col items-center">
                            <span className="font-semibold">{r.tests_total}</span>
                            {(r.tests_pass > 0 || r.tests_fail > 0) && (
                              <span className="text-[10px]">
                                {r.tests_pass > 0 && (
                                  <span className="text-emerald-600 dark:text-emerald-400">✓{r.tests_pass}</span>
                                )}
                                {r.tests_fail > 0 && (
                                  <span className="text-destructive ml-1">✗{r.tests_fail}</span>
                                )}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center text-sm tabular-nums">
                          <div className="flex flex-col items-center">
                            <span className="font-semibold">{r.nc_total}</span>
                            {r.nc_open > 0 && (
                              <span className="text-[10px] text-destructive">
                                ⚠ {r.nc_open}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`gap-1 ${meta.className}`}>
                            <StatusIcon className="h-3 w-3" />
                            {t(`mqt.coverage.status.${meta.label}`)}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              {filtered.length > 1000 && (
                <div className="p-2 text-xs text-center text-muted-foreground bg-muted/30">
                  {t("mqt.truncated", { shown: 1000, total: filtered.length })}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
