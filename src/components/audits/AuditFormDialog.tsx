import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { useProject } from "@/contexts/ProjectContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";

const STATUSES = ["planned", "in_progress", "completed"] as const;

export interface AuditActivity {
  id: string;
  description: string;
  planned_start: string | null;
  planned_end: string | null;
  status: string;
  progress_pct: number;
  constraints_text: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editAudit?: AuditActivity | null;
  onSuccess: () => void;
}

const EMPTY = {
  description: "",
  planned_start: "",
  planned_end: "",
  status: "planned" as string,
  progress_pct: 0,
  constraints_text: "",
};

export function AuditFormDialog({ open, onOpenChange, editAudit, onSuccess }: Props) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { activeProject } = useProject();
  const [form, setForm] = useState(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const isEdit = !!editAudit;

  useEffect(() => {
    if (editAudit) {
      setForm({
        description: editAudit.description,
        planned_start: editAudit.planned_start ?? "",
        planned_end: editAudit.planned_end ?? "",
        status: editAudit.status,
        progress_pct: editAudit.progress_pct,
        constraints_text: editAudit.constraints_text ?? "",
      });
    } else {
      setForm(EMPTY);
    }
  }, [editAudit, open]);

  const set = (k: string, v: any) => setForm(prev => ({ ...prev, [k]: v }));

  const handleSubmit = async () => {
    if (!activeProject || !user) return;
    if (!form.description.trim()) {
      toast.error(t("common.required"));
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        project_id: activeProject.id,
        description: form.description.trim(),
        planned_start: form.planned_start || null,
        planned_end: form.planned_end || null,
        status: form.status,
        progress_pct: form.progress_pct,
        constraints_text: form.constraints_text.trim() || null,
        created_by: user.id,
      };

      if (isEdit) {
        const { error } = await (supabase as any)
          .from("planning_activities")
          .update(payload)
          .eq("id", editAudit!.id);
        if (error) throw error;
        toast.success(t("common.saved", { defaultValue: "Guardado com sucesso" }));
      } else {
        const { error } = await (supabase as any)
          .from("planning_activities")
          .insert(payload);
        if (error) throw error;
        toast.success(t("common.created", { defaultValue: "Criado com sucesso" }));
      }
      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message ?? "Erro");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEdit
              ? t("audits.edit", { defaultValue: "Editar Auditoria" })
              : t("audits.create", { defaultValue: "Nova Auditoria" })}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Description */}
          <div className="space-y-1.5">
            <Label>{t("common.description")} *</Label>
            <Textarea
              value={form.description}
              onChange={e => set("description", e.target.value)}
              placeholder="AI-PF17A-05 — Auditoria Interna 05: …"
              rows={3}
            />
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{t("planning.plannedStart", { defaultValue: "Início Previsto" })}</Label>
              <Input type="date" value={form.planned_start} onChange={e => set("planned_start", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>{t("planning.plannedEnd", { defaultValue: "Fim Previsto" })}</Label>
              <Input type="date" value={form.planned_end} onChange={e => set("planned_end", e.target.value)} />
            </div>
          </div>

          {/* Status */}
          <div className="space-y-1.5">
            <Label>{t("common.status")}</Label>
            <Select value={form.status} onValueChange={v => set("status", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUSES.map(s => (
                  <SelectItem key={s} value={s}>
                    {t(`audits.status.${s}`, { defaultValue: s })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Progress */}
          <div className="space-y-1.5">
            <Label>{t("planning.progress", { defaultValue: "Progresso" })} — {form.progress_pct}%</Label>
            <Slider
              value={[form.progress_pct]}
              onValueChange={([v]) => set("progress_pct", v)}
              min={0} max={100} step={5}
            />
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label>{t("audits.notes", { defaultValue: "Notas / Constatações" })}</Label>
            <Textarea
              value={form.constraints_text}
              onChange={e => set("constraints_text", e.target.value)}
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t("common.cancel")}</Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? t("common.loading") : isEdit ? t("common.save") : t("common.create")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
