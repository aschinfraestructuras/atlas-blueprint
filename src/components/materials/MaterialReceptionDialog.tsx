import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { type Material } from "@/lib/services/materialService";
import { supplierService, type Supplier } from "@/lib/services/supplierService";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import { classifySupabaseError } from "@/lib/utils/supabaseError";
import { Badge } from "@/components/ui/badge";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  material: Material;
  onSuccess: () => Promise<void> | void;
}

const today = () => new Date().toISOString().slice(0, 10);

export function MaterialReceptionDialog({ open, onOpenChange, projectId, material, onSuccess }: Props) {
  const { t } = useTranslation();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loadingSuppliers, setLoadingSuppliers] = useState(false);
  const [saving, setSaving] = useState(false);
  const [createdLotId, setCreatedLotId] = useState<string | null>(null);
  const [createdNcCode, setCreatedNcCode] = useState<string | null>(null);
  const [createdNcId, setCreatedNcId] = useState<string | null>(null);
  const [showNcPrompt, setShowNcPrompt] = useState(false);

  const [receptionDate, setReceptionDate] = useState(today());
  const [supplierId, setSupplierId] = useState<string>("");
  const [pameCode, setPameCode] = useState("");
  const [deliveryNoteRef, setDeliveryNoteRef] = useState("");
  const [lotRef, setLotRef] = useState("");
  const [quantityReceived, setQuantityReceived] = useState("");
  const [unit, setUnit] = useState("");
  const [ceMarkingOk, setCeMarkingOk] = useState<"yes" | "no">("yes");
  const [physicalState, setPhysicalState] = useState<"conforme" | "nao_conforme">("conforme");
  const [storageLocation, setStorageLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");

  const requiresNcPrompt = useMemo(
    () => ceMarkingOk === "no" || physicalState === "nao_conforme",
    [ceMarkingOk, physicalState],
  );

  useEffect(() => {
    if (!open) return;
    setReceptionDate(today());
    setSupplierId(material.supplier_id ?? "");
    setPameCode(material.pame_code ?? "");
    setDeliveryNoteRef("");
    setLotRef("");
    setQuantityReceived("");
    setUnit(material.unit ?? "");
    setCeMarkingOk("yes");
    setPhysicalState("conforme");
    setStorageLocation("");
    setNotes("");
    setRejectionReason("");
    setCreatedLotId(null);
    setCreatedNcCode(null);
    setCreatedNcId(null);
    setShowNcPrompt(false);

    setLoadingSuppliers(true);
    supplierService.getByProject(projectId)
      .then(setSuppliers)
      .catch(() => setSuppliers([]))
      .finally(() => setLoadingSuppliers(false));
  }, [open, material, projectId]);

  const handleSave = async (receptionStatus: "approved" | "quarantine" | "rejected") => {
    if (!supplierId || !deliveryNoteRef.trim() || !lotRef.trim() || !quantityReceived || !unit.trim() || !storageLocation.trim()) {
      toast({ title: t("errors.notNull.title"), description: t("errors.notNull.description"), variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const { data: generatedCode, error: codeError } = await supabase.rpc("fn_next_lot_code" as any, {
        p_project_id: projectId,
        p_material_code: material.code,
      });
      if (codeError) throw codeError;

      const { data, error } = await (supabase.from("material_lots") as any)
        .insert({
          project_id: projectId,
          material_id: material.id,
          supplier_id: supplierId,
          lot_code: generatedCode,
          reception_date: receptionDate,
          delivery_note_ref: deliveryNoteRef.trim(),
          lot_ref: lotRef.trim(),
          quantity_received: Number(quantityReceived),
          unit: unit.trim(),
          ce_marking_ok: ceMarkingOk === "yes",
          physical_state: physicalState,
          reception_status: receptionStatus,
          pame_code: pameCode.trim() || null,
          storage_location: storageLocation.trim(),
          notes: notes.trim() || null,
          rejection_reason: (physicalState === "nao_conforme" || receptionStatus !== "approved")
            ? (rejectionReason.trim() || null)
            : null,
        })
        .select("id")
        .single();
      if (error) throw error;

      // Sync pame_status on the materials table
      if (receptionStatus === "rejected") {
        await (supabase.from("materials") as any).update({ pame_status: "rejected" }).eq("id", material.id);
      } else if (receptionStatus === "approved") {
        await (supabase.from("materials") as any).update({ pame_status: "approved" }).eq("id", material.id);
      } else if (receptionStatus === "quarantine") {
        await (supabase.from("materials") as any).update({ pame_status: "quarantine" }).eq("id", material.id);
      }

      await onSuccess();
      onOpenChange(false);

      if (requiresNcPrompt) {
        setCreatedLotId(data.id);
        setShowNcPrompt(true);
        toast({ title: "Receção não conforme. Criar NC?" });
      } else {
        toast({ title: t("materials.toast.created") });
      }
    } catch (err) {
      const info = classifySupabaseError(err, t);
      toast({ title: info.title, description: info.description ?? info.raw, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleCreateNc = async () => {
    if (!createdLotId) return;
    setSaving(true);
    try {
      const { data, error } = await supabase.rpc("fn_create_reception_nc" as any, { p_lot_id: createdLotId });
      if (error) throw error;

      const ncId = (data as any)?.id ?? (Array.isArray(data) ? data[0]?.id : null);
      const ncCode = (data as any)?.code ?? (Array.isArray(data) ? data[0]?.code : null);
      setCreatedNcId(ncId);
      setCreatedNcCode(ncCode);
      setShowNcPrompt(false);
      await onSuccess();
      toast({ title: t("materials.reception.actions.ncCreated") });
    } catch (err) {
      const info = classifySupabaseError(err, t);
      toast({ title: info.title, description: info.description ?? info.raw, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("materials.reception.newReception")}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-2 md:grid-cols-2">
            <div className="grid gap-1.5">
              <Label>{t("materials.reception.form.date")}</Label>
              <Input type="date" value={receptionDate} onChange={(e) => setReceptionDate(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label>{t("materials.reception.form.supplier")}</Label>
              <Select value={supplierId} onValueChange={setSupplierId}>
                <SelectTrigger>
                  <SelectValue placeholder={loadingSuppliers ? t("common.loading") : t("materials.reception.form.supplier")} />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map((supplier) => (
                    <SelectItem key={supplier.id} value={supplier.id}>
                      {supplier.code ? `${supplier.code} · ${supplier.name}` : supplier.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-1.5">
              <Label>{t("materials.reception.form.pameCode")}</Label>
              <Input value={pameCode} onChange={(e) => setPameCode(e.target.value)} placeholder="VF.02" />
            </div>
            <div className="grid gap-1.5">
              <Label>{t("materials.reception.form.deliveryNote")}</Label>
              <Input value={deliveryNoteRef} onChange={(e) => setDeliveryNoteRef(e.target.value)} />
            </div>

            <div className="grid gap-1.5">
              <Label>{t("materials.reception.form.lotRef")}</Label>
              <Input value={lotRef} onChange={(e) => setLotRef(e.target.value)} />
            </div>
            <div className="grid grid-cols-[1fr_120px] gap-3">
              <div className="grid gap-1.5">
                <Label>{t("materials.reception.form.quantity")}</Label>
                <Input type="number" min="0" step="0.01" value={quantityReceived} onChange={(e) => setQuantityReceived(e.target.value)} />
              </div>
              <div className="grid gap-1.5">
                <Label>{t("materials.reception.form.unit")}</Label>
                <Input value={unit} onChange={(e) => setUnit(e.target.value)} />
              </div>
            </div>

            <div className="grid gap-2">
              <Label>{t("materials.reception.form.ceMarking")}</Label>
              <RadioGroup value={ceMarkingOk} onValueChange={(v) => setCeMarkingOk(v as "yes" | "no")} className="grid grid-cols-2 gap-3">
                <label className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm">
                  <RadioGroupItem value="yes" />
                  <span>{t("common.yes")}</span>
                </label>
                <label className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm">
                  <RadioGroupItem value="no" />
                  <span>{t("common.no")}</span>
                </label>
              </RadioGroup>
            </div>

            <div className="grid gap-2">
              <Label>{t("materials.reception.form.physicalState")}</Label>
              <RadioGroup value={physicalState} onValueChange={(v) => setPhysicalState(v as "conforme" | "nao_conforme")} className="grid grid-cols-2 gap-3">
                <label className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm">
                  <RadioGroupItem value="conforme" />
                  <span>{t("common.conforming", { defaultValue: "Conforme" })}</span>
                </label>
                <label className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm">
                  <RadioGroupItem value="nao_conforme" />
                  <span>{t("common.nonConforming", { defaultValue: "Não conforme" })}</span>
                </label>
              </RadioGroup>
            </div>

            <div className="grid gap-1.5 md:col-span-2">
              <Label>{t("materials.reception.form.storageLocation")}</Label>
              <Input value={storageLocation} onChange={(e) => setStorageLocation(e.target.value)} placeholder="Zona A / Palete 3" />
            </div>

            <div className="grid gap-1.5 md:col-span-2">
              <Label>{t("materials.reception.form.notes")}</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
            </div>

            {(physicalState === "nao_conforme" || createdNcCode) && (
              <div className="grid gap-1.5 md:col-span-2">
                <Label>{t("materials.reception.form.rejectionReason")}</Label>
                <Textarea value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} rows={2} />
              </div>
            )}

            {createdNcCode && (
              <div className="md:col-span-2">
                <Badge variant="secondary" className="text-xs">
                  {t("materials.reception.actions.ncCreated")}: {createdNcCode}
                </Badge>
                {createdNcId && (
                  <Link to={`/non-conformities/${createdNcId}`} className="ml-3 text-sm text-primary underline underline-offset-2">
                    {createdNcCode}
                  </Link>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>{t("common.cancel")}</Button>
            <Button variant="outline" onClick={() => handleSave("quarantine")} disabled={saving}>{t("materials.reception.actions.saveQuarantine")}</Button>
            <Button variant="destructive" onClick={() => handleSave("rejected")} disabled={saving}>{t("materials.reception.actions.reject")}</Button>
            <Button onClick={() => handleSave("approved")} disabled={saving}>{t("materials.reception.actions.approveAndSave")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showNcPrompt} onOpenChange={setShowNcPrompt}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("materials.reception.actions.createNc")}</AlertDialogTitle>
            <AlertDialogDescription>Receção não conforme. Criar NC?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleCreateNc} disabled={saving}>
              {t("materials.reception.actions.createNc")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
