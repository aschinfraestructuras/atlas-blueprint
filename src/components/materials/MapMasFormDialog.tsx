import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useProject } from "@/contexts/ProjectContext";
import { useAuth } from "@/contexts/AuthContext";
import { mapMasService, type MapMasFormData, type MapMasDocument } from "@/lib/services/mapMasService";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

const SUBMISSION_TYPES = [
  { value: "submissao", label: "Submissão" },
  { value: "alternativa", label: "Alternativa" },
  { value: "mudanca_fonte", label: "Mudança de Fonte" },
  { value: "procedimento", label: "Procedimento" },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document?: MapMasDocument | null;
  onSuccess: () => void;
}

export function MapMasFormDialog({ open, onOpenChange, document: doc, onSuccess }: Props) {
  const { t } = useTranslation();
  const { activeProject } = useProject();
  const { user } = useAuth();
  const isEdit = !!doc;

  const [title, setTitle] = useState("");
  const [materialId, setMaterialId] = useState("");
  const [supplierId, setSupplierId] = useState("__none__");
  const [subcontractorId, setSubcontractorId] = useState("__none__");
  const [workItemId, setWorkItemId] = useState("__none__");
  const [submissionType, setSubmissionType] = useState<string>("submissao");
  const [zone, setZone] = useState("");
  const [pk, setPk] = useState("");
  const [normativeRefs, setNormativeRefs] = useState("");
  const [acceptanceCriteria, setAcceptanceCriteria] = useState("");
  const [lotRef, setLotRef] = useState("");
  const [observations, setObservations] = useState("");
  const [deadline, setDeadline] = useState("");
  const [saving, setSaving] = useState(false);

  // Lookups
  const [materials, setMaterials] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [subcontractors, setSubcontractors] = useState<any[]>([]);
  const [workItems, setWorkItems] = useState<any[]>([]);

  useEffect(() => {
    if (!open || !activeProject) return;
    // Fetch lookups
    Promise.all([
      supabase.from("materials" as any).select("id, name, code").eq("project_id", activeProject.id).eq("status", "active"),
      supabase.from("suppliers" as any).select("id, name, code").eq("project_id", activeProject.id),
      supabase.from("subcontractors").select("id, name").eq("project_id", activeProject.id),
      supabase.from("work_items" as any).select("id, code, description").eq("project_id", activeProject.id),
    ]).then(([m, s, sc, wi]) => {
      setMaterials((m.data as any[]) ?? []);
      setSuppliers((s.data as any[]) ?? []);
      setSubcontractors(sc.data ?? []);
      setWorkItems((wi.data as any[]) ?? []);
    });
  }, [open, activeProject]);

  useEffect(() => {
    if (doc) {
      setTitle(doc.title);
      const fd = doc.form_data as MapMasFormData | null;
      setMaterialId(fd?.material_id ?? "");
      setSupplierId(fd?.supplier_id ?? "__none__");
      setSubcontractorId(fd?.subcontractor_id ?? "__none__");
      setWorkItemId(fd?.work_item_id ?? "__none__");
      setSubmissionType(fd?.submission_type ?? "submissao");
      setZone(fd?.zone ?? "");
      setPk(fd?.pk ?? "");
      setNormativeRefs(fd?.normative_refs ?? "");
      setAcceptanceCriteria(fd?.acceptance_criteria ?? "");
      setLotRef(fd?.lot_ref ?? "");
      setObservations(fd?.observations ?? "");
      setDeadline(fd?.deadline ?? "");
    } else {
      setTitle(""); setMaterialId(""); setSupplierId("__none__");
      setSubcontractorId("__none__"); setWorkItemId("__none__");
      setSubmissionType("submissao"); setZone(""); setPk("");
      setNormativeRefs(""); setAcceptanceCriteria(""); setLotRef("");
      setObservations(""); setDeadline("");
    }
  }, [doc, open]);

  const handleSubmit = async () => {
    if (!activeProject || !user || !title.trim() || !materialId) return;
    setSaving(true);
    try {
      const formData: MapMasFormData = {
        material_id: materialId,
        supplier_id: supplierId !== "__none__" ? supplierId : undefined,
        subcontractor_id: subcontractorId !== "__none__" ? subcontractorId : undefined,
        work_item_id: workItemId !== "__none__" ? workItemId : undefined,
        submission_type: submissionType as any,
        zone: zone || undefined,
        pk: pk || undefined,
        normative_refs: normativeRefs || undefined,
        acceptance_criteria: acceptanceCriteria || undefined,
        lot_ref: lotRef || undefined,
        observations: observations || undefined,
        deadline: deadline || undefined,
        submitted_by: user.email ?? undefined,
      };

      if (isEdit && doc) {
        await mapMasService.updateFormData(doc.id, activeProject.id, formData);
        toast({ title: t("mapMas.toast.updated") });
      } else {
        await mapMasService.create(activeProject.id, title.trim(), formData);
        toast({ title: t("mapMas.toast.created") });
      }
      onOpenChange(false);
      onSuccess();
    } catch (err: any) {
      console.error(err);
      toast({ title: t("mapMas.toast.error"), description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? t("mapMas.form.titleEdit") : t("mapMas.form.titleCreate")}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-1.5">
            <Label>{t("mapMas.form.title")} *</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex: MAP Betão C30/37 — Lote 001" disabled={isEdit && doc?.status !== "draft"} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-1.5">
              <Label>{t("mapMas.form.material")} *</Label>
              <Select value={materialId} onValueChange={setMaterialId} disabled={isEdit && doc?.status !== "draft"}>
                <SelectTrigger><SelectValue placeholder={t("mapMas.form.selectMaterial")} /></SelectTrigger>
                <SelectContent>
                  {materials.map(m => (
                    <SelectItem key={m.id} value={m.id}>{m.code} — {m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>{t("mapMas.form.submissionType")} *</Label>
              <Select value={submissionType} onValueChange={setSubmissionType} disabled={isEdit && doc?.status !== "draft"}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SUBMISSION_TYPES.map(st => (
                    <SelectItem key={st.value} value={st.value}>{st.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="grid gap-1.5">
              <Label>{t("mapMas.form.supplier")}</Label>
              <Select value={supplierId} onValueChange={setSupplierId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">—</SelectItem>
                  {suppliers.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.code} — {s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>{t("mapMas.form.subcontractor")}</Label>
              <Select value={subcontractorId} onValueChange={setSubcontractorId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">—</SelectItem>
                  {subcontractors.map(sc => (
                    <SelectItem key={sc.id} value={sc.id}>{sc.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>{t("mapMas.form.workItem")}</Label>
              <Select value={workItemId} onValueChange={setWorkItemId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">—</SelectItem>
                  {workItems.map(wi => (
                    <SelectItem key={wi.id} value={wi.id}>{wi.code} — {(wi.description ?? "").substring(0, 40)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="grid gap-1.5">
              <Label>{t("mapMas.form.zone")}</Label>
              <Input value={zone} onChange={e => setZone(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label>{t("mapMas.form.pk")}</Label>
              <Input value={pk} onChange={e => setPk(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label>{t("mapMas.form.lotRef")}</Label>
              <Input value={lotRef} onChange={e => setLotRef(e.target.value)} />
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label>{t("mapMas.form.normativeRefs")}</Label>
            <Textarea value={normativeRefs} onChange={e => setNormativeRefs(e.target.value)} rows={2} />
          </div>

          <div className="grid gap-1.5">
            <Label>{t("mapMas.form.acceptanceCriteria")}</Label>
            <Textarea value={acceptanceCriteria} onChange={e => setAcceptanceCriteria(e.target.value)} rows={2} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-1.5">
              <Label>{t("mapMas.form.deadline")}</Label>
              <Input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label>{t("mapMas.form.observations")}</Label>
              <Textarea value={observations} onChange={e => setObservations(e.target.value)} rows={2} />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t("common.cancel")}</Button>
          <Button onClick={handleSubmit} disabled={saving || !title.trim() || !materialId}>
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />}
            {isEdit ? t("common.save") : t("mapMas.form.createBtn")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
