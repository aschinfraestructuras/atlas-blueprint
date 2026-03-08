import { useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useProject } from "@/contexts/ProjectContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Construction, CheckCircle2, XCircle, AlertTriangle,
  ClipboardCheck, FlaskConical, ArrowRight,
} from "lucide-react";

interface FrenteData {
  id: string;
  sector: string;
  obra: string | null;
  elemento: string | null;
  disciplina: string;
  status: string;
  readiness_status: string | null;
  nc_open: number;
  nc_total: number;
  tests_pass: number;
  tests_fail: number;
  tests_total: number;
  ppi_approved: number;
  ppi_total: number;
}

export function ConformityByFrenteChart() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { activeProject } = useProject();
  const [data, setData] = useState<FrenteData[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!activeProject) return;
    setLoading(true);
    try {
      const pid = activeProject.id;

      // Get active work items (frentes = elemento is not null)
      const { data: wis } = await supabase
        .from("work_items")
        .select("id, sector, obra, elemento, disciplina, status, readiness_status")
        .eq("project_id", pid)
        .not("elemento", "is", null)
        .in("status", ["in_progress", "planned"])
        .order("sector");

      if (!wis || wis.length === 0) { setData([]); setLoading(false); return; }

      const wiIds = wis.map(w => w.id);

      // Parallel queries for NCs, tests, PPIs linked to these work items
      const [ncRes, testRes, ppiRes] = await Promise.all([
        supabase
          .from("non_conformities")
          .select("work_item_id, status")
          .in("work_item_id", wiIds)
          .eq("is_deleted", false),
        supabase
          .from("test_results")
          .select("work_item_id, pass_fail, status")
          .in("work_item_id", wiIds)
          .eq("is_deleted", false),
        supabase
          .from("ppi_instances")
          .select("work_item_id, status")
          .in("work_item_id", wiIds)
          .eq("is_deleted", false),
      ]);

      const ncs = ncRes.data ?? [];
      const tests = testRes.data ?? [];
      const ppis = ppiRes.data ?? [];

      const frentes: FrenteData[] = wis.map(wi => {
        const wiNcs = ncs.filter(n => n.work_item_id === wi.id);
        const wiTests = tests.filter(tr => tr.work_item_id === wi.id);
        const wiPpis = ppis.filter(p => p.work_item_id === wi.id);

        return {
          id: wi.id,
          sector: wi.sector,
          obra: wi.obra,
          elemento: wi.elemento,
          disciplina: wi.disciplina,
          status: wi.status,
          readiness_status: wi.readiness_status,
          nc_open: wiNcs.filter(n => !["closed", "archived"].includes(n.status)).length,
          nc_total: wiNcs.length,
          tests_pass: wiTests.filter(tr => tr.pass_fail === "pass").length,
          tests_fail: wiTests.filter(tr => tr.pass_fail === "fail").length,
          tests_total: wiTests.length,
          ppi_approved: wiPpis.filter(p => p.status === "approved").length,
          ppi_total: wiPpis.length,
        };
      });

      // Sort: blocked first, then by nc_open desc
      frentes.sort((a, b) => {
        if (a.readiness_status === "blocked" && b.readiness_status !== "blocked") return -1;
        if (b.readiness_status === "blocked" && a.readiness_status !== "blocked") return 1;
        return b.nc_open - a.nc_open;
      });

      setData(frentes.slice(0, 12));
    } catch (err) {
      console.error("[ConformityByFrenteChart]", err);
    } finally {
      setLoading(false);
    }
  }, [activeProject]);

  useEffect(() => { fetch(); }, [fetch]);

  if (!activeProject) return null;

  const conformityPct = (f: FrenteData) => {
    const total = f.tests_total + f.ppi_total;
    if (total === 0) return null;
    const ok = f.tests_pass + f.ppi_approved;
    return Math.round((ok / total) * 100);
  };

  return (
    <Card className="border border-border bg-card shadow-card">
      <CardHeader className="pb-2 pt-4 px-5">
        <CardTitle className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground flex items-center gap-1.5">
          <Construction className="h-3.5 w-3.5" />
          {t("dashboard.conformityByFrente.title", { defaultValue: "Conformidade por Frente de Obra" })}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-3 pb-3">
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full rounded" />)}
          </div>
        ) : data.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            {t("dashboard.conformityByFrente.empty", { defaultValue: "Sem frentes de obra ativas" })}
          </p>
        ) : (
          <div className="space-y-1">
            {data.map((f) => {
              const pct = conformityPct(f);
              const isBlocked = f.readiness_status === "blocked";
              return (
                <div
                  key={f.id}
                  className={cn(
                    "flex items-center gap-2 px-2.5 py-2 rounded-lg cursor-pointer transition-colors group hover:bg-muted/40",
                    isBlocked && "bg-destructive/5 border border-destructive/10",
                  )}
                  onClick={() => navigate(`/work-items/${f.id}`)}
                >
                  {/* Label */}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">
                      {f.elemento ?? f.sector}
                      {f.obra && <span className="text-muted-foreground font-normal ml-1">· {f.obra}</span>}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {t(`workItems.disciplines.${f.disciplina}`, { defaultValue: f.disciplina })}
                    </p>
                  </div>

                  {/* Mini indicators */}
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {f.nc_open > 0 && (
                      <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-destructive">
                        <AlertTriangle className="h-3 w-3" />
                        {f.nc_open}
                      </span>
                    )}
                    {f.tests_total > 0 && (
                      <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-muted-foreground">
                        <FlaskConical className="h-3 w-3" />
                        {f.tests_pass}/{f.tests_total}
                      </span>
                    )}
                    {f.ppi_total > 0 && (
                      <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-muted-foreground">
                        <ClipboardCheck className="h-3 w-3" />
                        {f.ppi_approved}/{f.ppi_total}
                      </span>
                    )}
                  </div>

                  {/* Conformity bar */}
                  <div className="w-16 flex-shrink-0">
                    {pct !== null ? (
                      <div className="flex items-center gap-1">
                        <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all",
                              pct >= 80 ? "bg-primary" : pct >= 50 ? "bg-amber-500" : "bg-destructive",
                            )}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className={cn(
                          "text-[10px] font-bold tabular-nums",
                          pct >= 80 ? "text-primary" : pct >= 50 ? "text-amber-600" : "text-destructive",
                        )}>
                          {pct}%
                        </span>
                      </div>
                    ) : (
                      <span className="text-[10px] text-muted-foreground/50">—</span>
                    )}
                  </div>

                  <ArrowRight className="h-3 w-3 text-muted-foreground/0 group-hover:text-muted-foreground/40 transition-all flex-shrink-0" />
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
