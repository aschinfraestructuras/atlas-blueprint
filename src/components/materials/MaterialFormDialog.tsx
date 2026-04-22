import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useProject } from "@/contexts/ProjectContext";
import { useAuth } from "@/contexts/AuthContext";
import { materialService, type Material, type MaterialInput } from "@/lib/services/materialService";
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
import { toast } from "@/lib/utils/toast";

const CATEGORIES = [
  "betao", "aco", "solos", "agregado", "mbc", "pintura",
  "geossintetico", "soldadura", "tubagem", "prefabricado", "outro",
];

const UNITS = ["m3", "t", "m2", "m", "u", "kg", "l"];

const PAME_PRIORITIES = ["critica", "alta", "normal", "baixa"];

const DISCIPLINAS = [
  "geral", "estruturas", "geotecnia", "hidraulica", "estradas",
  "ambiente", "seguranca", "eletrica", "mecanica", "outro",
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  material?: Material | null;
  onSuccess: () => void;
}

export function MaterialFormDialog({ open, onOpenChange, material, onSuccess }: Props) {
  const { t } = useTranslation();
  const { activeProject } = useProject();
  const { user } = useAuth();
  const isEdit = !!material;

  // Identification fields
  const [name, setName] = useState("");
  const [category, setCategory] = useState("betao");
  const [subcategory, setSubcategory] = useState("");
  const [specification, setSpecification] = useState("");
  const [unit, setUnit] = useState("");
  const [normativeRefs, setNormativeRefs] = useState("");
  const [acceptanceCriteria, setAcceptanceCriteria] = useState("");

  // PAME fields
  const [pameCode, setPameCode] = useState("");
  const [pameStatus, setPameStatus] = useState("pending");
  const [pameDisciplina, setPameDisciplina] = useState("");
  const [pamePrioridade, setPamePrioridade] = useState("");
  const [pameNorma, setPameNorma] = useState("");
  const [pameDocsReq, setPameDocsReq] = useState("");
  const [pamePpiRef, setPamePpiRef] = useState("");

  // Certificação ferroviária
  const [applicableStandard, setApplicableStandard]       = useState("");
  const [steelGrade, setSteelGrade]                       = useState("");
  const [millCertRef, setMillCertRef]                     = useState("");
  const [dopRef, setDopRef]                               = useState("");
  const [ceMarking, setCeMarking]                         = useState(false);
  const [ceMarkingRef, setCeMarkingRef]                   = useState("");
  const [manufacturerRef, setManufacturerRef]             = useState("");
  const [countryOfOrigin, setCountryOfOrigin]             = useState("");
  const [technicalDatasheetRef, setTechnicalDatasheetRef] = useState("");

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (material) {
      setName(material.name);
      setCategory(material.category);
      setSubcategory(material.subcategory ?? "");
      setSpecification(material.specification ?? "");
      setUnit(material.unit ?? "");
      setNormativeRefs(material.normative_refs ?? "");
      setAcceptanceCriteria(material.acceptance_criteria ?? "");
      setPameCode(material.pame_code ?? "");
      setPameStatus(material.pame_status ?? "pending");
      setPameDisciplina((material as any).pame_disciplina ?? "");
      setPamePrioridade((material as any).pame_prioridade ?? "");
      setPameNorma((material as any).pame_norma ?? "");
      setPameDocsReq((material as any).pame_docs_req ?? "");
      setPamePpiRef((material as any).pame_ppi_ref ?? "");
      // Certificação ferroviária
      setApplicableStandard((material as any).applicable_standard ?? "");
      setSteelGrade((material as any).steel_grade ?? "");
      setMillCertRef((material as any).mill_certificate_ref ?? "");
      setDopRef((material as any).declaration_of_performance_ref ?? "");
      setCeMarking((material as any).ce_marking ?? false);
      setCeMarkingRef((material as any).ce_marking_ref ?? "");
      setManufacturerRef((material as any).manufacturer_ref ?? "");
      setCountryOfOrigin((material as any).country_of_origin ?? "");
      setTechnicalDatasheetRef((material as any).technical_datasheet_ref ?? "");
    } else {
      setName(""); setCategory("betao"); setSubcategory("");
      setSpecification(""); setUnit(""); setNormativeRefs(""); setAcceptanceCriteria("");
      setPameCode(""); setPameStatus("pending"); setPameDisciplina("");
      setPamePrioridade(""); setPameNorma(""); setPameDocsReq(""); setPamePpiRef("");
      setApplicableStandard(""); setSteelGrade(""); setMillCertRef(""); setDopRef("");
      setCeMarking(false); setCeMarkingRef(""); setManufacturerRef(""); setCountryOfOrigin(""); setTechnicalDatasheetRef("");
    }
  }, [material, open]);

  const handleSubmit = async () => {
    if (!activeProject || !user || !name.trim() || !category) return;
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        name: name.trim(),
        category,
        subcategory: subcategory || undefined,
        specification: specification || undefined,
        unit: unit || undefined,
        normative_refs: normativeRefs || undefined,
        acceptance_criteria: acceptanceCriteria || undefined,
        pame_code: pameCode || undefined,
        pame_status: pameStatus || undefined,
        pame_disciplina: pameDisciplina || undefined,
        pame_prioridade: pamePrioridade || undefined,
        pame_norma: pameNorma || undefined,
        pame_docs_req: pameDocsReq || undefined,
        pame_ppi_ref: pamePpiRef || undefined,
        // Certificação ferroviária
        applicable_standard: applicableStandard || undefined,
        steel_grade: steelGrade || undefined,
        mill_certificate_ref: millCertRef || undefined,
        declaration_of_performance_ref: dopRef || undefined,
        ce_marking: ceMarking,
        ce_marking_ref: ceMarkingRef || undefined,
        manufacturer_ref: manufacturerRef || undefined,
        country_of_origin: countryOfOrigin || undefined,
        technical_datasheet_ref: technicalDatasheetRef || undefined,
      };

      if (isEdit && material) {
        await materialService.update(material.id, activeProject.id, payload as any);
        toast({ title: t("materials.toast.updated") });
      } else {
        await materialService.create({
          project_id: activeProject.id,
          ...payload,
        } as any);
        toast({ title: t("materials.toast.created") });
      }
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      console.error(err);
      toast({ title: t("materials.toast.error"), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? t("materials.form.titleEdit") : t("materials.form.titleCreate")}</DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh] pr-1">
          <div className="space-y-4 pt-5 pb-2">
            {/* ── Section 1: Identification ── */}
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{t("materials.form.sectionIdentification")}</p>

            <div className="grid gap-1.5">
              <Label>{t("materials.form.name")} *</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder={t("materials.form.namePlaceholder")} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-1.5">
                <Label>{t("materials.form.category")} *</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => (
                      <SelectItem key={c} value={c}>{t(`materials.categories.${c}`, { defaultValue: c })}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label>{t("materials.form.subcategory")}</Label>
                <Input value={subcategory} onChange={e => setSubcategory(e.target.value)} placeholder={t("materials.form.subcategoryPlaceholder")} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-1.5">
                <Label>{t("materials.form.specification")}</Label>
                <Input value={specification} onChange={e => setSpecification(e.target.value)} placeholder={t("materials.form.specificationPlaceholder")} />
              </div>
              <div className="grid gap-1.5">
                <Label>{t("materials.form.unit")}</Label>
                <Select value={unit} onValueChange={setUnit}>
                  <SelectTrigger><SelectValue placeholder={t("materials.form.unitPlaceholder")} /></SelectTrigger>
                  <SelectContent>
                    {UNITS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-1.5">
              <Label>{t("materials.form.normativeRefs")}</Label>
              <Textarea value={normativeRefs} onChange={e => setNormativeRefs(e.target.value)} placeholder={t("materials.form.normativeRefsPlaceholder")} rows={2} />
            </div>

            <div className="grid gap-1.5">
              <Label>{t("materials.form.acceptanceCriteria")}</Label>
              <Textarea value={acceptanceCriteria} onChange={e => setAcceptanceCriteria(e.target.value)} placeholder={t("materials.form.acceptanceCriteriaPlaceholder")} rows={2} />
            </div>

            <Separator />

            {/* ── Section: Certificação Ferroviária (EN 13674, EN 13230, etc.) ── */}
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              {t("materials.form.certSection", { defaultValue: "Certificação Ferroviária" })}
            </p>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-1.5">
                <Label>{t("materials.form.applicableStandard", { defaultValue: "Norma de produto" })}</Label>
                <Input value={applicableStandard} onChange={e => setApplicableStandard(e.target.value)} placeholder="EN 13674-1, EN 13230..." />
              </div>
              <div className="grid gap-1.5">
                <Label>{t("materials.form.steelGrade", { defaultValue: "Grau do aço / classe" })}</Label>
                <Input value={steelGrade} onChange={e => setSteelGrade(e.target.value)} placeholder="R260, R350HT, C40/50..." />
              </div>
              <div className="grid gap-1.5">
                <Label>{t("materials.form.millCertRef", { defaultValue: "Ref. certificado de fábrica" })}</Label>
                <Input value={millCertRef} onChange={e => setMillCertRef(e.target.value)} placeholder="Ex: MC-2024-00123" />
              </div>
              <div className="grid gap-1.5">
                <Label>{t("materials.form.dopRef", { defaultValue: "Ref. Declaração de Desempenho (DoP)" })}</Label>
                <Input value={dopRef} onChange={e => setDopRef(e.target.value)} placeholder="Ex: DoP-EN13674-2024" />
              </div>
              <div className="grid gap-1.5">
                <Label>{t("materials.form.ceMark", { defaultValue: "Marcação CE" })}</Label>
                <div className="flex items-center gap-3 pt-1">
                  <input type="checkbox" checked={ceMarking} onChange={e => setCeMarking(e.target.checked)} className="h-4 w-4 rounded" id="ce_marking" />
                  <label htmlFor="ce_marking" className="text-sm cursor-pointer">{t("materials.form.ceMarkHas", { defaultValue: "Produto com Marcação CE" })}</label>
                </div>
              </div>
              <div className="grid gap-1.5">
                <Label>{t("materials.form.ceMarkRef", { defaultValue: "Ref. Marcação CE" })}</Label>
                <Input value={ceMarkingRef} onChange={e => setCeMarkingRef(e.target.value)} placeholder="Ex: 0051-CPR-2024-001" disabled={!ceMarking} />
              </div>
              <div className="grid gap-1.5">
                <Label>{t("materials.form.manufacturerRef", { defaultValue: "Ref. fabricante" })}</Label>
                <Input value={manufacturerRef} onChange={e => setManufacturerRef(e.target.value)} placeholder="Referência interna do fabricante" />
              </div>
              <div className="grid gap-1.5">
                <Label>{t("materials.form.countryOfOrigin", { defaultValue: "País de fabrico" })}</Label>
                <Input value={countryOfOrigin} onChange={e => setCountryOfOrigin(e.target.value)} placeholder="Ex: Portugal, Espanha, Áustria" />
              </div>
              <div className="col-span-2 grid gap-1.5">
                <Label>{t("materials.form.technicalDatasheetRef", { defaultValue: "Ref. ficha técnica aprovada" })}</Label>
                <Input value={technicalDatasheetRef} onChange={e => setTechnicalDatasheetRef(e.target.value)} placeholder="Referência da ficha técnica validada pela Fiscalização" />
              </div>
            </div>

            {/* ── Section 2: PAME ── */}
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">PAME</p>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-1.5">
                <Label>{t("materials.pameCode")}</Label>
                <Input value={pameCode} onChange={e => setPameCode(e.target.value)} placeholder="VF.02" />
              </div>
              <div className="grid gap-1.5">
                <Label>{t("materials.pameStatus")}</Label>
                <Select value={pameStatus} onValueChange={setPameStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(["pending", "submitted", "approved", "conditional", "rejected"] as const).map(status => (
                      <SelectItem key={status} value={status}>{t(`materials.pameStatuses.${status}`, { defaultValue: status })}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-1.5">
                <Label>{t("materials.form.pameDisciplina")}</Label>
                <Select value={pameDisciplina} onValueChange={setPameDisciplina}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">—</SelectItem>
                    {DISCIPLINAS.map(d => (
                      <SelectItem key={d} value={d}>{t(`documents.disciplinas.${d}`, { defaultValue: d })}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label>{t("materials.form.pamePrioridade")}</Label>
                <Select value={pamePrioridade} onValueChange={setPamePrioridade}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">—</SelectItem>
                    {PAME_PRIORITIES.map(p => (
                      <SelectItem key={p} value={p}>{t(`materials.pamePriorities.${p}`, { defaultValue: p })}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-1.5">
              <Label>{t("materials.form.pameNorma")}</Label>
              <Input value={pameNorma} onChange={e => setPameNorma(e.target.value)} placeholder="EN 10080, UNE-EN 206" />
            </div>

            <div className="grid gap-1.5">
              <Label>{t("materials.form.pameDocsReq")}</Label>
              <Textarea value={pameDocsReq} onChange={e => setPameDocsReq(e.target.value)} placeholder={t("materials.form.pameDocsReqPlaceholder")} rows={2} />
            </div>

            <div className="grid gap-1.5">
              <Label>{t("materials.form.pamePpiRef")}</Label>
              <Input value={pamePpiRef} onChange={e => setPamePpiRef(e.target.value)} placeholder="PPI-001" />
            </div>
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t("common.cancel")}</Button>
          <Button onClick={handleSubmit} disabled={saving || !name.trim()}>
            {saving ? t("common.loading") : isEdit ? t("common.save") : t("materials.form.createBtn")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
