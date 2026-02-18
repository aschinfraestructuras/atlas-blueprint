import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { useProject } from "@/contexts/ProjectContext";
import { useProjects } from "@/hooks/useProjects";
import { useDocuments } from "@/hooks/useDocuments";
import { useTests } from "@/hooks/useTests";
import { useNonConformities } from "@/hooks/useNonConformities";
import { useSuppliers } from "@/hooks/useSuppliers";
import { useAuditLog } from "@/hooks/useAuditLog";
import {
  FolderKanban, FileText, FlaskConical, AlertTriangle,
  Clock, Building2, Timer, CheckCircle2, TrendingUp, Activity,
  ChevronRight, RotateCcw, ShieldCheck,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { cn } from "@/lib/utils";

// ── Module color map (matches CSS custom properties) ─────────────────────────
const MOD = {
  documents:      "hsl(215, 70%, 38%)",
  tests:          "hsl(252, 55%, 45%)",
  nc:             "hsl(2, 60%, 44%)",
  suppliers:      "hsl(158, 45%, 32%)",
  subcontractors: "hsl(33, 75%, 38%)",
  plans:          "hsl(188, 55%, 32%)",
  projects:       "hsl(221, 50%, 40%)",
  muted:          "hsl(215, 15%, 65%)",
} as const;

// ── Animated counter ──────────────────────────────────────────────────────────
function useCountUp(target: number, duration = 900) {
  const [value, setValue] = useState(0);
  const raf = useRef<number | null>(null);
  const start = useRef<number | null>(null);
  useEffect(() => {
    if (target === 0) { setValue(0); return; }
    start.current = null;
    const step = (ts: number) => {
      if (!start.current) start.current = ts;
      const progress = Math.min((ts - start.current) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(ease * target));
      if (progress < 1) raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, [target, duration]);
  return value;
}

// ── KPI Stat Card ─────────────────────────────────────────────────────────────
function StatCard({
  label, value, icon: Icon, loading, moduleColor, sub,
}: {
  label: string; value: number; icon: React.ElementType;
  loading: boolean; moduleColor: string; sub?: string;
}) {
  const animated = useCountUp(loading ? 0 : value);

  if (loading) return (
    <Card className="border bg-card shadow-card">
      <CardContent className="p-6">
        <Skeleton className="h-3 w-28 mb-4" />
        <Skeleton className="h-10 w-16 mb-2" />
        <Skeleton className="h-2.5 w-24" />
      </CardContent>
    </Card>
  );

  return (
    <Card
      className="border bg-card shadow-card hover:shadow-card-hover transition-shadow duration-200 animate-fade-in overflow-hidden relative"
      style={{ borderTop: `3px solid ${moduleColor}` }}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground leading-none">
            {label}
          </p>
          <div
            className="flex h-9 w-9 items-center justify-center rounded-xl flex-shrink-0"
            style={{ background: `${moduleColor}18` }}
          >
            <Icon className="h-4 w-4" style={{ color: moduleColor }} />
          </div>
        </div>
        <p className="text-4xl font-extrabold tabular-nums text-foreground leading-none">
          {animated}
        </p>
        {sub && (
          <p className="mt-2 text-xs text-muted-foreground">{sub}</p>
        )}
      </CardContent>
    </Card>
  );
}

// ── Custom Tooltip ────────────────────────────────────────────────────────────
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-border bg-card px-3.5 py-2.5 shadow-card text-xs">
      {label && <p className="font-semibold text-foreground mb-1.5">{label}</p>}
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full inline-block" style={{ background: p.fill ?? p.color }} />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-semibold text-foreground">{p.value}</span>
        </div>
      ))}
    </div>
  );
}

// ── Pie Card ──────────────────────────────────────────────────────────────────
function PieCard({
  title, data, loading, icon: Icon, total,
}: {
  title: string;
  data: { name: string; value: number; color: string }[];
  loading: boolean; icon: React.ElementType; total: number;
}) {
  return (
    <Card className="border bg-card shadow-card animate-fade-in">
      <CardHeader className="pb-0 pt-5 px-5">
        <CardTitle className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
          <Icon className="h-3.5 w-3.5" />{title}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-5 pb-5">
        {loading ? (
          <Skeleton className="h-[130px] w-full mt-3 rounded-xl" />
        ) : total === 0 ? (
          <div className="flex h-[130px] items-center justify-center">
            <p className="text-sm text-muted-foreground">—</p>
          </div>
        ) : (
          <div className="flex items-center gap-5 mt-3">
            <ResponsiveContainer width={110} height={110}>
              <PieChart>
                <Pie data={data} cx="50%" cy="50%" innerRadius={28} outerRadius={50}
                  paddingAngle={3} dataKey="value" isAnimationActive animationDuration={700}>
                  {data.map((entry, i) => <Cell key={i} fill={entry.color} stroke="transparent" />)}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <ul className="flex-1 space-y-2 min-w-0">
              {data.map((d) => (
                <li key={d.name} className="flex items-center gap-2 text-xs">
                  <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ background: d.color }} />
                  <span className="flex-1 truncate text-muted-foreground">{d.name}</span>
                  <span className="font-bold tabular-nums text-foreground">{d.value}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Bar Card ──────────────────────────────────────────────────────────────────
function BarCard({
  title, data, loading, icon: Icon, bars,
}: {
  title: string; data: any[]; loading: boolean; icon: React.ElementType;
  bars: { key: string; color: string; label: string }[];
}) {
  return (
    <Card className="border bg-card shadow-card animate-fade-in">
      <CardHeader className="pb-0 pt-5 px-5">
        <CardTitle className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
          <Icon className="h-3.5 w-3.5" />{title}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-5 pb-5 pt-3">
        {loading ? (
          <Skeleton className="h-[130px] w-full rounded-xl" />
        ) : (
          <ResponsiveContainer width="100%" height={130}>
            <BarChart data={data} barCategoryGap="30%" barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={22} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: "hsl(var(--muted))" }} />
              <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 10, color: "hsl(var(--muted-foreground))" }} />
              {bars.map((b) => (
                <Bar key={b.key} dataKey={b.key} name={b.label} fill={b.color}
                  radius={[3, 3, 0, 0]} isAnimationActive animationDuration={700} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

// ── NC Aging Gauge ────────────────────────────────────────────────────────────
function AgingCard({ days, openCount, loading }: { days: number; openCount: number; loading: boolean }) {
  const { t } = useTranslation();
  const animated = useCountUp(loading ? 0 : days);
  const agingColor = days === 0 ? MOD.muted : days < 7 ? MOD.suppliers : days < 30 ? MOD.subcontractors : MOD.nc;
  return (
    <Card className="border bg-card shadow-card animate-fade-in">
      <CardHeader className="pb-0 pt-5 px-5">
        <CardTitle className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
          <Timer className="h-3.5 w-3.5" />{t("dashboard.kpi.avgAgingTitle")}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-5 pb-5">
        {loading ? (
          <Skeleton className="h-24 w-full mt-3 rounded-xl" />
        ) : (
          <div className="flex flex-col items-center justify-center py-5 gap-1">
            <span className="text-5xl font-extrabold tabular-nums" style={{ color: agingColor }}>{animated}</span>
            <span className="text-xs text-muted-foreground">{t("dashboard.kpi.days")}</span>
            <span className="mt-2 text-xs text-muted-foreground text-center">
              {openCount > 0
                ? t("dashboard.kpi.openNcCount", { count: openCount })
                : t("dashboard.kpi.noOpenNcs")}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Doc by Type Card ──────────────────────────────────────────────────────────
function DocTypeCard({ documents, loading, t }: { documents: any[]; loading: boolean; t: (k: string, opts?: any) => string }) {
  const TYPE_COLORS = [MOD.documents, MOD.tests, MOD.subcontractors, MOD.plans, MOD.nc, MOD.suppliers];
  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    documents.forEach((d) => { counts[d.doc_type] = (counts[d.doc_type] ?? 0) + 1; });
    return Object.entries(counts)
      .map(([type, count]) => ({ name: t(`documents.docTypes.${type}`, { defaultValue: type }), value: count, type }))
      .sort((a, b) => b.value - a.value);
  }, [documents, t]);

  return (
    <Card className="border bg-card shadow-card animate-fade-in">
      <CardHeader className="pb-0 pt-5 px-5">
        <CardTitle className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
          <FileText className="h-3.5 w-3.5" />{t("dashboard.charts.docsByType")}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-5 pb-5">
        {loading ? (
          <Skeleton className="h-[130px] w-full mt-3 rounded-xl" />
        ) : typeCounts.length === 0 ? (
          <div className="flex h-[130px] items-center justify-center">
            <p className="text-sm text-muted-foreground">—</p>
          </div>
        ) : (
          <div className="flex items-center gap-5 mt-3">
            <ResponsiveContainer width={110} height={110}>
              <PieChart>
                <Pie data={typeCounts.map((d, i) => ({ ...d, color: TYPE_COLORS[i % TYPE_COLORS.length] }))}
                  cx="50%" cy="50%" innerRadius={28} outerRadius={50} paddingAngle={3}
                  dataKey="value" isAnimationActive animationDuration={700}>
                  {typeCounts.map((_, i) => <Cell key={i} fill={TYPE_COLORS[i % TYPE_COLORS.length]} stroke="transparent" />)}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <ul className="flex-1 space-y-2 min-w-0">
              {typeCounts.slice(0, 6).map((d, i) => (
                <li key={d.type} className="flex items-center gap-2 text-xs">
                  <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ background: TYPE_COLORS[i % TYPE_COLORS.length] }} />
                  <span className="flex-1 truncate text-muted-foreground">{d.name}</span>
                  <span className="font-bold tabular-nums text-foreground">{d.value}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Recent Activity Card ───────────────────────────────────────────────────────
function RecentActivityCard({ entries, loading, t }: { entries: any[]; loading: boolean; t: (k: string, opts?: any) => string }) {
  const ACTION_ICON: Record<string, React.ElementType> = {
    INSERT:              TrendingUp,
    UPDATE:              RotateCcw,
    DELETE:              AlertTriangle,
    status_change:       CheckCircle2,
    attachment_add:      FileText,
    attachment_download: FileText,
  };
  return (
    <Card className="border bg-card shadow-card animate-fade-in">
      <CardHeader className="pb-3 pt-5 px-5">
        <CardTitle className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
          <Activity className="h-3.5 w-3.5" />{t("dashboard.recentActivity")}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-5 pb-4">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3 w-4/5" />
                  <Skeleton className="h-2.5 w-2/5" />
                </div>
              </div>
            ))}
          </div>
        ) : entries.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">{t("dashboard.noActivity")}</p>
        ) : (
          <ul className="divide-y divide-border">
            {entries.map((entry) => {
              const Icon = ACTION_ICON[entry.action] ?? Activity;
              return (
                <li key={entry.id} className="flex items-start gap-3 py-3 first:pt-0">
                  <div className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-muted">
                    <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-foreground leading-snug truncate">
                      {entry.description ?? `${entry.entity} · ${entry.action}`}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {new Date(entry.created_at).toLocaleString(undefined, {
                        day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
                      })}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

// ── Next Actions Card ─────────────────────────────────────────────────────────
function NextActionsCard({
  docsInReview, openNCs, t,
}: {
  docsInReview: any[];
  openNCs: any[];
  t: (k: string, opts?: any) => string;
}) {
  const items: { label: string; color: string; icon: React.ElementType }[] = [
    ...docsInReview.slice(0, 3).map((d) => ({ label: d.title, color: MOD.documents, icon: Clock })),
    ...openNCs.slice(0, 3).map((nc) => ({ label: nc.description?.slice(0, 60) ?? "NC", color: MOD.nc, icon: AlertTriangle })),
  ];

  return (
    <Card className="border bg-card shadow-card animate-fade-in">
      <CardHeader className="pb-3 pt-5 px-5">
        <CardTitle className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
          <ChevronRight className="h-3.5 w-3.5" />{t("dashboard.nextActions")}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-5 pb-4">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full" style={{ background: `${MOD.suppliers}18` }}>
              <CheckCircle2 className="h-5 w-5" style={{ color: MOD.suppliers }} />
            </div>
            <p className="text-sm text-muted-foreground">{t("dashboard.allClear")}</p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {items.map((item, i) => {
              const Icon = item.icon;
              return (
                <li key={i} className="flex items-center gap-3 py-3 first:pt-0">
                  <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg"
                    style={{ background: `${item.color}15` }}>
                    <Icon className="h-3.5 w-3.5" style={{ color: item.color }} />
                  </div>
                  <p className="flex-1 truncate text-xs text-foreground">{item.label}</p>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

// ── Document status mini-card ─────────────────────────────────────────────────
function DocStatusCard({
  label, count, color, icon: Icon, badge, loading,
}: {
  label: string; count: number; color: string; icon: React.ElementType;
  badge: string; loading: boolean;
}) {
  const animated = useCountUp(loading ? 0 : count);
  return (
    <Card className="border bg-card shadow-card animate-fade-in">
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
          <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        </div>
        {loading ? (
          <Skeleton className="h-9 w-14" />
        ) : (
          <>
            <p className="text-3xl font-extrabold tabular-nums leading-none" style={{ color }}>{animated}</p>
            <div className="mt-3">
              <span
                className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold border"
                style={{ color, borderColor: `${color}40`, background: `${color}12` }}
              >
                {badge}
              </span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ── Main Dashboard ─────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { activeProject } = useProject();

  const { data: allProjects, loading: projLoading } = useProjects();
  const { data: documents, loading: docLoading } = useDocuments();
  const { data: tests, loading: testLoading } = useTests();
  const { data: ncs, loading: ncLoading } = useNonConformities();
  const { data: suppliers, loading: supLoading } = useSuppliers();
  const { data: auditEntries, loading: auditLoading } = useAuditLog();

  const displayName = user?.email?.split("@")[0] ?? "—";

  // ── KPI Computations ─────────────────────────────────────────────────────────
  const activeProjectsCount = allProjects.filter((p) => p.status === "active").length;
  const docDraft    = documents.filter((d) => d.status === "draft").length;
  const docReview   = documents.filter((d) => d.status === "review").length;
  const docApproved = documents.filter((d) => d.status === "approved").length;
  const testPending      = tests.filter((t) => t.status === "pending").length;
  const testPass         = tests.filter((t) => t.status === "pass").length;
  const testFail         = tests.filter((t) => t.status === "fail").length;
  const testInconclusive = tests.filter((t) => t.status === "inconclusive").length;
  const ncOpen       = ncs.filter((n) => n.status === "open").length;
  const ncInProgress = ncs.filter((n) => n.status === "in_progress").length;
  const ncClosed     = ncs.filter((n) => n.status === "closed").length;
  const openNcs = ncs.filter((n) => n.status !== "closed");
  const avgAgingDays = openNcs.length > 0
    ? Math.round(openNcs.reduce((acc, n) => acc + Math.floor((Date.now() - new Date(n.created_at).getTime()) / 86_400_000), 0) / openNcs.length)
    : 0;
  const supPending  = suppliers.filter((s) => s.approval_status === "pending").length;
  const supApproved = suppliers.filter((s) => s.approval_status === "approved").length;
  const supRejected = suppliers.filter((s) => s.approval_status === "rejected").length;

  // ── Chart data ────────────────────────────────────────────────────────────────
  const docPieData = [
    { name: t("documents.status.draft"),    value: docDraft,    color: MOD.muted        },
    { name: t("documents.status.review"),   value: docReview,   color: MOD.documents    },
    { name: t("documents.status.approved"), value: docApproved, color: MOD.suppliers    },
  ].filter((d) => d.value > 0);

  const ncPieData = [
    { name: t("nc.status.open"),        value: ncOpen,       color: MOD.nc             },
    { name: t("nc.status.in_progress"), value: ncInProgress, color: MOD.subcontractors },
    { name: t("nc.status.closed"),      value: ncClosed,     color: MOD.suppliers      },
  ].filter((d) => d.value > 0);

  const testBarData = [{
    name: t("dashboard.charts.tests"),
    [t("tests.status.pass")]:         testPass,
    [t("tests.status.fail")]:         testFail,
    [t("tests.status.pending")]:      testPending,
    [t("tests.status.inconclusive")]: testInconclusive,
  }];
  const testBars = [
    { key: t("tests.status.pass"),         color: MOD.suppliers,      label: t("tests.status.pass")         },
    { key: t("tests.status.fail"),         color: MOD.nc,             label: t("tests.status.fail")         },
    { key: t("tests.status.pending"),      color: MOD.subcontractors, label: t("tests.status.pending")      },
    { key: t("tests.status.inconclusive"), color: MOD.muted,          label: t("tests.status.inconclusive") },
  ];

  const supBarData = [{
    name: t("dashboard.charts.suppliers"),
    [t("suppliers.approvalStatus.approved")]: supApproved,
    [t("suppliers.approvalStatus.pending")]:  supPending,
    [t("suppliers.approvalStatus.rejected")]: supRejected,
  }];
  const supBars = [
    { key: t("suppliers.approvalStatus.approved"), color: MOD.suppliers,      label: t("suppliers.approvalStatus.approved") },
    { key: t("suppliers.approvalStatus.pending"),  color: MOD.subcontractors, label: t("suppliers.approvalStatus.pending")  },
    { key: t("suppliers.approvalStatus.rejected"), color: MOD.nc,             label: t("suppliers.approvalStatus.rejected") },
  ];

  const recentEntries  = auditEntries.slice(0, 8);
  const docsInReview   = documents.filter((d) => d.status === "review");
  const openNCsList    = ncs.filter((n) => n.status === "open" || n.status === "in_progress");
  const anyLoading     = docLoading || testLoading || ncLoading || supLoading;

  return (
    <div className="space-y-8 max-w-6xl mx-auto animate-fade-in">

      {/* ── Page header ───────────────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
            {t("dashboard.welcome")}
          </p>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground leading-none">
            {displayName}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {activeProject
              ? t("dashboard.subtitleProject", { project: activeProject.name })
              : t("dashboard.subtitle")}
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-2 rounded-xl border border-border bg-card shadow-card px-4 py-2.5">
          <ShieldCheck className="h-4 w-4 text-muted-foreground" />
          <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
            Atlas QMS
          </span>
        </div>
      </div>

      {/* ── No project banner ─────────────────────────────────────────── */}
      {!activeProject && (
        <div className="flex items-center gap-3 rounded-xl border border-border bg-card shadow-card px-5 py-3.5">
          <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <p className="text-sm text-muted-foreground">{t("dashboard.noProjectSelected")}</p>
        </div>
      )}

      {/* ── Row 1: Main KPI cards (4 cols) ───────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label={t("dashboard.stats.activeProjects")}
          value={activeProjectsCount}
          icon={FolderKanban}
          loading={projLoading}
          moduleColor={MOD.projects}
        />
        <StatCard
          label={t("dashboard.stats.openDocuments")}
          value={documents.filter((d) => d.status !== "approved").length}
          icon={FileText}
          loading={docLoading}
          moduleColor={MOD.documents}
          sub={`${docApproved} ${t("documents.status.approved").toLowerCase()}`}
        />
        <StatCard
          label={t("dashboard.stats.pendingTests")}
          value={testPending + testFail}
          icon={FlaskConical}
          loading={testLoading}
          moduleColor={MOD.tests}
          sub={`${testPass} ${t("tests.status.pass").toLowerCase()}`}
        />
        <StatCard
          label={t("dashboard.stats.openNCs")}
          value={ncOpen + ncInProgress}
          icon={AlertTriangle}
          loading={ncLoading}
          moduleColor={MOD.nc}
          sub={`${ncClosed} ${t("nc.status.closed").toLowerCase()}`}
        />
      </div>

      {/* ── Row 2: Document status breakdown ─────────────────────────── */}
      <div className="grid grid-cols-3 gap-4">
        <DocStatusCard
          label={t("documents.status.draft")}
          count={docDraft}
          color={MOD.muted}
          icon={RotateCcw}
          badge={t("dashboard.kpi.documents")}
          loading={anyLoading}
        />
        <DocStatusCard
          label={t("documents.status.review")}
          count={docReview}
          color={MOD.documents}
          icon={Clock}
          badge={t("dashboard.kpi.awaitingReview")}
          loading={anyLoading}
        />
        <DocStatusCard
          label={t("documents.status.approved")}
          count={docApproved}
          color={MOD.suppliers}
          icon={CheckCircle2}
          badge={t("dashboard.kpi.approved")}
          loading={anyLoading}
        />
      </div>

      {/* ── Row 3: Charts grid ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 xl:grid-cols-4">
        <PieCard
          title={t("dashboard.kpi.documents")}
          data={docPieData}
          loading={docLoading}
          icon={FileText}
          total={documents.length}
        />
        <DocTypeCard documents={documents} loading={docLoading} t={t} />
        <PieCard
          title={t("dashboard.kpi.ncs")}
          data={ncPieData}
          loading={ncLoading}
          icon={AlertTriangle}
          total={ncs.length}
        />
        <AgingCard days={avgAgingDays} openCount={openNcs.length} loading={ncLoading} />
      </div>

      {/* ── Row 4: Tests + Suppliers bar charts ──────────────────────── */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <BarCard
          title={t("dashboard.kpi.tests")}
          data={testBarData}
          loading={testLoading}
          icon={FlaskConical}
          bars={testBars}
        />
        <BarCard
          title={t("dashboard.kpi.suppliers")}
          data={supBarData}
          loading={supLoading}
          icon={Building2}
          bars={supBars}
        />
      </div>

      {/* ── Row 5: Activity + Next actions ───────────────────────────── */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <RecentActivityCard entries={recentEntries} loading={auditLoading} t={t} />
        </div>
        <NextActionsCard docsInReview={docsInReview} openNCs={openNCsList} t={t} />
      </div>

    </div>
  );
}
