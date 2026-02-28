import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { useProject } from "@/contexts/ProjectContext";
import { planningService, type WbsNode } from "@/lib/services/planningService";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AttachmentsPanel } from "@/components/attachments/AttachmentsPanel";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  wbsNodes: WbsNode[];
  editNode?: WbsNode | null;
  defaultParentId?: string | null;
  onSuccess: () => void;
}

const EMPTY = { wbs_code: "", description: "", zone: "", planned_start: "", planned_end: "", responsible: "", parent_id: "__none__" };

export function WbsFormDialog({ open, onOpenChange, wbsNodes, editNode, defaultParentId, onSuccess }: Props) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { activeProject } = useProject();
  const [form, setForm] = useState(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const isEdit = !!editNode;

  useEffect(() => {
    if (editNode) {
      setForm({
        wbs_code: editNode.wbs_code,
        description: editNode.description,
        zone: editNode.zone ?? "",
        planned_start: editNode.planned_start ?? "",
        planned_end: editNode.planned_end ?? "",
        responsible: editNode.responsible ?? "",
        parent_id: editNode.parent_id ?? "__none__",
      });
    } else {
      setForm({ ...EMPTY, parent_id: defaultParentId ?? "__none__" });
    }
  }, [editNode, open, defaultParentId]);

  const handleSubmit = async () => {
    if (!activeProject || !user || !form.wbs_code.trim() || !form.description.trim()) return;
    // Uniqueness check
    const duplicate = wbsNodes.find(w => w.wbs_code.toLowerCase() === form.wbs_code.trim().toLowerCase() && w.id !== editNode?.id);
    if (duplicate) { toast.error(t("planning.wbs.codeDuplicate", { defaultValue: "Já existe um nó WBS com este código neste projeto." })); return; }
    setSubmitting(true);
    try {
      const parentId = form.parent_id === "__none__" ? null : form.parent_id;
      if (editNode) {
        await planningService.updateWbs(editNode.id, activeProject.id, {
          wbs_code: form.wbs_code.trim(),
          description: form.description.trim(),
          zone: form.zone || undefined,
          planned_start: form.planned_start || undefined,
          planned_end: form.planned_end || undefined,
          responsible: form.responsible || undefined,
          parent_id: parentId,
        });
        toast.success(t("planning.toast.wbsUpdated"));
      } else {
        await planningService.createWbs({
          project_id: activeProject.id,
          created_by: user.id,
          wbs_code: form.wbs_code.trim(),
          description: form.description.trim(),
          zone: form.zone || undefined,
          planned_start: form.planned_start || undefined,
          planned_end: form.planned_end || undefined,
          responsible: form.responsible || undefined,
          parent_id: parentId,
        });
        toast.success(t("planning.toast.wbsCreated"));
      }
      onSuccess();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message || "Erro");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? t("planning.wbs.editTitle") : t("planning.wbs.createTitle")}</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[70vh] pr-1">
          <div className="space-y-4 pb-1">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>{t("planning.wbs.code")} *</Label><Input value={form.wbs_code} onChange={e => setForm(f => ({ ...f, wbs_code: e.target.value }))} placeholder="1.2.3" /></div>
              <div>
                <Label>{t("planning.wbs.parent")}</Label>
                <Select value={form.parent_id} onValueChange={v => setForm(f => ({ ...f, parent_id: v }))}>
                  <SelectTrigger><SelectValue placeholder={t("common.optional")} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— {t("common.optional")} —</SelectItem>
                    {wbsNodes.filter(n => n.id !== editNode?.id).map(n => (
                      <SelectItem key={n.id} value={n.id}>{n.wbs_code} – {n.description}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>{t("common.description")} *</Label><Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>{t("planning.wbs.zone")}</Label><Input value={form.zone} onChange={e => setForm(f => ({ ...f, zone: e.target.value }))} placeholder="PK 12+500" /></div>
              <div><Label>{t("planning.wbs.responsible")}</Label><Input value={form.responsible} onChange={e => setForm(f => ({ ...f, responsible: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>{t("planning.fields.plannedStart")}</Label><Input type="date" value={form.planned_start} onChange={e => setForm(f => ({ ...f, planned_start: e.target.value }))} /></div>
              <div><Label>{t("planning.fields.plannedEnd")}</Label><Input type="date" value={form.planned_end} onChange={e => setForm(f => ({ ...f, planned_end: e.target.value }))} /></div>
            </div>

            {isEdit && editNode && activeProject && (
              <>
                <Separator />
                <AttachmentsPanel
                  projectId={activeProject.id}
                  entityType="planning_wbs"
                  entityId={editNode.id}
                />
              </>
            )}
          </div>
        </ScrollArea>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t("common.cancel")}</Button>
          <Button onClick={handleSubmit} disabled={submitting}>{submitting ? t("common.loading") : t("common.save")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
