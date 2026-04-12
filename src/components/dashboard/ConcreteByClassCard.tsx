import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useProject } from "@/contexts/ProjectContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Beaker } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

interface ClassSummary {
  concrete_class: string;
  batch_count: number;
  specimen_count: number;
  avg_fcm: number | null;
  status: "conforme" | "pendente" | "nc";
}

export function ConcreteByClassCard() {
  const { t } = useTranslation();
  const { activeProject } = useProject();
  const navigate = useNavigate();
  const [data, setData] = useState<ClassSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeProject) return;
    setLoading(true);

    (async () => {
      try {
        const { data: batches } = await supabase
          .from("concrete_batches")
          .select("concrete_class, id")
          .eq("project_id", activeProject.id);

        if (!batches || batches.length === 0) { setData([]); setLoading(false); return; }

        const classMap = new Map<string, string[]>();
        batches.forEach((b: any) => {
          const cls = b.concrete_class || "—";
          if (!classMap.has(cls)) classMap.set(cls, []);
          classMap.get(cls)!.push(b.id);
        });

        const batchIds = batches.map((b: any) => b.id);
        const { data: specimens } = await supabase
          .from("concrete_specimens")
          .select("batch_id, strength_mpa")
          .in("batch_id", batchIds);

        const specByBatch = new Map<string, { count: number; strengths: number[] }>();
        (specimens ?? []).forEach((s: any) => {
          if (!specByBatch.has(s.batch_id)) specByBatch.set(s.batch_id, { count: 0, strengths: [] });
          const entry = specByBatch.get(s.batch_id)!;
          entry.count++;
          if (s.strength_mpa != null) entry.strengths.push(s.strength_mpa);
        });

        const result: ClassSummary[] = [];
        classMap.forEach((bIds, cls) => {
          let totalSpec = 0;
          const allStrengths: number[] = [];
          bIds.forEach((bid) => {
            const e = specByBatch.get(bid);
            if (e) {
              totalSpec += e.count;
              allStrengths.push(...e.strengths);
            }
          });
          const avg = allStrengths.length > 0 ? Math.round((allStrengths.reduce((a, b) => a + b, 0) / allStrengths.length) * 10) / 10 : null;
          const status: ClassSummary["status"] = allStrengths.length === 0 ? "pendente" : avg != null && avg > 0 ? "conforme" : "nc";
          result.push({ concrete_class: cls, batch_count: bIds.length, specimen_count: totalSpec, avg_fcm: avg, status });
        });

        result.sort((a, b) => b.batch_count - a.batch_count);
        setData(result);
      } catch (e) {
        console.error("[ConcreteByClassCard]", e);
      } finally { setLoading(false); }
    })();
  }, [activeProject]);

  if (!activeProject) return null;

  const chartData = data.map((d) => ({
    name: d.concrete_class,
    amostras: d.specimen_count,
    fcm: d.avg_fcm ?? 0,
  }));

  const BAR_COLORS = CHART_SEQUENCE;

  return (
    <Card className="border border-border bg-card shadow-card">
      <CardHeader className="pb-2 pt-4 px-5">
        <CardTitle className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground flex items-center gap-1.5">
          <Beaker className="h-3.5 w-3.5" />
          {t("dashboard.concrete.title", { defaultValue: "Betão por Classe" })}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-5 pb-4">
        {loading ? (
          <Skeleton className="h-[160px] w-full" />
        ) : data.length === 0 ? (
          <div className="h-[140px] flex flex-col items-center justify-center gap-2">
            <Beaker className="h-8 w-8 text-muted-foreground/20" />
            <p className="text-sm text-muted-foreground/60">{t("dashboard.concrete.noData", { defaultValue: "Sem dados de betão" })}</p>
          </div>
        ) : (
          <>
            <div className="h-[140px] mb-3">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 9 }} />
                  <Tooltip
                    contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }}
                    formatter={(value: number, name: string) => [value, name === "amostras" ? t("dashboard.concrete.samples", { defaultValue: "Amostras" }) : "fcm (MPa)"]}
                  />
                  <Bar dataKey="amostras" radius={[4, 4, 0, 0]} maxBarSize={32}>
                    {chartData.map((_, idx) => (
                      <Cell key={idx} fill={BAR_COLORS[idx % BAR_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <ul className="divide-y divide-border text-xs">
              {data.map((d) => (
                <li
                  key={d.concrete_class}
                  className="flex items-center gap-2 py-1.5 cursor-pointer hover:bg-muted/30 -mx-1 px-1 rounded transition-colors"
                  onClick={() => navigate("/tests/concrete")}
                >
                  <span className="font-mono font-semibold w-16">{d.concrete_class}</span>
                  <span className="flex-1 text-muted-foreground">{d.specimen_count} {t("dashboard.concrete.samples", { defaultValue: "amostras" })}</span>
                  <span className="tabular-nums">{d.avg_fcm != null ? `${d.avg_fcm} MPa` : "—"}</span>
                  <Badge variant={d.status === "conforme" ? "secondary" : d.status === "nc" ? "destructive" : "outline"} className="text-[9px]">
                    {d.status === "conforme" ? "OK" : d.status === "nc" ? "NC" : t("common.pending", { defaultValue: "Pend." })}
                  </Badge>
                </li>
              ))}
            </ul>
          </>
        )}
      </CardContent>
    </Card>
  );
}
