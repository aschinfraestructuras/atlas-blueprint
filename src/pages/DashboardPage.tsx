import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { useProject } from "@/contexts/ProjectContext";
import { useProjects } from "@/hooks/useProjects";
import { useDocuments } from "@/hooks/useDocuments";
import { useTests } from "@/hooks/useTests";
import { useNonConformities } from "@/hooks/useNonConformities";
import { useSuppliers } from "@/hooks/useSuppliers";
import {
  FolderKanban,
  FileText,
  FlaskConical,
  AlertTriangle,
  Clock,
  Building2,
  Timer,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { cn } from "@/lib/utils";

// ── Semantic color palette from CSS vars ──────────────────────────────────────
const C = {
  blue:   "hsl(217, 91%, 50%)",
  green:  "hsl(142, 71%, 45%)",
  red:    "hsl(0, 84%, 60%)",
  orange: "hsl(25, 95%, 53%)",
  muted:  "hsl(215, 16%, 80%)",
} as const;

// ── Animated counter hook ─────────────────────────────────────────────────────
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
      // ease-out cubic
      const ease = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(ease * target));
      if (progress < 1) raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, [target, duration]);

  return value;
}

// ── Animated stat card ────────────────────────────────────────────────────────
function StatCard({
  label,
  value,
  icon: Icon,
  loading,
  accent,
  sub,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  loading: boolean;
  accent: string;
  sub?: string;
}) {
  const animated = useCountUp(loading ? 0 : value);

  if (loading) {
    return (
      <Card className="border bg-card shadow-none">
        <CardContent className="p-5">
          <Skeleton className="h-3 w-24 mb-3" />
          <Skeleton className="h-9 w-14 mb-1" />
          <Skeleton className="h-2.5 w-20" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border bg-card shadow-none hover:shadow-md transition-shadow duration-200 animate-fade-in">
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground leading-none">
            {label}
          </p>
          <div
            className="flex h-8 w-8 items-center justify-center rounded-lg"
            style={{ background: `${accent}1a` }}
          >
            <Icon className="h-4 w-4" style={{ color: accent }} />
          </div>
        </div>
        <p className="text-4xl font-bold tabular-nums text-foreground">{animated}</p>
        {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
      </CardContent>
    </Card>
  );
}

// ── Custom tooltip for charts ─────────────────────────────────────────────────
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

// ── Pie chart card ────────────────────────────────────────────────────────────
function PieCard({
  title,
  data,
  loading,
  icon: Icon,
  total,
}: {
  title: string;
  data: { name: string; value: number; color: string }[];
  loading: boolean;
  icon: React.ElementType;
  total: number;
}) {
  return (
    <Card className="border shadow-none animate-fade-in">
      <CardHeader className="pb-0 pt-4 px-5">
        <CardTitle className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          <Icon className="h-3.5 w-3.5" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-5 pb-5">
        {loading ? (
          <Skeleton className="h-40 w-full mt-3" />
        ) : total === 0 ? (
          <div className="flex h-40 items-center justify-center">
            <p className="text-sm text-muted-foreground">—</p>
          </div>
        ) : (
          <div className="flex items-center gap-4 mt-1">
            <ResponsiveContainer width={120} height={120}>
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={30}
                  outerRadius={52}
                  paddingAngle={2}
                  dataKey="value"
                  isAnimationActive
                  animationDuration={700}
                  animationEasing="ease-out"
                >
                  {data.map((entry, i) => (
                    <Cell key={i} fill={entry.color} stroke="none" />
                  ))}
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

// ── Bar chart card ────────────────────────────────────────────────────────────
function BarCard({
  title,
  data,
  loading,
  icon: Icon,
  bars,
}: {
  title: string;
  data: any[];
  loading: boolean;
  icon: React.ElementType;
  bars: { key: string; color: string; label: string }[];
}) {
  return (
    <Card className="border shadow-none animate-fade-in">
      <CardHeader className="pb-0 pt-4 px-5">
        <CardTitle className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          <Icon className="h-3.5 w-3.5" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-5 pb-5 pt-3">
        {loading ? (
          <Skeleton className="h-40 w-full" />
        ) : (
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={data} barCategoryGap="30%" barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
                width={24}
              />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: "hsl(var(--muted))" }} />
              <Legend
                iconType="circle"
                iconSize={7}
                wrapperStyle={{ fontSize: 10, color: "hsl(var(--muted-foreground))" }}
              />
              {bars.map((b) => (
                <Bar
                  key={b.key}
                  dataKey={b.key}
                  name={b.label}
                  fill={b.color}
                  radius={[3, 3, 0, 0]}
                  isAnimationActive
                  animationDuration={700}
                  animationEasing="ease-out"
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

// ── Aging gauge ───────────────────────────────────────────────────────────────
function AgingCard({
  days,
  openCount,
  loading,
}: {
  days: number;
  openCount: number;
  loading: boolean;
}) {
  const { t } = useTranslation();
  const animated = useCountUp(loading ? 0 : days);

  // Color interpolation: green <7d, orange 7-30d, red >30d
  const agingColor =
    days === 0 ? C.muted : days < 7 ? C.green : days < 30 ? C.orange : C.red;

  return (
    <Card className="border shadow-none animate-fade-in">
      <CardHeader className="pb-0 pt-4 px-5">
        <CardTitle className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          <Timer className="h-3.5 w-3.5" />
          {t("dashboard.kpi.avgAgingTitle")}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-5 pb-5">
        {loading ? (
          <Skeleton className="h-24 w-full mt-3" />
        ) : (
          <div className="flex flex-col items-center justify-center py-4 gap-1">
            <span
              className="text-5xl font-extrabold tabular-nums"
              style={{ color: agingColor }}
            >
              {animated}
            </span>
            <span className="text-xs text-muted-foreground">{t("dashboard.kpi.days")}</span>
            <span className="mt-1 text-xs text-muted-foreground">
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

// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { activeProject } = useProject();

  const { data: allProjects, loading: projLoading } = useProjects();
  const { data: documents, loading: docLoading } = useDocuments();
  const { data: tests, loading: testLoading } = useTests();
  const { data: ncs, loading: ncLoading } = useNonConformities();
  const { data: suppliers, loading: supLoading } = useSuppliers();

  const displayName = user?.email?.split("@")[0] ?? "—";

  // ── KPI Computations ────────────────────────────────────────────────────────
  const activeProjectsCount = allProjects.filter((p) => p.status === "active").length;

  // Documents
  const docDraft     = documents.filter((d) => d.status === "draft").length;
  const docSubmitted = documents.filter((d) => d.status === "submitted").length;
  const docApproved  = documents.filter((d) => d.status === "approved").length;
  const docRejected  = documents.filter((d) => d.status === "rejected").length;

  // Tests
  const testPending   = tests.filter((t) => t.status === "pending").length;
  const testCompliant = tests.filter((t) => t.status === "compliant").length;
  const testNonComp   = tests.filter((t) => t.status === "non_compliant").length;

  // NCs
  const ncOpen       = ncs.filter((n) => n.status === "open").length;
  const ncInProgress = ncs.filter((n) => n.status === "under_review").length;
  const ncClosed     = ncs.filter((n) => n.status === "closed").length;

  const openNcs = ncs.filter((n) => n.status !== "closed");
  const avgAgingDays =
    openNcs.length > 0
      ? Math.round(
          openNcs.reduce((acc, n) => {
            const days = Math.floor(
              (Date.now() - new Date(n.created_at).getTime()) / 86_400_000
            );
            return acc + days;
          }, 0) / openNcs.length
        )
      : 0;

  // Suppliers
  const supPending  = suppliers.filter((s) => s.approval_status === "pending").length;
  const supApproved = suppliers.filter((s) => s.approval_status === "approved").length;
  const supRejected = suppliers.filter((s) => s.approval_status === "rejected").length;

  // ── Chart data ───────────────────────────────────────────────────────────────

  const docPieData = [
    { name: t("documents.status.draft"),     value: docDraft,     color: C.muted   },
    { name: t("documents.status.submitted"), value: docSubmitted, color: C.blue    },
    { name: t("documents.status.approved"),  value: docApproved,  color: C.green   },
    { name: t("documents.status.rejected"),  value: docRejected,  color: C.red     },
  ].filter((d) => d.value > 0);

  const ncPieData = [
    { name: t("nc.status.open"),         value: ncOpen,       color: C.red    },
    { name: t("nc.status.under_review"), value: ncInProgress, color: C.orange },
    { name: t("nc.status.closed"),       value: ncClosed,     color: C.green  },
  ].filter((d) => d.value > 0);

  const testBarData = [
    {
      name: t("dashboard.charts.tests"),
      [t("tests.status.compliant")]:     testCompliant,
      [t("tests.status.non_compliant")]: testNonComp,
      [t("tests.status.pending")]:       testPending,
    },
  ];
  const testBars = [
    { key: t("tests.status.compliant"),     color: C.green,  label: t("tests.status.compliant")     },
    { key: t("tests.status.non_compliant"), color: C.red,    label: t("tests.status.non_compliant") },
    { key: t("tests.status.pending"),       color: C.orange, label: t("tests.status.pending")       },
  ];

  const supBarData = [
    {
      name: t("dashboard.charts.suppliers"),
      [t("suppliers.approvalStatus.approved")]: supApproved,
      [t("suppliers.approvalStatus.pending")]:  supPending,
      [t("suppliers.approvalStatus.rejected")]: supRejected,
    },
  ];
  const supBars = [
    { key: t("suppliers.approvalStatus.approved"), color: C.green,  label: t("suppliers.approvalStatus.approved") },
    { key: t("suppliers.approvalStatus.pending"),  color: C.orange, label: t("suppliers.approvalStatus.pending")  },
    { key: t("suppliers.approvalStatus.rejected"), color: C.red,    label: t("suppliers.approvalStatus.rejected") },
  ];

  return (
    <div className="space-y-7 max-w-6xl mx-auto animate-fade-in">

      {/* Header */}
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

      {/* No project warning */}
      {!activeProject && (
        <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/40 px-4 py-3">
          <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <p className="text-sm text-muted-foreground">{t("dashboard.noProjectSelected")}</p>
        </div>
      )}

      {/* ── Row 1: Animated stat cards ──────────────────────────────────────── */}
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
          value={testPending}
          icon={FlaskConical}
          loading={testLoading}
          accent={C.blue}
          sub={`${testCompliant} ${t("tests.status.compliant").toLowerCase()}`}
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

      {/* ── Row 2: Charts ───────────────────────────────────────────────────── */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
          {t("dashboard.kpi.title")}
        </p>
        <div className="grid gap-4 lg:grid-cols-4">
          {/* Documents pie */}
          <PieCard
            title={t("dashboard.kpi.documents")}
            data={docPieData}
            total={documents.length}
            loading={docLoading}
            icon={FileText}
          />

          {/* NC pie */}
          <PieCard
            title={t("dashboard.kpi.ncs")}
            data={ncPieData}
            total={ncs.length}
            loading={ncLoading}
            icon={AlertTriangle}
          />

          {/* Tests bar */}
          <BarCard
            title={t("dashboard.kpi.tests")}
            data={testBarData}
            loading={testLoading}
            icon={FlaskConical}
            bars={testBars}
          />

          {/* Suppliers bar */}
          <BarCard
            title={t("dashboard.kpi.suppliers")}
            data={supBarData}
            loading={supLoading}
            icon={Clock}
            bars={supBars}
          />
        </div>
      </div>

      {/* ── Row 3: NC Aging gauge ─────────────────────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-4">
        <AgingCard
          days={avgAgingDays}
          openCount={openNcs.length}
          loading={ncLoading}
        />

        {/* NC trend bar by month (last 6 months) */}
        <NcTrendCard ncs={ncs} loading={ncLoading} />

        {/* Empty 2 cols for future widgets */}
        <div className="lg:col-span-2" />
      </div>
    </div>
  );
}

// ── NC Trend (last 6 months) ──────────────────────────────────────────────────
function NcTrendCard({ ncs, loading }: { ncs: any[]; loading: boolean }) {
  const { t } = useTranslation();

  const trendData = (() => {
    const months: { name: string; open: number; closed: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const label = d.toLocaleString("default", { month: "short" });
      const y = d.getFullYear();
      const m = d.getMonth();
      const open   = ncs.filter((n) => {
        const c = new Date(n.created_at);
        return c.getFullYear() === y && c.getMonth() === m && n.status !== "closed";
      }).length;
      const closed = ncs.filter((n) => {
        const c = new Date(n.created_at);
        return c.getFullYear() === y && c.getMonth() === m && n.status === "closed";
      }).length;
      months.push({ name: label, open, closed });
    }
    return months;
  })();

  return (
    <Card className={cn("border shadow-none animate-fade-in", "lg:col-span-3")}>
      <CardHeader className="pb-0 pt-4 px-5">
        <CardTitle className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          <AlertTriangle className="h-3.5 w-3.5" />
          {t("dashboard.charts.ncTrend")}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-5 pb-5 pt-3">
        {loading ? (
          <Skeleton className="h-40 w-full" />
        ) : (
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={trendData} barCategoryGap="35%" barGap={3}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
                width={20}
              />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: "hsl(var(--muted))" }} />
              <Legend
                iconType="circle"
                iconSize={7}
                wrapperStyle={{ fontSize: 10, color: "hsl(var(--muted-foreground))" }}
              />
              <Bar
                dataKey="open"
                name={t("nc.status.open")}
                fill={C.red}
                radius={[3, 3, 0, 0]}
                isAnimationActive
                animationDuration={700}
              />
              <Bar
                dataKey="closed"
                name={t("nc.status.closed")}
                fill={C.green}
                radius={[3, 3, 0, 0]}
                isAnimationActive
                animationDuration={700}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
