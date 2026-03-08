import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useProject } from "@/contexts/ProjectContext";
import { useDashboardKpis } from "@/hooks/useDashboardKpis";
import { useRealtimeProject } from "@/hooks/useRealtimeProject";
import {
  AlertTriangle, Package, Crosshair, CalendarClock,
  ClipboardCheck, FlaskConical, FileText, FolderKanban,
  Plus, Inbox, ArrowRight, Clock,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { NoProjectBanner } from "@/components/NoProjectBanner";
import { NCFormDialog } from "@/components/nc/NCFormDialog";
import { MaterialReceptionDialog } from "@/components/materials/MaterialReceptionDialog";
import { RfiFormDialog } from "@/components/technical-office/RfiFormDialog";
import { cn } from "@/lib/utils";

// ── Semaphore colors ──────────────────────────────────────────────
function ncSemaphore(v: number) { return v === 0 ? "text-emerald-600" : v <= 3 ? "text-amber-500" : "text-destructive"; }
function ncBorder(v: number) { return v === 0 ? "border-l-emerald-500" : v <= 3 ? "border-l-amber-500" : "border-l-destructive"; }
function pameSemaphore(v: number) { return v === 0 ? "text-emerald-600" : v <= 10 ? "text-amber-500" : "text-destructive"; }
function pameBorder(v: number) { return v === 0 ? "border-l-emerald-500" : v <= 10 ? "border-l-amber-500" : "border-l-destructive"; }
function emeSemaphore(v: number) { return v === 0 ? "text-emerald-600" : v <= 2 ? "text-amber-500" : "text-destructive"; }
function emeBorder(v: number) { return v === 0 ? "border-l-emerald-500" : v <= 2 ? "border-l-amber-500" : "border-l-destructive"; }
function auditSemaphore(daysUntil: number | null) {
  if (daysUntil === null) return "text-muted-foreground";
  return daysUntil > 60 ? "text-emerald-600" : daysUntil >= 30 ? "text-amber-500" : "text-destructive";
}
function auditBorder(daysUntil: number | null) {
  if (daysUntil === null) return "border-l-border";
  return daysUntil > 60 ? "border-l-emerald-500" : daysUntil >= 30 ? "border-l-amber-500" : "border-l-destructive";
}

function daysUntilDate(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const diff = Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
  return diff;
}

// ── Activity icon/color by type ───────────────────────────────────
const ACTIVITY_CFG: Record<string, { icon: React.ElementType; color: string }> = {
  nc:   { icon: AlertTriangle, color: "text-destructive" },
  lot:  { icon: Package, color: "text-primary" },
  ppi:  { icon: ClipboardCheck, color: "text-emerald-600" },
  test: { icon: FlaskConical, color: "text-amber-500" },
};

// ══════════════════════════════════════════════════════════════════
export default function DashboardPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { activeProject } = useProject();
  const { data: kpis, loading, refetch } = useDashboardKpis();

  // Realtime
  const refetchAll = useCallback(() => { refetch(); }, [refetch]);
  useRealtimeProject("non_conformities", refetchAll);
  useRealtimeProject("materials", refetchAll);
  useRealtimeProject("ppi_instances", refetchAll);

  // Quick action dialogs
  const [ncOpen, setNcOpen] = useState(false);
  const [receptionOpen, setReceptionOpen] = useState(false);
  const [rfiOpen, setRfiOpen] = useState(false);

  const displayName = user?.email?.split("@")[0] ?? "—";

  if (!activeProject) return <NoProjectBanner />;

  const auditDays = daysUntilDate(kpis.nextAudit?.planned_start ?? null);

  return (
    <div className="space-y-6 max-w-[1100px] mx-auto animate-fade-in">

      {/* ── Header ──────────────────────────────────────────── */}
      <div className="space-y-1">
        <p className="text-[10px] font-extrabold uppercase tracking-[0.20em] text-muted-foreground/60">
          {t("dashboard.welcome")}
        </p>
        <h1 className="text-2xl font-black tracking-tight text-foreground">{displayName}</h1>
        <p className="text-sm text-muted-foreground">
          {t("dashboard.subtitleProject", { project: activeProject.name })}
        </p>
      </div>

      {/* ══ ZONA A — KPIs de saúde do SGQ ══════════════════ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* NCs Abertas */}
        <Card
          className={cn("border-0 border-l-4 bg-card shadow-card hover:shadow-card-hover cursor-pointer transition-all", ncBorder(kpis.ncOpen))}
          onClick={() => navigate("/non-conformities")}
        >
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                {t("dashboard.kpi.ncOpen", { defaultValue: "NCs Abertas" })}
              </p>
              <AlertTriangle className={cn("h-4 w-4", ncSemaphore(kpis.ncOpen))} />
            </div>
            {loading ? <Skeleton className="h-10 w-16" /> : (
              <p className={cn("text-4xl font-black tabular-nums", ncSemaphore(kpis.ncOpen))}>
                {kpis.ncOpen}
              </p>
            )}
          </CardContent>
        </Card>

        {/* PAME Pendentes */}
        <Card
          className={cn("border-0 border-l-4 bg-card shadow-card hover:shadow-card-hover cursor-pointer transition-all", pameBorder(kpis.pamePending))}
          onClick={() => navigate("/materials")}
        >
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                {t("dashboard.kpi.pamePending", { defaultValue: "PAME Pendentes" })}
              </p>
              <Package className={cn("h-4 w-4", pameSemaphore(kpis.pamePending))} />
            </div>
            {loading ? <Skeleton className="h-10 w-16" /> : (
              <p className={cn("text-4xl font-black tabular-nums", pameSemaphore(kpis.pamePending))}>
                {kpis.pamePending}
              </p>
            )}
          </CardContent>
        </Card>

        {/* EMEs a expirar */}
        <Card
          className={cn("border-0 border-l-4 bg-card shadow-card hover:shadow-card-hover cursor-pointer transition-all", emeBorder(kpis.emesExpiring30d))}
          onClick={() => navigate("/topography")}
        >
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                {t("dashboard.kpi.emesExpiring", { defaultValue: "EMEs ≤30d" })}
              </p>
              <Crosshair className={cn("h-4 w-4", emeSemaphore(kpis.emesExpiring30d))} />
            </div>
            {loading ? <Skeleton className="h-10 w-16" /> : (
              <p className={cn("text-4xl font-black tabular-nums", emeSemaphore(kpis.emesExpiring30d))}>
                {kpis.emesExpiring30d}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Próxima Auditoria */}
        <Card
          className={cn("border-0 border-l-4 bg-card shadow-card hover:shadow-card-hover cursor-pointer transition-all", auditBorder(auditDays))}
          onClick={() => navigate("/planning")}
        >
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                {t("dashboard.kpi.nextAudit", { defaultValue: "Próxima Auditoria" })}
              </p>
              <CalendarClock className={cn("h-4 w-4", auditSemaphore(auditDays))} />
            </div>
            {loading ? <Skeleton className="h-10 w-16" /> : kpis.nextAudit ? (
              <div>
                <p className={cn("text-2xl font-black tabular-nums", auditSemaphore(auditDays))}>
                  {auditDays !== null ? `${auditDays}d` : "—"}
                </p>
                <p className="text-[10px] text-muted-foreground mt-1 truncate">
                  {kpis.nextAudit.description}
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{t("dashboard.noAudit", { defaultValue: "Sem auditorias planeadas" })}</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ══ ZONA B — Barras de progresso ════════════════════ */}
      <Card className="border-0 bg-card shadow-card">
        <CardHeader className="pb-2 pt-5 px-5">
          <CardTitle className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
            {t("dashboard.progress.title", { defaultValue: "Progresso do SGQ" })}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-5 space-y-4">
          {/* PPIs Aprovados */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-foreground flex items-center gap-1.5">
                <ClipboardCheck className="h-3.5 w-3.5 text-muted-foreground" />
                {t("dashboard.progress.ppi", { defaultValue: "PPIs Aprovados" })}
              </span>
              <span className="text-sm font-bold tabular-nums text-foreground">
                {loading ? "—" : `${kpis.ppiApproved} / ${kpis.ppiTotal}`}
              </span>
            </div>
            <Progress value={kpis.ppiTotal > 0 ? (kpis.ppiApproved / kpis.ppiTotal) * 100 : 0} className="h-2" />
          </div>
          {/* Ensaios Realizados */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-foreground flex items-center gap-1.5">
                <FlaskConical className="h-3.5 w-3.5 text-muted-foreground" />
                {t("dashboard.progress.tests", { defaultValue: "Ensaios Realizados" })}
              </span>
              <span className="text-sm font-bold tabular-nums text-foreground">
                {loading ? "—" : `${kpis.testsCompleted} / ${kpis.testsTotal}`}
              </span>
            </div>
            <Progress value={kpis.testsTotal > 0 ? (kpis.testsCompleted / kpis.testsTotal) * 100 : 0} className="h-2" />
          </div>
          {/* Materiais Aprovados */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-foreground flex items-center gap-1.5">
                <Package className="h-3.5 w-3.5 text-muted-foreground" />
                {t("dashboard.progress.materials", { defaultValue: "Materiais Aprovados (PAME)" })}
              </span>
              <span className="text-sm font-bold tabular-nums text-foreground">
                {loading ? "—" : `${kpis.matApproved} / ${kpis.matTotal}`}
              </span>
            </div>
            <Progress value={kpis.matTotal > 0 ? (kpis.matApproved / kpis.matTotal) * 100 : 0} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* ══ ZONA C — Actividade recente ═════════════════════ */}
      <Card className="border-0 bg-card shadow-card">
        <CardHeader className="pb-2 pt-5 px-5">
          <CardTitle className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            {t("dashboard.recent.title", { defaultValue: "Actividade Recente" })}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-5">
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
            </div>
          ) : kpis.recentActivity.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              {t("dashboard.recent.empty", { defaultValue: "Sem actividade recente" })}
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {kpis.recentActivity.map((item, idx) => {
                const cfg = ACTIVITY_CFG[item.type] ?? ACTIVITY_CFG.nc;
                const Icon = cfg.icon;
                const route = item.type === "nc" ? `/non-conformities/${item.id}`
                  : item.type === "ppi" ? `/ppi/${item.id}`
                  : item.type === "lot" ? "/materials"
                  : "/tests";
                return (
                  <li
                    key={`${item.type}-${item.id}-${idx}`}
                    className="flex items-center gap-3 py-2.5 cursor-pointer hover:bg-muted/30 -mx-2 px-2 rounded-lg transition-colors"
                    onClick={() => navigate(route)}
                  >
                    <Icon className={cn("h-3.5 w-3.5 flex-shrink-0", cfg.color)} />
                    <span className="font-mono text-xs text-muted-foreground w-28 flex-shrink-0">{item.code}</span>
                    <span className="text-sm text-foreground flex-1 truncate">{item.label || "—"}</span>
                    <span className="text-[10px] text-muted-foreground tabular-nums flex-shrink-0">
                      {new Date(item.created_at).toLocaleDateString()}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* ══ ZONA D — Acções rápidas ═════════════════════════ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Button variant="outline" className="h-12 gap-2 text-sm font-medium" onClick={() => setNcOpen(true)}>
          <Plus className="h-4 w-4" /> {t("dashboard.actions.openNc", { defaultValue: "Abrir NC" })}
        </Button>
        <Button variant="outline" className="h-12 gap-2 text-sm font-medium" onClick={() => setReceptionOpen(true)}>
          <Plus className="h-4 w-4" /> {t("dashboard.actions.reception", { defaultValue: "Receção Material" })}
        </Button>
        <Button variant="outline" className="h-12 gap-2 text-sm font-medium" onClick={() => navigate("/tests")}>
          <Plus className="h-4 w-4" /> {t("dashboard.actions.test", { defaultValue: "Registar Ensaio" })}
        </Button>
        <Button variant="outline" className="h-12 gap-2 text-sm font-medium" onClick={() => setRfiOpen(true)}>
          <Plus className="h-4 w-4" /> {t("dashboard.actions.rfi", { defaultValue: "Novo RFI" })}
        </Button>
      </div>

      {/* ── Dialogs ───────────────────────────────────────── */}
      <NCFormDialog open={ncOpen} onOpenChange={setNcOpen} onSuccess={refetch} />
      <MaterialReceptionDialog open={receptionOpen} onOpenChange={setReceptionOpen} onSuccess={refetch} />
      <RfiFormDialog open={rfiOpen} onOpenChange={setRfiOpen} onSuccess={refetch} />
    </div>
  );
}
