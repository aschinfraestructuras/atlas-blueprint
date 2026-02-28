import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useProject } from "@/contexts/ProjectContext";
import { planningService, type Activity, type CompletionCheck } from "@/lib/services/planningService";
import { supabase } from "@/integrations/supabase/client";
import { auditService } from "@/lib/services/auditService";
import { exportActivityDetailPdf } from "@/lib/services/planningExportService";
import { ReportExportMenu } from "@/components/reports/ReportExportMenu";
import { AttachmentsPanel } from "@/components/attachments/AttachmentsPanel";
import { NoProjectBanner } from "@/components/NoProjectBanner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft, CheckCircle2, AlertTriangle, XCircle, ExternalLink,
  ClipboardList, MapPin, Wrench, FlaskConical, ShieldCheck, HardHat
} from "lucide-react";
import { cn } from "@/lib/utils";

const STATUS_COLORS: Record<string, string> = {
  planned: "bg-muted text-muted-foreground",
  in_progress: "bg-primary/10 text-primary",
  blocked: "bg-destructive/10 text-destructive",
  completed: "bg-primary/20 text-primary",
  cancelled: "bg-muted text-muted-foreground line-through",
};

interface RequirementStatus {
  key: string;
  label: string;
  required: boolean;
  met: boolean;
  details: string;
  icon: React.ReactNode;
  link?: string;
}

export default function ActivityDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { activeProject } = useProject();

  const [activity, setActivity] = useState<Activity | null>(null);
  const [loading, setLoading] = useState(true);
  const [completionCheck, setCompletionCheck] = useState<CompletionCheck | null>(null);
  const [checkLoading, setCheckLoading] = useState(false);

  // Requirement data
  const [topoRequests, setTopoRequests] = useState<any[]>([]);
  const [ppiInstances, setPpiInstances] = useState<any[]>([]);
  const [testResults, setTestResults] = useState<any[]>([]);
  const [subcontractor, setSubcontractor] = useState<any>(null);

  useEffect(() => {
    if (!id || !activeProject) return;
    loadActivity();
  }, [id, activeProject]);

  const loadActivity = async () => {
    if (!id || !activeProject) return;
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from("planning_activities")
        .select("*, planning_wbs(wbs_code), work_items(sector), subcontractors(name)")
        .eq("id", id)
        .single();
      if (error) throw error;
      const act: Activity = {
        ...data,
        wbs_code: data.planning_wbs?.wbs_code ?? null,
        work_item_sector: data.work_items?.sector ?? null,
        subcontractor_name: data.subcontractors?.name ?? null,
      };
      setActivity(act);
      await loadRequirements(act);
    } catch {
      setActivity(null);
    } finally {
      setLoading(false);
    }
  };

  const loadRequirements = async (act: Activity) => {
    const promises: Promise<void>[] = [];

    // Topography requests by work_item_id or zone
    if (act.requires_topography && (act.work_item_id || act.zone)) {
      promises.push((async () => {
        let q = (supabase as any).from("topography_requests").select("*").eq("project_id", act.project_id);
        if (act.work_item_id) q = q.eq("work_item_id", act.work_item_id);
        else if (act.zone) q = q.eq("zone", act.zone);
        const { data } = await q;
        setTopoRequests(data ?? []);
      })());
    }

    // PPI instances by work_item_id
    if (act.requires_ppi && act.work_item_id) {
      promises.push((async () => {
        const { data } = await (supabase as any)
          .from("ppi_instances").select("id, code, status, inspection_date")
          .eq("project_id", act.project_id).eq("work_item_id", act.work_item_id);
        setPpiInstances(data ?? []);
      })());
    }

    // Test results by work_item_id
    if (act.requires_tests && act.work_item_id) {
      promises.push((async () => {
        const { data } = await (supabase as any)
          .from("test_results").select("id, status, result_date")
          .eq("project_id", act.project_id).eq("work_item_id", act.work_item_id);
        setTestResults(data ?? []);
      })());
    }

    // Subcontractor info
    if (act.subcontractor_id) {
      promises.push((async () => {
        const { data } = await (supabase as any)
          .from("subcontractors").select("id, name, status, documentation_status")
          .eq("id", act.subcontractor_id).single();
        setSubcontractor(data ?? null);
      })());
    }

    await Promise.all(promises);
  };

  const runCompletionCheck = async () => {
    if (!id) return;
    setCheckLoading(true);
    try {
      const r = await planningService.checkCompletion(id);
      setCompletionCheck(r);
    } catch (e: any) {
      setCompletionCheck({ can_complete: false, blocks: [e.message] });
    } finally {
      setCheckLoading(false);
    }
  };

  const requirements = useMemo<RequirementStatus[]>(() => {
    if (!activity) return [];
    const reqs: RequirementStatus[] = [];

    if (activity.requires_topography) {
      const nonPending = topoRequests.filter(r => r.status !== "pending");
      reqs.push({
        key: "topography",
        label: t("planning.fields.reqTopography"),
        required: true,
        met: nonPending.length > 0,
        details: nonPending.length > 0
          ? t("planning.detail.reqMet", { count: nonPending.length, defaultValue: "{{count}} pedido(s) em progresso/concluídos" })
          : t("planning.detail.reqNotMet", { defaultValue: "Nenhum pedido topográfico registado ou todos pendentes" }),
        icon: <MapPin className="h-4 w-4" />,
        link: "/topography",
      });
    }

    if (activity.requires_ppi) {
      const active = ppiInstances.filter(p => ["in_progress", "submitted", "approved"].includes(p.status));
      reqs.push({
        key: "ppi",
        label: t("planning.fields.reqPpi"),
        required: true,
        met: active.length > 0,
        details: active.length > 0
          ? `${active.length} PPI em progresso/aprovado`
          : "Nenhuma inspeção PPI iniciada para esta atividade",
        icon: <ClipboardList className="h-4 w-4" />,
        link: "/ppi",
      });
    }

    if (activity.requires_tests) {
      const completed = testResults.filter(r => r.status !== "pending");
      reqs.push({
        key: "tests",
        label: t("planning.fields.reqTests"),
        required: true,
        met: completed.length > 0,
        details: completed.length > 0
          ? `${completed.length} ensaio(s) realizados`
          : "Nenhum ensaio concluído para esta atividade",
        icon: <FlaskConical className="h-4 w-4" />,
        link: "/tests",
      });
    }

    return reqs;
  }, [activity, topoRequests, ppiInstances, testResults, t]);

  if (!activeProject) return <NoProjectBanner />;

  if (loading) {
    return (
      <div className="space-y-4 max-w-5xl mx-auto">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!activity) {
    return (
      <div className="max-w-5xl mx-auto text-center py-12">
        <p className="text-muted-foreground">{t("common.noData")}</p>
        <Button variant="link" onClick={() => navigate("/planning")}>{t("common.back")}</Button>
      </div>
    );
  }

  const meta = { projectName: activeProject.name, projectCode: activeProject.code, locale: "pt" };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/planning")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold tracking-tight text-foreground truncate">{activity.description}</h1>
          <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
            {activity.wbs_code && <span className="font-mono">WBS: {activity.wbs_code}</span>}
            {activity.zone && <><span>•</span><span>{activity.zone}</span></>}
          </div>
        </div>
        <Badge className={cn("text-xs", STATUS_COLORS[activity.status] ?? "")}>
          {t(`planning.status.${activity.status}`, { defaultValue: activity.status })}
        </Badge>
        <ReportExportMenu options={[
          { label: "PDF", icon: "pdf", action: () => {
            exportActivityDetailPdf(activity, requirements, meta);
            auditService.log({ projectId: activeProject.id, entity: "planning_activities", entityId: activity.id, action: "EXPORT", module: "planning", description: `Exportação PDF da atividade "${activity.description}"` });
          }},
        ]} />
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="pt-4 pb-3 text-center">
          <p className="text-xs text-muted-foreground">{t("planning.fields.progress")}</p>
          <div className="flex items-center gap-2 justify-center mt-1">
            <Progress value={activity.progress_pct} className="h-2 w-16" />
            <span className="text-lg font-bold text-foreground">{activity.progress_pct}%</span>
          </div>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3 text-center">
          <p className="text-xs text-muted-foreground">{t("planning.fields.plannedStart")}</p>
          <p className="text-sm font-medium text-foreground mt-1">{activity.planned_start || "—"}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3 text-center">
          <p className="text-xs text-muted-foreground">{t("planning.fields.plannedEnd")}</p>
          <p className="text-sm font-medium text-foreground mt-1">{activity.planned_end || "—"}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3 text-center">
          <p className="text-xs text-muted-foreground">{t("planning.fields.subcontractor")}</p>
          <p className="text-sm font-medium text-foreground mt-1">{activity.subcontractor_name || "—"}</p>
        </CardContent></Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">{t("planning.detail.tabs.overview", { defaultValue: "Resumo" })}</TabsTrigger>
          <TabsTrigger value="requirements">{t("planning.detail.tabs.requirements", { defaultValue: "Requisitos" })}</TabsTrigger>
          <TabsTrigger value="evidence">{t("planning.detail.tabs.evidence", { defaultValue: "Evidências" })}</TabsTrigger>
          <TabsTrigger value="links">{t("planning.detail.tabs.links", { defaultValue: "Ligações" })}</TabsTrigger>
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-sm">{t("common.description")}</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm text-foreground">{activity.description}</p>
              {activity.constraints_text && (
                <>
                  <Separator className="my-3" />
                  <p className="text-xs text-muted-foreground font-semibold mb-1">{t("planning.fields.constraints")}</p>
                  <p className="text-sm text-muted-foreground">{activity.constraints_text}</p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm">{t("planning.fields.dates")}</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div><p className="text-xs text-muted-foreground">{t("planning.fields.plannedStart")}</p><p className="font-medium">{activity.planned_start || "—"}</p></div>
                <div><p className="text-xs text-muted-foreground">{t("planning.fields.plannedEnd")}</p><p className="font-medium">{activity.planned_end || "—"}</p></div>
                <div><p className="text-xs text-muted-foreground">{t("planning.fields.actualStart")}</p><p className="font-medium">{activity.actual_start || "—"}</p></div>
                <div><p className="text-xs text-muted-foreground">{t("planning.fields.actualEnd")}</p><p className="font-medium">{activity.actual_end || "—"}</p></div>
              </div>
            </CardContent>
          </Card>

          {/* Completion check */}
          <Card>
            <CardHeader><CardTitle className="text-sm">{t("planning.completion.title")}</CardTitle></CardHeader>
            <CardContent>
              {!completionCheck ? (
                <Button onClick={runCompletionCheck} disabled={checkLoading} size="sm">
                  <ShieldCheck className="h-4 w-4 mr-1.5" />
                  {checkLoading ? t("common.loading") : t("planning.completion.runCheck")}
                </Button>
              ) : completionCheck.can_complete ? (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/10 text-primary">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="text-sm font-medium">{t("planning.completion.canComplete")}</span>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-destructive">
                    <AlertTriangle className="h-5 w-5" />
                    <span className="text-sm font-medium">{t("planning.completion.blocked")}</span>
                  </div>
                  <ul className="space-y-1 pl-7 list-disc text-sm text-muted-foreground">
                    {completionCheck.blocks.map((b, i) => <li key={i}>{b}</li>)}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Requirements */}
        <TabsContent value="requirements" className="space-y-4">
          {requirements.length === 0 ? (
            <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">
              {t("planning.detail.noRequirements", { defaultValue: "Esta atividade não tem requisitos obrigatórios (Topografia, PPI, Ensaios)." })}
            </CardContent></Card>
          ) : (
            requirements.map((req) => (
              <Card key={req.key}>
                <CardContent className="py-4">
                  <div className="flex items-start gap-3">
                    <div className={cn("mt-0.5 rounded-full p-1.5", req.met ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive")}>
                      {req.met ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {req.icon}
                        <span className="text-sm font-medium text-foreground">{req.label}</span>
                        <Badge variant={req.met ? "default" : "destructive"} className="text-[10px]">
                          {req.met ? t("planning.detail.met", { defaultValue: "Cumprido" }) : t("planning.detail.notMet", { defaultValue: "Pendente" })}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{req.details}</p>
                    </div>
                    {req.link && (
                      <Button variant="ghost" size="sm" asChild>
                        <Link to={req.link}><ExternalLink className="h-3.5 w-3.5 mr-1" />{t("common.view")}</Link>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* Evidence */}
        <TabsContent value="evidence">
          <Card>
            <CardContent className="pt-4">
              <AttachmentsPanel projectId={activeProject.id} entityType="planning_activities" entityId={activity.id} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Links */}
        <TabsContent value="links" className="space-y-3">
          {activity.work_item_id && (
            <Card>
              <CardContent className="py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Wrench className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{t("planning.fields.workItem")}</span>
                    <span className="text-sm text-muted-foreground">{activity.work_item_sector || activity.work_item_id}</span>
                  </div>
                  <Button variant="ghost" size="sm" asChild>
                    <Link to={`/work-items/${activity.work_item_id}`}><ExternalLink className="h-3.5 w-3.5" /></Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
          {activity.subcontractor_id && subcontractor && (
            <Card>
              <CardContent className="py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <HardHat className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{t("planning.fields.subcontractor")}</span>
                    <span className="text-sm text-muted-foreground">{subcontractor.name}</span>
                    <Badge variant="outline" className="text-[10px]">{subcontractor.documentation_status}</Badge>
                  </div>
                  <Button variant="ghost" size="sm" asChild>
                    <Link to="/subcontractors"><ExternalLink className="h-3.5 w-3.5" /></Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
          {!activity.work_item_id && !activity.subcontractor_id && (
            <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">
              {t("planning.detail.noLinks", { defaultValue: "Sem ligações a Work Items ou Subempreiteiros." })}
            </CardContent></Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
