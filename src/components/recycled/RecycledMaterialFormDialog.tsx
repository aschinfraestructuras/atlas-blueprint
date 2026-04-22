import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/lib/utils/toast";
import { useProject } from "@/contexts/ProjectContext";
import { useAuth } from "@/contexts/AuthContext";
import { useSuppliers } from "@/hooks/useSuppliers";
import { recycledMaterialService, type RecycledMaterial, type RecycledMaterialInput } from "@/lib/services/recycledMaterialService";
import { AttachmentsPanel } from "@/components/attachments/AttachmentsPanel";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existing?: RecycledMaterial | null;
  onSuccess?: () => void;
}

const REF_TYPES = ["FAM", "PAP", "BAM", "OUTRO"] as const;
const UNITS = ["t", "m³", "m²", "un"];
const STATUSES = ["pending", "submitted", "approved", "rejected"] as const;

export function RecycledMaterialFormDialog({ open, onOpenChange, existing, onSuccess }: Props) {
  const { t } = useTranslation();
  const { activeProject } = useProject();
  const { user } = useAuth();
  const { data: suppliers } = useSuppliers();

  const [referenceType, setReferenceType] = useState<string>("FAM");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [materialName, setMaterialName] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [composition, setComposition] = useState("");
  const [recycledPct, setRecycledPct] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [qtyPlanned, setQtyPlanned] = useState("");
  const [qtyUsed, setQtyUsed] = useState("");
  const [unit, setUnit] = useState("t");
  const [appLocation, setAppLocation] = useState("");
  const [appDate, setAppDate] = useState("");
  const [certNumber, setCertNumber] = useState("");
  const [docRef, setDocRef] = useState("");
  const [status, setStatus] = useState<string>("pending");
  const [observations, setObservations] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && existing) {
      setReferenceType(existing.reference_type);
      setReferenceNumber(existing.reference_number);
      setMaterialName(existing.material_name);
      setSupplierId(existing.supplier_id ?? "");
      setSupplierName(existing.supplier_name ?? "");
      setComposition(existing.composition ?? "");
      setRecycledPct(existing.recycled_content_pct != null ? String(existing.recycled_content_pct) : "");
      setSerialNumber(existing.serial_number ?? "");
      setQtyPlanned(existing.quantity_planned != null ? String(existing.quantity_planned) : "");
      setQtyUsed(existing.quantity_used != null ? String(existing.quantity_used) : "");
      setUnit(existing.unit ?? "t");
      setAppLocation(existing.application_location ?? "");
      setAppDate(existing.application_date ?? "");
      setCertNumber(existing.certificate_number ?? "");
      setDocRef(existing.document_ref ?? "");
      setStatus(existing.status);
      setObservations(existing.observations ?? "");
    } else if (open && activeProject) {
      setReferenceType("FAM");
      setMaterialName(""); setSupplierId(""); setSupplierName("");
      setComposition(""); setRecycledPct(""); setSerialNumber("");
      setQtyPlanned(""); setQtyUsed(""); setUnit("t");
      setAppLocation(""); setAppDate(""); setCertNumber("");
      setDocRef(""); setStatus("pending"); setObservations("");
      recycledMaterialService.nextReference(activeProject.id, "FAM").then(setReferenceNumber);
    }
  }, [open, existing, activeProject]);

  useEffect(() => {
    if (open && !existing && activeProject) {
      recycledMaterialService.nextReference(activeProject.id, referenceType).then(setReferenceNumber);
    }
  }, [referenceType, open, existing, activeProject]);

  const handleSave = async () => {
    if (!activeProject || !user) return;
    setSaving(true);
    try {
      const input: RecycledMaterialInput = {
        project_id: activeProject.id,
        reference_type: referenceType,
        reference_number: referenceNumber,
        material_name: materialName,
        supplier_id: supplierId || null,
        supplier_name: supplierName || null,
        composition: composition || null,
        recycled_content_pct: recycledPct ? Number(recycledPct) : null,
        serial_number: serialNumber || null,
        quantity_planned: qtyPlanned ? Number(qtyPlanned) : null,
        quantity_used: qtyUsed ? Number(qtyUsed) : null,
        unit,
        application_location: appLocation || null,
        application_date: appDate || null,
        certificate_number: certNumber || null,
        document_ref: docRef || null,
        status,
        observations: observations || null,
      };
      if (existing) {
        await recycledMaterialService.update(existing.id, input);
        toast({ title: t("recycled.toast.updated") });
      } else {
        await recycledMaterialService.create(input, user.id);
        toast({ title: t("recycled.toast.created") });
      }
      onOpenChange(false);
      onSuccess?.();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{existing ? t("common.edit") : t("recycled.new")}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>{t("recycled.fields.referenceType")}</Label>
              <Select value={referenceType} onValueChange={setReferenceType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {REF_TYPES.map(rt => (
                    <SelectItem key={rt} value={rt}>{t(`recycled.types.${rt}`)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{t("recycled.fields.referenceNumber")}</Label>
              <Input value={referenceNumber} onChange={e => setReferenceNumber(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>{t("common.status")}</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUSES.map(s => (
                    <SelectItem key={s} value={s}>{t(`recycled.status.${s}`)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>{t("recycled.fields.materialName")}</Label>
            <Input value={materialName} onChange={e => setMaterialName(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{t("recycled.fields.supplier")}</Label>
              <Select value={supplierId} onValueChange={v => { setSupplierId(v); const s = suppliers.find(s => s.id === v); if (s) setSupplierName(s.name); }}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  {suppliers.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{t("recycled.fields.recycledPct")}</Label>
              <div className="flex items-center gap-1">
                <Input type="number" min={0} max={100} value={recycledPct} onChange={e => setRecycledPct(e.target.value)} />
                <span className="text-sm text-muted-foreground">%</span>
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>{t("recycled.fields.composition")}</Label>
            <Textarea value={composition} onChange={e => setComposition(e.target.value)} rows={2} placeholder="Descrição da composição e origem dos reciclados…" />
          </div>

          <div className="grid grid-cols-4 gap-3">
            <div className="space-y-1.5">
              <Label>{t("recycled.fields.quantityPlanned")}</Label>
              <Input type="number" value={qtyPlanned} onChange={e => setQtyPlanned(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>{t("recycled.fields.quantityUsed")}</Label>
              <Input type="number" value={qtyUsed} onChange={e => setQtyUsed(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>{t("recycled.fields.unit")}</Label>
              <Select value={unit} onValueChange={setUnit}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {UNITS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{t("recycled.fields.serialNumber")}</Label>
              <Input value={serialNumber} onChange={e => setSerialNumber(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{t("recycled.fields.applicationLocation")}</Label>
              <Input value={appLocation} onChange={e => setAppLocation(e.target.value)} placeholder="PK ou frente de obra" />
            </div>
            <div className="space-y-1.5">
              <Label>{t("recycled.fields.applicationDate")}</Label>
              <Input type="date" value={appDate} onChange={e => setAppDate(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{t("recycled.fields.certificateNumber")}</Label>
              <Input value={certNumber} onChange={e => setCertNumber(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>{t("recycled.fields.documentRef")}</Label>
              <Input value={docRef} onChange={e => setDocRef(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>{t("recycled.fields.observations")}</Label>
            <Textarea value={observations} onChange={e => setObservations(e.target.value)} rows={2} />
          </div>

          {/* Anexos — apenas em edição (após guardar pela primeira vez) */}
          {existing && activeProject && (
            <>
              <Separator />
              <AttachmentsPanel
                projectId={activeProject.id}
                entityType={"recycled_materials" as any}
                entityId={existing.id}
              />
            </>
          )}
          {!existing && (
            <p className="text-xs text-muted-foreground italic border-t pt-3">
              {t("recycled.attachments.afterSaveHint", { defaultValue: "Os anexos (certificados, fichas técnicas, fotografias) podem ser adicionados após guardar o registo." })}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t("common.cancel")}</Button>
          <Button onClick={handleSave} disabled={saving || !materialName || !referenceNumber}>
            {saving ? t("common.loading") : t("common.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
