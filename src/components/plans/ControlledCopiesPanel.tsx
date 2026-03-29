import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox as CheckboxUI } from "@/components/ui/checkbox";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Trash2, CheckCircle2, Clock, Copy } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export interface ControlledCopy {
  id: string;
  plan_id: string;
  project_id: string;
  copy_number: number;
  recipient_name: string;
  recipient_entity: string | null;
  delivered_at: string | null;
  delivered_by: string | null;
  received_confirmed: boolean;
  confirmed_at: string | null;
  notes: string | null;
  created_at: string;
}

interface Props {
  planId: string;
  projectId: string;
  canEdit?: boolean;
}

const ENTITIES = ["IP — Dono de Obra", "Fiscalização", "ACE ASCH — Empreiteiro", "Subempreiteiro", "Projetista", "Laboratório", "Outro"];

export function ControlledCopiesPanel({ planId, projectId, canEdit = true }: Props) {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const isEs = i18n.language?.startsWith("es");
  const [copies, setCopies] = useState<ControlledCopy[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ recipient_name: "", recipient_entity: "", notes: "" });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await db.from("plan_controlled_copies")
        .select("*")
        .eq("plan_id", planId)
        .order("copy_number", { ascending: true });
      if (error) throw error;
      setCopies((data ?? []) as ControlledCopy[]);
    } catch {
      setCopies([]);
    } finally {
      setLoading(false);
    }
  }, [planId]);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async () => {
    if (!form.recipient_name.trim()) return;
    const nextNum = copies.length > 0 ? Math.max(...copies.map(c => c.copy_number)) + 1 : 1;
    try {
      const { error } = await db.from("plan_controlled_copies").insert({
        plan_id: planId,
        project_id: projectId,
        copy_number: nextNum,
        recipient_name: form.recipient_name.trim(),
        recipient_entity: form.recipient_entity || null,
        notes: form.notes || null,
        created_by: user?.id,
      });
      if (error) throw error;
      toast({ title: isEs ? "Copia añadida" : "Cópia adicionada" });
      setForm({ recipient_name: "", recipient_entity: "", notes: "" });
      setDialogOpen(false);
      load();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  };

  const handleConfirm = async (copy: ControlledCopy) => {
    try {
      const { error } = await db.from("plan_controlled_copies")
        .update({
          delivered_at: new Date().toISOString().split("T")[0],
          delivered_by: user?.id,
          received_confirmed: true,
          confirmed_at: new Date().toISOString(),
        })
        .eq("id", copy.id);
      if (error) throw error;
      toast({ title: isEs ? "Recepción confirmada" : "Receção confirmada" });
      load();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await db.from("plan_controlled_copies").delete().eq("id", id);
      if (error) throw error;
      load();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Copy className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-semibold text-foreground">
            {t("plans.controlledCopies.title")}
          </span>
          <Badge variant="secondary" className="text-[10px]">{copies.length}</Badge>
        </div>
        {canEdit && (
          <Button variant="outline" size="sm" onClick={() => setDialogOpen(true)}>
            <Plus className="h-3.5 w-3.5 mr-1" />
            {t("common.add")}
          </Button>
        )}
      </div>

      {copies.length === 0 && !loading ? (
        <p className="text-xs text-muted-foreground text-center py-4">
          {isEs ? "Sin copias controladas registradas" : t("plans.controlledCopies.noRecords")}
        </p>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16 text-[10px]">N.º</TableHead>
                 <TableHead className="text-[10px]">{t("plans.controlledCopies.recipient")}</TableHead>
                 <TableHead className="text-[10px]">{t("plans.controlledCopies.entity")}</TableHead>
                 <TableHead className="text-[10px]">{t("plans.controlledCopies.delivery")}</TableHead>
                 <TableHead className="text-[10px]">{t("common.status")}</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {copies.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-mono text-xs font-bold">{String(c.copy_number).padStart(2, "0")}</TableCell>
                  <TableCell className="text-xs">{c.recipient_name}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{c.recipient_entity ?? "—"}</TableCell>
                  <TableCell className="text-xs">{c.delivered_at ?? "—"}</TableCell>
                  <TableCell>
                    {c.received_confirmed ? (
                      <Badge className="bg-chart-2/10 text-chart-2 border-chart-2/20 text-[10px]">
                        <CheckCircle2 className="h-3 w-3 mr-1" />{t("plans.controlledCopies.confirmed")}
                      </Badge>
                    ) : (
                      <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-[10px]">
                        <Clock className="h-3 w-3 mr-1" />{t("common.pending")}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {!c.received_confirmed && canEdit && (
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleConfirm(c)} title={t("plans.controlledCopies.confirmReceipt")}>
                          <CheckCircle2 className="h-3.5 w-3.5 text-chart-2" />
                        </Button>
                      )}
                      {canEdit && (
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDelete(c.id)}>
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Add dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("plans.controlledCopies.new")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
               <label className="text-xs font-medium text-foreground">{t("plans.controlledCopies.recipient")} *</label>
               <Input value={form.recipient_name} onChange={e => setForm(f => ({ ...f, recipient_name: e.target.value }))} placeholder={t("plans.controlledCopies.recipientPlaceholder")} />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground">{t("plans.controlledCopies.entity")}</label>
              <select className="w-full rounded-md border bg-background px-3 py-2 text-sm" value={form.recipient_entity} onChange={e => setForm(f => ({ ...f, recipient_entity: e.target.value }))}>
                <option value="">—</option>
                {ENTITIES.map(e => <option key={e} value={e}>{e}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-foreground">{t("common.notes")}</label>
              <Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>{t("common.cancel")}</Button>
            <Button onClick={handleAdd} disabled={!form.recipient_name.trim()}>{t("common.save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
