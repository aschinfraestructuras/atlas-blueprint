import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useProject } from "@/contexts/ProjectContext";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ResponsiveContainer, AreaChart, Area } from "recharts";
import { AlertTriangle, FlaskConical, ClipboardCheck, TrendingUp, TrendingDown, Minus, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface TrendBucket {
  key: string;
  label: string;
  count: number;
}

interface TrendCardData {
  buckets: TrendBucket[];
  current: number;
  previous: number;
  total: number;
}

function lastSixMonths(): Array<{ key: string; label: string; start: Date; end: Date }> {
  const out: Array<{ key: string; label: string; start: Date; end: Date }> = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
    const key = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}`;
    const label = start.toLocaleDateString("pt-PT", { month: "short" }).replace(".", "");
    out.push({ key, label: label.charAt(0).toUpperCase() + label.slice(1), start, end });
  }
  return out;
}

function bucketize(rows: Array<{ d: string | null }>, months: ReturnType<typeof lastSixMonths>): TrendCardData {
  const buckets: TrendBucket[] = months.map((m) => ({ key: m.key, label: m.label, count: 0 }));
  for (const r of rows) {
    if (!r.d) continue;
    const date = new Date(r.d);
    if (isNaN(date.getTime())) continue;
    const k = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const b = buckets.find((x) => x.key === k);
    if (b) b.count++;
  }
  const current = buckets[buckets.length - 1]?.count ?? 0;
  const previous = buckets[buckets.length - 2]?.count ?? 0;
  const total = buckets.reduce((a, b) => a + b.count, 0);
  return { buckets, current, previous, total };
}

export function MonthlyTrendCards() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { activeProject } = useProject();
  const [loading, setLoading] = useState(true);
  const [ncTrend, setNcTrend] = useState<TrendCardData | null>(null);
  const [testTrend, setTestTrend] = useState<TrendCardData | null>(null);
  const [ppiTrend, setPpiTrend] = useState<TrendCardData | null>(null);

  useEffect(() => {
    if (!activeProject) return;
    let cancelled = false;
    setLoading(true);
    const months = lastSixMonths();
    const sinceIso = months[0].start.toISOString();

    (async () => {
      const [ncRes, testsRes, ppiRes] = await Promise.allSettled([
        supabase.from("non_conformities")
          .select("detected_at")
          .eq("project_id", activeProject.id)
          .eq("is_deleted", false)
          .gte("detected_at", sinceIso)
          .limit(2000),
        supabase.from("test_results")
          .select("date")
          .eq("project_id", activeProject.id)
          .gte("date", sinceIso.slice(0, 10))
          .limit(2000),
        supabase.from("ppi_instances")
          .select("approved_at, status")
          .eq("project_id", activeProject.id)
          .eq("is_deleted", false)
          .not("approved_at", "is", null)
          .gte("approved_at", sinceIso)
          .limit(2000),
      ]);

      if (cancelled) return;

      if (ncRes.status === "fulfilled" && ncRes.value.data) {
        setNcTrend(bucketize(
          (ncRes.value.data as any[]).map((r) => ({ d: r.detected_at })),
          months,
        ));
      } else setNcTrend(bucketize([], months));

      if (testsRes.status === "fulfilled" && testsRes.value.data) {
        setTestTrend(bucketize(
          (testsRes.value.data as any[]).map((r) => ({ d: r.date })),
          months,
        ));
      } else setTestTrend(bucketize([], months));

      if (ppiRes.status === "fulfilled" && ppiRes.value.data) {
        setPpiTrend(bucketize(
          (ppiRes.value.data as any[]).map((r) => ({ d: r.approved_at })),
          months,
        ));
      } else setPpiTrend(bucketize([], months));

      setLoading(false);
    })().catch(() => {
      if (!cancelled) setLoading(false);
    });

    return () => { cancelled = true; };
  }, [activeProject]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <TrendCard
        loading={loading}
        label={t("dashboard.trend.ncOpened", { defaultValue: "NCs abertas" })}
        sublabel={t("dashboard.trend.last6Months", { defaultValue: "Últimos 6 meses" })}
        data={ncTrend}
        icon={AlertTriangle}
        color="0 65% 50%"
        invertTrend
        onClick={() => navigate("/non-conformities")}
      />
      <TrendCard
        loading={loading}
        label={t("dashboard.trend.testsRun", { defaultValue: "Ensaios realizados" })}
        sublabel={t("dashboard.trend.last6Months", { defaultValue: "Últimos 6 meses" })}
        data={testTrend}
        icon={FlaskConical}
        color="215 65% 38%"
        onClick={() => navigate("/tests")}
      />
      <TrendCard
        loading={loading}
        label={t("dashboard.trend.ppiApproved", { defaultValue: "PPIs aprovados" })}
        sublabel={t("dashboard.trend.last6Months", { defaultValue: "Últimos 6 meses" })}
        data={ppiTrend}
        icon={ClipboardCheck}
        color="145 55% 38%"
        onClick={() => navigate("/ppi")}
      />
    </div>
  );
}

function TrendCard({
  loading, label, sublabel, data, icon: Icon, color, onClick, invertTrend,
}: {
  loading: boolean;
  label: string;
  sublabel: string;
  data: TrendCardData | null;
  icon: React.ElementType;
  color: string;
  onClick: () => void;
  invertTrend?: boolean;
}) {
  const fillColor = `hsl(${color})`;
  const gradientId = `mtc-${color.replace(/\s+/g, "-").replace(/%/g, "")}`;

  let trendPct = 0;
  let trendDir: "up" | "down" | "flat" = "flat";
  if (data && data.previous > 0) {
    const diff = data.current - data.previous;
    trendPct = Math.round((diff / data.previous) * 100);
    trendDir = diff === 0 ? "flat" : diff > 0 ? "up" : "down";
  } else if (data && data.previous === 0 && data.current > 0) {
    trendPct = 100;
    trendDir = "up";
  }

  const isGood = trendDir === "flat" ? false : invertTrend ? trendDir === "down" : trendDir === "up";
  const trendCls = trendDir === "flat"
    ? "bg-muted/50 text-muted-foreground border-border/40"
    : isGood
    ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
    : "bg-destructive/10 text-destructive border-destructive/30";
  const TrendIcon = trendDir === "up" ? TrendingUp : trendDir === "down" ? TrendingDown : Minus;

  return (
    <Card
      onClick={onClick}
      className="border border-border/60 bg-card shadow-card hover:shadow-card-hover transition-all cursor-pointer active:scale-[0.98] group relative overflow-hidden"
    >
      <div className="absolute top-0 left-0 right-0 h-[2px] opacity-60" style={{ backgroundColor: fillColor }} />
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <div className="flex items-center justify-center w-5 h-5 rounded-md flex-shrink-0"
                style={{ backgroundColor: `${fillColor}14` }}>
                <Icon className="h-3 w-3" style={{ color: fillColor }} />
              </div>
              <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground truncate leading-none">
                {label}
              </p>
            </div>
            <p className="text-[9px] text-muted-foreground/60 ml-6.5 pl-0.5 leading-tight">{sublabel}</p>
          </div>
          <ArrowRight className="h-3 w-3 text-muted-foreground/0 group-hover:text-muted-foreground/50 transition-all flex-shrink-0 mt-1" />
        </div>

        {loading || !data ? (
          <div className="space-y-2">
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : (
          <>
            <div className="flex items-end justify-between gap-3 mb-2">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black tabular-nums leading-none" style={{ color: fillColor }}>
                  {data.current}
                </span>
                {data.previous > 0 || data.current > 0 ? (
                  <span className={cn(
                    "inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded border tabular-nums",
                    trendCls,
                  )}>
                    <TrendIcon className="h-2.5 w-2.5" />
                    {trendDir === "flat" ? "0%" : `${trendPct > 0 ? "+" : ""}${trendPct}%`}
                  </span>
                ) : null}
              </div>
            </div>

            <div className="h-10 -mx-1">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.buckets}>
                  <defs>
                    <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={fillColor} stopOpacity={0.35} />
                      <stop offset="100%" stopColor={fillColor} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="count" stroke={fillColor} strokeWidth={1.5}
                    fill={`url(#${gradientId})`} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
