import { useMemo, useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useProject } from "@/contexts/ProjectContext";
import { supabase } from "@/integrations/supabase/client";
import { NoProjectBanner } from "@/components/NoProjectBanner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  CheckCircle2, AlertCircle, Circle, ExternalLink, ShieldCheck,
  FileText, FlaskConical, ClipboardCheck, AlertTriangle, Truck,
  Package, HardHat, Construction, Crosshair, ClipboardList,
  BookOpen, CalendarClock, BarChart3, Leaf, Building2, Zap, Layers,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Real data state ─────────────────────────────────────────────────────────

interface RealData {
  docsApproved: number; docsTotal: number;
  ncsOpen: number; ncsClosed: number;
  ppiCompleted: number; ppiTotal: number;
  materialsApproved: number; materialsTotal: number;
  calibrationsValid: number; calibrationsTotal: number;
  testsPass: number; testsTotal: number;
  auditsDone: number; auditsTotal: number;
  trainingCount: number;
  monthlyReportsSubmitted: number;
  concreteBatches: number; concreteLots: number; concreteLotsConform: number;
  weldsTotal: number; weldsWithUT: number; weldsPendingUT: number;
  soilsTotal: number; soilsConform: number;
}

function useRealSGQData(projectId: string | undefined) {
  const [data, setData] = useState<RealData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!projectId) { setData(null); setLoading(false); return; }
    setLoading(true);
    try {
      // Use the materialized view for a single optimized query
      const { data: vw, error } = await (supabase as any)
        .from("vw_sgq_matrix_summary")
        .select("*")
        .eq("project_id", projectId)
        .maybeSingle();

      if (error) throw error;

      if (vw) {
        setData({
          docsApproved: vw.docs_approved ?? 0,
          docsTotal: vw.docs_total ?? 0,
          ncsOpen: vw.nc_open ?? 0,
          ncsClosed: vw.nc_closed ?? 0,
          ppiCompleted: vw.ppi_completed ?? 0,
          ppiTotal: vw.ppi_total ?? 0,
          materialsApproved: vw.materials_approved ?? 0,
          materialsTotal: vw.materials_total ?? 0,
          calibrationsValid: vw.calibrations_valid ?? 0,
          calibrationsTotal: vw.calibrations_total ?? 0,
          testsPass: vw.tests_pass ?? 0,
          testsTotal: vw.tests_total ?? 0,
          auditsDone: vw.audits_completed ?? 0,
          auditsTotal: vw.audits_total ?? 0,
          trainingCount: vw.training_total ?? 0,
          monthlyReportsSubmitted: vw.monthly_reports_submitted ?? 0,
          concreteBatches: vw.concrete_batches ?? 0,
          concreteLots: vw.concrete_lots ?? 0,
          concreteLotsConform: vw.concrete_lots_conform ?? 0,
          weldsTotal: vw.welds_total ?? 0,
          weldsWithUT: vw.welds_with_ut ?? 0,
          weldsPendingUT: vw.welds_pending_ut ?? 0,
          soilsTotal: vw.soils_total ?? 0,
          soilsConform: vw.soils_conform ?? 0,
        });
      } else {
        // Fallback: no data in view yet
        setData({
          docsApproved: 0, docsTotal: 0, ncsOpen: 0, ncsClosed: 0,
          ppiCompleted: 0, ppiTotal: 0, materialsApproved: 0, materialsTotal: 0,
          calibrationsValid: 0, calibrationsTotal: 0, testsPass: 0, testsTotal: 0,
          auditsDone: 0, auditsTotal: 0, trainingCount: 0, monthlyReportsSubmitted: 0,
          concreteBatches: 0, concreteLots: 0, concreteLotsConform: 0,
          weldsTotal: 0, weldsWithUT: 0, weldsPendingUT: 0,
          soilsTotal: 0, soilsConform: 0,
        });
      }
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { fetch(); }, [fetch]);
  return { data, loading };
}

// ─── SGQ Requirements Matrix ─────────────────────────────────────────────────

type CoverageLevel = "full" | "partial" | "planned" | "external";

interface SGQRequirement {
  chapter: string;
  requirementKey: string;
  moduleKey: string;
  route: string;
  icon: React.ElementType;
  coverage: CoverageLevel;
  detailsKey: string;
  registryTypes?: string[];
  dataKey?: keyof RealData;
  dataTotalKey?: keyof RealData;
}

const SGQ_REQUIREMENTS: SGQRequirement[] = [
  { chapter: "1", requirementKey: "sgqMatrix.req.ch1", moduleKey: "sgqMatrix.modules.projectSettings", route: "/settings", icon: ShieldCheck, coverage: "full", detailsKey: "sgqMatrix.det.ch1" },
  { chapter: "2", requirementKey: "sgqMatrix.req.ch2", moduleKey: "sgqMatrix.modules.documents", route: "/documents", icon: FileText, coverage: "full", detailsKey: "sgqMatrix.det.ch2", registryTypes: ["DOC", "FORM"], dataKey: "docsApproved", dataTotalKey: "docsTotal" },
  { chapter: "2.1", requirementKey: "sgqMatrix.req.ch2_1", moduleKey: "sgqMatrix.modules.plans", route: "/plans", icon: BookOpen, coverage: "full", detailsKey: "sgqMatrix.det.ch2_1", registryTypes: ["MS", "PlanTopo", "PlanEns", "PlanInsp", "PlanQual"] },
  { chapter: "3", requirementKey: "sgqMatrix.req.ch3", moduleKey: "sgqMatrix.modules.planning", route: "/planning", icon: CalendarClock, coverage: "full", detailsKey: "sgqMatrix.det.ch3" },
  { chapter: "3.1", requirementKey: "sgqMatrix.req.ch3_1", moduleKey: "sgqMatrix.modules.workItems", route: "/work-items", icon: Construction, coverage: "full", detailsKey: "sgqMatrix.det.ch3_1" },
  { chapter: "4", requirementKey: "sgqMatrix.req.ch4", moduleKey: "sgqMatrix.modules.ppi", route: "/ppi", icon: ClipboardCheck, coverage: "full", detailsKey: "sgqMatrix.det.ch4", registryTypes: ["PPI Instance", "PPI Template"], dataKey: "ppiCompleted", dataTotalKey: "ppiTotal" },
  { chapter: "4.1", requirementKey: "sgqMatrix.req.ch4_1", moduleKey: "sgqMatrix.modules.tests", route: "/tests", icon: FlaskConical, coverage: "full", detailsKey: "sgqMatrix.det.ch4_1", registryTypes: ["Test Result"], dataKey: "testsPass", dataTotalKey: "testsTotal" },
  { chapter: "4.2", requirementKey: "sgqMatrix.req.ch4_2", moduleKey: "sgqMatrix.modules.laboratories", route: "/laboratories", icon: Building2, coverage: "full", detailsKey: "sgqMatrix.det.ch4_2" },
  { chapter: "5", requirementKey: "sgqMatrix.req.ch5", moduleKey: "sgqMatrix.modules.nc", route: "/non-conformities", icon: AlertTriangle, coverage: "full", detailsKey: "sgqMatrix.det.ch5", registryTypes: ["RNC"], dataKey: "ncsClosed", dataTotalKey: "ncsOpen" },
  { chapter: "6", requirementKey: "sgqMatrix.req.ch6", moduleKey: "sgqMatrix.modules.materials", route: "/materials", icon: Package, coverage: "full", detailsKey: "sgqMatrix.det.ch6", registryTypes: ["PAME", "Material Lot"], dataKey: "materialsApproved", dataTotalKey: "materialsTotal" },
  { chapter: "6.1", requirementKey: "sgqMatrix.req.ch6_1", moduleKey: "sgqMatrix.modules.suppliers", route: "/suppliers", icon: Truck, coverage: "full", detailsKey: "sgqMatrix.det.ch6_1" },
  { chapter: "7", requirementKey: "sgqMatrix.req.ch7", moduleKey: "sgqMatrix.modules.subcontractors", route: "/subcontractors", icon: HardHat, coverage: "full", detailsKey: "sgqMatrix.det.ch7" },
  { chapter: "8", requirementKey: "sgqMatrix.req.ch8", moduleKey: "sgqMatrix.modules.topography", route: "/topography", icon: Crosshair, coverage: "full", detailsKey: "sgqMatrix.det.ch8", registryTypes: ["Survey", "Equipment", "Control", "MDJ", "Drawing"], dataKey: "calibrationsValid", dataTotalKey: "calibrationsTotal" },
  { chapter: "9", requirementKey: "sgqMatrix.req.ch9", moduleKey: "sgqMatrix.modules.dailyReports", route: "/daily-reports", icon: ClipboardList, coverage: "full", detailsKey: "sgqMatrix.det.ch9", registryTypes: ["Daily Report"] },
  { chapter: "10", requirementKey: "sgqMatrix.req.ch10", moduleKey: "sgqMatrix.modules.recycled", route: "/recycled-materials", icon: Leaf, coverage: "full", detailsKey: "sgqMatrix.det.ch10" },
  { chapter: "11", requirementKey: "sgqMatrix.req.ch11", moduleKey: "sgqMatrix.modules.technicalOffice", route: "/technical-office", icon: FileText, coverage: "full", detailsKey: "sgqMatrix.det.ch11", registryTypes: ["RFI", "Submittal"] },
  { chapter: "12", requirementKey: "sgqMatrix.req.ch12", moduleKey: "sgqMatrix.modules.audits", route: "/audits", icon: ShieldCheck, coverage: "full", detailsKey: "sgqMatrix.det.ch12", dataKey: "auditsDone", dataTotalKey: "auditsTotal" },
  { chapter: "13", requirementKey: "sgqMatrix.req.ch13", moduleKey: "sgqMatrix.modules.auditLog", route: "/audit-log", icon: BarChart3, coverage: "full", detailsKey: "sgqMatrix.det.ch13" },
  { chapter: "14", requirementKey: "sgqMatrix.req.ch14", moduleKey: "sgqMatrix.modules.pss", route: "/plans", icon: BookOpen, coverage: "partial", detailsKey: "sgqMatrix.det.ch14" },
  { chapter: "15", requirementKey: "sgqMatrix.req.ch15", moduleKey: "sgqMatrix.modules.rfi", route: "/technical-office", icon: FileText, coverage: "partial", detailsKey: "sgqMatrix.det.ch15" },
  { chapter: "V00", requirementKey: "sgqMatrix.req.v00", moduleKey: "sgqMatrix.modules.docsTopography", route: "/documents", icon: Crosshair, coverage: "full", detailsKey: "sgqMatrix.det.v00", registryTypes: ["MDJ", "Drawing"] },
  { chapter: "V01.1", requirementKey: "sgqMatrix.req.v01_1", moduleKey: "sgqMatrix.modules.documents", route: "/documents", icon: Construction, coverage: "full", detailsKey: "sgqMatrix.det.v01_1", registryTypes: ["MDJ", "MED", "CTE", "DPU"] },
  { chapter: "V01.2", requirementKey: "sgqMatrix.req.v01_2", moduleKey: "sgqMatrix.modules.documents", route: "/documents", icon: Construction, coverage: "full", detailsKey: "sgqMatrix.det.v01_2", registryTypes: ["MDJ", "MED", "CTE", "DPU", "Drawing"] },
  { chapter: "V01.6", requirementKey: "sgqMatrix.req.v01_6", moduleKey: "sgqMatrix.modules.documents", route: "/documents", icon: Construction, coverage: "full", detailsKey: "sgqMatrix.det.v01_6", registryTypes: ["MDJ", "MED", "CTE", "DPU", "Drawing"] },
  { chapter: "V01.7", requirementKey: "sgqMatrix.req.v01_7", moduleKey: "sgqMatrix.modules.documents", route: "/documents", icon: Construction, coverage: "full", detailsKey: "sgqMatrix.det.v01_7", registryTypes: ["EGT", "Drawing"] },
  { chapter: "V01.8", requirementKey: "sgqMatrix.req.v01_8", moduleKey: "sgqMatrix.modules.documents", route: "/documents", icon: Construction, coverage: "full", detailsKey: "sgqMatrix.det.v01_8", registryTypes: ["MDJ", "MED", "CTE", "DPU", "Drawing"] },
  { chapter: "E1", requirementKey: "sgqMatrix.req.e1", moduleKey: "sgqMatrix.modules.concreteTesting", route: "/tests", icon: FlaskConical, coverage: "full", detailsKey: "sgqMatrix.det.e1", registryTypes: ["Batch", "Lot", "Specimen"], dataKey: "concreteLots", dataTotalKey: "concreteBatches" },
  { chapter: "E2", requirementKey: "sgqMatrix.req.e2", moduleKey: "sgqMatrix.modules.weldTesting", route: "/tests", icon: Zap, coverage: "full", detailsKey: "sgqMatrix.det.e2", registryTypes: ["Weld"], dataKey: "weldsWithUT", dataTotalKey: "weldsTotal" },
  { chapter: "E3", requirementKey: "sgqMatrix.req.e3", moduleKey: "sgqMatrix.modules.soilTesting", route: "/tests", icon: Layers, coverage: "full", detailsKey: "sgqMatrix.det.e3", registryTypes: ["Soil", "Compaction"], dataKey: "soilsConform", dataTotalKey: "soilsTotal" },
];

// ─── Coverage helpers ────────────────────────────────────────────────────────

const COVERAGE_CONFIG: Record<CoverageLevel, { label: string; icon: React.ElementType; className: string }> = {
  full:     { label: "Cobertura Total",   icon: CheckCircle2, className: "text-emerald-600 bg-emerald-500/10" },
  partial:  { label: "Cobertura Parcial", icon: AlertCircle,  className: "text-amber-600 bg-amber-500/10" },
  planned:  { label: "Planeado",          icon: Circle,       className: "text-blue-500 bg-blue-500/10" },
  external: { label: "Externo ao SGQ",    icon: Circle,       className: "text-muted-foreground bg-muted" },
};

// ─── Progress indicator ──────────────────────────────────────────────────────

function DataProgress({ approved, total }: { approved: number; total: number }) {
  if (total === 0) return <span className="text-xs text-muted-foreground">—</span>;
  const pct = Math.round((approved / total) * 100);
  return (
    <div className="flex items-center gap-2 min-w-[100px]">
      <Progress value={pct} className="h-1.5 flex-1" />
      <span className="text-[10px] font-bold tabular-nums text-muted-foreground whitespace-nowrap">
        {approved}/{total} ({pct}%)
      </span>
    </div>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function SGQMatrixPage() {
  const { t } = useTranslation();
  const { activeProject } = useProject();
  const navigate = useNavigate();
  const { data: realData, loading: dataLoading } = useRealSGQData(activeProject?.id);

  const stats = useMemo(() => {
    const total = SGQ_REQUIREMENTS.length;
    const full = SGQ_REQUIREMENTS.filter(r => r.coverage === "full").length;
    const partial = SGQ_REQUIREMENTS.filter(r => r.coverage === "partial").length;
    const pct = Math.round(((full + partial * 0.5) / total) * 100);
    return { total, full, partial, pct };
  }, []);

  if (!activeProject) return <NoProjectBanner />;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          {t("sgqMatrix.title", { defaultValue: "Matriz de Conformidade SGQ" })}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t("sgqMatrix.subtitle", { defaultValue: "Mapeamento dos requisitos do Plano de Qualidade aos módulos do Atlas QMS" })} — {activeProject.name}
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <p className="text-xs text-muted-foreground">{t("sgqMatrix.kpi.totalReqs", { defaultValue: "Requisitos Totais" })}</p>
            <p className="text-2xl font-bold text-foreground">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <div className="flex items-center justify-center gap-1 text-emerald-600 mb-1">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <p className="text-xs">{t("sgqMatrix.kpi.fullCoverage", { defaultValue: "Cobertura Total" })}</p>
            </div>
            <p className="text-2xl font-bold text-emerald-600">{stats.full}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <div className="flex items-center justify-center gap-1 text-amber-600 mb-1">
              <AlertCircle className="h-3.5 w-3.5" />
              <p className="text-xs">{t("sgqMatrix.kpi.partialCoverage", { defaultValue: "Cobertura Parcial" })}</p>
            </div>
            <p className="text-2xl font-bold text-amber-600">{stats.partial}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <p className="text-xs text-muted-foreground mb-1">{t("sgqMatrix.kpi.coverageIndex", { defaultValue: "Índice de Cobertura" })}</p>
            <p className="text-2xl font-bold text-foreground">{stats.pct}%</p>
            <Progress value={stats.pct} className="mt-2 h-1.5" />
          </CardContent>
        </Card>
      </div>

      {/* Matrix Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">
            {t("sgqMatrix.tableTitle", { defaultValue: "Capítulos do Plano de Qualidade vs. Módulos Atlas" })}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="rounded-b-xl overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground w-12">Cap.</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Requisito PQ</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Módulo Atlas</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground w-32">Cobertura</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground w-40">{t("sgqMatrix.progress", { defaultValue: "Progresso" })}</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("sgqMatrix.detailsCol", { defaultValue: "Detalhes" })}</TableHead>
                  <TableHead className="w-16" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {SGQ_REQUIREMENTS.map((req, idx) => {
                  const coverageCfg = COVERAGE_CONFIG[req.coverage];
                  const Icon = req.icon;

                  // Progress from real data
                  let progressCell: React.ReactNode = <span className="text-xs text-muted-foreground">—</span>;
                  if (realData && req.dataKey && req.dataTotalKey) {
                    const approved = realData[req.dataKey] as number;
                    const total = realData[req.dataTotalKey] as number;
                    progressCell = <DataProgress approved={approved} total={total} />;
                  } else if (dataLoading && req.dataKey) {
                    progressCell = <div className="h-1.5 w-20 rounded bg-muted animate-pulse" />;
                  }

                  return (
                    <TableRow key={idx} className="hover:bg-muted/20 transition-colors">
                      <TableCell className="font-mono text-xs text-muted-foreground font-semibold">
                        {req.chapter}
                      </TableCell>
                      <TableCell className="font-medium text-sm text-foreground">
                        {t(req.requirementKey)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <Icon className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                          <span className="text-sm">{t(req.moduleKey)}</span>
                        </div>
                        {req.registryTypes && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {req.registryTypes.map(rt => (
                              <Badge key={rt} variant="outline" className="text-[9px] font-mono px-1.5 py-0">
                                {rt}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={cn("text-xs gap-1", coverageCfg.className)}
                        >
                          <coverageCfg.icon className="h-3 w-3" />
                          {t(`sgqMatrix.coverage.${req.coverage}`)}
                        </Badge>
                      </TableCell>
                      <TableCell>{progressCell}</TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[300px]">
                        {t(req.detailsKey)}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-primary"
                          onClick={() => navigate(req.route)}
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
        {Object.entries(COVERAGE_CONFIG).map(([key, cfg]) => (
          <div key={key} className="flex items-center gap-1.5">
            <Badge variant="secondary" className={cn("text-[10px] gap-1 px-1.5", cfg.className)}>
              <cfg.icon className="h-2.5 w-2.5" />
              {cfg.label}
            </Badge>
          </div>
        ))}
      </div>
    </div>
  );
}
