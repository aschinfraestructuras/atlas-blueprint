import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import type { PpiInstanceStatus, PpiItemResult } from "@/lib/services/ppiService";

const STATUS_VARIANT: Record<PpiInstanceStatus, "default" | "secondary" | "destructive" | "outline"> = {
  draft:       "outline",
  in_progress: "default",
  submitted:   "default",
  approved:    "secondary",
  rejected:    "destructive",
  archived:    "outline",
};

const STATUS_COLOR: Record<PpiInstanceStatus, string> = {
  draft:       "",
  in_progress: "border-primary/40 bg-primary/10 text-primary",
  submitted:   "border-amber-400/40 bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400",
  approved:    "border-emerald-400/40 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400",
  rejected:    "",
  archived:    "border-muted text-muted-foreground",
};

export function PPIStatusBadge({ status }: { status: PpiInstanceStatus | string }) {
  const { t } = useTranslation();
  const s = status as PpiInstanceStatus;
  const variant = STATUS_VARIANT[s] ?? "outline";
  const extraCls = STATUS_COLOR[s] ?? "";
  return (
    <Badge variant={variant} className={`text-xs ${extraCls}`}>
      {t(`ppi.status.${status}`, { defaultValue: status })}
    </Badge>
  );
}

// ─── Result badge for item-level results ──────────────────────────────────────

const RESULT_COLORS: Partial<Record<PpiItemResult, string>> = {
  ok:      "border-emerald-400/40 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400",
  pass:    "border-emerald-400/40 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400",
  nok:     "border-destructive/40 bg-destructive/10 text-destructive",
  fail:    "border-destructive/40 bg-destructive/10 text-destructive",
  na:      "border-border text-muted-foreground bg-muted/40",
  pending: "border-amber-300/60 bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300",
};

export function PPIResultBadge({ result }: { result: PpiItemResult | string }) {
  const { t } = useTranslation();
  const cls = RESULT_COLORS[result as PpiItemResult] ?? "";
  return (
    <Badge variant="outline" className={`text-xs ${cls}`}>
      {t(`ppi.instances.results.${result}`, { defaultValue: result })}
    </Badge>
  );
}

export function PPITemplateBadge({ active }: { active: boolean }) {
  const { t } = useTranslation();
  return (
    <Badge
      variant="outline"
      className={
        active
          ? "border-emerald-400/40 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 text-xs"
          : "border-muted text-muted-foreground text-xs"
      }
    >
      {active ? t("ppi.templateStatus.active") : t("ppi.templateStatus.inactive")}
    </Badge>
  );
}
