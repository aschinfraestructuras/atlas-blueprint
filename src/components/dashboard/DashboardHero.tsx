import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import {
  Calendar, Building2, Briefcase, Clock,
  Package, AlertTriangle, ChevronRight, Activity, ShieldCheck,
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
  accentTone?: "green" | "amber" | "red";
  liveUpdatedAgo?: string;
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

const TONE_ACCENT: Record<NonNullable<Props["accentTone"]>, string> = {
  green: "rgba(52,211,153,0.9)",
  amber: "rgba(251,191,36,0.9)",
  red:   "rgba(239,68,68,0.9)",
};
const TONE_GLOW: Record<NonNullable<Props["accentTone"]>, string> = {
  green: "rgba(52,211,153,0.12)",
  amber: "rgba(251,191,36,0.10)",
  red:   "rgba(239,68,68,0.12)",
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
  const accentColor = TONE_ACCENT[tone];
  const glowColor = TONE_GLOW[tone];

  const pills: Array<{ count: number; route: string; label: string; Icon: React.ElementType; tone: "amber" | "red" }> = [];
  if (ncOpen > 0)      pills.push({ count: ncOpen,      route: "/non-conformities", label: t("dashboard.alerts.ncOpen", { defaultValue: "NCs abertas" }),          Icon: AlertTriangle, tone: ncOpen > 3 ? "red" : "amber" });
  if (hpPending > 0)   pills.push({ count: hpPending,   route: "/deadlines",        label: t("dashboard.hpPending",     { defaultValue: "HP por confirmar" }),      Icon: Clock,         tone: "amber" });
  if (pamePending > 0) pills.push({ count: pamePending, route: "/materials",        label: t("dashboard.alerts.pamePending", { defaultValue: "PAME pendentes" }), Icon: Package,       tone: pamePending > 10 ? "red" : "amber" });

  return (
    <div
      className="relative overflow-hidden rounded-2xl shadow-2xl animate-fade-in"
      style={{ background: "linear-gradient(135deg, #0c1a33 0%, #0e1f3d 35%, #091527 70%, #060f1e 100%)" }}
    >
      {/* ── Railway track SVG — fundo animado ── */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ opacity: 0.06 }}
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Carris horizontais */}
        {[20, 35, 65, 80].map((y) => (
          <line key={y} x1="0" y1={`${y}%`} x2="100%" y2={`${y}%`} stroke="white" strokeWidth="1.5" />
        ))}
        {/* Travessas verticais */}
        {Array.from({ length: 22 }, (_, i) => (
          <line key={i} x1={`${i * 5}%`} y1="10%" x2={`${i * 5}%`} y2="90%" stroke="white" strokeWidth="0.8" strokeDasharray="4 8" />
        ))}
        {/* Linha diagonal — perspectiva ferroviária */}
        <line x1="0" y1="100%" x2="60%" y2="0" stroke="white" strokeWidth="1" strokeDasharray="6 12" />
        <line x1="100%" y1="100%" x2="40%" y2="0" stroke="white" strokeWidth="1" strokeDasharray="6 12" />
      </svg>

      {/* ── Glow dinâmico conforme estado ── */}
      <div
        className="absolute -top-20 -right-20 w-96 h-96 rounded-full pointer-events-none transition-all duration-1000"
        style={{ background: `radial-gradient(circle, ${glowColor} 0%, transparent 70%)` }}
      />
      <div
        className="absolute -bottom-24 -left-16 w-72 h-72 rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(59,130,246,0.08) 0%, transparent 70%)" }}
      />

      {/* ── Barra de acento lateral ── */}
      <div
        className="absolute top-0 bottom-0 left-0 w-[3px]"
        style={{ background: `linear-gradient(to bottom, transparent, ${accentColor}, transparent)` }}
      />

      {/* ── Noise/grain texture ── */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.018]"
        style={{
          backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
          backgroundRepeat: "repeat",
          backgroundSize: "128px",
        }}
      />

      {/* ══════════════════════════════════ CONTENT ══════════════════════════════════ */}
      <div className="relative z-10 px-5 sm:px-8 pt-5 sm:pt-6 pb-0">

        {/* ── TOP ROW: estado + live + período ── */}
        <div className="flex items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Pill de estado */}
            <div
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 border backdrop-blur-sm"
              style={{
                borderColor: `${accentColor}40`,
                background: `${accentColor}18`,
              }}
            >
              <span className="relative flex h-2 w-2">
                <span className="absolute inset-0 rounded-full animate-ping opacity-60" style={{ backgroundColor: accentColor }} />
                <span className="relative inline-flex h-2 w-2 rounded-full" style={{ backgroundColor: accentColor }} />
              </span>
              <span className="text-[10px] font-extrabold uppercase tracking-[0.2em]" style={{ color: accentColor }}>
                {stateLabel}
              </span>
            </div>

            {/* Live badge */}
            {liveUpdatedAgo && (
              <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-white/40 bg-white/[0.05] border border-white/10 rounded-full px-2.5 py-1">
                <Activity className="h-2.5 w-2.5" />
                {t("dashboard.live", { defaultValue: "Live" })}
                <span className="text-white/25">·</span>
                <span className="tabular-nums">{liveUpdatedAgo}</span>
              </span>
            )}
          </div>

          {/* Período */}
          <div className="flex items-center gap-1.5 bg-white/[0.06] backdrop-blur-md border border-white/10 rounded-xl px-2.5 py-1 flex-shrink-0">
            <Calendar className="h-3.5 w-3.5 text-white/30" />
            <Select value={period} onValueChange={onPeriodChange}>
              <SelectTrigger className="h-7 w-[130px] text-xs border-0 bg-transparent shadow-none focus:ring-0 focus:ring-offset-0 px-1 text-white/70">
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

        {/* ── HERO PRINCIPAL: monograma + nome + projecto ── */}
        <div className="flex items-center gap-4 sm:gap-6 mb-5">
          {/* Monograma */}
          <div className="hidden sm:flex flex-shrink-0 relative">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center font-black text-xl tracking-tight border"
              style={{
                background: "linear-gradient(135deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.04) 100%)",
                borderColor: "rgba(255,255,255,0.12)",
                color: "white",
                backdropFilter: "blur(8px)",
              }}
            >
              {(projectCode ?? projectName).slice(0, 3).toUpperCase()}
            </div>
            <ShieldCheck
              className="absolute -bottom-1 -right-1 h-4.5 w-4.5 rounded-full p-0.5 border"
              style={{ backgroundColor: "#060f1e", borderColor: `${accentColor}40`, color: accentColor }}
            />
          </div>

          {/* Títulos */}
          <div className="min-w-0 flex-1">
            <p className="text-[9px] font-extrabold uppercase tracking-[0.28em] text-white/30 mb-1">
              {t("dashboard.welcome", { defaultValue: "Bem-vindo" })}
            </p>
            <h1 className="text-3xl sm:text-4xl lg:text-[2.6rem] font-black tracking-tight text-white leading-none mb-1.5">
              {displayName}
            </h1>
            <p className="text-[13px] text-white/50 truncate">
              <span className="font-semibold text-white/70">{projectName}</span>
              {projectCode && (
                <>
                  <span className="text-white/20 mx-2">·</span>
                  <span className="font-mono text-[11px] text-white/40">{projectCode}</span>
                </>
              )}
            </p>
          </div>
        </div>

        {/* ── BARRA INFERIOR: metadados + pills ── */}
        <div
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3 px-1 border-t"
          style={{ borderColor: "rgba(255,255,255,0.07)" }}
        >
          {/* Metadados do contrato */}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5">
            {client && (
              <div className="inline-flex items-center gap-1.5">
                <Building2 className="h-3 w-3 text-white/30" />
                <span className="text-[9px] font-bold uppercase tracking-widest text-white/30">
                  {t("dashboard.heroChip.client", { defaultValue: "Cliente" })}
                </span>
                <span className="text-[11px] font-semibold text-white/65 truncate max-w-[180px]">{client}</span>
              </div>
            )}
            {contractor && (
              <div className="inline-flex items-center gap-1.5">
                <Briefcase className="h-3 w-3 text-white/30" />
                <span className="text-[9px] font-bold uppercase tracking-widest text-white/30">
                  {t("dashboard.heroChip.contractor", { defaultValue: "Empreiteiro" })}
                </span>
                <span className="text-[11px] font-semibold text-white/65 truncate max-w-[180px]">{contractor}</span>
              </div>
            )}
            {range && (
              <div className="inline-flex items-center gap-1.5">
                <Calendar className="h-3 w-3 text-white/30" />
                <span className="text-[9px] font-bold uppercase tracking-widest text-white/30">
                  {t("dashboard.heroChip.start", { defaultValue: "Início" })}
                </span>
                <span className="text-[11px] font-semibold text-white/65 tabular-nums">{range.startStr}</span>
                <span className="text-[11px] text-white/30 tabular-nums">
                  · {range.days}{t("dashboard.heroChip.daysAgo", { defaultValue: "d" })}
                </span>
              </div>
            )}
          </div>

          {/* Pills de alertas */}
          {pills.length > 0 && (
            <TooltipProvider delayDuration={200}>
              <div className="flex flex-wrap items-center gap-1.5">
                {pills.map((p) => {
                  const Icon = p.Icon;
                  const isRed = p.tone === "red";
                  return (
                    <Tooltip key={p.route + p.label}>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => navigate(p.route)}
                          className={cn(
                            "group inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 border backdrop-blur-sm transition-all hover:-translate-y-0.5 active:translate-y-0",
                            isRed
                              ? "bg-red-500/15 border-red-500/30 hover:bg-red-500/20 text-red-400"
                              : "bg-amber-500/15 border-amber-500/30 hover:bg-amber-500/20 text-amber-400",
                          )}
                        >
                          <Icon className="h-3 w-3" />
                          <span className="text-[10px] font-semibold uppercase tracking-wider hidden md:inline">{p.label}</span>
                          <span className="text-xs font-black tabular-nums">{p.count}</span>
                          <ChevronRight className="h-3 w-3 opacity-40 group-hover:opacity-80 group-hover:translate-x-0.5 transition-all" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-[10px]">{p.label}</TooltipContent>
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
