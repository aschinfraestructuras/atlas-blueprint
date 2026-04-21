import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useProject } from "@/contexts/ProjectContext";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useProjectRole } from "@/hooks/useProjectRole";
import { NoProjectBanner } from "@/components/NoProjectBanner";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileCheck, Plus, ClipboardList, Send, CheckCircle2, Clock, Mail, Users } from "lucide-react";
import { toast } from "@/lib/utils/toast";
import { cn } from "@/lib/utils";

interface RdcRecord {
  id: string;
  rdc_code: string;
  doc_code: string;
  doc_revision: string;
  copy_number: number;
  recipient_name: string;
  recipient_entity: string;
  delivered_at: string;
  delivery_method: string;
  ack_ref: string | null;
  received_confirmed: boolean;
  notes: string | null;
  created_at: string;
  plan_title?: string;
}

interface NotifLog {
  id: string;
  entity_type: string;
  entity_code: string;
  subject: string;
  body: string | null;
  sent_at: string;
  created_at: string;
  pdf_attached: boolean;
  recipients: { id: string; email: string; name: string; sent_status: string; confirmed_at: string | null }[];
}

const db = supabase as any;

export default function ControlledDistributionPage() {
  const { t } = useTranslation();
  const { activeProject } = useProject();
  const { user } = useAuth();
  const { canCreate } = useProjectRole();

  const [records, setRecords] = useState<RdcRecord[]>([]);
  const [notifLogs, setNotifLogs] = useState<NotifLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    doc_code: "", doc_revision: "", copy_number: 1, recipient_name: "",
    recipient_entity: "", delivered_at: new Date().toISOString().slice(0, 10),
    delivery_method: "email", ack_ref: "", received_confirmed: false, notes: "",
  });

  // Buscar registos manuais via view
  const fetchRecords = useCallback(async () => {
    if (!activeProject) return;
    try {
      const { data } = await db
        .from("vw_rdc_distribuicao")
        .select("*")
        .eq("project_id", activeProject.id)
        .order("created_at", { ascending: false });
      setRecords((data ?? []) as RdcRecord[]);
    } catch { setRecords([]); }
  }, [activeProject]);

  // Buscar histórico automático de envios
  const fetchNotifLogs = useCallback(async () => {
    if (!activeProject) return;
    try {
      const { data: logs } = await db
        .from("notifications_log")
        .select("*")
        .eq("project_id", activeProject.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (!logs?.length) { setNotifLogs([]); return; }

      const logIds = logs.map((l: any) => l.id);
      const { data: recipients } = await db
        .from("notification_recipients")
        .select("*")
        .in("notification_id", logIds);

      const recipMap: Record<string, any[]> = {};
      (recipients ?? []).forEach((r: any) => {
        if (!recipMap[r.notification_id]) recipMap[r.notification_id] = [];
        recipMap[r.notification_id].push(r);
      });

      setNotifLogs(logs.map((l: any) => ({
        ...l,
        recipients: recipMap[l.id] ?? [],
      })));
    } catch { setNotifLogs([]); }
  }, [activeProject]);

  useEffect(() => {
    if (!activeProject) return;
    setLoading(true);
    Promise.allSettled([fetchRecords(), fetchNotifLogs()])
      .finally(() => setLoading(false));
  }, [fetchRecords, fetchNotifLogs, activeProject]);

  const handleCreate = async () => {
    if (!activeProject) return;
    try {
      // Procurar um plano correspondente ao doc_code para satisfazer FK NOT NULL
      const { data: plan } = await db
        .from("plans")
        .select("id")
        .eq("project_id", activeProject.id)
        .eq("code", form.doc_code)
        .maybeSingle();

      if (!plan) {
        toast({
          title: t("documents.rdc.noPlan", { defaultValue: "Plano não encontrado" }),
          description: t("documents.rdc.noPlanDesc", { defaultValue: "Introduza o código exacto de um plano registado." }),
          variant: "destructive",
        });
        return;
      }

      const { error } = await db.from("plan_controlled_copies").insert({
        project_id: activeProject.id,
        plan_id: plan.id,
        doc_code: form.doc_code,
        doc_revision: form.doc_revision,
        copy_number: form.copy_number,
        recipient_name: form.recipient_name,
        recipient_entity: form.recipient_entity || null,
        delivered_at: form.delivered_at,
        delivery_method: form.delivery_method,
        ack_ref: form.ack_ref || null,
        received_confirmed: form.received_confirmed,
        notes: form.notes || null,
        created_by: user?.id,
        delivered_by: user?.id,
      });
      if (error) throw error;
      toast({ title: t("documents.rdc.toast.created") });
      setDialogOpen(false);
      setForm({
        doc_code: "", doc_revision: "", copy_number: 1, recipient_name: "",
        recipient_entity: "", delivered_at: new Date().toISOString().slice(0, 10),
        delivery_method: "email", ack_ref: "", received_confirmed: false, notes: "",
      });
      fetchRecords();
    } catch (err: any) {
      toast({
        title: t("documents.rdc.toast.error"),
        description: err?.message ?? t("common.error"),
        variant: "destructive",
      });
    }
  };

  if (!activeProject) return <NoProjectBanner />;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <PageHeader
        title={t("documents.rdc.title")}
        subtitle={t("documents.rdc.subtitle")}
        icon={ClipboardList}
        actions={canCreate ? (
          <Button size="sm" className="gap-1.5" onClick={() => setDialogOpen(true)}>
            <Plus className="h-3.5 w-3.5" />
            {t("documents.rdc.new")}
          </Button>
        ) : undefined}
      />

      <Tabs defaultValue="manual">
        <TabsList className="h-9 bg-muted/50 rounded-xl border border-border/40 gap-0.5 p-1">
          <TabsTrigger value="manual" className="gap-1.5 text-xs rounded-lg">
            <FileCheck className="h-3.5 w-3.5" />
            {t("documents.rdc.tabManual", { defaultValue: "Distribuição Formal" })}
            {records.length > 0 && (
              <span className="text-[9px] bg-primary/15 text-primary px-1.5 rounded-full font-bold">{records.length}</span>
            )}
          </TabsTrigger>
          <TabsTrigger value="auto" className="gap-1.5 text-xs rounded-lg">
            <Send className="h-3.5 w-3.5" />
            {t("documents.rdc.tabAuto", { defaultValue: "Envios Automáticos" })}
            {notifLogs.length > 0 && (
              <span className="text-[9px] bg-primary/15 text-primary px-1.5 rounded-full font-bold">{notifLogs.length}</span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ── Tab Distribuição Formal (manual) ─────────────────────────── */}
        <TabsContent value="manual" className="mt-4">
          {loading ? (
            <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}</div>
          ) : records.length === 0 ? (
            <EmptyState
              icon={ClipboardList}
              title={t("documents.rdc.empty")}
              subtitle={t("documents.rdc.emptyDesc", { defaultValue: "Registe as cópias controladas distribuídas fisicamente ou por email formal." })}
              action={canCreate ? { label: t("documents.rdc.new"), onClick: () => setDialogOpen(true) } : undefined}
            />
          ) : (
            <Card className="border bg-card">
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">{t("documents.rdc.col.code")}</TableHead>
                      <TableHead className="text-xs">{t("documents.rdc.col.document")}</TableHead>
                      <TableHead className="text-xs">{t("documents.rdc.col.recipient")}</TableHead>
                      <TableHead className="text-xs">{t("documents.rdc.col.date")}</TableHead>
                      <TableHead className="text-xs">{t("documents.rdc.col.method")}</TableHead>
                      <TableHead className="text-xs">{t("documents.rdc.col.confirmed")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {records.map(r => (
                      <TableRow key={r.id}>
                        <TableCell className="font-mono text-xs text-muted-foreground">{r.rdc_code ?? "—"}</TableCell>
                        <TableCell className="text-xs">
                          <p className="font-medium">{r.doc_code} <span className="text-muted-foreground">Rev.{r.doc_revision}</span></p>
                          {r.plan_title && <p className="text-muted-foreground text-[10px] truncate max-w-[200px]">{r.plan_title}</p>}
                        </TableCell>
                        <TableCell className="text-xs">
                          <p className="font-medium">{r.recipient_name}</p>
                          {r.recipient_entity && <p className="text-muted-foreground text-[10px]">{r.recipient_entity}</p>}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {r.delivered_at ? new Date(r.delivered_at + "T00:00:00").toLocaleDateString("pt-PT") : "—"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-[9px] capitalize">{r.delivery_method ?? "—"}</Badge>
                        </TableCell>
                        <TableCell>
                          {r.received_confirmed
                            ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                            : <Clock className="h-3.5 w-3.5 text-muted-foreground" />}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ── Tab Envios Automáticos (notifications_log) ───────────────── */}
        <TabsContent value="auto" className="mt-4">
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 mb-4 flex items-start gap-2.5">
            <Send className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              {t("documents.rdc.autoDesc", { defaultValue: "Registo automático de todas as notificações enviadas por email a partir do Atlas — HP, NCs, relatórios e outros documentos. Cada envio é registado com data, destinatários e estado de entrega." })}
            </p>
          </div>

          {loading ? (
            <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-20 w-full rounded-lg" />)}</div>
          ) : notifLogs.length === 0 ? (
            <EmptyState
              icon={Send}
              title={t("documents.rdc.autoEmpty", { defaultValue: "Sem envios registados" })}
              subtitle={t("documents.rdc.autoEmptyDesc", { defaultValue: "Os emails enviados a partir do Atlas aparecem aqui automaticamente." })}
            />
          ) : (
            <div className="space-y-2">
              {notifLogs.map(log => {
                const sentCount = log.recipients.filter(r => r.sent_status === "sent").length;
                const confirmedCount = log.recipients.filter(r => r.confirmed_at).length;
                return (
                  <div key={log.id} className="rounded-lg border border-border bg-card p-3 space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className="text-[9px] font-mono">{log.entity_code ?? log.entity_type}</Badge>
                          <p className="text-sm font-medium truncate">{log.subject}</p>
                          {log.pdf_attached && (
                            <Badge variant="secondary" className="text-[9px]">PDF</Badge>
                          )}
                        </div>
                      </div>
                      <p className="text-[10px] text-muted-foreground flex-shrink-0">
                        {new Date(log.created_at).toLocaleString("pt-PT", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                    {log.recipients.length > 0 && (
                      <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {log.recipients.length} destinatário(s)
                        </span>
                        <span className={cn("flex items-center gap-1", sentCount > 0 ? "text-green-600" : "text-destructive")}>
                          <Mail className="h-3 w-3" />
                          {sentCount} enviado(s)
                        </span>
                        {confirmedCount > 0 && (
                          <span className="flex items-center gap-1 text-green-600">
                            <CheckCircle2 className="h-3 w-3" />
                            {confirmedCount} confirmado(s)
                          </span>
                        )}
                      </div>
                    )}
                    {log.recipients.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {log.recipients.map(r => (
                          <span key={r.id} className={cn(
                            "inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md border",
                            r.confirmed_at
                              ? "border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-400"
                              : r.sent_status === "sent"
                              ? "border-border bg-muted/50 text-muted-foreground"
                              : "border-destructive/30 bg-destructive/10 text-destructive"
                          )}>
                            {r.confirmed_at && <CheckCircle2 className="h-2.5 w-2.5" />}
                            {r.name || r.email}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ── Dialog criar registo manual ────────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileCheck className="h-4 w-4" />
              {t("documents.rdc.new")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">{t("documents.rdc.col.document")} *</Label>
                <Input
                  value={form.doc_code}
                  onChange={e => setForm(f => ({ ...f, doc_code: e.target.value }))}
                  placeholder={t("documents.rdc.placeholders.docCode", { defaultValue: "ex: PEPF17A001" })}
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{t("documents.rdc.col.revision")}</Label>
                <Input
                  value={form.doc_revision}
                  onChange={e => setForm(f => ({ ...f, doc_revision: e.target.value }))}
                  placeholder="Rev.00"
                  className="h-8 text-xs"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">{t("documents.rdc.col.recipient")} *</Label>
                <Input
                  value={form.recipient_name}
                  onChange={e => setForm(f => ({ ...f, recipient_name: e.target.value }))}
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{t("documents.rdc.col.entity")}</Label>
                <Input
                  value={form.recipient_entity}
                  onChange={e => setForm(f => ({ ...f, recipient_entity: e.target.value }))}
                  placeholder="ex: IP — Infraestruturas de Portugal"
                  className="h-8 text-xs"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">{t("documents.rdc.col.date")}</Label>
                <Input type="date" value={form.delivered_at} onChange={e => setForm(f => ({ ...f, delivered_at: e.target.value }))} className="h-8 text-xs" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{t("documents.rdc.col.method")}</Label>
                <Select value={form.delivery_method} onValueChange={v => setForm(f => ({ ...f, delivery_method: v }))}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="physical">Físico</SelectItem>
                    <SelectItem value="platform">Plataforma</SelectItem>
                    <SelectItem value="other">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{t("documents.rdc.col.copy")}</Label>
                <Input type="number" min={1} value={form.copy_number} onChange={e => setForm(f => ({ ...f, copy_number: Number(e.target.value) }))} className="h-8 text-xs" />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t("documents.rdc.col.ackRef")}</Label>
              <Input value={form.ack_ref} onChange={e => setForm(f => ({ ...f, ack_ref: e.target.value }))} className="h-8 text-xs" placeholder={t("documents.rdc.placeholders.ackRef", { defaultValue: "Referência de acuse de recibo" })} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t("common.notes")}</Label>
              <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} className="text-xs resize-none" />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="confirmed" checked={form.received_confirmed} onCheckedChange={v => setForm(f => ({ ...f, received_confirmed: !!v }))} />
              <label htmlFor="confirmed" className="text-xs cursor-pointer">{t("documents.rdc.confirmedLabel", { defaultValue: "Recepção confirmada pelo destinatário" })}</label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>{t("common.cancel")}</Button>
            <Button onClick={handleCreate} disabled={!form.doc_code || !form.recipient_name} className="gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              {t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
