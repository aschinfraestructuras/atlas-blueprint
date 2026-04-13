import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";
import { type Material } from "@/lib/services/materialService";
import { supplierService, type Supplier } from "@/lib/services/supplierService";
import { workItemService, type WorkItem } from "@/lib/services/workItemService";
import { supabase } from "@/integrations/supabase/client";
import { attachmentService } from "@/lib/services/attachmentService";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "@/lib/utils/toast";
import { classifySupabaseError } from "@/lib/utils/supabaseError";
import { Badge } from "@/components/ui/badge";
import { Camera, Upload, X, MapPin, Loader2, FlaskConical } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  material: Material;
  onSuccess: () => Promise<void> | void;
}

const today = () => new Date().toISOString().slice(0, 10);

// ── GPS helper ────────────────────────────────────────────────────────────────
function captureGeo(): Promise<{ latitude: number; longitude: number; accuracy_m: number; captured_at: string } | null> {
  if (!navigator.geolocation) return Promise.resolve(null);
  return new Promise(resolve => {
    navigator.geolocation.getCurrentPosition(
      pos => resolve({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy_m: pos.coords.accuracy,
        captured_at: new Date().toISOString(),
      }),
      () => resolve(null),
      { timeout: 8000, enableHighAccuracy: true }
    );
  });
}

// ── Foto pendente (antes do lote existir) ────────────────────────────────────
interface PendingPhoto {
  id: string;
  file: File;
  previewUrl: string;
  geo: { latitude: number; longitude: number; accuracy_m: number; captured_at: string } | null;
}

export function MaterialReceptionDialog({ open, onOpenChange, projectId, material, onSuccess }: Props) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [workItems, setWorkItems] = useState<WorkItem[]>([]);
  const [loadingSuppliers, setLoadingSuppliers] = useState(false);
  const [saving, setSaving] = useState(false);
  const [createdLotId, setCreatedLotId] = useState<string | null>(null);
  const [createdNcCode, setCreatedNcCode] = useState<string | null>(null);
  const [createdNcId, setCreatedNcId] = useState<string | null>(null);
  const [showNcPrompt, setShowNcPrompt] = useState(false);
  const [dueTestsCreated, setDueTestsCreated] = useState(0);

  // Campos do formulário
  const [receptionDate, setReceptionDate] = useState(today());
  const [supplierId, setSupplierId] = useState("");
  const [workItemId, setWorkItemId] = useState("__none__");
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

  // Fotos
  const [photos, setPhotos] = useState<PendingPhoto[]>([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const requiresNcPrompt = useMemo(
    () => ceMarkingOk === "no" || physicalState === "nao_conforme",
    [ceMarkingOk, physicalState]
  );

  // Reset ao abrir
  useEffect(() => {
    if (!open) return;
    setReceptionDate(today());
    setSupplierId(material.supplier_id ?? "");
    setWorkItemId("__none__");
    setPameCode(material.pame_code ?? "");
    setDeliveryNoteRef(""); setLotRef(""); setQuantityReceived("");
    setUnit(material.unit ?? "");
    setCeMarkingOk("yes"); setPhysicalState("conforme");
    setStorageLocation(""); setNotes(""); setRejectionReason("");
    setCreatedLotId(null); setCreatedNcCode(null); setCreatedNcId(null);
    setShowNcPrompt(false); setDueTestsCreated(0);
    setPhotos([]);

    setLoadingSuppliers(true);
    Promise.all([
      supplierService.getByProject(projectId),
      workItemService.getByProject(projectId),
    ]).then(([s, wi]) => {
      setSuppliers(s);
      setWorkItems(wi.data);
    }).catch(() => {}).finally(() => setLoadingSuppliers(false));
  }, [open, material, projectId]);

  // ── Gerir fotos ────────────────────────────────────────────────────────────
  const addPhoto = async (file: File) => {
    if (!file.type.startsWith("image/")) return;
    setUploadingPhoto(true);
    const geo = await captureGeo();
    const previewUrl = URL.createObjectURL(file);
    setPhotos(prev => [...prev, {
      id: crypto.randomUUID(),
      file, previewUrl, geo,
    }]);
    setUploadingPhoto(false);
  };

  const removePhoto = (id: string) => {
    setPhotos(prev => {
      const p = prev.find(x => x.id === id);
      if (p) URL.revokeObjectURL(p.previewUrl);
      return prev.filter(x => x.id !== id);
    });
  };

  // Upload das fotos após criação do lote
  const uploadPhotos = async (lotId: string) => {
    for (const p of photos) {
      try {
        await attachmentService.upload(p.file, projectId, "material_lot", lotId, user?.id, p.geo ?? undefined);
      } catch { /* continua — foto falhou mas lote foi criado */ }
    }
  };

  // ── Gravar ─────────────────────────────────────────────────────────────────
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
          work_item_id: workItemId === "__none__" ? null : workItemId,
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
            ? (rejectionReason.trim() || null) : null,
          received_by: user?.id ?? null,
        })
        .select("id")
        .single();
      if (error) throw error;

      const lotId = data.id;

      // Upload de fotos
      if (photos.length > 0) await uploadPhotos(lotId);

      // Sincronizar pame_status no material
      const pameMap: Record<string, string> = {
        approved: "approved", quarantine: "quarantine", rejected: "rejected"
      };
      await (supabase.from("materials") as any)
        .update({ pame_status: pameMap[receptionStatus] })
        .eq("id", material.id);

      // Auto-criar ensaios pendentes se aprovado
      let dueCreated = 0;
      if (receptionStatus === "approved") {
        try {
          const { data: dueCount } = await (supabase as any).rpc("fn_lot_received_create_due_tests", {
            p_lot_id: lotId,
            p_work_item_id: workItemId === "__none__" ? null : workItemId,
          });
          dueCreated = Number(dueCount ?? 0);
        } catch { /* regras de ensaio podem não existir — não bloqueia */ }
      }

      setDueTestsCreated(dueCreated);
      await onSuccess();
      onOpenChange(false);

      if (requiresNcPrompt) {
        setCreatedLotId(lotId);
        setShowNcPrompt(true);
      } else {
        const msg = dueCreated > 0
          ? `${t("materials.toast.created")} · ${dueCreated} ensaio(s) pendente(s) criado(s)`
          : t("materials.toast.created");
        toast({ title: msg });
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

          <div className="grid gap-4 pt-5 pb-2 md:grid-cols-2">
            {/* Data */}
            <div className="grid gap-1.5">
              <Label>{t("materials.reception.form.date")}</Label>
              <Input type="date" value={receptionDate} onChange={e => setReceptionDate(e.target.value)} />
            </div>

            {/* Fornecedor */}
            <div className="grid gap-1.5">
              <Label>{t("materials.reception.form.supplier")}</Label>
              <Select value={supplierId} onValueChange={setSupplierId}>
                <SelectTrigger>
                  <SelectValue placeholder={loadingSuppliers ? t("common.loading") : t("materials.reception.form.supplier")} />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map(s => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.code ? `${s.code} · ${s.name}` : s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Elemento de Obra */}
            <div className="grid gap-1.5 md:col-span-2">
              <Label className="flex items-center gap-1">
                {t("workItems.singular", { defaultValue: "Elemento de Obra" })}
                <span className="text-xs text-muted-foreground">(opcional — onde será aplicado)</span>
              </Label>
              <Select value={workItemId} onValueChange={setWorkItemId}>
                <SelectTrigger>
                  <SelectValue placeholder={t("common.none", { defaultValue: "Sem associação" })} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">{t("common.none", { defaultValue: "Sem associação" })}</SelectItem>
                  {workItems.map(wi => (
                    <SelectItem key={wi.id} value={wi.id}>
                      {wi.sector} {wi.disciplina ? `· ${wi.disciplina}` : ""} {wi.elemento ? `— ${wi.elemento}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* PAME / GR */}
            <div className="grid gap-1.5">
              <Label>{t("materials.reception.form.pameCode")}</Label>
              <Input value={pameCode} onChange={e => setPameCode(e.target.value)} placeholder="VF.02" />
            </div>

            {/* GR / Guia */}
            <div className="grid gap-1.5">
              <Label>{t("materials.reception.form.deliveryNote")}</Label>
              <Input value={deliveryNoteRef} onChange={e => setDeliveryNoteRef(e.target.value)} />
            </div>

            {/* Ref lote */}
            <div className="grid gap-1.5">
              <Label>{t("materials.reception.form.lotRef")}</Label>
              <Input value={lotRef} onChange={e => setLotRef(e.target.value)} />
            </div>

            {/* Quantidade + Unidade */}
            <div className="grid grid-cols-[1fr_120px] gap-3">
              <div className="grid gap-1.5">
                <Label>{t("materials.reception.form.quantity")}</Label>
                <Input type="number" min="0" step="0.01" value={quantityReceived} onChange={e => setQuantityReceived(e.target.value)} />
              </div>
              <div className="grid gap-1.5">
                <Label>{t("materials.reception.form.unit")}</Label>
                <Input value={unit} onChange={e => setUnit(e.target.value)} />
              </div>
            </div>

            {/* Marcação CE */}
            <div className="grid gap-2">
              <Label>{t("materials.reception.form.ceMarking")}</Label>
              <RadioGroup value={ceMarkingOk} onValueChange={v => setCeMarkingOk(v as "yes" | "no")} className="grid grid-cols-2 gap-3">
                <label className={cn("flex items-center gap-2 rounded-lg border px-3 py-2 text-sm cursor-pointer", ceMarkingOk === "yes" ? "border-primary bg-primary/5" : "border-border")}>
                  <RadioGroupItem value="yes" /><span>{t("common.yes")}</span>
                </label>
                <label className={cn("flex items-center gap-2 rounded-lg border px-3 py-2 text-sm cursor-pointer", ceMarkingOk === "no" ? "border-destructive bg-destructive/5" : "border-border")}>
                  <RadioGroupItem value="no" /><span>{t("common.no")}</span>
                </label>
              </RadioGroup>
            </div>

            {/* Estado físico */}
            <div className="grid gap-2">
              <Label>{t("materials.reception.form.physicalState")}</Label>
              <RadioGroup value={physicalState} onValueChange={v => setPhysicalState(v as "conforme" | "nao_conforme")} className="grid grid-cols-2 gap-3">
                <label className={cn("flex items-center gap-2 rounded-lg border px-3 py-2 text-sm cursor-pointer", physicalState === "conforme" ? "border-primary bg-primary/5" : "border-border")}>
                  <RadioGroupItem value="conforme" /><span>{t("common.conforming", { defaultValue: "Conforme" })}</span>
                </label>
                <label className={cn("flex items-center gap-2 rounded-lg border px-3 py-2 text-sm cursor-pointer", physicalState === "nao_conforme" ? "border-destructive bg-destructive/5" : "border-border")}>
                  <RadioGroupItem value="nao_conforme" /><span>{t("common.nonConforming", { defaultValue: "Não conforme" })}</span>
                </label>
              </RadioGroup>
            </div>

            {/* Local de armazenamento */}
            <div className="grid gap-1.5 md:col-span-2">
              <Label>{t("materials.reception.form.storageLocation")}</Label>
              <Input value={storageLocation} onChange={e => setStorageLocation(e.target.value)} placeholder="Zona A / Palete 3 / Estaleiro Norte" />
            </div>

            {/* Notas */}
            <div className="grid gap-1.5 md:col-span-2">
              <Label>{t("materials.reception.form.notes")}</Label>
              <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} />
            </div>

            {/* Motivo de rejeição (condicional) */}
            {(physicalState === "nao_conforme" || ceMarkingOk === "no") && (
              <div className="grid gap-1.5 md:col-span-2">
                <Label>{t("materials.reception.form.rejectionReason")}</Label>
                <Textarea value={rejectionReason} onChange={e => setRejectionReason(e.target.value)} rows={2}
                  placeholder="Descrever anomalia observada..." />
              </div>
            )}

            {/* ── Fotos com GPS ── */}
            <div className="md:col-span-2 space-y-2">
              <Label className="flex items-center gap-1.5">
                <Camera className="h-3.5 w-3.5" />
                {t("attachments.photos", { defaultValue: "Fotos da recepção" })}
                <span className="text-xs text-muted-foreground">(GPS automático)</span>
              </Label>

              {/* Grelha de previews */}
              {photos.length > 0 && (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {photos.map(p => (
                    <div key={p.id} className="relative aspect-square rounded-lg overflow-hidden border border-border group">
                      <img src={p.previewUrl} alt="" className="w-full h-full object-cover" />
                      {p.geo && (
                        <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-1.5 py-0.5 flex items-center gap-1">
                          <MapPin className="h-2.5 w-2.5 text-emerald-400 flex-shrink-0" />
                          <span className="text-[9px] text-emerald-300 truncate">
                            {p.geo.latitude.toFixed(4)}, {p.geo.longitude.toFixed(4)}
                          </span>
                        </div>
                      )}
                      <button
                        onClick={() => removePhoto(p.id)}
                        className="absolute top-1 right-1 h-5 w-5 rounded-full bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-3 w-3 text-white" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Botões de foto */}
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" className="gap-1.5 text-xs"
                  disabled={uploadingPhoto}
                  onClick={() => cameraRef.current?.click()}>
                  {uploadingPhoto ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
                  Câmara
                </Button>
                <Button type="button" variant="outline" size="sm" className="gap-1.5 text-xs"
                  disabled={uploadingPhoto}
                  onClick={() => fileRef.current?.click()}>
                  <Upload className="h-3.5 w-3.5" />
                  Ficheiro
                </Button>
                <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) addPhoto(f); e.target.value = ""; }} />
                <input ref={fileRef} type="file" accept="image/*,application/pdf" multiple className="hidden"
                  onChange={e => { Array.from(e.target.files ?? []).forEach(addPhoto); e.target.value = ""; }} />
              </div>
            </div>

            {/* Badge NC criada */}
            {createdNcCode && (
              <div className="md:col-span-2 flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">
                  NC criada: {createdNcCode}
                </Badge>
                {createdNcId && (
                  <Link to={`/non-conformities/${createdNcId}`} className="text-sm text-primary underline underline-offset-2">
                    {createdNcCode}
                  </Link>
                )}
              </div>
            )}

            {/* Info ensaios criados */}
            {dueTestsCreated > 0 && (
              <div className="md:col-span-2 flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-400">
                <FlaskConical className="h-4 w-4" />
                {dueTestsCreated} ensaio(s) pendente(s) criado(s) automaticamente
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0 flex-wrap">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>{t("common.cancel")}</Button>
            <Button variant="outline" onClick={() => handleSave("quarantine")} disabled={saving}>
              {t("materials.reception.actions.saveQuarantine")}
            </Button>
            <Button variant="destructive" onClick={() => handleSave("rejected")} disabled={saving}>
              {t("materials.reception.actions.reject")}
            </Button>
            <Button onClick={() => handleSave("approved")} disabled={saving}>
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : null}
              {t("materials.reception.actions.approveAndSave")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showNcPrompt} onOpenChange={setShowNcPrompt}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("materials.reception.actions.createNc")}</AlertDialogTitle>
            <AlertDialogDescription>Receção não conforme. Criar NC automática para este lote?</AlertDialogDescription>
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
