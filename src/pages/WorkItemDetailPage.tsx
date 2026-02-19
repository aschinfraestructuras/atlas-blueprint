import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft, Construction, FlaskConical, AlertTriangle, Paperclip,
  Pencil, Calendar, MapPin, ClipboardCheck, Plus, Eye,
} from "lucide-react";
import { workItemService, formatPk, type WorkItem } from "@/lib/services/workItemService";
import { ppiService, type PpiInstanceStatus } from "@/lib/services/ppiService";
import { WorkItemFormDialog } from "@/components/work-items/WorkItemFormDialog";
import { PPIInstanceFormDialog } from "@/components/ppi/PPIInstanceFormDialog";
import { PPIStatusBadge } from "@/components/ppi/PPIStatusBadge";
import { AttachmentsPanel } from "@/components/attachments/AttachmentsPanel";
import { useProject } from "@/contexts/ProjectContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

// ─── Status badge ─────────────────────────────────────────────────────────────

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  planned:     "outline",
  in_progress: "default",
  hold:        "outline",
  completed:   "secondary",
  approved:    "secondary",
  archived:    "outline",
  cancelled:   "destructive",
};

function StatusBadge({ status }: { status: string }) {
  const { t } = useTranslation();
  return (
    <Badge variant={STATUS_VARIANT[status] ?? "outline"} className="text-xs">
      {t(`workItems.status.${status}`, { defaultValue: status })}
    </Badge>
  );
}

// ─── NC / Test status colors ──────────────────────────────────────────────────

const NC_STATUS_COLORS: Record<string, string> = {
  open:        "hsl(2, 60%, 44%)",
  in_progress: "hsl(33, 75%, 38%)",
  closed:      "hsl(158, 45%, 32%)",
};

const TEST_STATUS_COLORS: Record<string, string> = {
  pending:      "hsl(215, 15%, 65%)",
  pass:         "hsl(158, 45%, 32%)",
  fail:         "hsl(2, 60%, 44%)",
  inconclusive: "hsl(33, 75%, 38%)",
};

// ─── Info row ─────────────────────────────────────────────────────────────────

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 py-2 border-b border-border/50 last:border-0">
      <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground w-28 flex-shrink-0 mt-0.5">
        {label}
      </span>
      <span className="text-sm text-foreground">{value || "—"}</span>
    </div>
  );
}

// ─── PPI list for a work item ─────────────────────────────────────────────────

type PpiRow = {
  id: string;
  code: string;
  status: PpiInstanceStatus;
  template_disciplina: string | null;
  template_code: string | null;
  updated_at: string;
};

function WorkItemPPITab({
  workItemId,
  projectId,
}: {
  workItemId: string;
  projectId: string;
}) {
  const { t }      = useTranslation();
  const navigate   = useNavigate();
  const [ppiList,  setPpiList]  = useState<PpiRow[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [createOpen, setCreateOpen] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const rows = await ppiService.listInstances(projectId, { work_item_id: workItemId });
      setPpiList(rows as PpiRow[]);
    } catch {
      // non-blocking
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [workItemId, projectId]);

  return (
    <>
      <Card className="shadow-card">
        <CardHeader className="pb-3 pt-4 px-5 flex flex-row items-center justify-between">
          <CardTitle className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
            {t("ppi.instances.title")}
            {ppiList.length > 0 && (
              <span className="ml-2 rounded-full bg-primary/10 px-1.5 py-px text-[10px] font-bold text-primary">
                {ppiList.length}
              </span>
            )}
          </CardTitle>
          <Button size="sm" variant="outline" className="gap-1.5 h-7 text-xs" onClick={() => setCreateOpen(true)}>
            <Plus className="h-3 w-3" />
            {t("workItems.detail.ppiTab.createPPI")}
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-5 space-y-2">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full rounded" />)}
            </div>
          ) : ppiList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 gap-2 text-muted-foreground">
              <ClipboardCheck className="h-6 w-6 opacity-40" />
              <p className="text-sm">{t("workItems.detail.ppiTab.empty")}</p>
              <Button
                size="sm" variant="outline" className="gap-1.5 mt-1 text-xs"
                onClick={() => setCreateOpen(true)}
              >
                <Plus className="h-3 w-3" />
                {t("workItems.detail.ppiTab.createPPI")}
              </Button>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {ppiList.map((ppi) => (
                <li
                  key={ppi.id}
                  className="flex items-center gap-3 px-5 py-3 hover:bg-muted/20 cursor-pointer group"
                  onClick={() => navigate(`/ppi/${ppi.id}`)}
                >
                  <ClipboardCheck className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-mono font-semibold text-foreground">{ppi.code}</p>
                    {ppi.template_disciplina && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {t(`ppi.disciplinas.${ppi.template_disciplina}`, { defaultValue: ppi.template_disciplina })}
                        {ppi.template_code && ` · ${ppi.template_code}`}
                      </p>
                    )}
                  </div>
                  <PPIStatusBadge status={ppi.status} />
                  <Button
                    variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                    onClick={(e) => { e.stopPropagation(); navigate(`/ppi/${ppi.id}`); }}
                    title={t("common.view")}
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <PPIInstanceFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        preselectedWorkItemId={workItemId}
        onSuccess={(id) => { load(); navigate(`/ppi/${id}`); }}
      />
    </>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function WorkItemDetailPage() {
  const { t }             = useTranslation();
  const { id }            = useParams<{ id: string }>();
  const navigate          = useNavigate();
  const { activeProject } = useProject();

  const [item,       setItem]       = useState<WorkItem | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [editOpen,   setEditOpen]   = useState(false);
  const [tests,      setTests]      = useState<any[]>([]);
  const [ncs,        setNcs]        = useState<any[]>([]);
  const [subLoading, setSubLoading] = useState(true);

  async function loadItem() {
    if (!id) return;
    setLoading(true);
    try {
      const data = await workItemService.getById(id);
      setItem(data);
    } catch {
      toast({ title: t("workItems.detail.loadError"), variant: "destructive" });
      navigate("/work-items");
    } finally {
      setLoading(false);
    }
  }

  async function loadRelated() {
    if (!id) return;
    setSubLoading(true);
    try {
      const [{ data: testData }, { data: ncData }] = await Promise.all([
        supabase
          .from("test_results")
          .select("*, tests_catalog(name, code)")
          .eq("work_item_id", id)
          .order("created_at", { ascending: false }),
        supabase
          .from("non_conformities")
          .select("*")
          .eq("work_item_id", id)
          .order("created_at", { ascending: false }),
      ]);
      setTests(testData ?? []);
      setNcs(ncData ?? []);
    } catch {
      // non-blocking
    } finally {
      setSubLoading(false);
    }
  }

  useEffect(() => {
    loadItem();
    loadRelated();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (loading) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto animate-fade-in">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }

  if (!item) return null;

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-fade-in">
      {/* ── Back + Header ────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/work-items")} className="mt-0.5">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground mb-1">
              {t("workItems.detail.breadcrumb")}
            </p>
            <h1 className="text-xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
              <Construction className="h-5 w-5 text-muted-foreground" />
              {item.sector}
            </h1>
            <div className="flex items-center gap-2 mt-1.5">
              <StatusBadge status={item.status} />
              <span className="text-xs text-muted-foreground">
                {t(`workItems.disciplines.${item.disciplina}`, { defaultValue: item.disciplina })}
              </span>
            </div>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => setEditOpen(true)} className="gap-2 flex-shrink-0">
          <Pencil className="h-3.5 w-3.5" /> {t("workItems.detail.edit")}
        </Button>
      </div>

      {/* ── Detail card ──────────────────────────────────────────────── */}
      <Card className="shadow-card">
        <CardHeader className="pb-2 pt-5 px-5">
          <CardTitle className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
            {t("workItems.detail.generalInfo")}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-5 grid grid-cols-1 md:grid-cols-2 gap-x-8">
          <div>
            <InfoRow label={t("workItems.detail.sector")}     value={item.sector} />
            <InfoRow label={t("workItems.detail.discipline")} value={t(`workItems.disciplines.${item.disciplina}`, { defaultValue: item.disciplina })} />
            <InfoRow label={t("workItems.detail.obra")}       value={item.obra} />
            <InfoRow label={t("workItems.detail.lote")}       value={item.lote} />
          </div>
          <div>
            <InfoRow label={t("workItems.detail.element")} value={item.elemento} />
            <InfoRow label={t("workItems.detail.parte")}   value={item.parte} />
            <InfoRow
              label={t("workItems.detail.pk")}
              value={
                <span className="font-mono text-xs">
                  {formatPk(item.pk_inicio, item.pk_fim)}
                </span>
              }
            />
            <InfoRow
              label={t("workItems.detail.createdAt")}
              value={new Date(item.created_at).toLocaleDateString(undefined, {
                day: "2-digit", month: "short", year: "numeric",
              })}
            />
          </div>
        </CardContent>
      </Card>

      {/* ── Tabs: Tests / NCs / PPI / Attachments ────────────────────── */}
      <Tabs defaultValue="ppi">
        <TabsList>
          {/* PPI tab — first so users naturally find it */}
          <TabsTrigger value="ppi" className="gap-1.5">
            <ClipboardCheck className="h-3.5 w-3.5" />
            {t("workItems.detail.tabs.ppi")}
          </TabsTrigger>
          <TabsTrigger value="tests" className="gap-1.5">
            <FlaskConical className="h-3.5 w-3.5" />
            {t("workItems.detail.tabs.tests")}
            {tests.length > 0 && (
              <span className="ml-1 rounded-full bg-primary/10 px-1.5 py-px text-[10px] font-bold text-primary">
                {tests.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="ncs" className="gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5" />
            {t("workItems.detail.tabs.ncs")}
            {ncs.length > 0 && (
              <span className="ml-1 rounded-full bg-destructive/10 px-1.5 py-px text-[10px] font-bold text-destructive">
                {ncs.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="attachments" className="gap-1.5">
            <Paperclip className="h-3.5 w-3.5" />
            {t("workItems.detail.tabs.attachments")}
          </TabsTrigger>
        </TabsList>

        {/* PPI tab */}
        <TabsContent value="ppi" className="mt-4">
          <WorkItemPPITab workItemId={item.id} projectId={activeProject?.id ?? ""} />
        </TabsContent>

        {/* Tests tab */}
        <TabsContent value="tests" className="mt-4">
          <Card className="shadow-card">
            <CardContent className="p-0">
              {subLoading ? (
                <div className="p-5 space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full rounded" />)}
                </div>
              ) : tests.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 gap-2 text-muted-foreground">
                  <FlaskConical className="h-6 w-6 opacity-40" />
                  <p className="text-sm">{t("workItems.detail.emptyTests")}</p>
                </div>
              ) : (
                <ul className="divide-y divide-border">
                  {tests.map((tr) => (
                    <li key={tr.id} className="flex items-center gap-3 px-5 py-3">
                      <div
                        className="flex h-7 w-7 items-center justify-center rounded-full flex-shrink-0"
                        style={{ background: `${TEST_STATUS_COLORS[tr.status] ?? "#888"}18` }}
                      >
                        <FlaskConical
                          className="h-3.5 w-3.5"
                          style={{ color: TEST_STATUS_COLORS[tr.status] ?? "#888" }}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {tr.tests_catalog?.name ?? t("tests.unknownTest")}{" "}
                          <span className="text-muted-foreground font-normal">({tr.tests_catalog?.code ?? "—"})</span>
                        </p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                          <Calendar className="h-3 w-3" />
                          {new Date(tr.date).toLocaleDateString()}
                          {tr.sample_ref && <><span>·</span><span>Ref: {tr.sample_ref}</span></>}
                          {tr.location   && <><span>·</span><MapPin className="h-3 w-3" /><span>{tr.location}</span></>}
                        </div>
                      </div>
                      <Badge
                        variant={
                          tr.status === "pass"         ? "secondary"   :
                          tr.status === "fail"         ? "destructive" : "outline"
                        }
                        className="text-xs"
                      >
                        {t(`tests.status.${tr.status}`, { defaultValue: tr.status })}
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* NCs tab */}
        <TabsContent value="ncs" className="mt-4">
          <Card className="shadow-card">
            <CardContent className="p-0">
              {subLoading ? (
                <div className="p-5 space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full rounded" />)}
                </div>
              ) : ncs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 gap-2 text-muted-foreground">
                  <AlertTriangle className="h-6 w-6 opacity-40" />
                  <p className="text-sm">{t("workItems.detail.emptyNcs")}</p>
                </div>
              ) : (
                <ul className="divide-y divide-border">
                  {ncs.map((nc) => (
                    <li key={nc.id} className="flex items-start gap-3 px-5 py-3">
                      <div
                        className="flex h-7 w-7 items-center justify-center rounded-full flex-shrink-0 mt-0.5"
                        style={{ background: `${NC_STATUS_COLORS[nc.status] ?? "#888"}18` }}
                      >
                        <AlertTriangle
                          className="h-3.5 w-3.5"
                          style={{ color: NC_STATUS_COLORS[nc.status] ?? "#888" }}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium leading-snug line-clamp-2">{nc.description}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          {nc.reference && (
                            <span className="text-[10px] font-mono text-muted-foreground">#{nc.reference}</span>
                          )}
                          {nc.due_date && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(nc.due_date).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <Badge
                          variant={nc.severity === "critical" || nc.severity === "high" ? "destructive" : "outline"}
                          className="text-[10px]"
                        >
                          {t(`nc.severity.${nc.severity}`, { defaultValue: nc.severity })}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">
                          {t(`nc.status.${nc.status}`, { defaultValue: nc.status })}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Attachments tab */}
        <TabsContent value="attachments" className="mt-4">
          <AttachmentsPanel
            entityType="work_items"
            entityId={item.id}
            projectId={activeProject?.id ?? ""}
          />
        </TabsContent>
      </Tabs>

      {/* ── Edit dialog ──────────────────────────────────────────────── */}
      <WorkItemFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        item={item}
        onSuccess={() => { loadItem(); }}
      />
    </div>
  );
}
