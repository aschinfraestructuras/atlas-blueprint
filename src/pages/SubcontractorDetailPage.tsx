import { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useProject } from "@/contexts/ProjectContext";
import { useAuth } from "@/contexts/AuthContext";
import { subcontractorService, type Subcontractor } from "@/lib/services/subcontractorService";
import { subcontractorDocService, DOC_TYPES, type SubcontractorDocument } from "@/lib/services/subcontractorDocService";
import { auditService } from "@/lib/services/auditService";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { classifySupabaseError } from "@/lib/utils/supabaseError";
import { NoProjectBanner } from "@/components/NoProjectBanner";
import { AttachmentsPanel } from "@/components/attachments/AttachmentsPanel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ArrowLeft, HardHat, Plus, Trash2, FileCheck, AlertTriangle, ClipboardList, Briefcase, History, AlertCircle, FlaskConical } from "lucide-react";
import { cn } from "@/lib/utils";
import { ReportExportMenu } from "@/components/reports/ReportExportMenu";
import { exportSubcontractorDetailPdf } from "@/lib/services/subcontractorExportService";
import type { ReportMeta } from "@/lib/services/reportService";
import { useReportMeta } from "@/hooks/useReportMeta";

const DOC_STATUS_COLORS: Record<string, string> = {
  valid: "bg-primary/20 text-primary",
  expired: "bg-destructive/10 text-destructive",
  pending: "bg-muted text-muted-foreground",
};

const SUB_DOC_TYPES = [
  { value: "seguros", label: "Seguros" },
  { value: "sst", label: "SST" },
  { value: "qualidade", label: "Qualidade" },
  { value: "certificados", label: "Certificados" },
  { value: "formacao", label: "Formação" },
  { value: "seguro", label: "Seguro" },
  { value: "alvara", label: "Alvará" },
  { value: "contrato", label: "Contrato" },
  { value: "certificacao", label: "Certificação" },
  { value: "other", label: "Outro" },
];

export default function SubcontractorDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { activeProject } = useProject();
  const { user } = useAuth();
  const { toast } = useToast();
  const reportMeta = useReportMeta();

  useEffect(() => {
    if (!id || id === "undefined" || id.trim() === "") {
      toast({ title: t("common.recordNotFound", { defaultValue: "Registo não encontrado." }), variant: "destructive" });
      navigate("/subcontractors", { replace: true });
    }
  }, [id]);

  const [sub, setSub] = useState<Subcontractor | null>(null);
  const [loading, setLoading] = useState(true);
  const [docs, setDocs] = useState<SubcontractorDocument[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [workItems, setWorkItems] = useState<any[]>([]);
  const [ncs, setNcs] = useState<any[]>([]);
  const [tests, setTests] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  // New doc form
  const [newDoc, setNewDoc] = useState({ doc_type: "seguros", title: "", valid_from: "", valid_to: "", status: "valid" });
  const [addingDoc, setAddingDoc] = useState(false);
  const [deletingDoc, setDeletingDoc] = useState<SubcontractorDocument | null>(null);

  const fetchSub = useCallback(async () => {
    if (!id || !activeProject) return;
    setLoading(true);
    try {
      const all = await subcontractorService.getByProject(activeProject.id);
      const found = all.find(s => s.id === id);
      setSub(found ?? null);
    } catch (err) {
      const { title, description } = classifySupabaseError(err, t);
      toast({ variant: "destructive", title, description });
    } finally {
      setLoading(false);
    }
  }, [id, activeProject, t, toast]);

  const fetchDocs = useCallback(async () => {
    if (!id) return;
    try {
      const result = await subcontractorDocService.getBySubcontractor(id);
      setDocs(result);
    } catch { /* swallow */ }
  }, [id]);

  const fetchActivities = useCallback(async () => {
    if (!id || !activeProject) return;
    try {
      const { data } = await supabase
        .from("planning_activities")
        .select("*")
        .eq("project_id", activeProject.id)
        .eq("subcontractor_id", id)
        .order("created_at", { ascending: false });
      setActivities(data ?? []);
    } catch { /* swallow */ }
  }, [id, activeProject]);

  const fetchWorkItems = useCallback(async () => {
    if (!id || !activeProject) return;
    try {
      const { data } = await supabase
        .from("work_items" as any)
        .select("*")
        .eq("project_id", activeProject.id)
        .eq("subcontractor_id", id)
        .order("created_at", { ascending: false });
      setWorkItems((data as any[]) ?? []);
    } catch { setWorkItems([]); }
  }, [id, activeProject]);

  const fetchNcs = useCallback(async () => {
    if (!id || !activeProject) return;
    try {
      const { data } = await supabase
        .from("non_conformities")
        .select("*")
        .eq("project_id", activeProject.id)
        .eq("subcontractor_id", id)
        .eq("is_deleted", false)
        .order("created_at", { ascending: false });
      setNcs(data ?? []);
    } catch { setNcs([]); }
  }, [id, activeProject]);

  const fetchTests = useCallback(async () => {
    if (!id || !activeProject) return;
    try {
      // Tests linked via work_items that belong to this subcontractor
      const wiIds = workItems.map((wi: any) => wi.id);
      if (wiIds.length === 0) { setTests([]); return; }
      const { data } = await supabase
        .from("test_results" as any)
        .select("*")
        .eq("project_id", activeProject.id)
        .in("work_item_id", wiIds)
        .order("created_at", { ascending: false });
      setTests((data as any[]) ?? []);
    } catch { setTests([]); }
  }, [id, activeProject, workItems]);

  const fetchAudit = useCallback(async () => {
    if (!id || !activeProject) return;
    try {
      const { data } = await supabase
        .from("audit_log")
        .select("*")
        .eq("project_id", activeProject.id)
        .eq("entity_id", id)
        .order("created_at", { ascending: false })
        .limit(50);
      setAuditLogs(data ?? []);
    } catch { /* swallow */ }
  }, [id, activeProject]);

  useEffect(() => {
    fetchSub();
    fetchDocs();
    fetchActivities();
    fetchWorkItems();
    fetchAudit();
    fetchNcs();
  }, [fetchSub, fetchDocs, fetchActivities, fetchWorkItems, fetchAudit, fetchNcs]);

  // Fetch tests after workItems are loaded
  useEffect(() => {
    if (workItems.length > 0) fetchTests();
  }, [workItems, fetchTests]);

  // Check doc validity
  const docsWithStatus = useMemo(() => {
    const today = new Date();
    const soon = new Date();
    soon.setDate(soon.getDate() + 30);
    return docs.map(d => {
      let computedStatus = d.status;
      if (d.valid_to) {
        const vt = new Date(d.valid_to);
        if (vt < today) computedStatus = "expired";
        else if (vt < soon && computedStatus === "valid") computedStatus = "expiring_soon";
      }
      return { ...d, computedStatus };
    });
  }, [docs]);

  const expiredDocs = docsWithStatus.filter(d => d.computedStatus === "expired");
  const expiringDocs = docsWithStatus.filter(d => d.computedStatus === "expiring_soon");

  if (!activeProject) return <NoProjectBanner />;

  if (loading) {
    return (
      <div className="space-y-4 max-w-5xl mx-auto">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!sub) {
    return (
      <div className="max-w-5xl mx-auto space-y-4">
        <Button variant="ghost" size="sm" onClick={() => navigate("/subcontractors")}>
          <ArrowLeft className="h-4 w-4 mr-1" /> {t("common.back")}
        </Button>
        <p className="text-muted-foreground">{t("common.noData")}</p>
      </div>
    );
  }

  const meta: ReportMeta = reportMeta ?? {
    projectName: activeProject.name,
    projectCode: activeProject.code,
    locale: "pt",
    generatedBy: user?.email ?? undefined,
  };

  const handleAddDoc = async () => {
    if (!activeProject || !newDoc.title.trim()) return;
    setAddingDoc(true);
    try {
      await subcontractorDocService.create({
        project_id: activeProject.id,
        subcontractor_id: sub.id,
        doc_type: newDoc.doc_type,
        title: newDoc.title.trim(),
        valid_from: newDoc.valid_from || undefined,
        valid_to: newDoc.valid_to || undefined,
        status: newDoc.status,
      });
      toast({ title: t("subcontractors.detail.docAdded") });
      setNewDoc({ doc_type: "seguros", title: "", valid_from: "", valid_to: "", status: "valid" });
      fetchDocs();
    } catch (err) {
      const { title, description } = classifySupabaseError(err, t);
      toast({ variant: "destructive", title, description });
    } finally {
      setAddingDoc(false);
    }
  };

  const handleDeleteDoc = async () => {
    if (!deletingDoc || !activeProject) return;
    try {
      await subcontractorDocService.delete(deletingDoc.id, activeProject.id);
      toast({ title: t("subcontractors.detail.docDeleted") });
      fetchDocs();
    } catch (err) {
      const { title, description } = classifySupabaseError(err, t);
      toast({ variant: "destructive", title, description });
    } finally {
      setDeletingDoc(null);
    }
  };

  const docTypeLabel = (v: string) => {
    const found = SUB_DOC_TYPES.find(dt => dt.value === v) ?? DOC_TYPES.find(dt => dt.value === v);
    return found?.label ?? v;
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate("/subcontractors")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <HardHat className="h-5 w-5 text-muted-foreground" />
              <h1 className="text-xl font-bold text-foreground">{sub.name}</h1>
              <Badge variant="secondary" className={cn("text-xs", DOC_STATUS_COLORS[sub.status] ?? "")}>
                {t(`subcontractors.status.${sub.status}`, { defaultValue: sub.status })}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">{sub.trade ?? "—"} · {sub.contact_email ?? "—"}</p>
          </div>
        </div>
        <ReportExportMenu options={[
          { label: "PDF", icon: "pdf", action: () => exportSubcontractorDetailPdf(sub, docsWithStatus, activities, meta) },
        ]} />
      </div>

      {/* Alerts */}
      {expiredDocs.length > 0 && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium">{t("subcontractors.detail.docsExpiredWarning")}</p>
            <ul className="mt-1 list-disc list-inside text-xs">
              {expiredDocs.map(d => <li key={d.id}>{d.title} ({docTypeLabel(d.doc_type)}) — {t("subcontractors.detail.expiredOn")} {d.valid_to}</li>)}
            </ul>
            <p className="text-xs mt-1">{t("subcontractors.detail.blockingNotice")}</p>
          </div>
        </div>
      )}
      {expiringDocs.length > 0 && (
        <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/5 px-4 py-3 text-sm text-yellow-700 dark:text-yellow-400 flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium">{t("subcontractors.detail.docsExpiringSoon")}</p>
            <ul className="mt-1 list-disc list-inside text-xs">
              {expiringDocs.map(d => <li key={d.id}>{d.title} — {t("subcontractors.detail.expiresOn")} {d.valid_to}</li>)}
            </ul>
          </div>
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">{t("subcontractors.detail.tabs.overview")}</TabsTrigger>
          <TabsTrigger value="docs">
            {t("subcontractors.detail.tabs.docs")}
            {docs.length > 0 && <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5 py-0">{docs.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="materials">{t("subcontractors.materialsSection")}</TabsTrigger>
          <TabsTrigger value="activities">
            {t("subcontractors.detail.tabs.activities")}
            {activities.length > 0 && <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5 py-0">{activities.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="workitems">
            {t("subcontractors.detail.tabs.workItems")}
            {workItems.length > 0 && <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5 py-0">{workItems.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="ncs">
            {t("subcontractors.detail.tabs.ncs")}
            {ncs.length > 0 && <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5 py-0">{ncs.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="tests">
            {t("subcontractors.detail.tabs.tests")}
            {tests.length > 0 && <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5 py-0">{tests.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="audit">{t("subcontractors.detail.tabs.audit")}</TabsTrigger>
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-sm">{t("subcontractors.detail.generalInfo")}</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <Row label={t("common.name")} value={sub.name} />
                <Row label={t("subcontractors.table.trade")} value={sub.trade ?? "—"} />
                <Row label={t("subcontractors.table.contactEmail")} value={sub.contact_email ?? "—"} />
                <Row label={t("subcontractors.detail.contract")} value={sub.contract ?? "—"} />
                <Row label={t("common.status")} value={t(`subcontractors.status.${sub.status}`)} />
                <Row label={t("subcontractors.detail.docStatus")} value={t(`subcontractors.docStatus.${sub.documentation_status}`, { defaultValue: sub.documentation_status })} />
                <Row label={t("subcontractors.detail.score")} value={sub.performance_score != null ? `${sub.performance_score}/100` : "—"} />
                <Row label={t("common.date")} value={new Date(sub.created_at).toLocaleDateString()} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-sm">{t("subcontractors.detail.attachments")}</CardTitle></CardHeader>
              <CardContent>
                <AttachmentsPanel projectId={activeProject.id} entityType="subcontractors" entityId={sub.id} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Documentation */}
        <TabsContent value="docs">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <FileCheck className="h-4 w-4 text-muted-foreground" />
                {t("subcontractors.detail.mandatoryDocs")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {docsWithStatus.length > 0 && (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40">
                      <TableHead className="text-xs">{t("subcontractors.detail.docType")}</TableHead>
                      <TableHead className="text-xs">{t("subcontractors.detail.docTitle")}</TableHead>
                      <TableHead className="text-xs">{t("subcontractors.detail.validFrom")}</TableHead>
                      <TableHead className="text-xs">{t("subcontractors.detail.validTo")}</TableHead>
                      <TableHead className="text-xs">{t("common.status")}</TableHead>
                      <TableHead className="w-12" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {docsWithStatus.map(d => (
                      <TableRow key={d.id}>
                        <TableCell className="text-sm">{docTypeLabel(d.doc_type)}</TableCell>
                        <TableCell className="text-sm font-medium">{d.title}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{d.valid_from ?? "—"}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{d.valid_to ?? "—"}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={cn("text-xs", d.computedStatus === "expired" ? "bg-destructive/10 text-destructive" : d.computedStatus === "expiring_soon" ? "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400" : DOC_STATUS_COLORS[d.status] ?? "")}>
                            {d.computedStatus === "expiring_soon" ? t("subcontractors.detail.expiringSoonBadge") : t(`subcontractors.docStatus.${d.status}`, { defaultValue: d.status })}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => setDeletingDoc(d)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}

              {/* Add doc form */}
              <div className="border border-border rounded-lg p-3 space-y-3">
                <p className="text-xs font-medium text-muted-foreground">{t("subcontractors.detail.addDoc")}</p>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2 items-end">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">{t("subcontractors.detail.docType")}</label>
                    <Select value={newDoc.doc_type} onValueChange={v => setNewDoc(d => ({ ...d, doc_type: v }))}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {SUB_DOC_TYPES.map(dt => <SelectItem key={dt.value} value={dt.value}>{dt.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">{t("subcontractors.detail.docTitle")}</label>
                    <Input className="h-8 text-xs" value={newDoc.title} onChange={e => setNewDoc(d => ({ ...d, title: e.target.value }))} placeholder="Ex: Seguro RC 2025" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">{t("subcontractors.detail.validFrom")}</label>
                    <Input type="date" className="h-8 text-xs" value={newDoc.valid_from} onChange={e => setNewDoc(d => ({ ...d, valid_from: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">{t("subcontractors.detail.validTo")}</label>
                    <Input type="date" className="h-8 text-xs" value={newDoc.valid_to} onChange={e => setNewDoc(d => ({ ...d, valid_to: e.target.value }))} />
                  </div>
                  <Button size="sm" className="h-8 gap-1" onClick={handleAddDoc} disabled={addingDoc || !newDoc.title.trim()}>
                    <Plus className="h-3 w-3" /> {t("subcontractors.detail.addDocBtn")}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Materials (PAME) - read-only */}
        <TabsContent value="materials">
          <SubMaterialsSection projectId={activeProject.id} subId={sub.id} supplierId={sub.supplier_id} />
        </TabsContent>

        {/* Activities */}
        <TabsContent value="activities">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-muted-foreground" />
                {t("subcontractors.detail.linkedActivities")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {activities.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">{t("common.noData")}</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40">
                      <TableHead className="text-xs">{t("common.description")}</TableHead>
                      <TableHead className="text-xs">{t("subcontractors.detail.zone")}</TableHead>
                      <TableHead className="text-xs">{t("common.status")}</TableHead>
                      <TableHead className="text-xs">{t("subcontractors.detail.progress")}</TableHead>
                      <TableHead className="text-xs">{t("subcontractors.detail.plannedDates")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activities.map((a: any) => (
                      <TableRow key={a.id} className="cursor-pointer hover:bg-muted/20" onClick={() => navigate(`/planning/activities/${a.id}`)}>
                        <TableCell className="text-sm font-medium">{a.description}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{a.zone ?? "—"}</TableCell>
                        <TableCell><Badge variant="secondary" className="text-xs">{a.status}</Badge></TableCell>
                        <TableCell className="text-sm">{a.progress_pct}%</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {a.planned_start ?? "?"} → {a.planned_end ?? "?"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Work Items */}
        <TabsContent value="workitems">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-muted-foreground" />
                {t("subcontractors.detail.linkedWorkItems")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {workItems.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">{t("common.noData")}</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40">
                      <TableHead className="text-xs">{t("common.description")}</TableHead>
                      <TableHead className="text-xs">{t("common.status")}</TableHead>
                      <TableHead className="text-xs">{t("common.date")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {workItems.map((wi: any) => (
                      <TableRow key={wi.id} className="cursor-pointer hover:bg-muted/20" onClick={() => navigate(`/work-items/${wi.id}`)}>
                        <TableCell className="text-sm font-medium">{wi.description ?? wi.title ?? "—"}</TableCell>
                        <TableCell><Badge variant="secondary" className="text-xs">{wi.status}</Badge></TableCell>
                        <TableCell className="text-sm text-muted-foreground">{new Date(wi.created_at).toLocaleDateString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Non-Conformities */}
        <TabsContent value="ncs">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-muted-foreground" />
                {t("subcontractors.detail.linkedNCs")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {ncs.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">{t("common.noData")}</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40">
                      <TableHead className="text-xs">{t("subcontractors.detail.ncCode")}</TableHead>
                      <TableHead className="text-xs">{t("common.description")}</TableHead>
                      <TableHead className="text-xs">{t("subcontractors.detail.severity")}</TableHead>
                      <TableHead className="text-xs">{t("common.status")}</TableHead>
                      <TableHead className="text-xs">{t("subcontractors.detail.dueDate")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ncs.map((nc: any) => (
                      <TableRow key={nc.id} className="cursor-pointer hover:bg-muted/20" onClick={() => navigate(`/non-conformities/${nc.id}`)}>
                        <TableCell className="text-sm font-medium">{nc.code ?? "—"}</TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{nc.title ?? nc.description}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={cn("text-xs", nc.severity === "critical" ? "bg-destructive/10 text-destructive" : nc.severity === "major" ? "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400" : "")}>
                            {nc.severity}
                          </Badge>
                        </TableCell>
                        <TableCell><Badge variant="secondary" className="text-xs">{nc.status}</Badge></TableCell>
                        <TableCell className="text-sm text-muted-foreground">{nc.due_date ?? "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tests */}
        <TabsContent value="tests">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <FlaskConical className="h-4 w-4 text-muted-foreground" />
                {t("subcontractors.detail.linkedTests")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {tests.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">{t("common.noData")}</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40">
                      <TableHead className="text-xs">{t("subcontractors.detail.testCode")}</TableHead>
                      <TableHead className="text-xs">{t("common.status")}</TableHead>
                      <TableHead className="text-xs">{t("subcontractors.detail.testDate")}</TableHead>
                      <TableHead className="text-xs">{t("subcontractors.detail.testResult")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tests.map((tr: any) => (
                      <TableRow key={tr.id}>
                        <TableCell className="text-sm font-medium">{tr.code ?? "—"}</TableCell>
                        <TableCell><Badge variant="secondary" className="text-xs">{tr.status}</Badge></TableCell>
                        <TableCell className="text-sm text-muted-foreground">{tr.date ? new Date(tr.date).toLocaleDateString() : "—"}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{tr.pass_fail ?? "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Audit */}
        <TabsContent value="audit">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <History className="h-4 w-4 text-muted-foreground" />
                {t("subcontractors.detail.auditHistory")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {auditLogs.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">{t("common.noData")}</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40">
                      <TableHead className="text-xs">{t("audit.table.timestamp")}</TableHead>
                      <TableHead className="text-xs">{t("audit.table.action")}</TableHead>
                      <TableHead className="text-xs">{t("audit.table.description")}</TableHead>
                      <TableHead className="text-xs">{t("audit.table.entity")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {auditLogs.map((log: any) => (
                      <TableRow key={log.id}>
                        <TableCell className="text-xs text-muted-foreground">{new Date(log.created_at).toLocaleString()}</TableCell>
                        <TableCell><Badge variant="outline" className="text-[10px]">{log.action}</Badge></TableCell>
                        <TableCell className="text-xs">{log.description ?? "—"}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{log.entity}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Delete doc dialog */}
      <AlertDialog open={!!deletingDoc} onOpenChange={v => { if (!v) setDeletingDoc(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("subcontractors.detail.deleteDocTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("subcontractors.detail.deleteDocDesc", { name: deletingDoc?.title ?? "" })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteDoc} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}
