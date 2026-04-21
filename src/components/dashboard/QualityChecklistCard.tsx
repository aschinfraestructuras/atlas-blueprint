import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, XCircle, AlertCircle, ClipboardCheck, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCountUp } from "@/hooks/useCountUp";
import { cn } from "@/lib/utils";

type ItemStatus = "ok" | "warn" | "nc" | "empty";

interface ChecklistItem {
  key: string;
  label: string;
  pct: number;          // 0..100
  status: ItemStatus;
  hint?: string;        // ex: "12/14"
  route?: string;
}

interface Props {
  items: ChecklistItem[];
  loading?: boolean;
  /** Percentagem global (0..100). Se omitida calcula média ponderada. */
  globalPct?: number;
}

const STATUS_TONE: Record<ItemStatus, { bar: string; chipBg: string; chipFg: string; chipBd: string; icon: React.ElementType; iconBg: string; iconFg: string; chipLabelKey: string }> = {
  ok: {
    bar: "bg-emerald-500",
    chipBg: "bg-emerald-500/10", chipFg: "text-emerald-600", chipBd: "border-emerald-500/30",
    icon: CheckCircle2, iconBg: "bg-emerald-500/12", iconFg: "text-emerald-600",
    chipLabelKey: "dashboard.checklist.ok",
  },
  warn: {
    bar: "bg-amber-500",
    chipBg: "bg-amber-500/10", chipFg: "text-amber-700", chipBd: "border-amber-500/30",
    icon: AlertCircle, iconBg: "bg-amber-500/12", iconFg: "text-amber-600",
    chipLabelKey: "dashboard.checklist.warn",
  },
  nc: {
    bar: "bg-destructive",
    chipBg: "bg-destructive/10", chipFg: "text-destructive", chipBd: "border-destructive/30",
    icon: XCircle, iconBg: "bg-destructive/12", iconFg: "text-destructive",
    chipLabelKey: "dashboard.checklist.nc",
  },
  empty: {
    bar: "bg-muted-foreground/30",
    chipBg: "bg-muted/40", chipFg: "text-muted-foreground", chipBd: "border-border",
    icon: AlertCircle, iconBg: "bg-muted/40", iconFg: "text-muted-foreground",
    chipLabelKey: "dashboard.checklist.warn",
  },
};

export function QualityChecklistCard({ items, loading, globalPct }: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const computedGlobal = useMemo(() => {
    if (globalPct !== undefined) return globalPct;
    const valid = items.filter(i => i.status !== "empty");
    if (valid.length === 0) return 0;
    return Math.round(valid.reduce((s, i) => s + i.pct, 0) / valid.length);
  }, [items, globalPct]);

  const animPct = useCountUp(loading ? 0 : computedGlobal, { duration: 900, delay: 150 });
  const okCount = items.filter(i => i.status === "ok").length;
  const totalEvaluated = items.filter(i => i.status !== "empty").length;

  const ringColor =
    computedGlobal >= 80 ? "hsl(145 55% 42%)"
    : computedGlobal >= 50 ? "hsl(38 85% 50%)"
    : "hsl(var(--destructive))";

  const SIZE = 64, R = 26, C = 2 * Math.PI * R, VB = SIZE + 4, CENTER = VB / 2;

  return (
    <Card className="relative overflow-hidden border border-border/60 bg-card shadow-card animate-fade-in">
      {/* Accent gradient backdrop */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.04] via-card to-emerald-500/[0.03]" />
      <div
        className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{
          backgroundImage: "linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />

      <CardContent className="relative z-10 p-4 sm:p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
              <ClipboardCheck className="h-5 w-5 text-primary" strokeWidth={2.2} />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-black tracking-tight text-foreground leading-tight truncate">
                {t("dashboard.checklist.title")}
              </h3>
              <p className="text-[10px] sm:text-[11px] text-muted-foreground/80 truncate mt-0.5">
                {t("dashboard.checklist.subtitle")}
              </p>
            </div>
          </div>

          {/* Ring percentage */}
          <div className="relative flex-shrink-0">
            <svg width={SIZE} height={SIZE} viewBox={`0 0 ${VB} ${VB}`}>
              <circle cx={CENTER} cy={CENTER} r={R} fill="none" stroke="hsl(var(--muted))" strokeWidth="4.5" />
              <circle
                cx={CENTER} cy={CENTER} r={R} fill="none" stroke={ringColor} strokeWidth="4.5" strokeLinecap="round"
                strokeDasharray={C}
                strokeDashoffset={C * (1 - animPct / 100)}
                transform={`rotate(-90 ${CENTER} ${CENTER})`}
                style={{ transition: "stroke-dashoffset 1s cubic-bezier(0.16,1,0.3,1)" }}
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-xs font-black tabular-nums text-foreground">
              {loading ? "—" : `${Math.round(animPct)}%`}
            </span>
          </div>
        </div>

        {/* Items */}
        {loading ? (
          <div className="space-y-2.5">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full rounded-lg" />)}
          </div>
        ) : items.length === 0 ? (
          <p className="text-xs text-muted-foreground py-6 text-center">{t("dashboard.checklist.empty")}</p>
        ) : (
          <ul className="space-y-2">
            {items.map((it) => {
              const tone = STATUS_TONE[it.status];
              const Icon = tone.icon;
              return (
                <li
                  key={it.key}
                  className={cn(
                    "group flex items-center gap-3 rounded-xl px-2.5 py-2 transition-colors",
                    it.route && "cursor-pointer hover:bg-muted/40",
                  )}
                  onClick={it.route ? () => navigate(it.route!) : undefined}
                  role={it.route ? "link" : undefined}
                >
                  <div className={cn("h-7 w-7 rounded-lg flex items-center justify-center flex-shrink-0", tone.iconBg)}>
                    <Icon className={cn("h-4 w-4", tone.iconFg)} strokeWidth={2.4} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <p className="text-xs sm:text-[13px] font-semibold text-foreground truncate">{it.label}</p>
                      {it.hint && (
                        <span className="text-[10px] tabular-nums text-muted-foreground/70 font-medium flex-shrink-0">{it.hint}</span>
                      )}
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-muted/60 overflow-hidden">
                      <div
                        className={cn("h-full rounded-full transition-all duration-700 ease-out", tone.bar)}
                        style={{ width: `${Math.max(2, it.pct)}%` }}
                      />
                    </div>
                  </div>

                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[10px] font-bold uppercase tracking-wider px-2 h-5 flex-shrink-0",
                      tone.chipBg, tone.chipFg, tone.chipBd,
                    )}
                  >
                    {t(tone.chipLabelKey)}
                  </Badge>
                </li>
              );
            })}
          </ul>
        )}

        {/* Footer */}
        {!loading && items.length > 0 && (
          <div className="mt-4 pt-3 border-t border-border/40 flex items-center justify-between gap-3">
            <p className="text-[11px] text-muted-foreground tabular-nums">
              {t("dashboard.checklist.footerOk", { ok: okCount, total: totalEvaluated })}
            </p>
            <Button
              variant="outline"
              size="sm"
              className="h-7 gap-1.5 text-[11px] font-semibold border-primary/30 text-primary hover:bg-primary/5"
              onClick={() => navigate("/indicators?tab=sgq")}
            >
              {t("dashboard.checklist.viewAll")}
              <ArrowRight className="h-3 w-3" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
