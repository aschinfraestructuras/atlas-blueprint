import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, Construction, FlaskConical, AlertTriangle, Paperclip,
  Pencil, Calendar, MapPin,
} from "lucide-react";
import { workItemService, formatPk, type WorkItem } from "@/lib/services/workItemService";
import { WorkItemFormDialog } from "@/components/work-items/WorkItemFormDialog";
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

const STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  planned:     { label: "Previsto",    variant: "outline"     },
  in_progress: { label: "Em Execução", variant: "default"     },
  completed:   { label: "Concluído",   variant: "secondary"   },
  cancelled:   { label: "Cancelado",   variant: "destructive" },
};

function StatusBadge({ status }: { status: string }) {
  const meta = STATUS_MAP[status] ?? { label: status, variant: "outline" as const };
  return <Badge variant={meta.variant} className="text-xs">{meta.label}</Badge>;
}

// ─── NC status colors ─────────────────────────────────────────────────────────

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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function WorkItemDetailPage() {
  const { id }            = useParams<{ id: string }>();
  const navigate          = useNavigate();
  const { activeProject } = useProject();

  const [item,      setItem]      = useState<WorkItem | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [editOpen,  setEditOpen]  = useState(false);
  const [tests,     setTests]     = useState<any[]>([]);
  const [ncs,       setNcs]       = useState<any[]>([]);
  const [subLoading,setSubLoading]= useState(true);

  // ── Load work item ─────────────────────────────────────────────────────────
  async function loadItem() {
    if (!id) return;
    setLoading(true);
    try {
      const data = await workItemService.getById(id);
      setItem(data);
    } catch {
      toast({ title: "Erro", description: "Work item não encontrado", variant: "destructive" });
      navigate("/work-items");
    } finally {
      setLoading(false);
    }
  }

  // ── Load related tests + NCs ───────────────────────────────────────────────
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
              Work Item
            </p>
            <h1 className="text-xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
              <Construction className="h-5 w-5 text-muted-foreground" />
              {item.sector}
            </h1>
            <div className="flex items-center gap-2 mt-1.5">
              <StatusBadge status={item.status} />
              <span className="text-xs text-muted-foreground">{item.disciplina}</span>
            </div>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => setEditOpen(true)} className="gap-2 flex-shrink-0">
          <Pencil className="h-3.5 w-3.5" /> Editar
        </Button>
      </div>

      {/* ── Detail card ──────────────────────────────────────────────── */}
      <Card className="shadow-card">
        <CardHeader className="pb-2 pt-5 px-5">
          <CardTitle className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
            Informação Geral
          </CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-5 grid grid-cols-1 md:grid-cols-2 gap-x-8">
          <div>
            <InfoRow label="Sector"     value={item.sector} />
            <InfoRow label="Disciplina" value={item.disciplina} />
            <InfoRow label="Obra"       value={item.obra} />
            <InfoRow label="Lote"       value={item.lote} />
          </div>
          <div>
            <InfoRow label="Elemento" value={item.elemento} />
            <InfoRow label="Parte"    value={item.parte} />
            <InfoRow
              label="PK"
              value={
                <span className="font-mono text-xs">
                  {formatPk(item.pk_inicio, item.pk_fim)}
                </span>
              }
            />
            <InfoRow
              label="Criado em"
              value={new Date(item.created_at).toLocaleDateString("pt-PT", {
                day: "2-digit", month: "short", year: "numeric",
              })}
            />
          </div>
        </CardContent>
      </Card>

      {/* ── Tabs: Tests / NCs / Attachments ─────────────────────────── */}
      <Tabs defaultValue="tests">
        <TabsList>
          <TabsTrigger value="tests" className="gap-1.5">
            <FlaskConical className="h-3.5 w-3.5" />
            Ensaios
            {tests.length > 0 && (
              <span className="ml-1 rounded-full bg-primary/10 px-1.5 py-px text-[10px] font-bold text-primary">
                {tests.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="ncs" className="gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5" />
            Não Conformidades
            {ncs.length > 0 && (
              <span className="ml-1 rounded-full bg-destructive/10 px-1.5 py-px text-[10px] font-bold text-destructive">
                {ncs.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="attachments" className="gap-1.5">
            <Paperclip className="h-3.5 w-3.5" />
            Anexos
          </TabsTrigger>
        </TabsList>

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
                  <p className="text-sm">Nenhum ensaio associado</p>
                </div>
              ) : (
                <ul className="divide-y divide-border">
                  {tests.map((t) => (
                    <li key={t.id} className="flex items-center gap-3 px-5 py-3">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full flex-shrink-0"
                        style={{ background: `${TEST_STATUS_COLORS[t.status] ?? "#888"}18` }}>
                        <FlaskConical className="h-3.5 w-3.5"
                          style={{ color: TEST_STATUS_COLORS[t.status] ?? "#888" }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {t.tests_catalog?.name ?? "Ensaio"}{" "}
                          <span className="text-muted-foreground font-normal">({t.tests_catalog?.code ?? "—"})</span>
                        </p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                          <Calendar className="h-3 w-3" />
                          {new Date(t.date).toLocaleDateString("pt-PT")}
                          {t.sample_ref && <><span>·</span><span>Ref: {t.sample_ref}</span></>}
                          {t.location   && <><span>·</span><MapPin className="h-3 w-3" /><span>{t.location}</span></>}
                        </div>
                      </div>
                      <Badge
                        variant={
                          t.status === "pass"        ? "secondary"   :
                          t.status === "fail"        ? "destructive" :
                          t.status === "inconclusive"? "outline"     : "outline"
                        }
                        className="text-xs"
                      >
                        {t.status}
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
                  <p className="text-sm">Nenhuma não conformidade associada</p>
                </div>
              ) : (
                <ul className="divide-y divide-border">
                  {ncs.map((nc) => (
                    <li key={nc.id} className="flex items-start gap-3 px-5 py-3">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full flex-shrink-0 mt-0.5"
                        style={{ background: `${NC_STATUS_COLORS[nc.status] ?? "#888"}18` }}>
                        <AlertTriangle className="h-3.5 w-3.5"
                          style={{ color: NC_STATUS_COLORS[nc.status] ?? "#888" }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium leading-snug line-clamp-2">
                          {nc.description}
                        </p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          {nc.reference && (
                            <span className="text-[10px] font-mono text-muted-foreground">#{nc.reference}</span>
                          )}
                          {nc.due_date && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(nc.due_date).toLocaleDateString("pt-PT")}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <Badge
                          variant={nc.severity === "critical" || nc.severity === "high" ? "destructive" : "outline"}
                          className="text-[10px]"
                        >
                          {nc.severity}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground capitalize">{nc.status}</span>
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
