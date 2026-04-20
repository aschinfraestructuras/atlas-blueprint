import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import {
  Calendar, Building2, Briefcase, Clock, ShieldCheck,
  Package, AlertTriangle, ChevronRight, Activity,
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface Props {
  displayName: string;
  projectName: string;
  projectCode?: string | null;
  client?: string | null;
  contractor?: string | null;
  startDate?: string | null;
  period: string;
  onPeriodChange: (v: string) => void;
  /** Estado dinâmico: 'green' (saudável), 'amber' (atenção), 'red' (crítico) */
  accentTone?: "green" | "amber" | "red";
  liveUpdatedAgo?: string;
  /** Pendências críticas integradas no header */
  pamePending?: number;
  hpPending?: number;
  ncOpen?: number;
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

const TONE_BG: Record<NonNullable<Props["accentTone"]>, string> = {
  green: "from-emerald-500/[0.07] via-card/40 to-card",
  amber: "from-amber-500/[0.09] via-card/40 to-card",
  red:   "from-destructive/[0.08] via-card/40 to-card",
};
const TONE_BLOB: Record<NonNullable<Props["accentTone"]>, string> = {
  green: "bg-emerald-500/10",
  amber: "bg-amber-500/12",
  red:   "bg-destructive/12",
};
const TONE_BAR: Record<NonNullable<Props["accentTone"]>, string> = {
  green: "from-emerald-400 via-emerald-500 to-emerald-600",
  amber: "from-amber-400 via-amber-500 to-orange-500",
  red:   "from-rose-500 via-destructive to-red-700",
};
const TONE_DOT: Record<NonNullable<Props["accentTone"]>, string> = {
  green: "bg-emerald-500",
  amber: "bg-amber-500",
  red:   "bg-destructive",
};
const TONE_LABEL: Record<NonNullable<Props["accentTone"]>, { pt: string; es: string }> = {
  green: { pt: "Saudável", es: "Saludable" },
  amber: { pt: "Atenção",  es: "Atención"  },
  red:   { pt: "Crítico",  es: "Crítico"   },
};

export function DashboardHero({
  displayName, projectName, projectCode, client, contractor, startDate,
  period, onPeriodChange, accentTone = "green", liveUpdatedAgo,
  pamePending = 0, hpPending = 0, ncOpen = 0,
}: Props) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const range = formatDateRange(startDate);
  const tone = accentTone;
  const isES = i18n.language === "es";
  const stateLabel = isES ? TONE_LABEL[tone].es : TONE_LABEL[tone].pt;

  // Pendências cliques rápidos
  const pills: Array<{ count: number; route: string; label: string; Icon: React.ElementType; tone: "amber" | "red" }> = [];
  if (ncOpen > 0)      pills.push({ count: ncOpen,      route: "/non-conformities", label: t("dashboard.alerts.ncOpen", { defaultValue: "NCs abertas" }),       Icon: AlertTriangle, tone: ncOpen > 3 ? "red" : "amber" });
  if (hpPending > 0)   pills.push({ count: hpPending,   route: "/deadlines",        label: t("dashboard.hpPending",      { defaultValue: "HP por confirmar" }), Icon: Clock,          tone: "amber" });
  if (pamePending > 0) pills.push({ count: pamePending, route: "/materials",        label: t("dashboard.alerts.pamePending", { defaultValue: "PAME pendentes" }), Icon: Package,    tone: pamePending > 10 ? "red" : "amber" });

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/40 bg-card shadow-card animate-fade-in">
      {/* === Layered backgrounds === */}
      <div className={cn("absolute inset-0 bg-gradient-to-br transition-colors duration-700", TONE_BG[tone])} />
      <div className={cn("absolute -top-32 -right-24 w-80 h-80 rounded-full blur-3xl pointer-events-none transition-colors duration-700", TONE_BLOB[tone])} />
      <div className="absolute -bottom-28 -left-20 w-72 h-72 rounded-full bg-primary/[0.06] blur-3xl pointer-events-none" />
      {/* Grid pattern (very subtle) */}
      <div
        className="absolute inset-0 opacity-[0.025] pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)",
          backgroundSize: "44px 44px",
        }}
      />

      {/* === Lateral accent bar (left) — animated === */}
      <div className="absolute top-0 bottom-0 left-0 w-[3px] overflow-hidden">
        <div className={cn("absolute inset-0 bg-gradient-to-b animate-[shimmer_4s_ease-in-out_infinite]", TONE_BAR[tone])} />
      </div>
      <style>{`@keyframes shimmer { 0%,100% { opacity: .85 } 50% { opacity: 1 } }`}</style>

      {/* === Content === */}
      <div className="relative z-10 px-5 sm:px-7 py-5 sm:py-6">
        {/* TOP ROW — eyebrow + state + live + period */}
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            {/* State chip */}
            <div className={cn(
              "inline-flex items-center gap-1.5 rounded-full pl-1.5 pr-2.5 py-0.5 border backdrop-blur-sm transition-colors",
              tone === "green" && "border-emerald-500/30 bg-emerald-500/10",
              tone === "amber" && "border-amber-500/30 bg-amber-500/10",
              tone === "red"   && "border-destructive/30 bg-destructive/10",
            )}>
              <span className="relative flex h-2 w-2">
                <span className={cn("absolute inline-flex h-full w-full rounded-full opacity-60 animate-ping", TONE_DOT[tone])} />
                <span className={cn("relative inline-flex h-2 w-2 rounded-full", TONE_DOT[tone])} />
              </span>
              <span className={cn(
                "text-[10px] font-extrabold uppercase tracking-[0.18em]",
                tone === "green" && "text-emerald-700 dark:text-emerald-400",
                tone === "amber" && "text-amber-700 dark:text-amber-400",
                tone === "red"   && "text-destructive",
              )}>
                {stateLabel}
              </span>
            </div>

            {/* Live tick */}
            {liveUpdatedAgo && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70 bg-card/50 backdrop-blur-sm border border-border/40 rounded-full px-2 py-0.5">
                <Activity className="h-2.5 w-2.5" />
                <span>{t("dashboard.live", { defaultValue: "Live" })}</span>
                <span className="text-muted-foreground/50">·</span>
                <span className="tabular-nums">{liveUpdatedAgo}</span>
              </span>
            )}
          </div>

          {/* Period selector */}
          <div className="flex items-center gap-1.5 bg-card/70 backdrop-blur-md border border-border/50 rounded-xl px-2 py-1 shadow-sm flex-shrink-0">
            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
            <Select value={period} onValueChange={onPeriodChange}>
              <SelectTrigger className="h-7 w-[130px] text-xs border-0 bg-transparent shadow-none focus:ring-0 focus:ring-offset-0 px-1">
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

        {/* MAIN BLOCK — Project monogram + Title */}
        <div className="flex items-start gap-4 sm:gap-5">
          {/* Monogram tile (project initials) */}
          <div className="hidden sm:flex flex-shrink-0 relative">
            <div className={cn(
              "w-14 h-14 rounded-2xl flex items-center justify-center font-black text-lg tracking-tight shadow-md border",
              "bg-gradient-to-br from-card to-muted/40 border-border/50 text-foreground",
            )}>
              {(projectCode ?? projectName).slice(0, 3).toUpperCase()}
            </div>
            <ShieldCheck className={cn(
              "absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-card p-0.5 border border-border/50",
              tone === "green" && "text-emerald-500",
              tone === "amber" && "text-amber-500",
              tone === "red"   && "text-destructive",
            )} />
          </div>

          {/* Titles */}
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.22em] text-muted-foreground/60 mb-0.5">
              {t("dashboard.welcome", { defaultValue: "Bem-vindo" })}
            </p>
            <h1 className="text-2xl sm:text-[1.85rem] lg:text-[2.05rem] font-black tracking-tight text-foreground leading-[1.1] truncate">
              {displayName}
            </h1>
            <p className="text-[12px] sm:text-[13px] text-muted-foreground/85 mt-1 truncate">
              <span className="font-semibold text-foreground/85">{projectName}</span>
              {projectCode && (
                <>
                  <span className="text-muted-foreground/40 mx-1.5">·</span>
                  <span className="font-mono text-[11px] text-muted-foreground/70">{projectCode}</span>
                </>
              )}
            </p>
          </div>
        </div>

        {/* DIVIDER */}
        <div className="h-px bg-gradient-to-r from-transparent via-border/60 to-transparent my-4" />

        {/* CONTRACT METADATA + PILLS — 2 columns on desktop */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Contract chips */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
            {client && (
              <div className="inline-flex items-center gap-1.5 text-[11px]">
                <Building2 className="h-3 w-3 text-muted-foreground/60" />
                <span className="text-muted-foreground/60 uppercase tracking-wider text-[9px] font-bold">
                  {t("dashboard.heroChip.client", { defaultValue: "Cliente" })}
                </span>
                <span className="font-semibold text-foreground/90 truncate max-w-[200px]">{client}</span>
              </div>
            )}
            {contractor && (
              <div className="inline-flex items-center gap-1.5 text-[11px]">
                <Briefcase className="h-3 w-3 text-muted-foreground/60" />
                <span className="text-muted-foreground/60 uppercase tracking-wider text-[9px] font-bold">
                  {t("dashboard.heroChip.contractor", { defaultValue: "Empreiteiro" })}
                </span>
                <span className="font-semibold text-foreground/90 truncate max-w-[200px]">{contractor}</span>
              </div>
            )}
            {range && (
              <div className="inline-flex items-center gap-1.5 text-[11px]">
                <Calendar className="h-3 w-3 text-muted-foreground/60" />
                <span className="text-muted-foreground/60 uppercase tracking-wider text-[9px] font-bold">
                  {t("dashboard.heroChip.start", { defaultValue: "Início" })}
                </span>
                <span className="font-semibold text-foreground/90 tabular-nums">{range.startStr}</span>
                <span className="text-muted-foreground/50 tabular-nums">
                  · {range.days}{t("dashboard.heroChip.daysAgo", { defaultValue: "d" })}
                </span>
              </div>
            )}
          </div>

          {/* Pendency pills (only if any) */}
          {pills.length > 0 && (
            <TooltipProvider delayDuration={200}>
              <div className="flex flex-wrap items-center gap-1.5">
                {pills.map((p) => {
                  const Icon = p.Icon;
                  return (
                    <Tooltip key={p.route + p.label}>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => navigate(p.route)}
                          className={cn(
                            "group inline-flex items-center gap-1.5 rounded-lg px-2 py-1 border backdrop-blur-sm transition-all hover:shadow-sm hover:-translate-y-0.5 active:translate-y-0",
                            p.tone === "red"
                              ? "bg-destructive/10 border-destructive/30 hover:bg-destructive/15 text-destructive"
                              : "bg-amber-500/10 border-amber-500/30 hover:bg-amber-500/15 text-amber-700 dark:text-amber-400",
                          )}
                        >
                          <Icon className="h-3 w-3" />
                          <span className="text-[10px] font-semibold uppercase tracking-wider hidden md:inline">{p.label}</span>
                          <span className="text-xs font-black tabular-nums">{p.count}</span>
                          <ChevronRight className="h-3 w-3 opacity-50 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="text-[10px]">{p.label}</TooltipContent>
                    </Tooltip>
                  );
                })}
              </div>
            </TooltipProvider>
          )}
        </div>
      </div>
    </div>
  );
}
