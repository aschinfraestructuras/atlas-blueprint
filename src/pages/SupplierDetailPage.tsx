import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useProject } from "@/contexts/ProjectContext";
import { useProjectRole } from "@/hooks/useProjectRole";
import {
  supplierService,
  type Supplier,
  type SupplierDocument,
  type SupplierMaterial,
  type SupplierDetailMetrics,
  type SupplierEvaluation,
} from "@/lib/services/supplierService";
import { exportSupplierPdf, buildSupplierDetailHtml } from "@/lib/services/supplierExportService";
import { useProjectLogo } from "@/hooks/useProjectLogo";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Truck, FileText, Package, FlaskConical, AlertTriangle, History, Plus, Trash2, Eye } from "lucide-react";
import { PdfPreviewDialog } from "@/components/ui/pdf-preview-dialog";
import { buildHtmlPreviewUrl, revokeHtmlPreviewUrl } from "@/lib/utils/htmlPreview";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { NoProjectBanner } from "@/components/NoProjectBanner";
import { SupplierFormDialog } from "@/components/suppliers/SupplierFormDialog";
import { AddMaterialDialog } from "@/components/suppliers/AddMaterialDialog";
import { LinkedDocumentsPanel } from "@/components/documents/LinkedDocumentsPanel";
import { ReportExportMenu } from "@/components/reports/ReportExportMenu";
import { toast } from "@/lib/utils/toast";
import { cn } from "@/lib/utils";

// Evaluation dialog component
interface EvalDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  evalForm: { quality: number; delivery: number; ncManagement: number; cooperation: number; notes: string };
  setEvalForm: React.Dispatch<React.SetStateAction<{ quality: number; delivery: number; ncManagement: number; cooperation: number; notes: string }>>;
  evalLoading: boolean;
  onSubmit: () => void;
  t: (k: string, opts?: any) => string;
}

function EvaluationDialog({ open, onOpenChange, evalForm, setEvalForm, evalLoading, onSubmit, t }: EvalDialogProps) {
  const score = Math.round(
    evalForm.quality * 0.35 +
    evalForm.delivery * 0.25 +
    evalForm.ncManagement * 0.25 +
    evalForm.cooperation * 0.15
  );
  const result = score < 60 ? "rejected" : score < 75 ? "conditional" : "approved";
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("suppliers.evaluations.new")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-5 py-2">
          {/* Quality 35% */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm">{t("suppliers.evaluations.criteria.quality")} <span className="text-muted-foreground">(35%)</span></Label>
              <span className="text-sm font-medium tabular-nums">{evalForm.quality}</span>
            </div>
            <Slider value={[evalForm.quality]} onValueChange={([v]) => setEvalForm(f => ({ ...f, quality: v }))} min={0} max={100} step={1} />
          </div>
          {/* Delivery 25% */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm">{t("suppliers.evaluations.criteria.delivery")} <span className="text-muted-foreground">(25%)</span></Label>
              <span className="text-sm font-medium tabular-nums">{evalForm.delivery}</span>
            </div>
            <Slider value={[evalForm.delivery]} onValueChange={([v]) => setEvalForm(f => ({ ...f, delivery: v }))} min={0} max={100} step={1} />
          </div>
          {/* NC Management 25% */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm">{t("suppliers.evaluations.criteria.ncManagement")} <span className="text-muted-foreground">(25%)</span></Label>
              <span className="text-sm font-medium tabular-nums">{evalForm.ncManagement}</span>
            </div>
            <Slider value={[evalForm.ncManagement]} onValueChange={([v]) => setEvalForm(f => ({ ...f, ncManagement: v }))} min={0} max={100} step={1} />
          </div>
          {/* Cooperation 15% */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm">{t("suppliers.evaluations.criteria.cooperation")} <span className="text-muted-foreground">(15%)</span></Label>
              <span className="text-sm font-medium tabular-nums">{evalForm.cooperation}</span>
            </div>
            <Slider value={[evalForm.cooperation]} onValueChange={([v]) => setEvalForm(f => ({ ...f, cooperation: v }))} min={0} max={100} step={1} />
          </div>
          {/* Notes */}
          <div className="space-y-2">
            <Label className="text-sm">{t("suppliers.evaluations.notes")}</Label>
            <Textarea value={evalForm.notes} onChange={e => setEvalForm(f => ({ ...f, notes: e.target.value }))} rows={2} placeholder={t("common.optional")} />
          </div>
          {/* Preview */}
          <div className="rounded-lg border border-border/50 p-4 bg-muted/30">
            <p className="text-sm text-muted-foreground mb-2">{t("suppliers.evaluations.preview")}</p>
            <div className="flex items-center gap-3">
              <span className="text-2xl font-bold tabular-nums">{score}/100</span>
              <Badge variant="secondary" className={cn(
                "text-xs",
                result === "approved" ? "bg-primary/15 text-primary" :
                result === "conditional" ? "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400" :
                "bg-destructive/10 text-destructive"
              )}>
                {t(`suppliers.evaluations.results.${result}`)}
              </Badge>
            </div>
            {result === "rejected" && (
              <p className="text-xs text-destructive mt-2">{t("suppliers.evaluations.ncWarning")}</p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t("common.cancel")}</Button>
          <Button onClick={onSubmit} disabled={evalLoading}>{evalLoading ? t("common.loading") : t("common.save")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const QUAL_COLORS: Record<string, string> = {
  pending: "bg-muted text-muted-foreground",
  approved: "bg-primary/15 text-primary",
  rejected: "bg-destructive/10 text-destructive",
};

const STATUS_COLORS: Record<string, string> = {
  active: "bg-primary/15 text-primary",
  suspended: "bg-accent text-accent-foreground",
  blocked: "bg-destructive/10 text-destructive",
  archived: "bg-muted text-muted-foreground",
};

export default function SupplierDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { activeProject } = useProject();
  const { canEdit, canCreate } = useProjectRole();
  const { logoBase64 } = useProjectLogo();

  useEffect(() => {
    if (!id || id === "undefined" || id.trim() === "") {
      toast({ title: t("common.recordNotFound", { defaultValue: "Registo não encontrado." }), variant: "destructive" });
      navigate("/suppliers", { replace: true });
    }
  }, [id, navigate, t]);

  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [metrics, setMetrics] = useState<SupplierDetailMetrics | null>(null);
  const [docs, setDocs] = useState<SupplierDocument[]>([]);
  const [materials, setMaterials] = useState<SupplierMaterial[]>([]);
  const [ncs, setNcs] = useState<any[]>([]);
  const [tests, setTests] = useState<any[]>([]);
  const [evals, setEvals] = useState<SupplierEvaluation[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [addMaterialOpen, setAddMaterialOpen] = useState(false);
  const [evalDialogOpen, setEvalDialogOpen] = useState(false);
  const [evalLoading, setEvalLoading] = useState(false);
  const [evalForm, setEvalForm] = useState({
    quality: 75,
    delivery: 75,
    ncManagement: 75,
    cooperation: 75,
    notes: "",
  });

  const fetchAll = useCallback(async () => {
    if (!id || !activeProject) return;
    setLoading(true);
    try {
      const [s, m, d, mat, ev] = await Promise.all([
        supplierService.getById(id),
        supplierService.getDetailMetrics(id),
        supplierService.getDocuments(id),
        supplierService.getMaterials(id),
        supplierService.getEvaluations(id),
      ]);
      setSupplier(s);
      setMetrics(m);
      setDocs(d);
      setMaterials(mat);
      setEvals(ev);

      const { data: ncData } = await supabase
        .from("non_conformities")
        .select("id, code, title, severity, status, detected_at")
        .eq("supplier_id", id)
        .order("detected_at", { ascending: false });
      setNcs(ncData ?? []);

      const { data: trData } = await supabase
        .from("test_results")
        .select("id, code, date, status, pass_fail, sample_ref")
        .eq("supplier_id", id)
        .order("date", { ascending: false });
      setTests(trData ?? []);

      const { data: logData } = await supabase
        .from("audit_log")
        .select("id, action, diff, created_at, description")
        .eq("entity", "suppliers")
        .eq("entity_id", id)
        .order("created_at", { ascending: false })
        .limit(50);
      setAuditLogs(logData ?? []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [id, activeProject]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  if (!activeProject) return <NoProjectBanner />;

  if (loading) return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <Skeleton className="h-8 w-48" />
      <div className="grid grid-cols-5 gap-4">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-24" />)}</div>
      <Skeleton className="h-64" />
    </div>
  );

  if (!supplier) return <div className="text-center py-12 text-muted-foreground">{t("common.noData")}</div>;

  const handleRemoveMaterial = async (matId: string) => {
    try {
      await supplierService.removeMaterial(matId);
      setMaterials(prev => prev.filter(m => m.id !== matId));
      toast({ title: t("common.delete") });
    } catch { toast({ title: t("suppliers.toast.error"), variant: "destructive" }); }
  };

  const buildPreviewData = () => ({
    supplier: supplier!,
    metrics,
    docs,
    materials,
    ncs: ncs.map(nc => ({ code: nc.code ?? "", title: nc.title ?? "", severity: nc.severity ?? "", status: nc.status ?? "" })),
    projectName: activeProject!.name,
    projectCode: activeProject!.code,
    t,
    logoBase64,
  });

  const handleExportPdf = () => exportSupplierPdf(buildPreviewData());

  const handlePreviewPdf = () => {
    if (!supplier || !activeProject) return;
    revokeHtmlPreviewUrl(previewUrl);
    const html = buildSupplierDetailHtml(buildPreviewData());
    const url = buildHtmlPreviewUrl(html);
    setPreviewUrl(url);
    setPreviewOpen(true);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/suppliers")} className="h-8 w-8">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-muted-foreground" />
            <h1 className="text-xl font-bold text-foreground truncate">{supplier.name}</h1>
            <Badge variant="secondary" className={cn("text-xs", STATUS_COLORS[supplier.status] ?? "")}>{t(`suppliers.status.${supplier.status}`)}</Badge>
            <Badge variant="secondary" className={cn("text-xs ml-1", QUAL_COLORS[supplier.qualification_status ?? supplier.approval_status] ?? "")}>{t(`suppliers.qualificationStatus.${supplier.qualification_status ?? supplier.approval_status}`)}</Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">{supplier.code} · {supplier.nif_cif ?? "—"}</p>
        </div>
        <div className="flex gap-2">
          <ReportExportMenu
            options={[
              { label: "PDF", icon: "pdf" as const, action: handleExportPdf },
            ]}
          />
          {canEdit && (
            <Button size="sm" variant="outline" onClick={() => setEditOpen(true)}>{t("common.edit")}</Button>
          )}
        </div>
      </div>

      {/* Metric Cards */}
      {metrics && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { label: t("suppliers.detail.openNCs"), value: metrics.open_nc_count, color: metrics.open_nc_count > 0 ? "text-destructive" : "text-foreground" },
            { label: t("suppliers.detail.testsTotal"), value: metrics.tests_total, color: "text-foreground" },
            { label: t("suppliers.detail.testsNC"), value: metrics.tests_nonconform, color: metrics.tests_nonconform > 0 ? "text-destructive" : "text-foreground" },
            { label: t("suppliers.detail.docsExpiring"), value: metrics.docs_expiring_30d, color: metrics.docs_expiring_30d > 0 ? "text-accent-foreground" : "text-foreground" },
            { label: t("suppliers.detail.docsExpired"), value: metrics.docs_expired, color: metrics.docs_expired > 0 ? "text-destructive" : "text-foreground" },
          ].map((m, i) => (
            <Card key={i} className="border-0 bg-card shadow-card">
              <CardContent className="p-4 text-center">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{m.label}</p>
                <p className={cn("text-2xl font-black tabular-nums mt-1", m.color)}>{m.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="summary" className="space-y-4">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="summary">{t("suppliers.detail.tabs.summary")}</TabsTrigger>
          <TabsTrigger value="documents">{t("suppliers.detail.tabs.documents")}</TabsTrigger>
          <TabsTrigger value="materials">{t("suppliers.detail.tabs.materials")}</TabsTrigger>
          <TabsTrigger value="tests">{t("suppliers.detail.tabs.tests")}</TabsTrigger>
          <TabsTrigger value="ncs">{t("suppliers.detail.tabs.ncs")}</TabsTrigger>
          <TabsTrigger value="evaluations">{t("suppliers.detail.tabs.evaluations", { defaultValue: "Avaliações" })}</TabsTrigger>
          <TabsTrigger value="audit">{t("suppliers.detail.tabs.audit")}</TabsTrigger>
        </TabsList>

        {/* Summary */}
        <TabsContent value="summary">
          <Card className="border-0 shadow-card">
            <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                [t("suppliers.form.category"), supplier.category ? t(`suppliers.categories.${supplier.category}`, { defaultValue: supplier.category }) : "—"],
                [t("suppliers.form.country"), supplier.country ?? "—"],
                [t("suppliers.form.address"), supplier.address ?? "—"],
                [t("suppliers.form.contactName"), supplier.contact_name ?? "—"],
                [t("suppliers.form.contactEmail"), supplier.contact_email ?? "—"],
                [t("suppliers.form.contactPhone"), supplier.contact_phone ?? "—"],
                [t("suppliers.form.notes"), supplier.notes ?? "—"],
                [t("suppliers.form.qualificationScore"), supplier.qualification_score != null ? `${supplier.qualification_score}/100` : "—"],
              ].map(([label, value], i) => (
                <div key={i}>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</p>
                  <p className="text-sm text-foreground mt-0.5">{value}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Documents */}
        <TabsContent value="documents">
          <LinkedDocumentsPanel entityType="supplier" entityId={supplier.id} projectId={activeProject.id} />
          {docs.length > 0 && (
            <Card className="border-0 shadow-card mt-4">
              <CardHeader className="pb-2"><CardTitle className="text-sm">{t("suppliers.detail.supplierDocs")}</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("suppliers.detail.docType")}</TableHead>
                      <TableHead>{t("suppliers.detail.validTo")}</TableHead>
                      <TableHead>{t("common.status")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {docs.map(d => (
                      <TableRow key={d.id}>
                        <TableCell className="text-sm">{t(`suppliers.docTypes.${d.doc_type}`, { defaultValue: d.doc_type })}</TableCell>
                        <TableCell className="text-sm">{d.valid_to ? new Date(d.valid_to).toLocaleDateString() : "—"}</TableCell>
                        <TableCell><Badge variant="secondary" className="text-xs">{d.status}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Materials */}
        <TabsContent value="materials">
          <Card className="border-0 shadow-card">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm">{t("suppliers.detail.tabs.materials")}</CardTitle>
              {canCreate && (
                <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setAddMaterialOpen(true)}>
                  <Plus className="h-3.5 w-3.5" />
                  {t("suppliers.detail.addMaterial", { defaultValue: "Adicionar Material" })}
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {materials.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">{t("suppliers.detail.noMaterials")}</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("suppliers.detail.materialName")}</TableHead>
                      <TableHead>{t("suppliers.detail.primary")}</TableHead>
                      <TableHead>{t("suppliers.detail.leadTime")}</TableHead>
                      <TableHead>{t("suppliers.detail.unitPrice")}</TableHead>
                      <TableHead className="w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {materials.map(m => (
                      <TableRow key={m.id}>
                        <TableCell className="text-sm font-medium">{m.material_name}</TableCell>
                        <TableCell>{m.is_primary ? "✓" : "—"}</TableCell>
                        <TableCell className="text-sm">{m.lead_time_days != null ? `${m.lead_time_days}d` : "—"}</TableCell>
                        <TableCell className="text-sm font-mono">{m.unit_price != null ? `${m.unit_price} ${m.currency}` : "—"}</TableCell>
                        <TableCell>
                          {canEdit && (
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleRemoveMaterial(m.id)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </TableCell>
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
          <Card className="border-0 shadow-card">
            <CardContent className="p-6">
              {tests.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">{t("suppliers.detail.noTests")}</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("tests.results.table.code")}</TableHead>
                      <TableHead>{t("common.date")}</TableHead>
                      <TableHead>{t("common.status")}</TableHead>
                      <TableHead>{t("tests.results.table.passFail")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tests.map(tr => (
                      <TableRow key={tr.id} className="cursor-pointer hover:bg-muted/30" onClick={() => navigate(`/tests`)}>
                        <TableCell className="text-sm font-mono">{tr.code ?? "—"}</TableCell>
                        <TableCell className="text-sm">{new Date(tr.date).toLocaleDateString()}</TableCell>
                        <TableCell><Badge variant="secondary" className="text-xs">{t(`tests.status.${tr.status}`, { defaultValue: tr.status })}</Badge></TableCell>
                        <TableCell><Badge variant="secondary" className={cn("text-xs", tr.pass_fail === "fail" ? "bg-destructive/10 text-destructive" : "")}>{tr.pass_fail ? t(`tests.results.form.passFailOptions.${tr.pass_fail}`, { defaultValue: tr.pass_fail }) : "—"}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* NCs */}
        <TabsContent value="ncs">
          <Card className="border-0 shadow-card">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm">{t("suppliers.detail.tabs.ncs")}</CardTitle>
              {canCreate && (
                <Button size="sm" variant="outline" className="gap-1.5" onClick={() => navigate(`/non-conformities?supplier_id=${supplier.id}`)}>
                  <Plus className="h-3.5 w-3.5" />
                  {t("suppliers.detail.createNC", { defaultValue: "Criar NC" })}
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {ncs.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">{t("suppliers.detail.noNCs")}</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("nc.table.code")}</TableHead>
                      <TableHead>{t("nc.table.title")}</TableHead>
                      <TableHead>{t("nc.table.severity")}</TableHead>
                      <TableHead>{t("common.status")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ncs.map(nc => (
                      <TableRow key={nc.id} className="cursor-pointer hover:bg-muted/30" onClick={() => navigate(`/non-conformities/${nc.id}`)}>
                        <TableCell className="text-sm font-mono">{nc.code ?? "—"}</TableCell>
                        <TableCell className="text-sm">{nc.title ?? "—"}</TableCell>
                        <TableCell><Badge variant="secondary" className="text-xs">{t(`nc.severity.${nc.severity}`, { defaultValue: nc.severity })}</Badge></TableCell>
                        <TableCell><Badge variant="secondary" className="text-xs">{t(`nc.status.${nc.status}`, { defaultValue: nc.status })}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Evaluations */}
        <TabsContent value="evaluations">
          <Card className="border-0 shadow-card">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm">{t("suppliers.evaluations.title")}</CardTitle>
              {canCreate && (
                <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setEvalDialogOpen(true)}>
                  <Plus className="h-3.5 w-3.5" />
                  {t("suppliers.evaluations.new")}
                </Button>
              )}
            </CardHeader>
            <CardContent className="p-6 pt-2">
              {evals.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">{t("common.noData")}</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("common.date")}</TableHead>
                      <TableHead>{t("suppliers.evaluations.score")}</TableHead>
                      <TableHead>{t("suppliers.evaluations.result")}</TableHead>
                      <TableHead>{t("suppliers.evaluations.notes")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {evals.map(ev => (
                      <TableRow key={ev.id}>
                        <TableCell className="text-sm">{new Date(ev.eval_date).toLocaleDateString()}</TableCell>
                        <TableCell className="text-sm font-medium">{ev.score != null ? `${ev.score}/100` : "—"}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={cn(
                            "text-xs",
                            ev.result === "approved" ? "bg-primary/15 text-primary" :
                            ev.result === "conditional" ? "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400" :
                            ev.result === "rejected" ? "bg-destructive/10 text-destructive" :
                            "bg-muted text-muted-foreground"
                          )}>
                            {t(`suppliers.evaluations.results.${ev.result}`, { defaultValue: ev.result })}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{ev.notes ?? "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
          
          {/* Evaluation Dialog */}
          {evalDialogOpen && (
            <EvaluationDialog
              open={evalDialogOpen}
              onOpenChange={setEvalDialogOpen}
              evalForm={evalForm}
              setEvalForm={setEvalForm}
              evalLoading={evalLoading}
              onSubmit={async () => {
                if (!activeProject || !supplier) return;
                setEvalLoading(true);
                // Calculate weighted score: Quality 35%, Delivery 25%, NC 25%, Cooperation 15%
                const score = Math.round(
                  evalForm.quality * 0.35 +
                  evalForm.delivery * 0.25 +
                  evalForm.ncManagement * 0.25 +
                  evalForm.cooperation * 0.15
                );
                let result = "approved";
                if (score < 60) result = "rejected";
                else if (score < 75) result = "conditional";
                
                try {
                  await supplierService.createEvaluation({
                    project_id: activeProject.id,
                    supplier_id: supplier.id,
                    eval_date: new Date().toISOString().split("T")[0],
                    criteria: {
                      quality: evalForm.quality,
                      delivery: evalForm.delivery,
                      ncManagement: evalForm.ncManagement,
                      cooperation: evalForm.cooperation,
                    },
                    score,
                    result,
                    notes: evalForm.notes || undefined,
                  });
                  
                  if (result === "rejected") {
                    toast({
                      title: t("suppliers.evaluations.ncWarningTitle"),
                      description: t("suppliers.evaluations.ncWarningDesc"),
                      variant: "destructive",
                    });
                  } else {
                    toast({ title: t("suppliers.evaluations.created") });
                  }
                  
                  setEvalDialogOpen(false);
                  setEvalForm({ quality: 75, delivery: 75, ncManagement: 75, cooperation: 75, notes: "" });
                  fetchAll();
                } catch (err) {
                  console.error(err);
                  toast({ title: t("suppliers.toast.error"), variant: "destructive" });
                } finally {
                  setEvalLoading(false);
                }
              }}
              t={t}
            />
          )}
        </TabsContent>

        {/* Audit */}
        <TabsContent value="audit">
          <Card className="border-0 shadow-card">
            <CardContent className="p-6">
              {auditLogs.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">{t("suppliers.detail.noAudit")}</p>
              ) : (
                <ul className="space-y-3">
                  {auditLogs.map(log => (
                    <li key={log.id} className="flex items-start gap-3 text-sm border-b border-border/50 pb-3 last:border-0">
                      <History className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground">{log.description ?? log.action}</p>
                        <p className="text-xs text-muted-foreground">{new Date(log.created_at).toLocaleString()}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <SupplierFormDialog open={editOpen} onOpenChange={setEditOpen} supplier={supplier} onSuccess={fetchAll} />
      <AddMaterialDialog open={addMaterialOpen} onOpenChange={setAddMaterialOpen} projectId={activeProject.id} supplierId={supplier.id} onSuccess={fetchAll} />
    </div>
  );
}
