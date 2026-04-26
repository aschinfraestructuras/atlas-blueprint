import { useEffect, useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { useProject } from "@/contexts/ProjectContext";
import { ncService } from "@/lib/services/ncService";
import type { NonConformity } from "@/lib/services/ncService";
import { toast } from "@/lib/utils/toast";
import { classifySupabaseError } from "@/lib/utils/supabaseError";
import { withOtherRefinement } from "@/components/ui/select-with-other.utils";
import { teamsNcOpen } from "@/lib/services/teamsWebhookService";
import { SelectWithOther } from "@/components/ui/select-with-other";
import { usePPIInstances } from "@/hooks/usePPI";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Loader2, AlertCircle, AlertTriangle } from "lucide-react";
import { AttachmentsPanel } from "@/components/attachments/AttachmentsPanel";
import { MemberPicker } from "@/components/members/MemberPicker";
import { cn } from "@/lib/utils";

// ─── Schema ───────────────────────────────────────────────────────────────────

const DISCIPLINES = ["terras", "betao", "ferrovia", "catenaria", "st", "drenagem", "estruturas", "via", "geotecnia", "eletrica", "sinalizacao", "passagens_nivel", "edificios", "outros"] as const;
const CE_DISCIPLINES = ["via", "catenaria", "drenagem", "estruturas", "geotecnia", "eletrica", "sinalizacao", "passagens_nivel", "edificios", "outros"] as const;
const CORRECTION_TYPES = ["accept", "repair", "demolish", "reject"] as const;
const ROOT_CAUSE_METHODS = ["5whys", "ishikawa", "other"] as const;

const schema = (t: (k: string) => string) =>
  z.object({
    title:               z.string().trim().min(1, t("nc.form.validation.titleRequired")).max(200),
    description:         z.string().trim().min(1, t("nc.form.validation.descriptionRequired")).max(2000),
    severity:            z.string().min(1, t("nc.form.validation.severityRequired")),
    category:            z.string().min(1),
    category_outro:      z.string().trim().max(100).optional().or(z.literal("")),
    origin:              z.string().min(1),
    reference:           z.string().trim().max(50).optional().or(z.literal("")),
    responsible:         z.string().trim().max(120).optional().or(z.literal("")),
    due_date:            z.string().optional().or(z.literal("")),
    detected_at:         z.string().optional().or(z.literal("")),
    // PG-03 fields
    location_pk:         z.string().trim().max(200).optional().or(z.literal("")),
    discipline:          z.string().optional().or(z.literal("")),
    discipline_outro:    z.string().trim().max(100).optional().or(z.literal("")),
    classification:      z.string().min(1, t("nc.form.validation.classificationRequired")),
    ppi_instance_id:     z.string().optional().or(z.literal("")),
    violated_requirement: z.string().trim().max(500).optional().or(z.literal("")),
    // Correction
    correction_type:     z.string().optional().or(z.literal("")),
    correction:          z.string().trim().max(2000).optional().or(z.literal("")),
    // Root cause
    root_cause_method:   z.string().optional().or(z.literal("")),
    root_cause:          z.string().trim().max(2000).optional().or(z.literal("")),
    // Corrective action
    corrective_action:   z.string().trim().max(2000).optional().or(z.literal("")),
    preventive_action:   z.string().trim().max(2000).optional().or(z.literal("")),
    assigned_to:         z.string().trim().max(200).optional().or(z.literal("")),
    ac_efficacy_indicator: z.string().trim().max(500).optional().or(z.literal("")),
    // Closure
    verification_method: z.string().trim().max(500).optional().or(z.literal("")),
    verification_result: z.string().trim().max(500).optional().or(z.literal("")),
    verified_at:         z.string().optional().or(z.literal("")),
    closure_date:        z.string().optional().or(z.literal("")),
    fip_validated_by:    z.string().trim().max(200).optional().or(z.literal("")),
    // CE fields
    audit_origin_type:       z.string().optional().or(z.literal("")),
    actual_completion_date:  z.string().optional().or(z.literal("")),
    deviation_justification: z.string().trim().max(2000).optional().or(z.literal("")),
    efficacy_analysis:       z.string().trim().max(2000).optional().or(z.literal("")),
  }).superRefine((val, ctx) => {
    withOtherRefinement(val, ctx, "category", "category_outro", t("nc.form.validation.categoryOutroRequired"));
    withOtherRefinement(val, ctx, "discipline", "discipline_outro", t("nc.form.validation.disciplineOutroRequired"), "outros");
  });

type FormValues = z.infer<ReturnType<typeof schema>>;

// ─── Props ────────────────────────────────────────────────────────────────────

interface NCFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nc?: NonConformity | null;
  originOverride?: string;
  /** Pré-preenchimento ao abrir nova NC vinda de fluxo "fail" */
  prefill?: {
    test_result_id?: string;
    work_item_id?: string;
    ppi_instance_id?: string;
    description?: string;
    title?: string;
  };
  onSuccess: () => void;
}

// ─── Defaults ─────────────────────────────────────────────────────────────────

const defaultValues = (origin?: string): FormValues => ({
  title: "", description: "",
  severity: "major", category: "qualidade", category_outro: "",
  origin: origin ?? "manual", reference: "", responsible: "",
  due_date: "", detected_at: new Date().toISOString().split("T")[0],
  location_pk: "", discipline: "", discipline_outro: "", classification: "",
  ppi_instance_id: "", violated_requirement: "",
  correction_type: "", correction: "",
  root_cause_method: "", root_cause: "",
  corrective_action: "", preventive_action: "",
  assigned_to: "", ac_efficacy_indicator: "",
  verification_method: "", verification_result: "",
  verified_at: "", closure_date: "", fip_validated_by: "",
  audit_origin_type: "", actual_completion_date: "",
  deviation_justification: "", efficacy_analysis: "",
});

// ─── Componente ───────────────────────────────────────────────────────────────

export function NCFormDialog({
  open, onOpenChange, nc, originOverride, prefill, onSuccess,
}: NCFormDialogProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { activeProject } = useProject();
  const [submitting, setSubmitting] = useState(false);
  const isEdit = !!nc;
  const { data: ppiInstances } = usePPIInstances();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema(t)),
    defaultValues: defaultValues(originOverride),
  });

  const watchedOrigin = form.watch("origin");
  const watchedCategory = form.watch("category");
  const watchedClassification = form.watch("classification");
  const isMaior = watchedClassification === "maior";
  const showClosure = isEdit && nc && ["in_review", "closed"].includes(nc.status);

  useEffect(() => {
    if (!open) return;
    if (nc) {
      form.reset({
      title:               nc.title ?? "",
      description:         nc.description,
      severity:            nc.severity,
      category:            nc.category ?? "qualidade",
      category_outro:      (nc as any).category_outro ?? "",
      origin:              nc.origin ?? "manual",
      reference:           nc.reference ?? "",
      responsible:         nc.responsible ?? "",
      due_date:            nc.due_date ?? "",
      detected_at:         nc.detected_at ?? "",
      location_pk:         (nc as any).location_pk ?? "",
      discipline:          (nc as any).discipline ?? "",
      discipline_outro:    (nc as any).discipline_outro ?? "",
      classification:      (nc as any).classification ?? "",
      ppi_instance_id:     nc.ppi_instance_id ?? "",
      violated_requirement: (nc as any).violated_requirement ?? "",
      correction_type:     (nc as any).correction_type ?? "",
      correction:          nc.correction ?? "",
      root_cause_method:   (nc as any).root_cause_method ?? "",
      root_cause:          nc.root_cause ?? "",
      corrective_action:   nc.corrective_action ?? "",
      preventive_action:   (nc as any).preventive_action ?? "",
      assigned_to:         "",
      ac_efficacy_indicator: (nc as any).ac_efficacy_indicator ?? "",
      verification_method: nc.verification_method ?? "",
      verification_result: nc.verification_result ?? "",
      verified_at:         (nc as any).verified_at ? new Date((nc as any).verified_at).toISOString().split("T")[0] : "",
      closure_date:        nc.closure_date ?? "",
      fip_validated_by:    (nc as any).fip_validated_by ?? "",
      audit_origin_type:       nc.audit_origin_type ?? "",
      actual_completion_date:  nc.actual_completion_date ?? "",
      deviation_justification: nc.deviation_justification ?? "",
      efficacy_analysis:       nc.efficacy_analysis ?? "",
      });
    } else {
      // Nova NC — aplicar prefill se existir (ex: vinda de ensaio fail)
      const base = defaultValues(prefill?.test_result_id ? "test" : (prefill?.ppi_instance_id ? "ppi" : originOverride));
      if (prefill?.description) base.description = prefill.description;
      if (prefill?.title) base.title = prefill.title;
      if (prefill?.ppi_instance_id) base.ppi_instance_id = prefill.ppi_instance_id;
      form.reset(base);
    }
  }, [open, nc, form, originOverride, prefill]);

  const onSubmit = async (values: FormValues) => {
    if (!user || !activeProject) return;
    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        title:               values.title,
        description:         values.description,
        severity:            values.severity,
        category:            values.category,
        category_outro:      values.category === "outros" ? (values.category_outro || undefined) : undefined,
        origin:              values.origin,
        reference:           values.reference || undefined,
        responsible:         values.responsible || undefined,
        assigned_to:         values.assigned_to && values.assigned_to.trim() ? values.assigned_to : undefined,
        due_date:            values.due_date || undefined,
        detected_at:         values.detected_at || undefined,
        location_pk:         values.location_pk || undefined,
        latitude:            (values as any).latitude  ?? null,
        longitude:           (values as any).longitude ?? null,
        discipline:          values.discipline || undefined,
        discipline_outro:    values.discipline === "outros" ? (values.discipline_outro || undefined) : undefined,
        classification:      values.classification || undefined,
        ppi_instance_id:     values.ppi_instance_id || undefined,
        violated_requirement: values.violated_requirement || undefined,
        correction_type:     values.correction_type || undefined,
        correction:          values.correction || undefined,
        root_cause_method:   values.root_cause_method || undefined,
        root_cause:          values.root_cause || undefined,
        corrective_action:   values.corrective_action || undefined,
        preventive_action:   values.preventive_action || undefined,
        ac_efficacy_indicator: values.ac_efficacy_indicator || undefined,
        verification_method: values.verification_method || undefined,
        verification_result: values.verification_result || undefined,
        verified_at:         values.verified_at || undefined,
        closure_date:        values.closure_date || undefined,
        fip_validated_by:    values.fip_validated_by || undefined,
        audit_origin_type:       values.audit_origin_type || undefined,
        actual_completion_date:  values.actual_completion_date || undefined,
        deviation_justification: values.deviation_justification || undefined,
        efficacy_analysis:       values.efficacy_analysis || undefined,
      };

      if (isEdit && nc) {
        await ncService.update(nc.id, activeProject.id, payload as any, nc.status);
        toast({ title: t("nc.toast.updated") });
      } else {
        // Em criação, anexar ids de origem (prefill) — ligação dura à origem técnica
        if (prefill?.test_result_id) {
          payload.test_result_id = prefill.test_result_id;
        }
        if (prefill?.work_item_id) {
          payload.work_item_id = prefill.work_item_id;
        }
        if (prefill?.ppi_instance_id) {
          payload.ppi_instance_id = prefill.ppi_instance_id;
        }
        const created = await ncService.create({
          project_id: activeProject.id,
          ...payload,
        } as any);
        toast({ title: t("nc.toast.created") });
        // Notificar Teams (melhor-esforço, silencioso)
        teamsNcOpen({
          projectId: activeProject.id,
          ncCode: created?.code ?? "—",
          title: values.title,
          severity: values.severity,
          dueDate: (values as any).due_date ?? null,
          baseUrl: window.location.origin,
        });
      }
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      const info = classifySupabaseError(err);
      toast({
        title: t(info.titleKey),
        description: info.descriptionKey ? t(info.descriptionKey) : info.raw || t("auth.errors.unexpected"),
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[720px] max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">
            {isEdit ? t("nc.form.titleEdit") : t("nc.form.titleCreate")}
            {nc?.code && (
              <span className="ml-2 text-xs font-mono text-muted-foreground">{nc.code}</span>
            )}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-0 pt-5">
            <Tabs defaultValue="identification" className="w-full">
              <TabsList className="w-full mb-4 flex-wrap h-auto gap-1">
                <TabsTrigger value="identification" className="text-xs gap-1">
                  {watchedClassification ? "✓" : "○"} 1. {t("nc.form.tabs.identification", { defaultValue: "Identificação" })}
                </TabsTrigger>
                <TabsTrigger value="description" className="text-xs gap-1">
                  {form.watch("description") ? "✓" : "○"} 2. {t("nc.form.tabs.description", { defaultValue: "Descrição" })}
                </TabsTrigger>
                <TabsTrigger value="correction" className="text-xs gap-1">
                  {form.watch("correction_type") ? "✓" : "○"} 3. {t("nc.form.tabs.correction", { defaultValue: "Correcção" })}
                </TabsTrigger>
                <TabsTrigger value="rootcause" className="text-xs gap-1">
                  {form.watch("root_cause") ? "✓" : isMaior ? "⚠" : "○"} 4. {t("nc.form.tabs.rootCause", { defaultValue: "Causa Raiz" })}
                </TabsTrigger>
                <TabsTrigger value="capa" className="text-xs gap-1">
                  {form.watch("corrective_action") ? "✓" : "○"} 5. {t("nc.form.tabs.capa", { defaultValue: "Acção Corretiva" })}
                </TabsTrigger>
                {showClosure && (
                  <TabsTrigger value="closure" className="text-xs gap-1">
                    {form.watch("verification_result") ? "✓" : "○"} 6. {t("nc.form.tabs.closure", { defaultValue: "Fecho" })}
                  </TabsTrigger>
                )}
                {isEdit && (
                  <TabsTrigger value="attachments" className="text-xs">
                    {t("nc.form.tabs.attachments")}
                  </TabsTrigger>
                )}
              </TabsList>

              {/* ── SECÇÃO 1: IDENTIFICAÇÃO ─────────────────────────────── */}
              <TabsContent value="identification" className="space-y-4 mt-0">
                {/* Code (read-only) */}
                {nc?.code && (
                  <div>
                    <Label className="text-xs text-muted-foreground">{t("nc.table.code", { defaultValue: "Código" })}</Label>
                    <p className="font-mono text-sm mt-0.5">{nc.code}</p>
                  </div>
                )}

                {/* Título */}
                <FormField control={form.control} name="title" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("nc.form.title")}</FormLabel>
                    <FormControl>
                      <Input placeholder={t("nc.form.titlePlaceholder")} autoFocus {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <div className="grid grid-cols-2 gap-3">
                  <FormField control={form.control} name="detected_at" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("nc.form.detectedAt")}</FormLabel>
                      <FormControl><Input type="date" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="location_pk" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("nc.form.locationPk")}</FormLabel>
                      <FormControl><Input placeholder="Ex: PK 12+500" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                {/* GPS */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">{t("nc.form.gpsCoords", { defaultValue: "Coordenadas GPS" })}</span>
                    <Button
                      type="button" variant="outline" size="sm" className="h-7 gap-1.5 text-xs"
                      onClick={() => {
                        if (!navigator.geolocation) return;
                        navigator.geolocation.getCurrentPosition(
                          (pos) => {
                            form.setValue("latitude" as any, pos.coords.latitude);
                            form.setValue("longitude" as any, pos.coords.longitude);
                          },
                          () => {},
                          { enableHighAccuracy: true, timeout: 10000 }
                        );
                      }}
                    >
                      <span>📍</span>{t("nc.form.captureGps", { defaultValue: "Capturar GPS" })}
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Input type="number" step="any" placeholder={t("workItems.form.latitude", { defaultValue: "Latitude" })}
                      value={(form.watch("latitude" as any) as number | undefined) ?? ""}
                      onChange={(e) => form.setValue("latitude" as any, e.target.value === "" ? undefined : parseFloat(e.target.value))}
                      className="text-xs" />
                    <Input type="number" step="any" placeholder={t("workItems.form.longitude", { defaultValue: "Longitude" })}
                      value={(form.watch("longitude" as any) as number | undefined) ?? ""}
                      onChange={(e) => form.setValue("longitude" as any, e.target.value === "" ? undefined : parseFloat(e.target.value))}
                      className="text-xs" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <FormField control={form.control} name="discipline" render={({ field }) => (
                    <SelectWithOther
                      label={t("nc.form.discipline")}
                      options={DISCIPLINES.map(d => ({ value: d, label: t(`nc.discipline.${d}`, { defaultValue: d }) }))}
                      value={field.value || ""}
                      onChange={field.onChange}
                      otherValue="outros"
                      otherFieldName="discipline_outro"
                      control={form.control}
                      otherLabel={t("nc.form.disciplineOtro")}
                      otherPlaceholder={t("nc.form.disciplineOtroPlaceholder")}
                    />
                  )} />
                  <FormField control={form.control} name="ppi_instance_id" render={({ field }) => (
                    <FormItem>
                      <FormLabel>PPI <span className="text-xs text-muted-foreground">({t("common.optional")})</span></FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || "__none__"}>
                        <FormControl><SelectTrigger><SelectValue placeholder="—" /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="__none__">—</SelectItem>
                          {ppiInstances.map(p => (
                            <SelectItem key={p.id} value={p.id}>{p.code}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                {/* Classification - REQUIRED */}
                <FormField control={form.control} name="classification" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("nc.form.classification")} *</FormLabel>
                    <FormControl>
                      <RadioGroup onValueChange={field.onChange} value={field.value} className="flex flex-wrap gap-4">
                        <div className="flex items-center gap-2">
                          <RadioGroupItem value="maior" id="cls-maior" />
                          <Label htmlFor="cls-maior" className="text-sm font-medium text-destructive">{t("nc.form.classificationMaior")}</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <RadioGroupItem value="menor" id="cls-menor" />
                          <Label htmlFor="cls-menor" className="text-sm font-medium">{t("nc.form.classificationMenor")}</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <RadioGroupItem value="observacao" id="cls-obs" />
                          <Label htmlFor="cls-obs" className="text-sm font-medium text-muted-foreground">{t("nc.form.classificationObs")}</Label>
                        </div>
                        <Separator orientation="vertical" className="h-5 mx-1" />
                        <div className="flex items-center gap-2">
                          <RadioGroupItem value="C" id="cls-c" />
                          <Label htmlFor="cls-c" className="text-sm font-medium text-blue-600 dark:text-blue-400">{t("nc.form.classificationC")}</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <RadioGroupItem value="AC" id="cls-ac" />
                          <Label htmlFor="cls-ac" className="text-sm font-medium text-amber-600 dark:text-amber-400">{t("nc.form.classificationAC")}</Label>
                        </div>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                {/* Classification banners */}
                {watchedClassification === "maior" && (
                  <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-2 text-sm text-destructive flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                    <span>{t("nc.form.classificationBannerMaior")}</span>
                  </div>
                )}
                {watchedClassification === "menor" && (
                  <Badge variant="secondary" className="text-xs bg-amber-500/15 text-amber-600 dark:text-amber-400">{t("nc.form.classificationBannerMenor")}</Badge>
                )}
                {watchedClassification === "observacao" && (
                  <Badge variant="secondary" className="text-xs">{t("nc.form.classificationBannerObs")}</Badge>
                )}
                {watchedClassification === "C" && (
                  <Badge variant="secondary" className="text-xs bg-blue-500/10 text-blue-700 dark:text-blue-400">{t("nc.form.classificationC")}</Badge>
                )}
                {watchedClassification === "AC" && (
                  <Badge variant="secondary" className="text-xs bg-amber-500/10 text-amber-700 dark:text-amber-400">{t("nc.form.classificationAC")}</Badge>
                )}

                <FormField control={form.control} name="responsible" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("nc.form.responsibleDetected")}</FormLabel>
                    <FormControl><Input placeholder={t("nc.form.responsiblePlaceholder")} {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                {/* Severidade + Categoria */}
                <div className="grid grid-cols-2 gap-3">
                  <FormField control={form.control} name="severity" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("nc.table.severity")}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="minor">{t("nc.severity.minor")}</SelectItem>
                          <SelectItem value="major">{t("nc.severity.major")}</SelectItem>
                          <SelectItem value="critical">{t("nc.severity.critical")}</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="category" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("nc.form.category")}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="qualidade">{t("nc.category.qualidade")}</SelectItem>
                          <SelectItem value="seguranca">{t("nc.category.seguranca")}</SelectItem>
                          <SelectItem value="ambiente">{t("nc.category.ambiente")}</SelectItem>
                          <SelectItem value="producao">{t("nc.category.producao")}</SelectItem>
                          <SelectItem value="outros">{t("nc.category.outros")}</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                {watchedCategory === "outros" && (
                  <FormField control={form.control} name="category_outro" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("nc.form.categoryOutro")}</FormLabel>
                      <FormControl><Input placeholder={t("nc.form.categoryOutroPlaceholder")} {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                )}

                {/* Origem + Referência */}
                <div className="grid grid-cols-2 gap-3">
                  <FormField control={form.control} name="origin" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("nc.form.origin")}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="manual">{t("nc.origin.manual")}</SelectItem>
                          <SelectItem value="ppi">{t("nc.origin.ppi")}</SelectItem>
                          <SelectItem value="test">{t("nc.origin.test")}</SelectItem>
                          <SelectItem value="document">{t("nc.origin.document")}</SelectItem>
                          <SelectItem value="audit">{t("nc.origin.audit")}</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="due_date" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("nc.table.dueDate")}</FormLabel>
                      <FormControl><Input type="date" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                {/* Audit origin type - only when origin === 'audit' */}
                {watchedOrigin === "audit" && (
                  <FormField control={form.control} name="audit_origin_type" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("nc.form.auditOriginType", { defaultValue: "Tipo de Auditoria" })}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl><SelectTrigger><SelectValue placeholder="—" /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="auditoria_interna">{t("nc.auditOrigin.auditoria_interna", { defaultValue: "Auditoria Interna" })}</SelectItem>
                          <SelectItem value="auditoria_ip">{t("nc.auditOrigin.auditoria_ip", { defaultValue: "Auditoria IP/Fiscalização" })}</SelectItem>
                          <SelectItem value="extra_auditoria">{t("nc.auditOrigin.extra_auditoria", { defaultValue: "Extra-Auditoria" })}</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                )}
              </TabsContent>

              {/* ── SECÇÃO 2: DESCRIÇÃO ─────────────────────────────────── */}
              <TabsContent value="description" className="space-y-4 mt-0">
                <FormField control={form.control} name="description" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("nc.form.description")} *</FormLabel>
                    <FormControl>
                      <Textarea placeholder={t("nc.form.descriptionPlaceholder")} className="resize-none" rows={5} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="violated_requirement" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("nc.form.violatedRequirement", { defaultValue: "Requisito violado (norma/CE/PPI)" })}</FormLabel>
                    <FormControl><Input placeholder="Ex: EN 206-1 cl. 8.2.1" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </TabsContent>

              {/* ── SECÇÃO 3: CORRECÇÃO IMEDIATA ────────────────────────── */}
              <TabsContent value="correction" className="space-y-4 mt-0">
                <FormField control={form.control} name="correction_type" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("nc.form.correctionType", { defaultValue: "Tipo de correcção" })}</FormLabel>
                    <FormControl>
                      <RadioGroup onValueChange={field.onChange} value={field.value || ""} className="space-y-2">
                        {CORRECTION_TYPES.map(ct => (
                          <div key={ct} className="flex items-center gap-2">
                            <RadioGroupItem value={ct} id={`ct-${ct}`} />
                            <Label htmlFor={`ct-${ct}`} className="text-sm">
                              {t(`nc.correctionType.${ct}`, {
                                defaultValue: ct === "accept" ? "Aceitar (derrogação F/IP)" :
                                  ct === "repair" ? "Reparar" :
                                  ct === "demolish" ? "Demolir e refazer" : "Rejeitar/devolver"
                              })}
                            </Label>
                          </div>
                        ))}
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="correction" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("nc.form.correction")}</FormLabel>
                    <FormControl>
                      <Textarea placeholder={t("nc.form.correctionPlaceholder")} className="resize-none" rows={3} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </TabsContent>

              {/* ── SECÇÃO 4: CAUSA RAIZ (visível sempre, destaque se maior) ── */}
              <TabsContent value="rootcause" className="space-y-4 mt-0">
                {isMaior && !form.watch("root_cause") && (
                  <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-2 text-sm text-destructive flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    <span>{t("nc.form.rootCauseRequired", { defaultValue: "Análise de causa raiz é OBRIGATÓRIA para NC MAIOR. Preencha antes de submeter para fecho." })}</span>
                  </div>
                )}
                {!isMaior && (
                  <div className="rounded-lg bg-muted/40 border border-border px-4 py-2 text-xs text-muted-foreground">
                    {t("nc.form.rootCauseOptional", { defaultValue: "Secção obrigatória apenas para NC MAIOR. Pode preencher opcionalmente." })}
                  </div>
                )}
                <FormField control={form.control} name="root_cause_method" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("nc.form.rootCauseMethod", { defaultValue: "Método de análise" })}</FormLabel>
                    <FormControl>
                      <RadioGroup onValueChange={field.onChange} value={field.value || ""} className="flex gap-4">
                        {ROOT_CAUSE_METHODS.map(m => (
                          <div key={m} className="flex items-center gap-2">
                            <RadioGroupItem value={m} id={`rcm-${m}`} />
                             <Label htmlFor={`rcm-${m}`} className="text-sm">
                               {t(`nc.rootCauseMethod.${m}`, { defaultValue: m === "5whys" ? "5 Porquês" : m === "ishikawa" ? "Ishikawa" : t("common.other") })}
                            </Label>
                          </div>
                        ))}
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="root_cause" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("nc.form.rootCause")}</FormLabel>
                    <FormControl>
                      <Textarea placeholder={t("nc.form.rootCausePlaceholder")} className="resize-none" rows={4} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </TabsContent>

              {/* ── SECÇÃO 5: ACÇÃO CORRETIVA ──────────────────────────── */}
              <TabsContent value="capa" className="space-y-4 mt-0">
                <FormField control={form.control} name="corrective_action" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("nc.form.correctiveAction")}</FormLabel>
                    <FormControl>
                      <Textarea placeholder={t("nc.form.correctiveActionPlaceholder")} className="resize-none" rows={3} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <div className="grid grid-cols-2 gap-3">
                  <FormField control={form.control} name="assigned_to" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("nc.form.assignedTo", { defaultValue: "Responsável pela acção" })}</FormLabel>
                      <FormControl>
                        <MemberPicker
                          value={field.value}
                          onChange={(uid) => field.onChange(uid ?? "")}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="due_date" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("nc.form.actionDeadline", { defaultValue: "Prazo acção" })}</FormLabel>
                      <FormControl><Input type="date" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                <FormField control={form.control} name="ac_efficacy_indicator" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("nc.form.efficacyIndicator", { defaultValue: "Indicador de eficácia" })}</FormLabel>
                    <FormControl><Input placeholder="Ex: Verificar em 30 dias se NC recorre" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="preventive_action" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("nc.form.preventiveAction")}</FormLabel>
                    <FormControl>
                      <Textarea placeholder={t("nc.form.preventiveActionPlaceholder")} className="resize-none" rows={2} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <Separator className="my-2" />
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                  {t("nc.form.seguimentoSection", { defaultValue: "Seguimento CE" })}
                </p>

                <div className="grid grid-cols-2 gap-3">
                  <FormField control={form.control} name="actual_completion_date" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("nc.form.actualCompletionDate", { defaultValue: "Data Real de Implementação" })}</FormLabel>
                      <FormControl><Input type="date" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="due_date" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("nc.table.dueDate")} <span className="text-xs text-muted-foreground">({t("common.optional")})</span></FormLabel>
                      <FormControl><Input type="date" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                <FormField control={form.control} name="deviation_justification" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("nc.form.deviationJustification", { defaultValue: "Justificação de Desvios" })}</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={t("nc.form.deviationJustificationPlaceholder", { defaultValue: "Justifique eventuais desvios face à data/método planeado…" })}
                        className="resize-none" rows={3} {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="efficacy_analysis" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("nc.form.efficacyAnalysis", { defaultValue: "Análise de Eficácia" })}</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={t("nc.form.efficacyAnalysisPlaceholder", { defaultValue: "Descreva como foi verificada a eficácia da ação implementada…" })}
                        className="resize-none" rows={3} {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </TabsContent>

              {/* ── SECÇÃO 6: FECHO (só em edit com status in_review/closed) ── */}
              {showClosure && (
                <TabsContent value="closure" className="space-y-4 mt-0">
                  <FormField control={form.control} name="verification_result" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("nc.form.verificationResult")}</FormLabel>
                      <FormControl>
                        <Textarea placeholder={t("nc.form.verificationResultPlaceholder")} className="resize-none" rows={3} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <div className="grid grid-cols-2 gap-3">
                    <FormField control={form.control} name="verified_at" render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("nc.form.verifiedAt", { defaultValue: "Data verificação" })}</FormLabel>
                        <FormControl><Input type="date" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="closure_date" render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("nc.form.closureDate", { defaultValue: "Data fecho" })}</FormLabel>
                        <FormControl><Input type="date" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                  <FormField control={form.control} name="fip_validated_by" render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {t("nc.form.fipValidatedBy", { defaultValue: "Validado por F/IP" })}
                        {(nc as any)?.fip_validation_required && <span className="text-destructive ml-1">*</span>}
                      </FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </TabsContent>
              )}

              {/* ── TAB: ANEXOS (só em modo edição) ────────────────────── */}
              {isEdit && (
                <TabsContent value="attachments" className="mt-0">
                  {activeProject && nc && (
                    <AttachmentsPanel
                      projectId={activeProject.id}
                      entityType="non_conformities"
                      entityId={nc.id}
                    />
                  )}
                </TabsContent>
              )}
            </Tabs>

            <DialogFooter className="pt-4 border-t border-border mt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
                {t("common.cancel")}
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />}
                {isEdit ? t("common.save") : t("nc.form.createBtn")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
