import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useProject } from "@/contexts/ProjectContext";
import { useProjectRole } from "@/hooks/useProjectRole";
import {
  materialService,
  type Material,
  type MaterialDocument,
  type MaterialDetailMetrics,
  type WorkItemMaterial,
} from "@/lib/services/materialService";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Package, FileText, Truck, FlaskConical, AlertTriangle, History, Construction, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { NoProjectBanner } from "@/components/NoProjectBanner";
import { MaterialFormDialog } from "@/components/materials/MaterialFormDialog";
import { LinkedDocumentsPanel } from "@/components/documents/LinkedDocumentsPanel";
import { ReportExportMenu } from "@/components/reports/ReportExportMenu";
import { cn } from "@/lib/utils";

const STATUS_COLORS: Record<string, string> = {
  active: "bg-primary/15 text-primary",
  discontinued: "bg-accent text-accent-foreground",
  archived: "bg-muted text-muted-foreground",
};

export default function MaterialDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { activeProject } = useProject();
  const { canEdit, canCreate } = useProjectRole();

  const [material, setMaterial] = useState<Material | null>(null);
  const [metrics, setMetrics] = useState<MaterialDetailMetrics | null>(null);
  const [docs, setDocs] = useState<MaterialDocument[]>([]);
  const [supplierLinks, setSupplierLinks] = useState<any[]>([]);
  const [ncs, setNcs] = useState<any[]>([]);
  const [tests, setTests] = useState<any[]>([]);
  const [workItemLinks, setWorkItemLinks] = useState<WorkItemMaterial[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);

  const fetchAll = useCallback(async () => {
    if (!id || !activeProject) return;
    setLoading(true);
    try {
      const [mat, met, d, sl, wl] = await Promise.all([
        materialService.getById(id),
        materialService.getDetailMetrics(id),
        materialService.getDocuments(id),
        materialService.getSupplierLinks(id),
        materialService.getWorkItemLinks(id),
      ]);
      setMaterial(mat);
      setMetrics(met);
      setDocs(d);
      setSupplierLinks(sl);
      setWorkItemLinks(wl);

      const { data: ncData } = await (supabase
        .from("non_conformities") as any)
        .select("id, code, title, severity, status, detected_at")
        .eq("material_id", id)
        .order("detected_at", { ascending: false });
      setNcs(ncData ?? []);

      const { data: trData } = await (supabase
        .from("test_results") as any)
        .select("id, code, date, status, pass_fail, sample_ref")
        .eq("material_id", id)
        .order("date", { ascending: false });
      setTests(trData ?? []);

      const { data: logData } = await supabase
        .from("audit_log")
        .select("id, action, diff, created_at, description")
        .eq("entity", "materials")
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
      <div className="grid grid-cols-4 gap-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}</div>
      <Skeleton className="h-64" />
    </div>
  );

  if (!material) return <div className="text-center py-12 text-muted-foreground">{t("common.noData")}</div>;

  const handleExportCsv = () => {
    const headers = [t("materials.table.code"), t("common.name"), t("materials.form.category"), t("materials.form.specification"), t("materials.form.unit"), t("common.status")];
    const row = [material.code, material.name, material.category, material.specification ?? "", material.unit ?? "", material.status];
    const csv = [headers.join(";"), row.join(";")].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `MAT_${activeProject.code}_${material.code}.csv`; a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/materials")} className="h-8 w-8">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-muted-foreground" />
            <h1 className="text-xl font-bold text-foreground truncate">{material.name}</h1>
            <Badge variant="secondary" className={cn("text-xs", STATUS_COLORS[material.status] ?? "")}>{t(`materials.status.${material.status}`)}</Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">{material.code} · {t(`materials.categories.${material.category}`, { defaultValue: material.category })}</p>
        </div>
        <div className="flex gap-2">
          <ReportExportMenu options={[{ label: "CSV", icon: "csv" as const, action: handleExportCsv }]} />
          {canEdit && (
            <Button size="sm" variant="outline" onClick={() => setEditOpen(true)}>{t("common.edit")}</Button>
          )}
        </div>
      </div>

      {/* Metrics */}
      {metrics && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {[
            { label: t("materials.detail.suppliersCount"), value: metrics.suppliers_count },
            { label: t("materials.detail.testsTotal"), value: metrics.tests_total },
            { label: t("materials.detail.testsNC"), value: metrics.tests_nonconform, warn: metrics.tests_nonconform > 0 },
            { label: t("materials.detail.ncOpen"), value: metrics.nc_open_count, warn: metrics.nc_open_count > 0 },
            { label: t("materials.detail.docsExpiring"), value: metrics.docs_expiring_30d, warn: metrics.docs_expiring_30d > 0 },
            { label: t("materials.detail.docsExpired"), value: metrics.docs_expired, warn: metrics.docs_expired > 0 },
            { label: t("materials.detail.workItems"), value: metrics.work_items_count },
          ].map((m, i) => (
            <Card key={i} className="border-0 bg-card shadow-card">
              <CardContent className="p-3 text-center">
                <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">{m.label}</p>
                <p className={cn("text-xl font-black tabular-nums mt-1", m.warn ? "text-destructive" : "text-foreground")}>{m.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="summary" className="space-y-4">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="summary">{t("materials.detail.tabs.summary")}</TabsTrigger>
          <TabsTrigger value="suppliers">{t("materials.detail.tabs.suppliers")}</TabsTrigger>
          <TabsTrigger value="documents">{t("materials.detail.tabs.documents")}</TabsTrigger>
          <TabsTrigger value="tests">{t("materials.detail.tabs.tests")}</TabsTrigger>
          <TabsTrigger value="ncs">{t("materials.detail.tabs.ncs")}</TabsTrigger>
          <TabsTrigger value="workItems">{t("materials.detail.tabs.workItems")}</TabsTrigger>
          <TabsTrigger value="audit">{t("materials.detail.tabs.audit")}</TabsTrigger>
        </TabsList>

        {/* Summary */}
        <TabsContent value="summary">
          <Card className="border-0 shadow-card">
            <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                [t("materials.form.category"), t(`materials.categories.${material.category}`, { defaultValue: material.category })],
                [t("materials.form.subcategory"), material.subcategory ?? "—"],
                [t("materials.form.specification"), material.specification ?? "—"],
                [t("materials.form.unit"), material.unit ?? "—"],
                [t("materials.form.normativeRefs"), material.normative_refs ?? "—"],
                [t("materials.form.acceptanceCriteria"), material.acceptance_criteria ?? "—"],
              ].map(([label, value], i) => (
                <div key={i}>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</p>
                  <p className="text-sm text-foreground mt-0.5 whitespace-pre-wrap">{value}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Suppliers */}
        <TabsContent value="suppliers">
          <Card className="border-0 shadow-card">
            <CardContent className="p-6">
              {supplierLinks.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">{t("materials.detail.noSuppliers")}</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("suppliers.table.code")}</TableHead>
                      <TableHead>{t("common.name")}</TableHead>
                      <TableHead>{t("common.status")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {supplierLinks.map(sl => {
                      const sup = sl.suppliers;
                      return (
                        <TableRow key={sl.id} className="cursor-pointer hover:bg-muted/30" onClick={() => navigate(`/suppliers/${sup?.id}`)}>
                          <TableCell className="font-mono text-xs">{sup?.code ?? "—"}</TableCell>
                          <TableCell className="text-sm font-medium">{sup?.name ?? "—"}</TableCell>
                          <TableCell><Badge variant="secondary" className="text-xs">{sup?.status ?? "—"}</Badge></TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Documents */}
        <TabsContent value="documents">
          <LinkedDocumentsPanel entityType="material" entityId={material.id} projectId={activeProject.id} />
        </TabsContent>

        {/* Tests */}
        <TabsContent value="tests">
          <Card className="border-0 shadow-card">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm">{t("materials.detail.tabs.tests")}</CardTitle>
              {canCreate && (
                <Button size="sm" variant="outline" className="gap-1.5" onClick={() => navigate("/tests")}>
                  <Plus className="h-3.5 w-3.5" />
                  {t("materials.detail.createTest")}
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {tests.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">{t("materials.detail.noTests")}</p>
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
                      <TableRow key={tr.id}>
                        <TableCell className="font-mono text-xs">{tr.code ?? "—"}</TableCell>
                        <TableCell className="text-sm">{new Date(tr.date).toLocaleDateString()}</TableCell>
                        <TableCell><Badge variant="secondary" className="text-xs">{t(`tests.status.${tr.status}`, { defaultValue: tr.status })}</Badge></TableCell>
                        <TableCell><Badge variant="secondary" className={cn("text-xs", tr.pass_fail === "fail" ? "bg-destructive/10 text-destructive" : "")}>{tr.pass_fail ?? "—"}</Badge></TableCell>
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
              <CardTitle className="text-sm">{t("materials.detail.tabs.ncs")}</CardTitle>
              {canCreate && (
                <Button size="sm" variant="outline" className="gap-1.5" onClick={() => navigate(`/non-conformities?material_id=${material.id}`)}>
                  <Plus className="h-3.5 w-3.5" />
                  {t("materials.detail.createNC")}
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {ncs.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">{t("materials.detail.noNCs")}</p>
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
                        <TableCell className="font-mono text-xs">{nc.code ?? "—"}</TableCell>
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

        {/* Work Items */}
        <TabsContent value="workItems">
          <Card className="border-0 shadow-card">
            <CardContent className="p-6">
              {workItemLinks.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">{t("materials.detail.noWorkItems")}</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("materials.detail.workItemId")}</TableHead>
                      <TableHead>{t("materials.detail.lotRef")}</TableHead>
                      <TableHead>{t("materials.detail.quantity")}</TableHead>
                      <TableHead>{t("materials.form.unit")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {workItemLinks.map(wl => (
                      <TableRow key={wl.id} className="cursor-pointer hover:bg-muted/30" onClick={() => navigate(`/work-items/${wl.work_item_id}`)}>
                        <TableCell className="font-mono text-xs">{wl.work_item_id.substring(0, 8)}…</TableCell>
                        <TableCell className="text-sm">{wl.lot_ref ?? "—"}</TableCell>
                        <TableCell className="text-sm tabular-nums">{wl.quantity != null ? wl.quantity : "—"}</TableCell>
                        <TableCell className="text-sm">{wl.unit ?? "—"}</TableCell>
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
          <Card className="border-0 shadow-card">
            <CardContent className="p-6">
              {auditLogs.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">{t("materials.detail.noAudit")}</p>
              ) : (
                <ul className="space-y-3">
                  {auditLogs.map(log => (
                    <li key={log.id} className="flex items-start gap-3 text-sm">
                      <History className="h-3.5 w-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <div>
                        <span className="font-medium text-foreground">{log.action}</span>
                        {log.description && <span className="text-muted-foreground ml-1">— {log.description}</span>}
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

      <MaterialFormDialog open={editOpen} onOpenChange={setEditOpen} material={material} onSuccess={fetchAll} />
    </div>
  );
}
