import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useProject } from "@/contexts/ProjectContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface PPIKpis {
  total: number;
  approved_count: number;
  in_progress_count: number;
  items_pending: number;
}

function MetricBox({ label, value, color }: { label: string; value: number; color: string }) {
  const colorMap: Record<string, string> = {
    emerald: "text-emerald-600 dark:text-emerald-400",
    blue: "text-primary",
    amber: "text-amber-600 dark:text-amber-400",
    muted: "text-muted-foreground",
  };
  return (
    <div className="flex flex-col items-center py-2 rounded-lg bg-muted/30 border border-border/40">
      <span className={`text-xl font-black tabular-nums leading-none ${colorMap[color] ?? colorMap.muted}`}>
        {value}
      </span>
      <span className="text-[8px] font-semibold uppercase tracking-wider text-muted-foreground mt-1 text-center">
        {label}
      </span>
    </div>
  );
}

export function PPIProgressChart() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { activeProject } = useProject();
  const [kpis, setKpis] = useState<PPIKpis>({ total: 0, approved_count: 0, in_progress_count: 0, items_pending: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeProject) { setLoading(false); return; }
    setLoading(true);
    (supabase as any)
      .from("vw_ppi_kpis")
      .select("total, approved_count, in_progress_count, items_pending")
      .eq("project_id", activeProject.id)
      .maybeSingle()
      .then(({ data }: any) => {
        if (data) {
          setKpis({
            total: Number(data.total) || 0,
            approved_count: Number(data.approved_count) || 0,
            in_progress_count: Number(data.in_progress_count) || 0,
            items_pending: Number(data.items_pending) || 0,
          });
        }
        setLoading(false);
      });
  }, [activeProject]);

  const pct = kpis.total > 0 ? (kpis.approved_count / kpis.total) * 100 : 0;

  return (
    <Card
      className="border border-border bg-card shadow-card cursor-pointer hover:shadow-card-hover hover:border-primary/20 transition-all"
      onClick={() => navigate("/ppi")}
    >
      <CardHeader className="pb-1 pt-4 px-5">
        <CardTitle className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
          {t("dashboard.charts.ppiProgress", { defaultValue: "Inspecções PPI" })}
        </CardTitle>
        <p className="text-[9px] text-muted-foreground/60">
          {t("dashboard.charts.ppiProgressSub", { defaultValue: "Estado geral das inspecções" })}
        </p>
      </CardHeader>
      <CardContent className="px-5 pb-4">
        {loading ? (
          <Skeleton className="h-[120px] w-full" />
        ) : (
          <>
            <div className="grid grid-cols-3 gap-3 mb-4">
              <MetricBox label={t("dashboard.charts.approved", { defaultValue: "Aprovadas" })} value={kpis.approved_count} color="emerald" />
              <MetricBox label={t("dashboard.charts.inProgressLabel", { defaultValue: "Em curso" })} value={kpis.in_progress_count} color="blue" />
              <MetricBox label={t("dashboard.charts.hpPending", { defaultValue: "HP Pendentes" })} value={kpis.items_pending} color={kpis.items_pending > 0 ? "amber" : "muted"} />
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all duration-700 ease-out"
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="text-[10px] text-muted-foreground mt-1.5">
              {kpis.approved_count} / {kpis.total} {t("dashboard.charts.inspCompleted", { defaultValue: "inspecções concluídas" })}
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
