import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  AlertTriangle, FlaskConical, ClipboardCheck, FileText,
  Crosshair, CheckSquare, ArrowRight,
} from "lucide-react";
import type { ProjectHealth } from "@/hooks/useProjectHealth";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  health: ProjectHealth;
  loading?: boolean;
}

const STATUS_COLORS = {
  healthy: "text-emerald-600 dark:text-emerald-400",
  attention: "text-amber-600 dark:text-amber-400",
  critical: "text-destructive",
};

const STATUS_BG = {
  healthy: "bg-emerald-500/10",
  attention: "bg-amber-500/10",
  critical: "bg-destructive/10",
};

interface HealthRow {
  labelKey: string;
  icon: React.ElementType;
  value: number;
  max: number;
  unit: string;
  route: string;
  invert?: boolean; // true = lower is better
}

export function HealthScoreSheet({ open, onOpenChange, health, loading }: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const rows: HealthRow[] = [
    { labelKey: "health.components.nc", icon: AlertTriangle, value: health.total_nc_open, max: 10, unit: t("health.components.nc"), route: "/non-conformities", invert: true },
    { labelKey: "health.components.ncOverdue", icon: AlertTriangle, value: health.total_nc_overdue, max: 5, unit: t("health.components.ncOverdue"), route: "/non-conformities", invert: true },
    { labelKey: "health.components.tests", icon: FlaskConical, value: health.total_tests_pending, max: 10, unit: t("health.components.tests"), route: "/tests", invert: true },
    { labelKey: "health.components.ppis", icon: ClipboardCheck, value: health.total_ppi_pending, max: 10, unit: t("health.components.ppis"), route: "/ppi", invert: true },
    { labelKey: "health.components.docs", icon: FileText, value: health.total_documents_expired, max: 5, unit: t("health.components.docs"), route: "/documents", invert: true },
    { labelKey: "health.components.calibrations", icon: Crosshair, value: health.total_calibrations_expired, max: 5, unit: t("health.components.calibrations"), route: "/topography", invert: true },
    { labelKey: "health.components.readiness", icon: CheckSquare, value: health.readiness_ratio, max: 100, unit: "%", route: "/work-items", invert: false },
  ];

  function getRowColor(row: HealthRow): string {
    if (row.invert) {
      if (row.value === 0) return "text-emerald-600";
      if (row.value <= 2) return "text-amber-600";
      return "text-destructive";
    }
    if (row.value >= 80) return "text-emerald-600";
    if (row.value >= 50) return "text-amber-600";
    return "text-destructive";
  }

  function getProgressValue(row: HealthRow): number {
    if (row.invert) return Math.max(0, 100 - (row.value / row.max) * 100);
    return Math.min(100, (row.value / row.max) * 100);
  }

  function getProgressColor(row: HealthRow): string {
    if (row.invert) {
      if (row.value === 0) return "bg-emerald-500";
      if (row.value <= 2) return "bg-amber-500";
      return "bg-destructive";
    }
    if (row.value >= 80) return "bg-emerald-500";
    if (row.value >= 50) return "bg-amber-500";
    return "bg-destructive";
  }

  function displayValue(row: HealthRow): string {
    if (row.invert) {
      if (row.value === 0) return "OK";
      return `${row.value} ${row.labelKey.includes("nc") ? t("health.components.nc").toLowerCase().includes("nc") ? "" : "" : ""}`.trim() || String(row.value);
    }
    return `${row.value}%`;
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="pb-4">
          <SheetTitle className="flex items-center justify-between">
            <span>{t("health.sheetTitle", { defaultValue: "Estado Geral da Obra" })}</span>
            <span className={cn("text-2xl font-black tabular-nums", STATUS_COLORS[health.health_status])}>
              {health.health_score}
              <span className="text-xs font-bold text-muted-foreground ml-1">/ 100</span>
            </span>
          </SheetTitle>
          <Badge
            variant="secondary"
            className={cn("w-fit text-[10px] font-bold uppercase tracking-wider", STATUS_BG[health.health_status], STATUS_COLORS[health.health_status])}
          >
            {t(`health.${health.health_status}`)}
          </Badge>
        </SheetHeader>

        <div className="space-y-1.5 mt-2">
          {rows.map((row) => {
            const Icon = row.icon;
            const color = getRowColor(row);
            const pVal = getProgressValue(row);
            const pColor = getProgressColor(row);
            return (
              <button
                key={row.labelKey}
                type="button"
                className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-muted/50 transition-colors group"
                onClick={() => { onOpenChange(false); navigate(row.route); }}
              >
                <Icon className={cn("h-4 w-4 flex-shrink-0", color)} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">{t(row.labelKey)}</p>
                  <div className="relative h-1.5 w-full rounded-full bg-muted mt-1 overflow-hidden">
                    <div
                      className={cn("absolute inset-y-0 left-0 rounded-full transition-all duration-500", pColor)}
                      style={{ width: `${Math.max(4, pVal)}%` }}
                    />
                  </div>
                </div>
                <span className={cn("text-sm font-bold tabular-nums min-w-[48px] text-right", color)}>
                  {row.invert ? (row.value === 0 ? "OK" : row.value) : `${row.value}%`}
                </span>
                <ArrowRight className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            );
          })}
        </div>

        {/* Quick action buttons */}
        <div className="mt-6 pt-4 border-t border-border space-y-2">
          <Button variant="outline" size="sm" className="w-full justify-start gap-2" onClick={() => { onOpenChange(false); navigate("/non-conformities"); }}>
            <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
            {t("health.viewNcs", { defaultValue: "Ver NCs abertas" })}
          </Button>
          <Button variant="outline" size="sm" className="w-full justify-start gap-2" onClick={() => { onOpenChange(false); navigate("/ppi"); }}>
            <ClipboardCheck className="h-3.5 w-3.5 text-amber-500" />
            {t("health.viewPpis", { defaultValue: "Ver PPIs pendentes" })}
          </Button>
          <Button variant="outline" size="sm" className="w-full justify-start gap-2" onClick={() => { onOpenChange(false); navigate("/tests"); }}>
            <FlaskConical className="h-3.5 w-3.5 text-primary" />
            {t("health.viewTests", { defaultValue: "Ver ensaios em atraso" })}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
