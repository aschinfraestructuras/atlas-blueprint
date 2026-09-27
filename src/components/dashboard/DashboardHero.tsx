import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import {
  Calendar, Building2, Briefcase, Activity, ChevronRight,
  AlertTriangle, ClipboardCheck, FlaskConical, Package,
  type LucideIcon,
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface KpiInput {
  ncOpen: number;
  ppiApproved: number;
  ppiTotal: number;
  testsCompleted: number;
  testsTotal: number;
  pamePending: number;
}

interface Props {
  displayName: string;
  projectName: string;
  projectCode?: string | null;
  client?: string | null;
  contractor?: string | null;
  startDate?: string | null;
  period: string;
  onPeriodChange: (v: string) => void;
  accentTone?: "green" | "amber" | "red";
  liveUpdatedAgo?: string;
  hpPending?: number;
  /** RMSGQ do mês anterior: em atraso (overdue) ou a vencer, com dias */
  rmsgq?: { overdue: boolean; days: number } | null;
  kpis: KpiInput;
  loading?: boolean;
  /** Optional sparkline series per KPI (last 8-12 values). */
  sparklines?: { nc?: number[]; ppi?: number[]; tests?: number[]; pame?: number[] };
}

function formatDateRange(startDate?: string | null) {
  if (!startDate) return null;
  const start = new Date(startDate);
  if (isNaN(start.getTime())) return null;
  const days = Math.floor((Date.now() - start.getTime()) / 86400000);
  return {
    startStr: start.toLocaleDateString("pt-PT", { day: "2-digit", month: "short", year: "numeric" }),
    days,
  };
}

const TONE_CHIP = {
  green: "text-emerald-700 bg-emerald-500/10 border-emerald-500/30 dark:text-emerald-400",
  amber: "text-amber-700 bg-amber-500/10 border-amber-500/30 dark:text-amber-400",
  red:   "text-red-700 bg-red-500/10 border-red-500/30 dark:text-red-400",
} as const;

const TONE_DOT = { green: "bg-emerald-500", amber: "bg-amber-500", red: "bg-red-500" } as const;

const KPI_ICON = {
  green: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  red:   "bg-red-500/10 text-red-600 dark:text-red-400",
  cyan:  "bg-sky-500/10 text-sky-600 dark:text-sky-400",
} as const;

const KPI_SPARK = { green: "text-emerald-500", amber: "text-amber-500", red: "text-red-500", cyan: "text-sky-500" } as const;

const TONE_LABEL = {
  green: { pt: "Saudável", es: "Saludable" },
  amber: { pt: "Atenção",  es: "Atención"  },
  red:   { pt: "Crítico",  es: "Crítico"   },
} as const;

export function DashboardHero({
  displayName, projectName, projectCode, client, contractor, startDate,
  period, onPeriodChange, accentTone = "green", liveUpdatedAgo,
  hpPending = 0, rmsgq = null, kpis, loading = false, sparklines = {},
}: Props) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const range = formatDateRange(startDate);
  const isES = i18n.language === "es";
  const stateLabel = isES ? TONE_LABEL[accentTone].es : TONE_LABEL[accentTone].pt;

  // KPI tone derivation
  const ppiPct   = kpis.ppiTotal   > 0 ? Math.round((kpis.ppiApproved    / kpis.ppiTotal)   * 100) : 0;
  const testsPct = kpis.testsTotal > 0 ? Math.round((kpis.testsCompleted / kpis.testsTotal) * 100) : 0;
  const ncTone:    "green" | "amber" | "red" = kpis.ncOpen === 0 ? "green" : kpis.ncOpen <= 3 ? "amber" : "red";
  const ppiTone:   "green" | "amber" | "cyan" = kpis.ppiTotal === 0 ? "cyan"  : ppiPct >= 80 ? "green" : ppiPct >= 50 ? "amber" : "cyan";
  const testsTone: "green" | "amber" | "cyan" = kpis.testsTotal === 0 ? "cyan" : testsPct >= 70 ? "green" : "amber";
  const pameTone:  "green" | "amber" | "red"  = kpis.pamePending === 0 ? "green" : kpis.pamePending <= 5 ? "amber" : "red";

  type IconType = LucideIcon;
  const heroKpis: Array<{ icon: IconType; label: string; value: number | string; ratio?: string; hint?: string; tone: "cyan" | "amber" | "red" | "green"; spark?: number[]; route: string; }> = [
    {
      icon: AlertTriangle,
      label: t("dashboard.module.nc", { defaultValue: "Não Conformidades" }),
      value: kpis.ncOpen,
      hint: kpis.ncOpen === 0 ? t("dashboard.moduleSub.noAlerts", { defaultValue: "Sem alertas" }) : `${kpis.ncOpen} ${t("dashboard.moduleSub.ncOpen", { defaultValue: "em aberto" })}`,
      tone: ncTone,
      spark: sparklines.nc,
      route: "/non-conformities",
    },
    {
      icon: ClipboardCheck,
      label: t("dashboard.module.ppi", { defaultValue: "Inspeções PPI" }),
      value: kpis.ppiApproved,
      ratio: kpis.ppiTotal > 0 ? `/ ${kpis.ppiTotal}` : undefined,
      hint: `${ppiPct}% ${t("dashboard.moduleSub.approved", { defaultValue: "aprovados" })}`,
      tone: ppiTone,
      spark: sparklines.ppi,
      route: "/ppi",
    },
    {
      icon: FlaskConical,
      label: t("dashboard.module.tests", { defaultValue: "Ensaios" }),
      value: kpis.testsCompleted,
      ratio: kpis.testsTotal > 0 ? `/ ${kpis.testsTotal}` : undefined,
      hint: `${testsPct}% ${t("dashboard.moduleSub.completed", { defaultValue: "realizados" })}`,
      tone: testsTone,
      spark: sparklines.tests,
      route: "/tests",
    },
    {
      icon: Package,
      label: t("dashboard.module.materials", { defaultValue: "Materiais PAME" }),
      value: kpis.pamePending,
      hint: kpis.pamePending === 0
        ? t("dashboard.moduleSub.allApproved", { defaultValue: "Tudo aprovado" })
        : `${kpis.pamePending} ${t("dashboard.moduleSub.pending", { defaultValue: "pend." })}`,
      tone: pameTone,
      spark: sparklines.pame,
      route: "/materials",
    },
  ];

  const chip = "inline-flex items-center gap-1.5 h-7 min-h-0 text-[11px] font-bold uppercase tracking-wide rounded-full px-2.5 border transition-colors whitespace-nowrap";

  return (
    <section className="animate-fade-in rounded-2xl border border-border/60 bg-card shadow-card">
      {/* ── Identidade da obra + período ─────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between px-5 sm:px-6 pt-5">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground mb-1">
            {t("dashboard.greeting", { name: displayName, defaultValue: `Olá, ${displayName}` })}
          </p>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground truncate">{projectName}</h1>
            {projectCode && !projectName.includes(projectCode) && (
              <span className="font-mono text-[11px] font-semibold text-muted-foreground bg-muted rounded-md px-1.5 py-0.5">
                {projectCode}
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-muted-foreground">
            {client && (
              <span className="inline-flex items-center gap-1.5 min-w-0">
                <Building2 className="h-3.5 w-3.5 flex-shrink-0" />
                <span>{t("dashboard.heroChip.client", { defaultValue: "Cliente" })}:</span>
                <span className="font-medium text-foreground truncate max-w-[220px]">{client}</span>
              </span>
            )}
            {contractor && (
              <span className="inline-flex items-center gap-1.5 min-w-0">
                <Briefcase className="h-3.5 w-3.5 flex-shrink-0" />
                <span>{t("dashboard.heroChip.contractor", { defaultValue: "Empreiteiro" })}:</span>
                <span className="font-medium text-foreground truncate max-w-[220px]">{contractor}</span>
              </span>
            )}
            {range && (
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 flex-shrink-0" />
                <span>{t("dashboard.heroChip.start", { defaultValue: "Início" })}:</span>
                <span className="font-medium text-foreground tabular-nums">{range.startStr}</span>
                <span className="tabular-nums">({range.days} {t("dashboard.heroChip.days", { defaultValue: "dias" })})</span>
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 border border-border rounded-lg px-2.5 py-0.5 flex-shrink-0 self-start">
          <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
          <Select value={period} onValueChange={onPeriodChange}>
            <SelectTrigger className="h-8 w-[140px] text-xs border-0 bg-transparent shadow-none focus:ring-0 focus:ring-offset-0 px-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("dashboard.period.all")}</SelectItem>
              <SelectItem value="3m">{t("dashboard.period.3m")}</SelectItem>
              <SelectItem value="6m">{t("dashboard.period.6m")}</SelectItem>
              <SelectItem value="12m">{t("dashboard.period.12m")}</SelectItem>
              <SelectItem value="ytd">{t("dashboard.period.ytd")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ── Estado e alertas ─────────────────────────────────────────── */}
      <div className="flex items-center gap-2 flex-wrap px-5 sm:px-6 pt-4">
        <span className={cn(chip, TONE_CHIP[accentTone])}>
          <span className={cn("h-1.5 w-1.5 rounded-full", TONE_DOT[accentTone])} />
          {stateLabel}
        </span>

        {hpPending > 0 && (
          <button onClick={() => navigate("/deadlines")} className={cn(chip, TONE_CHIP.amber, "hover:bg-amber-500/15")}>
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
            {t("dashboard.hpPending", { defaultValue: "HP por confirmar" })}
            <span className="tabular-nums">{hpPending}</span>
          </button>
        )}

        {rmsgq && (
          <button
            onClick={() => navigate("/reports?tab=monthly")}
            className={cn(chip, rmsgq.overdue ? TONE_CHIP.red : TONE_CHIP.amber, rmsgq.overdue ? "hover:bg-red-500/15" : "hover:bg-amber-500/15")}
          >
            <span className={cn("h-1.5 w-1.5 rounded-full", rmsgq.overdue ? "bg-red-500 animate-pulse" : "bg-amber-500")} />
            {rmsgq.overdue
              ? t("dashboard.rmsgqOverdueChip", { defaultValue: "RMSGQ em atraso" })
              : t("dashboard.rmsgqDueChip", { defaultValue: "RMSGQ vence em" })}
            <span className="tabular-nums normal-case">{rmsgq.days}d</span>
          </button>
        )}

        {liveUpdatedAgo && (
          <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground ml-auto">
            <Activity className="h-3 w-3" />
            {t("dashboard.updated", { defaultValue: "Atualizado" })} {liveUpdatedAgo}
          </span>
        )}
      </div>

      {/* ── Indicadores ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 p-5 sm:p-6 pt-4 sm:pt-4">
        {heroKpis.map((k) => {
          const Icon = k.icon;
          return (
            <button
              key={k.route}
              onClick={() => navigate(k.route)}
              className="group text-left rounded-xl border border-border/70 bg-background/60 p-3.5 hover:border-border hover:shadow-sm transition-all min-w-0"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className={cn("flex items-center justify-center w-7 h-7 rounded-lg", KPI_ICON[k.tone])}>
                  <Icon className="h-4 w-4" />
                </span>
                <span className="text-xs font-semibold text-muted-foreground leading-tight">{k.label}</span>
                <ChevronRight className="hidden sm:block h-3.5 w-3.5 ml-auto text-muted-foreground/40 group-hover:text-muted-foreground transition-colors flex-shrink-0" />
              </div>
              <div className="flex items-end justify-between gap-2">
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold tabular-nums text-foreground leading-none">{loading ? "—" : k.value}</span>
                  {k.ratio && <span className="text-sm text-muted-foreground tabular-nums">{k.ratio}</span>}
                </div>
                {k.spark && k.spark.length > 1 && <MiniSpark data={k.spark} className={KPI_SPARK[k.tone]} />}
              </div>
              {k.hint && <p className="text-xs text-muted-foreground truncate mt-1.5">{k.hint}</p>}
            </button>
          );
        })}
      </div>
    </section>
  );
}

function MiniSpark({ data, className }: { data: number[]; className?: string }) {
  const w = 56, h = 18;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const span = Math.max(max - min, 1);
  const step = w / (data.length - 1);
  const points = data.map((v, i) => `${i * step},${h - ((v - min) / span) * h}`).join(" ");
  return (
    <svg width={w} height={h} className={cn("overflow-visible flex-shrink-0", className)}>
      <polyline fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" points={points} />
    </svg>
  );
}
