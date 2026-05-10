import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import {
  Calendar, Building2, Briefcase, Activity, ShieldCheck,
  AlertTriangle, ClipboardCheck, FlaskConical, Package,
  type LucideIcon,
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CommandSurface, GlassKPI, GlassPanel } from "@/components/atlas";

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

const TONE_HSL = {
  green: "150 60% 55%",
  amber: "38 90% 60%",
  red:   "0 75% 62%",
} as const;

const TONE_LABEL = {
  green: { pt: "Saudável", es: "Saludable" },
  amber: { pt: "Atenção",  es: "Atención"  },
  red:   { pt: "Crítico",  es: "Crítico"   },
} as const;

export function DashboardHero({
  displayName, projectName, projectCode, client, contractor, startDate,
  period, onPeriodChange, accentTone = "green", liveUpdatedAgo,
  hpPending = 0, kpis, loading = false, sparklines = {},
}: Props) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const range = formatDateRange(startDate);
  const isES = i18n.language === "es";
  const stateLabel = isES ? TONE_LABEL[accentTone].es : TONE_LABEL[accentTone].pt;
  const accentColor = TONE_HSL[accentTone];

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
      label: t("dashboard.module.ppi", { defaultValue: "Inspecções PPI" }),
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

  return (
    <CommandSurface className="animate-fade-in">
      {/* ── TOP META ROW ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3 px-5 sm:px-7 pt-5">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Status pill */}
          <div
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 border"
            style={{ borderColor: `hsl(${accentColor} / 0.35)`, background: `hsl(${accentColor} / 0.12)` }}
          >
            <span className="atlas-live-dot" style={{ filter: `drop-shadow(0 0 6px hsl(${accentColor}))` }}>
              <span style={{ background: `hsl(${accentColor})` }} />
            </span>
            <span className="text-[10px] font-extrabold uppercase tracking-[0.22em]" style={{ color: `hsl(${accentColor})` }}>
              {stateLabel}
            </span>
          </div>

          {liveUpdatedAgo && (
            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-white/45 bg-white/[0.04] border border-white/10 rounded-full px-2.5 py-1">
              <Activity className="h-2.5 w-2.5" />
              {t("dashboard.live", { defaultValue: "Live" })}
              <span className="text-white/25">·</span>
              <span className="tabular-nums">{liveUpdatedAgo}</span>
            </span>
          )}

          {hpPending > 0 && (
            <button
              onClick={() => navigate("/deadlines")}
              className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-amber-300 bg-amber-400/10 border border-amber-400/30 rounded-full px-2.5 py-1 hover:bg-amber-400/15 transition-colors"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-amber-300 animate-pulse" />
              {t("dashboard.hpPending", { defaultValue: "HP por confirmar" })}
              <span className="tabular-nums text-white">{hpPending}</span>
            </button>
          )}
        </div>

        {/* Period selector */}
        <div className="flex items-center gap-1.5 bg-white/[0.05] backdrop-blur-md border border-white/10 rounded-xl px-2.5 py-1 flex-shrink-0">
          <Calendar className="h-3.5 w-3.5 text-white/40" />
          <Select value={period} onValueChange={onPeriodChange}>
            <SelectTrigger className="h-7 w-[130px] text-xs border-0 bg-transparent shadow-none focus:ring-0 focus:ring-offset-0 px-1 text-white/75">
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

      {/* ── IDENTITY + KPIs GRID ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] gap-5 lg:gap-7 px-5 sm:px-7 pt-5 pb-5 sm:pb-6">

        {/* LEFT — Project identity */}
        <div className="flex flex-col justify-center min-w-0">
          <div className="flex items-center gap-4 sm:gap-5 mb-4">
            <div className="hidden sm:flex flex-shrink-0 relative">
              <div
                className="w-[68px] h-[68px] rounded-2xl flex items-center justify-center font-black text-xl tracking-tight border text-white"
                style={{
                  background: "linear-gradient(135deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.03) 100%)",
                  borderColor: "rgba(255,255,255,0.14)",
                  backdropFilter: "blur(8px)",
                }}
              >
                {(projectCode ?? projectName).slice(0, 3).toUpperCase()}
              </div>
              <ShieldCheck
                className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full p-0.5 border"
                style={{ backgroundColor: "hsl(220 60% 4%)", borderColor: `hsl(${accentColor} / 0.45)`, color: `hsl(${accentColor})` }}
              />
            </div>

            <div className="min-w-0 flex-1">
              <p className="atlas-eyebrow mb-1">
                {t("dashboard.welcome", { defaultValue: "Bem-vindo" })}
              </p>
              <h1 className="text-3xl sm:text-[2.4rem] lg:text-[2.6rem] font-black tracking-tight text-white leading-none mb-1.5">
                {displayName}
              </h1>
              <p className="text-[13px] text-white/55 truncate">
                <span className="font-semibold text-white/75">{projectName}</span>
                {projectCode && (
                  <>
                    <span className="text-white/20 mx-2">·</span>
                    <span className="font-mono text-[11px] text-white/45">{projectCode}</span>
                  </>
                )}
              </p>
            </div>
          </div>

          {/* Contract metadata row */}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-3 border-t border-white/[0.07]">
            {client && (
              <div className="inline-flex items-center gap-1.5 min-w-0">
                <Building2 className="h-3 w-3 text-white/35 flex-shrink-0" />
                <span className="atlas-label">{t("dashboard.heroChip.client", { defaultValue: "Cliente" })}</span>
                <span className="text-[11px] font-semibold text-white/70 truncate max-w-[180px]">{client}</span>
              </div>
            )}
            {contractor && (
              <div className="inline-flex items-center gap-1.5 min-w-0">
                <Briefcase className="h-3 w-3 text-white/35 flex-shrink-0" />
                <span className="atlas-label">{t("dashboard.heroChip.contractor", { defaultValue: "Empreiteiro" })}</span>
                <span className="text-[11px] font-semibold text-white/70 truncate max-w-[180px]">{contractor}</span>
              </div>
            )}
            {range && (
              <div className="inline-flex items-center gap-1.5">
                <Calendar className="h-3 w-3 text-white/35 flex-shrink-0" />
                <span className="atlas-label">{t("dashboard.heroChip.start", { defaultValue: "Início" })}</span>
                <span className="text-[11px] font-semibold text-white/70 tabular-nums">{range.startStr}</span>
                <span className="text-[11px] text-white/35 tabular-nums">
                  · {range.days}{t("dashboard.heroChip.daysAgo", { defaultValue: "d" })}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT — Floating KPI cluster */}
        <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
          {heroKpis.map((k) => (
            <GlassKPI
              key={k.route}
              icon={k.icon}
              label={k.label}
              value={k.value}
              ratio={k.ratio}
              hint={k.hint}
              tone={k.tone}
              sparkline={k.spark}
              loading={loading}
              onClick={() => navigate(k.route)}
            />
          ))}
        </div>
      </div>
    </CommandSurface>
  );
}
