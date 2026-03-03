import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AttachmentsPanel } from "@/components/attachments/AttachmentsPanel";
import { topographyRequestService, type TopographyRequest } from "@/lib/services/topographyService";
import { toast } from "sonner";

const REQUEST_TYPES = ["implantacao", "levantamento", "controlo", "verificacao"];
const PRIORITIES = ["low", "normal", "high", "urgent"];

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  projectId: string;
  editRequest?: TopographyRequest | null;
  onSuccess: () => void;
}

export function RequestFormDialog({ open, onOpenChange, projectId, editRequest, onSuccess }: Props) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const isEdit = !!editRequest;
  const [form, setForm] = useState({
    request_type: editRequest?.request_type ?? "implantacao",
    description: editRequest?.description ?? "",
    zone: editRequest?.zone ?? "",
    request_date: editRequest?.request_date ?? new Date().toISOString().split("T")[0],
    priority: editRequest?.priority ?? "normal",
    responsible: editRequest?.responsible ?? "",
  });

  const handleSubmit = async () => {
    if (!form.description.trim()) { toast.error(t("topography.form.descriptionRequired")); return; }
    setLoading(true);
    try {
      if (editRequest) {
        await topographyRequestService.update(editRequest.id, projectId, {
          request_type: form.request_type,
          description: form.description.trim(),
          zone: form.zone || null,
          request_date: form.request_date,
          priority: form.priority,
          responsible: form.responsible || null,
        });
        toast.success(t("topography.toast.requestUpdated"));
      } else {
        await topographyRequestService.create({
          project_id: projectId,
          request_type: form.request_type,
          description: form.description.trim(),
          zone: form.zone || null,
          request_date: form.request_date,
          priority: form.priority,
          responsible: form.responsible || null,
        });
        toast.success(t("topography.toast.requestCreated"));
      }
      setForm({ request_type: "implantacao", description: "", zone: "", request_date: new Date().toISOString().split("T")[0], priority: "normal", responsible: "" });
      onSuccess();
    } catch (e: any) {
      toast.error(e.message || t("topography.toast.error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{isEdit ? t("topography.form.editRequest") : t("topography.form.newRequest")}</DialogTitle></DialogHeader>
        <ScrollArea className="max-h-[70vh] pr-1">
          <div className="space-y-4 pb-1">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t("topography.table.requestType")} *</Label>
                <Select value={form.request_type} onValueChange={v => setForm(f => ({ ...f, request_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {REQUEST_TYPES.map(rt => <SelectItem key={rt} value={rt}>{t(`topography.requestType.${rt}`)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t("topography.table.priority")}</Label>
                <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PRIORITIES.map(p => <SelectItem key={p} value={p}>{t(`topography.priority.${p}`)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>{t("common.description")} *</Label><Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>{t("topography.table.zone")}</Label><Input value={form.zone} onChange={e => setForm(f => ({ ...f, zone: e.target.value }))} placeholder="Ex: PK 12+500" /></div>
              <div><Label>{t("common.date")}</Label><Input type="date" value={form.request_date} onChange={e => setForm(f => ({ ...f, request_date: e.target.value }))} /></div>
            </div>
            <div><Label>{t("topography.table.responsible")}</Label><Input value={form.responsible} onChange={e => setForm(f => ({ ...f, responsible: e.target.value }))} /></div>

            {isEdit && editRequest && (
              <>
                <Separator />
                <AttachmentsPanel
                  projectId={projectId}
                  entityType="topography_requests"
                  entityId={editRequest.id}
                />
              </>
            )}

            <Button onClick={handleSubmit} disabled={loading} className="w-full">{loading ? t("common.loading") : isEdit ? t("common.save") : t("topography.newRequest")}</Button>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
