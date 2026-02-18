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
  ChevronRight, RotateCcw,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { cn } from "@/lib/utils";

// ── Semantic color tokens ─────────────────────────────────────────────────────
const C = {
  blue:   "hsl(217, 91%, 50%)",
  green:  "hsl(142, 71%, 45%)",
  red:    "hsl(0, 84%, 60%)",
  orange: "hsl(25, 95%, 53%)",
  muted:  "hsl(215, 16%, 80%)",
  purple: "hsl(270, 80%, 60%)",
} as const;

// ── Animated counter ──────────────────────────────────────────────────────────
function useCountUp(target: number, duration = 800) {
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

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({
  label, value, icon: Icon, loading, accent, sub, trend,
}: {
  label: string; value: number; icon: React.ElementType;
  loading: boolean; accent: string; sub?: string; trend?: string;
}) {
  const animated = useCountUp(loading ? 0 : value);
  if (loading) return (
    <Card className="border bg-card shadow-none">
      <CardContent className="p-5">
        <Skeleton className="h-3 w-24 mb-3" />
        <Skeleton className="h-9 w-14 mb-1" />
        <Skeleton className="h-2.5 w-20" />
      </CardContent>
    </Card>
  );
  return (
    <Card className="border bg-card shadow-none hover:shadow-md transition-shadow duration-200 animate-fade-in">
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground leading-none">{label}</p>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: `${accent}1a` }}>
            <Icon className="h-4 w-4" style={{ color: accent }} />
          </div>
        </div>
        <p className="text-4xl font-bold tabular-nums text-foreground">{animated}</p>
        {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
        {trend && <p className="mt-1 text-xs font-medium" style={{ color: accent }}>{trend}</p>}
      </CardContent>
    </Card>
  );
}

// ── Custom tooltip ────────────────────────────────────────────────────────────
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-lg text-xs">
      {label && <p className="font-semibold text-foreground mb-1">{label}</p>}
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

// ── Pie card ──────────────────────────────────────────────────────────────────
function PieCard({
  title, data, loading, icon: Icon, total,
}: {
  title: string;
  data: { name: string; value: number; color: string }[];
  loading: boolean; icon: React.ElementType; total: number;
}) {
  return (
    <Card className="border shadow-none animate-fade-in">
      <CardHeader className="pb-0 pt-4 px-5">
        <CardTitle className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          <Icon className="h-3.5 w-3.5" />{title}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-5 pb-5">
        {loading ? <Skeleton className="h-40 w-full mt-3" /> : total === 0 ? (
          <div className="flex h-40 items-center justify-center">
            <p className="text-sm text-muted-foreground">—</p>
          </div>
        ) : (
          <div className="flex items-center gap-4 mt-1">
            <ResponsiveContainer width={120} height={120}>
              <PieChart>
                <Pie data={data} cx="50%" cy="50%" innerRadius={30} outerRadius={52}
                  paddingAngle={2} dataKey="value" isAnimationActive animationDuration={700}>
                  {data.map((entry, i) => <Cell key={i} fill={entry.color} stroke="none" />)}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <ul className="flex-1 space-y-1.5 min-w-0">
              {data.map((d) => (
                <li key={d.name} className="flex items-center gap-2 text-xs">
                  <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ background: d.color }} />
                  <span className="flex-1 truncate text-muted-foreground">{d.name}</span>
                  <span className="font-semibold tabular-nums text-foreground">{d.value}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Bar card ──────────────────────────────────────────────────────────────────
function BarCard({
  title, data, loading, icon: Icon, bars,
}: {
  title: string; data: any[]; loading: boolean; icon: React.ElementType;
  bars: { key: string; color: string; label: string }[];
}) {
  return (
    <Card className="border shadow-none animate-fade-in">
      <CardHeader className="pb-0 pt-4 px-5">
        <CardTitle className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          <Icon className="h-3.5 w-3.5" />{title}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-5 pb-5 pt-3">
        {loading ? <Skeleton className="h-40 w-full" /> : (
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={data} barCategoryGap="30%" barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={24} />
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

// ── NC Aging gauge ────────────────────────────────────────────────────────────
function AgingCard({ days, openCount, loading }: { days: number; openCount: number; loading: boolean }) {
  const { t } = useTranslation();
  const animated = useCountUp(loading ? 0 : days);
  const agingColor = days === 0 ? C.muted : days < 7 ? C.green : days < 30 ? C.orange : C.red;

  return (
    <Card className="border shadow-none animate-fade-in">
      <CardHeader className="pb-0 pt-4 px-5">
        <CardTitle className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          <Timer className="h-3.5 w-3.5" />{t("dashboard.kpi.avgAgingTitle")}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-5 pb-5">
        {loading ? <Skeleton className="h-24 w-full mt-3" /> : (
          <div className="flex flex-col items-center justify-center py-4 gap-1">
            <span className="text-5xl font-extrabold tabular-nums" style={{ color: agingColor }}>{animated}</span>
            <span className="text-xs text-muted-foreground">{t("dashboard.kpi.days")}</span>
            <span className="mt-1 text-xs text-muted-foreground">
              {openCount > 0 ? t("dashboard.kpi.openNcCount", { count: openCount }) : t("dashboard.kpi.noOpenNcs")}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Doc-by-type chart ─────────────────────────────────────────────────────────
function DocTypeCard({ documents, loading, t }: { documents: any[]; loading: boolean; t: (k: string, opts?: any) => string }) {
  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    documents.forEach((d) => { counts[d.doc_type] = (counts[d.doc_type] ?? 0) + 1; });
    return Object.entries(counts)
      .map(([type, count]) => ({ name: t(`documents.docTypes.${type}`, { defaultValue: type }), value: count, type }))
      .sort((a, b) => b.value - a.value);
  }, [documents, t]);

  const colors = [C.blue, C.green, C.orange, C.purple, C.red, C.muted];

  return (
    <Card className="border shadow-none animate-fade-in">
      <CardHeader className="pb-0 pt-4 px-5">
        <CardTitle className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          <FileText className="h-3.5 w-3.5" />{t("dashboard.charts.docsByType")}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-5 pb-5">
        {loading ? <Skeleton className="h-40 w-full mt-3" /> : typeCounts.length === 0 ? (
          <div className="flex h-40 items-center justify-center">
            <p className="text-sm text-muted-foreground">—</p>
          </div>
        ) : (
          <div className="flex items-center gap-4 mt-1">
            <ResponsiveContainer width={120} height={120}>
              <PieChart>
                <Pie data={typeCounts.map((d, i) => ({ ...d, color: colors[i % colors.length] }))}
                  cx="50%" cy="50%" innerRadius={30} outerRadius={52} paddingAngle={2}
                  dataKey="value" isAnimationActive animationDuration={700}>
                  {typeCounts.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} stroke="none" />)}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <ul className="flex-1 space-y-1.5 min-w-0">
              {typeCounts.slice(0, 6).map((d, i) => (
                <li key={d.type} className="flex items-center gap-2 text-xs">
                  <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ background: colors[i % colors.length] }} />
                  <span className="flex-1 truncate text-muted-foreground">{d.name}</span>
                  <span className="font-semibold tabular-nums text-foreground">{d.value}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Recent activity ────────────────────────────────────────────────────────────
function RecentActivityCard({ entries, loading, t }: { entries: any[]; loading: boolean; t: (k: string, opts?: any) => string }) {
  const ACTION_ICON: Record<string, React.ElementType> = {
    INSERT: TrendingUp,
    UPDATE: RotateCcw,
    DELETE: AlertTriangle,
    status_change: CheckCircle2,
    attachment_add: FileText,
    attachment_download: FileText,
  };

  return (
    <Card className="border shadow-none animate-fade-in">
      <CardHeader className="pb-2 pt-4 px-5">
        <CardTitle className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          <Activity className="h-3.5 w-3.5" />{t("dashboard.recentActivity")}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-5 pb-4">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-7 w-7 rounded-full flex-shrink-0" />
                <div className="flex-1 space-y-1">
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
                <li key={entry.id} className="flex items-start gap-3 py-2.5 first:pt-0">
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

// ── Next actions ──────────────────────────────────────────────────────────────
function NextActionsCard({
  docsInReview, openNCs, t,
}: {
  docsInReview: any[];
  openNCs: any[];
  t: (k: string, opts?: any) => string;
}) {
  const items: { label: string; color: string; icon: React.ElementType }[] = [
    ...docsInReview.slice(0, 3).map((d) => ({
      label: d.title,
      color: C.blue,
      icon: Clock,
    })),
    ...openNCs.slice(0, 3).map((nc) => ({
      label: nc.description?.slice(0, 60) ?? "NC",
      color: C.red,
      icon: AlertTriangle,
    })),
  ];

  return (
    <Card className="border shadow-none animate-fade-in">
      <CardHeader className="pb-2 pt-4 px-5">
        <CardTitle className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          <ChevronRight className="h-3.5 w-3.5" />{t("dashboard.nextActions")}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-5 pb-4">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 gap-2">
            <CheckCircle2 className="h-8 w-8 text-chart-2" />
            <p className="text-sm text-muted-foreground">{t("dashboard.allClear")}</p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {items.map((item, i) => {
              const Icon = item.icon;
              return (
                <li key={i} className="flex items-center gap-3 py-2.5 first:pt-0">
                  <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full"
                    style={{ background: `${item.color}1a` }}>
                    <Icon className="h-3 w-3" style={{ color: item.color }} />
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
    { name: t("documents.status.draft"),    value: docDraft,    color: C.muted  },
    { name: t("documents.status.review"),   value: docReview,   color: C.blue   },
    { name: t("documents.status.approved"), value: docApproved, color: C.green  },
  ].filter((d) => d.value > 0);

  const ncPieData = [
    { name: t("nc.status.open"),        value: ncOpen,       color: C.red    },
    { name: t("nc.status.in_progress"), value: ncInProgress, color: C.orange },
    { name: t("nc.status.closed"),      value: ncClosed,     color: C.green  },
  ].filter((d) => d.value > 0);

  const testBarData = [{
    name: t("dashboard.charts.tests"),
    [t("tests.status.pass")]:         testPass,
    [t("tests.status.fail")]:         testFail,
    [t("tests.status.pending")]:      testPending,
    [t("tests.status.inconclusive")]: testInconclusive,
  }];
  const testBars = [
    { key: t("tests.status.pass"),        color: C.green,  label: t("tests.status.pass")        },
    { key: t("tests.status.fail"),        color: C.red,    label: t("tests.status.fail")         },
    { key: t("tests.status.pending"),     color: C.orange, label: t("tests.status.pending")      },
    { key: t("tests.status.inconclusive"),color: C.muted,  label: t("tests.status.inconclusive") },
  ];

  const supBarData = [{
    name: t("dashboard.charts.suppliers"),
    [t("suppliers.approvalStatus.approved")]: supApproved,
    [t("suppliers.approvalStatus.pending")]:  supPending,
    [t("suppliers.approvalStatus.rejected")]: supRejected,
  }];
  const supBars = [
    { key: t("suppliers.approvalStatus.approved"), color: C.green,  label: t("suppliers.approvalStatus.approved") },
    { key: t("suppliers.approvalStatus.pending"),  color: C.orange, label: t("suppliers.approvalStatus.pending")  },
    { key: t("suppliers.approvalStatus.rejected"), color: C.red,    label: t("suppliers.approvalStatus.rejected") },
  ];

  // Recent activity: last 8 entries
  const recentEntries = auditEntries.slice(0, 8);

  // Next actions
  const docsInReview = documents.filter((d) => d.status === "review");
  const openNCsList  = ncs.filter((n) => n.status === "open" || n.status === "in_progress");

  const anyLoading = docLoading || testLoading || ncLoading || supLoading;

  return (
    <div className="space-y-7 max-w-6xl mx-auto animate-fade-in">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          {t("dashboard.welcome")},{" "}
          <span className="text-primary">{displayName}</span>
        </h1>
        <p className="text-sm text-muted-foreground">
          {activeProject
            ? t("dashboard.subtitleProject", { project: activeProject.name })
            : t("dashboard.subtitle")}
        </p>
      </div>

      {!activeProject && (
        <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/40 px-4 py-3">
          <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <p className="text-sm text-muted-foreground">{t("dashboard.noProjectSelected")}</p>
        </div>
      )}

      {/* ── Row 1: KPI stat cards ───────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label={t("dashboard.stats.activeProjects")}
          value={activeProjectsCount}
          icon={FolderKanban}
          loading={projLoading}
          accent={C.blue}
        />
        <StatCard
          label={t("dashboard.stats.openDocuments")}
          value={documents.filter((d) => d.status !== "approved").length}
          icon={FileText}
          loading={docLoading}
          accent={C.orange}
          sub={`${docApproved} ${t("documents.status.approved").toLowerCase()}`}
        />
        <StatCard
          label={t("dashboard.stats.pendingTests")}
          value={testPending + testFail}
          icon={FlaskConical}
          loading={testLoading}
          accent={C.purple}
          sub={`${testPass} ${t("tests.status.pass").toLowerCase()}`}
        />
        <StatCard
          label={t("dashboard.stats.openNCs")}
          value={ncOpen + ncInProgress}
          icon={AlertTriangle}
          loading={ncLoading}
          accent={C.red}
          sub={`${ncClosed} ${t("nc.status.closed").toLowerCase()}`}
        />
      </div>

      {/* ── Row 2: Document KPIs ────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-4">
        <Card className={cn("border shadow-none", anyLoading ? "" : "animate-fade-in")}>
          <CardContent className="p-5 flex flex-col gap-1">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{t("documents.status.draft")}</p>
            {anyLoading ? <Skeleton className="h-9 w-14" /> : (
              <p className="text-3xl font-bold text-foreground tabular-nums">{docDraft}</p>
            )}
            <Badge variant="outline" className="w-fit text-xs bg-muted/50">{t("dashboard.kpi.documents")}</Badge>
          </CardContent>
        </Card>
        <Card className={cn("border shadow-none bg-primary/5", anyLoading ? "" : "animate-fade-in")}>
          <CardContent className="p-5 flex flex-col gap-1">
            <p className="text-xs font-semibold uppercase tracking-widest text-primary/70">{t("documents.status.review")}</p>
            {anyLoading ? <Skeleton className="h-9 w-14" /> : (
              <p className="text-3xl font-bold text-primary tabular-nums">{docReview}</p>
            )}
            <Badge variant="outline" className="w-fit text-xs bg-primary/10 text-primary border-primary/20">
              <Clock className="h-3 w-3 mr-1" />{t("dashboard.kpi.awaitingReview")}
            </Badge>
          </CardContent>
        </Card>
        <Card className={cn("border shadow-none bg-chart-2/5", anyLoading ? "" : "animate-fade-in")}>
          <CardContent className="p-5 flex flex-col gap-1">
            <p className="text-xs font-semibold uppercase tracking-widest text-chart-2/70">{t("documents.status.approved")}</p>
            {anyLoading ? <Skeleton className="h-9 w-14" /> : (
              <p className="text-3xl font-bold text-chart-2 tabular-nums">{docApproved}</p>
            )}
            <Badge variant="outline" className="w-fit text-xs bg-chart-2/10 text-chart-2 border-chart-2/20">
              <CheckCircle2 className="h-3 w-3 mr-1" />{t("dashboard.kpi.approved")}
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* ── Row 3: Charts ───────────────────────────────────────────────────── */}
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

      {/* ── Row 4: Tests + Suppliers charts ─────────────────────────────────── */}
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

      {/* ── Row 5: Activity + Next actions ──────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <RecentActivityCard entries={recentEntries} loading={auditLoading} t={t} />
        </div>
        <NextActionsCard docsInReview={docsInReview} openNCs={openNCsList} t={t} />
      </div>

    </div>
  );
}
