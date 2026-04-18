import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, ArrowRight, Flame, Construction, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";

interface Frente {
  work_item_id: string;
  sector: string | null;
  parte: string | null;
  elemento: string | null;
  disciplina: string | null;
  nc_open: number;
  nc_critical: number;
  ppi_pending: number;
  /** Score de criticidade (interno) */
  score: number;
}

interface Props {
  projectId: string;
}

export function TopCriticalFrentes({ projectId }: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [data, setData] = useState<Frente[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const { data: rows } = await (supabase as any)
          .from("vw_work_item_quality_summary")
          .select("work_item_id, sector, parte, elemento, disciplina, nc_open, nc_critical, ppi_pending")
          .eq("project_id", projectId)
          .limit(500);
        if (cancelled) return;
        const scored: Frente[] = (rows ?? []).map((r: any) => ({
          ...r,
          // criticidade ponderada: NCs críticas pesam x3, NCs normais x2, PPI pendentes x1
          score: (r.nc_critical ?? 0) * 3 + (r.nc_open ?? 0) * 2 + (r.ppi_pending ?? 0),
        }));
        scored.sort((a, b) => b.score - a.score);
        setData(scored.filter((f) => f.score > 0).slice(0, 3));
      } catch {
        setData([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [projectId]);

  if (loading) {
    return (
      <Card className="border border-border/60 bg-card shadow-card">
        <CardContent className="p-4 space-y-2">
          <div className="flex items-center gap-2 mb-2">
            <Skeleton className="h-5 w-32" />
          </div>
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
        </CardContent>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card className="border border-emerald-500/30 bg-emerald-500/5">
        <CardContent className="p-4 flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-emerald-500/10">
            <ShieldAlert className="h-4 w-4 text-emerald-600" />
          </div>
          <div>
            <p className="text-xs font-bold text-foreground">
              {t("topFrentes.allClear", { defaultValue: "Todas as frentes sob controlo" })}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {t("topFrentes.allClearDetail", { defaultValue: "Sem NCs críticas nem PPIs pendentes em frentes activas" })}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-border/60 bg-card shadow-card overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-destructive/10 border border-destructive/20">
            <Flame className="h-3.5 w-3.5 text-destructive" />
          </div>
          <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-muted-foreground">
            {t("topFrentes.title", { defaultValue: "Top Frentes Críticas" })}
          </p>
          <span className="ml-auto text-[9px] text-muted-foreground/60 italic">
            {t("topFrentes.subtitle", { defaultValue: "Onde investir tempo hoje" })}
          </span>
        </div>

        <div className="space-y-1.5">
          {data.map((f, i) => {
            const label = [f.parte, f.elemento].filter(Boolean).join(" · ") || f.sector || "—";
            return (
              <div
                key={f.work_item_id}
                className="group flex items-center gap-2.5 p-2.5 rounded-lg border border-border/40 bg-muted/20 hover:bg-muted/40 hover:border-primary/40 cursor-pointer transition-all animate-fade-in"
                style={{ animationDelay: `${i * 80}ms`, animationFillMode: "both" }}
                onClick={() => navigate(`/work-items/${f.work_item_id}`)}
              >
                <div className={cn(
                  "flex items-center justify-center w-7 h-7 rounded-md flex-shrink-0 font-black text-[11px] tabular-nums",
                  i === 0 ? "bg-destructive/15 text-destructive" : i === 1 ? "bg-amber-500/15 text-amber-700" : "bg-muted text-muted-foreground",
                )}>
                  #{i + 1}
                </div>
                <Construction className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-foreground truncate leading-tight">{label}</p>
                  {f.sector && f.disciplina && (
                    <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                      {f.sector} · {f.disciplina}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {f.nc_critical > 0 && (
                    <Badge variant="destructive" className="h-4 text-[9px] px-1.5 gap-0.5">
                      <AlertTriangle className="h-2.5 w-2.5" />
                      {f.nc_critical}
                    </Badge>
                  )}
                  {f.nc_open > 0 && (
                    <Badge variant="outline" className="h-4 text-[9px] px-1.5 border-destructive/30 text-destructive">
                      NC {f.nc_open}
                    </Badge>
                  )}
                  {f.ppi_pending > 0 && (
                    <Badge variant="outline" className="h-4 text-[9px] px-1.5 border-amber-500/30 text-amber-700">
                      PPI {f.ppi_pending}
                    </Badge>
                  )}
                </div>
                <ArrowRight className="h-3 w-3 text-muted-foreground/0 group-hover:text-muted-foreground/60 transition-all flex-shrink-0" />
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
