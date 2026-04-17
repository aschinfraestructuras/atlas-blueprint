import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useProject } from "@/contexts/ProjectContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from "recharts";
import { CHART_COLORS, CHART_STYLE, ChartTooltipContent } from "@/lib/chartTheme";

interface DiscRow {
  d: string;
  concluido: number;
  execucao: number;
  planeado: number;
}

export function WorkProgressChart() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { activeProject } = useProject();
  const [data, setData] = useState<DiscRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeProject) { setData([]); setLoading(false); return; }
    setLoading(true);
    (supabase as any)
      .from("vw_work_items_summary")
      .select("disciplina, concluidas, em_execucao, previstas")
      .eq("project_id", activeProject.id)
      .then(({ data: rows }: any) => {
        const byDisc = Object.values(
          (rows ?? []).reduce((acc: Record<string, DiscRow>, row: any) => {
            const d = row.disciplina ?? "outros";
            if (!acc[d]) acc[d] = { d: d.charAt(0).toUpperCase() + d.slice(1), concluido: 0, execucao: 0, planeado: 0 };
            acc[d].concluido += Number(row.concluidas) || 0;
            acc[d].execucao += Number(row.em_execucao) || 0;
            acc[d].planeado += Number(row.previstas) || 0;
            return acc;
          }, {} as Record<string, DiscRow>)
        ) as DiscRow[];
        setData(byDisc);
        setLoading(false);
      });
  }, [activeProject]);

  return (
    <Card
      className="border border-border bg-card shadow-card cursor-pointer hover:shadow-card-hover hover:border-primary/20 transition-all"
      onClick={() => navigate("/work-items")}
    >
      <CardHeader className="pb-1 pt-4 px-5">
        <CardTitle className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
          {t("dashboard.charts.workProgress", { defaultValue: "Progresso por Disciplina" })}
        </CardTitle>
        <p className="text-[9px] text-muted-foreground/60">
          {t("dashboard.charts.workProgressSub", { defaultValue: "Concluído · Em execução · Planeado" })}
        </p>
      </CardHeader>
      <CardContent className="px-3 pb-3">
        {loading ? (
          <Skeleton className="h-[180px] w-full" />
        ) : data.length === 0 ? (
          <p className="text-xs text-muted-foreground py-12 text-center">{t("common.noData")}</p>
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={data} layout="vertical" margin={{ top: 5, right: 10, left: 5, bottom: 0 }} barSize={8}>
              <CartesianGrid strokeDasharray={CHART_STYLE.grid.strokeDasharray} stroke={CHART_STYLE.grid.stroke} strokeOpacity={CHART_STYLE.grid.strokeOpacity} horizontal={false} />
              <XAxis type="number" tick={CHART_STYLE.axis.tick} axisLine={false} tickLine={false} />
              <YAxis dataKey="d" type="category" tick={CHART_STYLE.axis.tick} axisLine={false} tickLine={false} width={70} />
              <Tooltip content={<ChartTooltipContent />} cursor={CHART_STYLE.tooltip.cursor} />
              <Legend wrapperStyle={{ fontSize: 10, color: "hsl(var(--muted-foreground))" }} />
              <Bar dataKey="concluido" name={t("dashboard.charts.completed",  { defaultValue: "Concluído" })}   stackId="a" fill={CHART_COLORS.success} radius={[0, 0, 0, 0]} />
              <Bar dataKey="execucao"  name={t("dashboard.charts.inProgress", { defaultValue: "Em execução" })} stackId="a" fill={CHART_COLORS.primary} />
              <Bar dataKey="planeado"  name={t("dashboard.charts.planned",    { defaultValue: "Planeado" })}    stackId="a" fill={CHART_COLORS.muted}   radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
