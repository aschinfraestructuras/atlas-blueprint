import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Calendar, Plus, AlertTriangle, ClipboardCheck, FlaskConical, FileText, Building2, Briefcase, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  /** Estado dinâmico para o accent: 'green' (saudável), 'amber' (atenção), 'red' (crítico) */
  accentTone?: "green" | "amber" | "red";
  liveUpdatedAgo?: string;
}

function formatDateRange(startDate?: string | null) {
  if (!startDate) return null;
  const start = new Date(startDate);
  if (isNaN(start.getTime())) return null;
  const days = Math.floor((Date.now() - start.getTime()) / 86400000);
  return { startStr: start.toLocaleDateString("pt-PT", { day: "2-digit", month: "short", year: "numeric" }), days };
}

const TONE_BG: Record<NonNullable<Props["accentTone"]>, string> = {
  green: "from-emerald-500/8 via-card/60 to-card",
  amber: "from-amber-500/10 via-card/60 to-card",
  red:   "from-destructive/8 via-card/60 to-card",
};
const TONE_BLOB: Record<NonNullable<Props["accentTone"]>, string> = {
  green: "bg-emerald-500/15",
  amber: "bg-amber-500/15",
  red:   "bg-destructive/15",
};
const TONE_DOT: Record<NonNullable<Props["accentTone"]>, string> = {
  green: "bg-emerald-500",
  amber: "bg-amber-500",
  red:   "bg-destructive",
};

export function DashboardHero({
  displayName, projectName, projectCode, client, contractor, startDate,
  period, onPeriodChange, accentTone = "green", liveUpdatedAgo,
}: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const range = formatDateRange(startDate);
  const tone = accentTone;

  const quickActions = [
    { label: t("dashboard.quick.nc",     { defaultValue: "Nova NC" }),       icon: AlertTriangle,  route: "/non-conformities", color: "text-destructive" },
    { label: t("dashboard.quick.ppi",    { defaultValue: "Novo PPI" }),      icon: ClipboardCheck, route: "/ppi",              color: "text-emerald-600" },
    { label: t("dashboard.quick.test",   { defaultValue: "Registar Ensaio"}),icon: FlaskConical,   route: "/tests",            color: "text-amber-600" },
    { label: t("dashboard.quick.report", { defaultValue: "Parte Diária" }),  icon: FileText,       route: "/daily-reports",    color: "text-primary" },
  ];

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/50 animate-fade-in">
      {/* Layered backgrounds */}
      <div className={cn("absolute inset-0 bg-gradient-to-br transition-colors duration-700", TONE_BG[tone])} />
      <div className={cn("absolute -top-24 -right-24 w-72 h-72 rounded-full blur-3xl pointer-events-none transition-colors duration-700", TONE_BLOB[tone])} />
      <div className="absolute -bottom-24 -left-16 w-64 h-64 rounded-full bg-primary/8 blur-3xl pointer-events-none" />
      <div
        className="absolute inset-0 opacity-[0.035] pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, hsl(var(--foreground)) 1px, transparent 0)",
          backgroundSize: "20px 20px",
        }}
      />

      {/* Top accent bar — dynamic */}
      <div className={cn("absolute top-0 left-0 right-0 h-[3px] transition-colors duration-700", TONE_DOT[tone])} style={{ opacity: 0.6 }} />

      {/* Content */}
      <div className="relative z-10 flex flex-col gap-4 px-4 sm:px-6 py-5 sm:py-6">
        {/* Row 1 — Greeting + Live + Period */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-4">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={cn("inline-flex h-1.5 w-1.5 rounded-full animate-pulse", TONE_DOT[tone])} />
              <p className="text-[9px] font-extrabold uppercase tracking-[0.25em] text-muted-foreground/70">
                {t("dashboard.welcome")}
              </p>
              {liveUpdatedAgo && (
                <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-muted-foreground/60 bg-card/60 backdrop-blur-sm border border-border/40 rounded-full px-1.5 py-0.5">
                  <Clock className="h-2.5 w-2.5" />
                  {t("dashboard.live", { defaultValue: "live" })} · {liveUpdatedAgo}
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-[1.85rem] font-black tracking-tight text-foreground leading-tight truncate">
              {displayName}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground/85 truncate">
              {t("dashboard.subtitleProject", { project: projectName })}
              {projectCode ? <span className="text-muted-foreground/50"> · {projectCode}</span> : null}
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-end bg-card/70 backdrop-blur-md border border-border/50 rounded-xl px-2.5 py-1.5 shadow-sm flex-shrink-0">
            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
            <Select value={period} onValueChange={onPeriodChange}>
              <SelectTrigger className="h-7 w-[140px] text-xs border-0 bg-transparent shadow-none focus:ring-0 focus:ring-offset-0 px-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("dashboard.period.all",  { defaultValue: "Todo o período" })}</SelectItem>
                <SelectItem value="3m"> {t("dashboard.period.3m",   { defaultValue: "Últimos 3 meses" })}</SelectItem>
                <SelectItem value="6m"> {t("dashboard.period.6m",   { defaultValue: "Últimos 6 meses" })}</SelectItem>
                <SelectItem value="12m">{t("dashboard.period.12m",  { defaultValue: "Últimos 12 meses" })}</SelectItem>
                <SelectItem value="ytd">{t("dashboard.period.ytd",  { defaultValue: "Ano corrente" })}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Row 2 — Contextual breadcrumb chips */}
        {(client || contractor || range) && (
          <div className="flex flex-wrap items-center gap-1.5 -mt-1">
            {client && (
              <span className="inline-flex items-center gap-1.5 text-[10px] sm:text-xs font-medium bg-card/70 backdrop-blur-sm border border-border/40 rounded-lg px-2 py-1 text-foreground/80">
                <Building2 className="h-3 w-3 text-muted-foreground" />
                <span className="text-muted-foreground/70">{t("dashboard.heroChip.client", { defaultValue: "Cliente" })}:</span>
                <strong className="text-foreground">{client}</strong>
              </span>
            )}
            {contractor && (
              <span className="inline-flex items-center gap-1.5 text-[10px] sm:text-xs font-medium bg-card/70 backdrop-blur-sm border border-border/40 rounded-lg px-2 py-1 text-foreground/80">
                <Briefcase className="h-3 w-3 text-muted-foreground" />
                <span className="text-muted-foreground/70">{t("dashboard.heroChip.contractor", { defaultValue: "Empreiteiro" })}:</span>
                <strong className="text-foreground">{contractor}</strong>
              </span>
            )}
            {range && (
              <span className="inline-flex items-center gap-1.5 text-[10px] sm:text-xs font-medium bg-card/70 backdrop-blur-sm border border-border/40 rounded-lg px-2 py-1 text-foreground/80">
                <Calendar className="h-3 w-3 text-muted-foreground" />
                <span className="text-muted-foreground/70">{t("dashboard.heroChip.start", { defaultValue: "Início" })}:</span>
                <strong className="text-foreground">{range.startStr}</strong>
                <span className="text-muted-foreground/60 tabular-nums">· {range.days}{t("dashboard.heroChip.daysAgo", { defaultValue: "d" })}</span>
              </span>
            )}
          </div>
        )}

        {/* Row 3 — Quick actions */}
        <TooltipProvider delayDuration={200}>
          <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-border/30">
            <span className="text-[9px] font-extrabold uppercase tracking-[0.18em] text-muted-foreground/50 mr-1">
              {t("dashboard.quickActionsLabel", { defaultValue: "Acções rápidas" })}
            </span>
            {quickActions.map((qa) => {
              const Icon = qa.icon;
              return (
                <Tooltip key={qa.route}>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 gap-1.5 text-[11px] font-semibold bg-card/60 backdrop-blur-sm border border-border/40 hover:bg-card hover:border-primary/40 hover:shadow-sm transition-all"
                      onClick={() => navigate(qa.route)}
                    >
                      <Plus className="h-3 w-3" />
                      <Icon className={cn("h-3 w-3", qa.color)} />
                      <span className="hidden sm:inline">{qa.label}</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-[10px]">{qa.label}</TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </TooltipProvider>
      </div>
    </div>
  );
}
