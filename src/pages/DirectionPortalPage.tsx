import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useProject } from "@/contexts/ProjectContext";
import { supabase } from "@/integrations/supabase/client";
import { useProjectRole } from "@/hooks/useProjectRole";
import { useDashboardKpis } from "@/hooks/useDashboardKpis";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  AlertTriangle, CheckCircle2, Clock, FlaskConical,
  Package, ClipboardCheck, TrendingUp, Shield,
  FileBarChart2, Building2, BarChart3,
} from "lucide-react";
import { Link } from "react-router-dom";
import { NoProjectBanner } from "@/components/NoProjectBanner";

// ─── Subcomponentes ──────────────────────────────────────────────────────────

function KpiBlock({
  icon: Icon, label, value, sub, status, route,
}: {
  icon: React.ElementType;
  label: string;
  value: number | string;
  sub?: string;
  status?: "ok" | "warn" | "danger";
  route?: string;
}) {
  const colors = {
    ok:     "text-emerald-600 dark:text-emerald-400",
    warn:   "text-amber-600 dark:text-amber-400",
    danger: "text-destructive",
    undefined: "text-foreground",
  };
  const borderColors = {
    ok:     "border-l-emerald-400",
    warn:   "border-l-amber-400",
    danger: "border-l-destructive",
    undefined: "border-l-muted-foreground/20",
  };

  const inner = (
    <Card className={cn(
      "border-l-4 hover:shadow-md transition-all",
      borderColors[status ?? "undefined"]
    )}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground mb-1">{label}</p>
            <p className={cn("text-3xl font-black tabular-nums", colors[status ?? "undefined"])}>{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
          </div>
          <div className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
            status === "ok"     ? "bg-emerald-500/10" :
            status === "warn"   ? "bg-amber-500/10" :
            status === "danger" ? "bg-destructive/10" :
            "bg-muted/50"
          )}>
            <Icon className={cn("h-5 w-5", colors[status ?? "undefined"])} />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (route) return <Link to={route}>{inner}</Link>;
  return inner;
}

// ─── Linha de progresso ───────────────────────────────────────────────────────
function ProgressRow({ label, value, total, color = "#378ADD" }: {
  label: string; value: number; total: number; color?: string;
}) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm text-foreground">{label}</span>
        <span className="text-xs font-semibold text-muted-foreground">{value}/{total} ({pct}%)</span>
      </div>
      <div className="h-2 rounded-full bg-muted/40 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function DirectionPortalPage() {
  const { t } = useTranslation();
  const { activeProject } = useProject();
  const { role } = useProjectRole();
  const { data: kpis, loading } = useDashboardKpis();
  const [lastUpdated] = useState(new Date());

  if (!activeProject) return <NoProjectBanner />;

  const ncStatus: "ok" | "warn" | "danger" =
    kpis.ncOpen === 0 ? "ok" : kpis.ncOpen <= 3 ? "warn" : "danger";
  const ppiPct = kpis.ppiTotal > 0 ? Math.round((kpis.ppiApproved / kpis.ppiTotal) * 100) : 0;
  const testsPct = kpis.testsTotal > 0 ? Math.round((kpis.testsCompleted / kpis.testsTotal) * 100) : 0;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">

      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Building2 className="h-5 w-5 text-muted-foreground" />
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
              Portal Direcção de Obra
            </p>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
            {activeProject.name}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">{activeProject.code}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Actualizado</p>
          <p className="text-xs font-medium text-foreground">
            {lastUpdated.toLocaleDateString("pt-PT")} {lastUpdated.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" })}
          </p>
        </div>
      </div>

      {/* KPIs principais — 2x2 mobile, 4 desktop */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[100px] rounded-xl" />)
        ) : (
          <>
            <KpiBlock
              icon={AlertTriangle}
              label="Não Conformidades"
              value={kpis.ncOpen}
              sub={kpis.ncOpen === 0 ? "Sem alertas" : `${kpis.ncOpen} em aberto`}
              status={ncStatus}
              route="/non-conformities"
            />
            <KpiBlock
              icon={ClipboardCheck}
              label="PPIs aprovadas"
              value={`${ppiPct}%`}
              sub={`${kpis.ppiApproved} de ${kpis.ppiTotal} inspecções`}
              status={ppiPct >= 80 ? "ok" : ppiPct >= 50 ? "warn" : "danger"}
              route="/ppi"
            />
            <KpiBlock
              icon={FlaskConical}
              label="Ensaios realizados"
              value={`${testsPct}%`}
              sub={kpis.testsOverdue > 0 ? `${kpis.testsOverdue} em atraso` : "Sem atrasos"}
              status={kpis.testsOverdue > 0 ? "danger" : testsPct >= 70 ? "ok" : "warn"}
              route="/tests"
            />
            <KpiBlock
              icon={Package}
              label="Materiais PAME"
              value={kpis.pamePending}
              sub={kpis.pamePending === 0 ? "Tudo aprovado" : "pendentes de aprovação"}
              status={kpis.pamePending === 0 ? "ok" : kpis.pamePending <= 5 ? "warn" : "danger"}
              route="/materials"
            />
          </>
        )}
      </div>

      {/* Progresso detalhado */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3 pt-4 px-5">
            <CardTitle className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
              <BarChart3 className="h-3.5 w-3.5" />
              Progresso de qualidade
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5 space-y-4">
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-8" />)}
              </div>
            ) : (
              <>
                <ProgressRow label="Inspecções PPI aprovadas" value={kpis.ppiApproved} total={kpis.ppiTotal} color="#1D9E75" />
                <ProgressRow label="Ensaios realizados" value={kpis.testsCompleted} total={kpis.testsTotal} color="#378ADD" />
                <ProgressRow label="Materiais PAME aprovados" value={kpis.matApproved} total={kpis.matTotal} color="#7F77DD" />
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3 pt-4 px-5">
            <CardTitle className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
              <Shield className="h-3.5 w-3.5" />
              Alertas e pendências
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5 space-y-3">
            {loading ? (
              <Skeleton className="h-32" />
            ) : (
              <>
                {kpis.ncOpen > 0 && (
                  <Link to="/non-conformities" className="flex items-center gap-3 p-3 rounded-lg bg-destructive/8 border border-destructive/20 hover:bg-destructive/12 transition-colors">
                    <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0" />
                    <span className="text-sm text-destructive font-medium">{kpis.ncOpen} NC{kpis.ncOpen > 1 ? "s" : ""} em aberto</span>
                  </Link>
                )}
                {kpis.testsOverdue > 0 && (
                  <Link to="/tests?tab=due" className="flex items-center gap-3 p-3 rounded-lg bg-amber-500/8 border border-amber-500/20 hover:bg-amber-500/12 transition-colors">
                    <Clock className="h-4 w-4 text-amber-600 flex-shrink-0" />
                    <span className="text-sm text-amber-700 dark:text-amber-400 font-medium">{kpis.testsOverdue} ensaio{kpis.testsOverdue > 1 ? "s" : ""} em atraso</span>
                  </Link>
                )}
                {kpis.emesExpiring30d > 0 && (
                  <Link to="/expirations" className="flex items-center gap-3 p-3 rounded-lg bg-orange-500/8 border border-orange-500/20 hover:bg-orange-500/12 transition-colors">
                    <AlertTriangle className="h-4 w-4 text-orange-600 flex-shrink-0" />
                    <span className="text-sm text-orange-700 dark:text-orange-400 font-medium">{kpis.emesExpiring30d} expirações nos próximos 30 dias</span>
                  </Link>
                )}
                {kpis.ncOpen === 0 && kpis.testsOverdue === 0 && kpis.emesExpiring30d === 0 && (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-emerald-500/8 border border-emerald-500/20">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                    <span className="text-sm text-emerald-700 dark:text-emerald-400 font-medium">Sem alertas activos</span>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Acesso rápido a relatórios */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground mb-3">
          Relatórios e documentos
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            { icon: FileBarChart2, label: "Relatório Mensal SGQ", route: "/reports/monthly" },
            { icon: TrendingUp, label: "KPIs Contratuais", route: "/contract-kpis" },
            { icon: ClipboardCheck, label: "PPIs aprovadas", route: "/ppi" },
            { icon: AlertTriangle, label: "Não Conformidades", route: "/non-conformities" },
            { icon: FlaskConical, label: "Resultados de ensaio", route: "/tests" },
            { icon: Package, label: "Materiais PAME", route: "/materials" },
          ].map(({ icon: Icon, label, route }) => (
            <Link key={route} to={route}>
              <Card className="hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer group">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/10 transition-colors">
                    <Icon className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                  <span className="text-xs font-medium text-foreground leading-tight">{label}</span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

    </div>
  );
}
