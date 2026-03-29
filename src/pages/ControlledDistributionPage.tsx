import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useProject } from "@/contexts/ProjectContext";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useProjectRole } from "@/hooks/useProjectRole";
import { NoProjectBanner } from "@/components/NoProjectBanner";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { FileCheck, Plus, ClipboardList } from "lucide-react";
import { toast } from "@/hooks/use-toast";

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
}

export default function ControlledDistributionPage() {
  const { t } = useTranslation();
  const { activeProject } = useProject();
  const { user } = useAuth();
  const { canCreate } = useProjectRole();

  const [records, setRecords] = useState<RdcRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    doc_code: "", doc_revision: "", copy_number: 1, recipient_name: "",
    recipient_entity: "", delivered_at: new Date().toISOString().slice(0, 10),
    delivery_method: "email", ack_ref: "", received_confirmed: false, notes: "",
  });

  const fetchRecords = useCallback(async () => {
    if (!activeProject) return;
    setLoading(true);
    try {
      const { data } = await supabase
        .from("rdc_distribution" as any)
        .select("*")
        .eq("project_id", activeProject.id)
        .order("created_at", { ascending: false });
      setRecords((data as any[]) ?? []);
    } catch {
      // Try fallback view
      try {
        const { data } = await supabase
          .from("vw_rdc_distribuicao" as any)
          .select("*")
          .eq("project_id", activeProject.id);
        setRecords((data as any[]) ?? []);
      } catch { setRecords([]); }
    } finally {
      setLoading(false);
    }
  }, [activeProject]);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  const handleCreate = async () => {
    if (!activeProject) return;
    try {
      const { error } = await (supabase as any).from("rdc_distribution").insert({
        project_id: activeProject.id,
        doc_code: form.doc_code,
        doc_revision: form.doc_revision,
        copy_number: form.copy_number,
        recipient_name: form.recipient_name,
        recipient_entity: form.recipient_entity,
        delivered_at: form.delivered_at,
        delivery_method: form.delivery_method,
        ack_ref: form.ack_ref || null,
        received_confirmed: form.received_confirmed,
        notes: form.notes || null,
        created_by: user?.id,
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
      toast({ title: t("documents.rdc.toast.error"), description: err.message, variant: "destructive" });
    }
  };

  if (!activeProject) return <NoProjectBanner />;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <PageHeader
        title={t("documents.rdc.title")}
        subtitle={t("documents.rdc.subtitle")}
        icon={ClipboardList}
      />

      {canCreate && (
        <div className="flex justify-end">
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            {t("documents.rdc.register")}
          </Button>
        </div>
      )}

      {loading ? (
        <div className="py-12 text-center text-muted-foreground">{t("common.loading")}</div>
      ) : records.length === 0 ? (
        <EmptyState icon={FileCheck} titleKey="common.noData" />
      ) : (
        <Card className="border-0 bg-card shadow-card">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>RDC</TableHead>
                  <TableHead>{t("documents.rdc.docCode")}</TableHead>
                  <TableHead>{t("documents.rdc.docRevision")}</TableHead>
                  <TableHead>{t("documents.rdc.copyNumber")}</TableHead>
                  <TableHead>{t("documents.rdc.recipientName")}</TableHead>
                  <TableHead>{t("documents.rdc.recipientEntity")}</TableHead>
                  <TableHead>{t("documents.rdc.deliveredAt")}</TableHead>
                  <TableHead>{t("documents.rdc.deliveryMethod")}</TableHead>
                  <TableHead>{t("documents.rdc.receivedConfirmed")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map(r => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs">{r.rdc_code ?? "—"}</TableCell>
                    <TableCell className="text-sm font-medium">{r.doc_code}</TableCell>
                    <TableCell className="text-xs">{r.doc_revision}</TableCell>
                    <TableCell className="text-xs text-center">{r.copy_number}</TableCell>
                    <TableCell className="text-sm">{r.recipient_name}</TableCell>
                    <TableCell className="text-xs">{r.recipient_entity}</TableCell>
                    <TableCell className="text-xs">{new Date(r.delivered_at).toLocaleDateString()}</TableCell>
                    <TableCell className="text-xs">{t(`documents.rdc.methods.${r.delivery_method}`, { defaultValue: r.delivery_method })}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={r.received_confirmed ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}>
                        {r.received_confirmed ? t("common.yes") : t("common.no")}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("documents.rdc.new")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{t("documents.rdc.docCode")}</Label>
                <Input value={form.doc_code} onChange={e => setForm(p => ({ ...p, doc_code: e.target.value }))} placeholder="PQO-PF17A-001" />
              </div>
              <div>
                <Label>{t("documents.rdc.docRevision")}</Label>
                <Input value={form.doc_revision} onChange={e => setForm(p => ({ ...p, doc_revision: e.target.value }))} placeholder="Rev.00" />
              </div>
            </div>
            <div>
              <Label>{t("documents.rdc.copyNumber")}</Label>
              <Input type="number" min={1} value={form.copy_number} onChange={e => setForm(p => ({ ...p, copy_number: parseInt(e.target.value) || 1 }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{t("documents.rdc.recipientName")}</Label>
                <Input value={form.recipient_name} onChange={e => setForm(p => ({ ...p, recipient_name: e.target.value }))} />
              </div>
              <div>
                <Label>{t("documents.rdc.recipientEntity")}</Label>
                <Input value={form.recipient_entity} onChange={e => setForm(p => ({ ...p, recipient_entity: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{t("documents.rdc.deliveredAt")}</Label>
                <Input type="date" value={form.delivered_at} onChange={e => setForm(p => ({ ...p, delivered_at: e.target.value }))} />
              </div>
              <div>
                <Label>{t("documents.rdc.deliveryMethod")}</Label>
                <Select value={form.delivery_method} onValueChange={v => setForm(p => ({ ...p, delivery_method: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["email", "fisico", "portal", "outro"].map(m => (
                      <SelectItem key={m} value={m}>{t(`documents.rdc.methods.${m}`)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>{t("documents.rdc.ackRef")}</Label>
              <Input value={form.ack_ref} onChange={e => setForm(p => ({ ...p, ack_ref: e.target.value }))} />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                checked={form.received_confirmed}
                onCheckedChange={v => setForm(p => ({ ...p, received_confirmed: v === true }))}
              />
              <Label>{t("documents.rdc.receivedConfirmed")}</Label>
            </div>
            <div>
              <Label>{t("common.notes")}</Label>
              <Textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>{t("common.cancel")}</Button>
            <Button onClick={handleCreate} disabled={!form.doc_code.trim() || !form.recipient_name.trim()}>
              {t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
