import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { FlaskConical, ClipboardCheck, Package, AlertTriangle, Zap } from "lucide-react";

interface RmKpis {
  kpi_tests_pass_pct: number;
  kpi_tests_status: string;
  kpi_hp_rate_pct: number;
  kpi_hp_status: string;
  kpi_pame_status: string;
  nc_overdue_15d: number;
  kpi_nc_overdue_status: string;
  kpi_us_status: string;
  mat_pending: number;
  welds_us_pending: number;
}

const EMPTY: RmKpis = {
  kpi_tests_pass_pct: 0, kpi_tests_status: "sem_dados",
  kpi_hp_rate_pct: 0, kpi_hp_status: "sem_dados",
  kpi_pame_status: "sem_dados",
  nc_overdue_15d: 0, kpi_nc_overdue_status: "sem_dados",
  kpi_us_status: "sem_dados",
  mat_pending: 0, welds_us_pending: 0,
};

function semaphoreColor(status: string): string {
  if (status === "ok") return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30";
  if (status === "alerta") return "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30";
  if (status === "critico") return "bg-destructive/15 text-destructive border-destructive/30";
  return "bg-muted text-muted-foreground border-border";
}

function semaphoreDot(status: string): string {
  if (status === "ok") return "bg-emerald-500";
  if (status === "alerta") return "bg-amber-500";
  if (status === "critico") return "bg-destructive";
  return "bg-muted-foreground/40";
}

export function SgqKpiCards({ projectId }: { projectId: string }) {
  const { t } = useTranslation();
  const [data, setData] = useState<RmKpis>(EMPTY);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: row } = await supabase
        .from("vw_rm_kpis" as any)
        .select("*")
        .eq("project_id", projectId)
        .single();
      if (row) {
        const r = row as any;
        setData({
          kpi_tests_pass_pct: Number(r.kpi_tests_pass_pct) || 0,
          kpi_tests_status: r.kpi_tests_status ?? "sem_dados",
          kpi_hp_rate_pct: Number(r.kpi_hp_rate_pct) || 0,
          kpi_hp_status: r.kpi_hp_status ?? "sem_dados",
          kpi_pame_status: r.kpi_pame_status ?? "sem_dados",
          nc_overdue_15d: Number(r.nc_overdue_15d) || 0,
          kpi_nc_overdue_status: r.kpi_nc_overdue_status ?? "sem_dados",
          kpi_us_status: r.kpi_us_status ?? "sem_dados",
          mat_pending: Number(r.mat_pending) || 0,
          welds_us_pending: Number(r.welds_us_pending) || 0,
        });
      }
      setLoading(false);
    })();
  }, [projectId]);

  const metrics = [
    {
      icon: FlaskConical,
      label: t("dashboard.sgqKpi.testsConformity", { defaultValue: "Conformidade Ensaios" }),
      value: `${data.kpi_tests_pass_pct.toFixed(0)}%`,
      meta: "≥ 95%",
      status: data.kpi_tests_status,
    },
    {
      icon: ClipboardCheck,
      label: t("dashboard.sgqKpi.hpApproved", { defaultValue: "HPs Aprovados" }),
      value: `${data.kpi_hp_rate_pct.toFixed(0)}%`,
      meta: "100%",
      status: data.kpi_hp_status,
    },
    {
      icon: Package,
      label: t("dashboard.sgqKpi.pameStatus", { defaultValue: "PAME s/ Pendentes" }),
      value: data.kpi_pame_status === "ok" ? "✓" : `${data.mat_pending}`,
      meta: t("dashboard.sgqKpi.noPending", { defaultValue: "0 pendentes" }),
      status: data.kpi_pame_status,
    },
    {
      icon: AlertTriangle,
      label: t("dashboard.sgqKpi.ncOverdue", { defaultValue: "RNCs >15 dias" }),
      value: `${data.nc_overdue_15d}`,
      meta: "= 0",
      status: data.kpi_nc_overdue_status,
    },
    {
      icon: Zap,
      label: t("dashboard.sgqKpi.usWelds", { defaultValue: "US Soldaduras" }),
      value: data.kpi_us_status === "ok" ? "✓" : `${data.welds_us_pending}`,
      meta: t("dashboard.sgqKpi.allInspected", { defaultValue: "Todas inspecionadas" }),
      status: data.kpi_us_status,
    },
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
      {metrics.map((m) => (
        <Card key={m.label} className={cn("border transition-all", semaphoreColor(m.status))}>
          <CardContent className="p-3 flex flex-col items-center text-center gap-1.5">
            <div className="flex items-center gap-1.5">
              <span className={cn("h-2 w-2 rounded-full", semaphoreDot(m.status))} />
              <m.icon className="h-3.5 w-3.5 opacity-70" />
            </div>
            <p className="text-[9px] font-bold uppercase tracking-widest opacity-70 leading-tight">{m.label}</p>
            <p className="text-xl font-black tabular-nums">{m.value}</p>
            <Badge variant="outline" className="text-[8px] px-1.5 py-0 border-current/20">
              {m.status === "sem_dados"
                ? t("dashboard.sgqKpi.noData", { defaultValue: "Sem dados ainda" })
                : `${t("dashboard.sgqKpi.target", { defaultValue: "Meta" })}: ${m.meta}`}
            </Badge>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
