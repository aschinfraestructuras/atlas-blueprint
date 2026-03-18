import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import { useProject } from "@/contexts/ProjectContext";
import {
  testService, TEST_WORKFLOW_STATUSES, TEST_RESULT_VALUES,
} from "@/lib/services/testService";
import type { TestResult, TestCatalogEntry, TestResultInput, TestWorkflowStatus, TestResultValue } from "@/lib/services/testService";
import { toast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { classifySupabaseError } from "@/lib/utils/supabaseError";
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
import { Loader2, Camera, Image as ImageIcon } from "lucide-react";
import { AttachmentsPanel } from "@/components/attachments/AttachmentsPanel";
import { supabase } from "@/integrations/supabase/client";
import { TraceabilityChain } from "@/components/tests/TraceabilityChain";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const schema = (t: (k: string) => string) =>
  z.object({
    test_id:          z.string().min(1, t("tests.results.form.validation.testRequired")),
    date:             z.string().min(1, t("tests.results.form.validation.dateRequired")),
    status_workflow:  z.string().min(1),
    result_status:    z.string().optional().or(z.literal("")),
    sample_ref:       z.string().trim().max(100).optional().or(z.literal("")),
    location:         z.string().trim().max(200).optional().or(z.literal("")),
    pk_inicio:        z.string().optional().or(z.literal("")),
    pk_fim:           z.string().optional().or(z.literal("")),
    report_number:    z.string().trim().optional().or(z.literal("")),
    notes:            z.string().trim().optional().or(z.literal("")),
    work_item_id:     z.string().optional().or(z.literal("")),
    supplier_id:      z.string().optional().or(z.literal("")),
    // BE-CAMPO fields
    be_campo_code:    z.string().trim().optional().or(z.literal("")),
    eme_code:         z.string().trim().optional().or(z.literal("")),
    eme_calibration_date: z.string().optional().or(z.literal("")),
    location_pk:      z.string().trim().optional().or(z.literal("")),
    weather:          z.string().optional().or(z.literal("")),
    ambient_temperature: z.string().optional().or(z.literal("")),
  });

type FormValues = z.infer<ReturnType<typeof schema>>;

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  testResult?: TestResult | null;
  preselectedWorkItemId?: string;
  onSuccess: () => void;
}

export function TestResultFormDialog({ open, onOpenChange, testResult, preselectedWorkItemId, onSuccess }: Props) {
  const { t }             = useTranslation();
  const { activeProject } = useProject();
  const [submitting, setSubmitting]       = useState(false);
  const [catalog, setCatalog]             = useState<TestCatalogEntry[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [workItems, setWorkItems]         = useState<{ id: string; sector: string }[]>([]);
  const [suppliers, setSuppliers]         = useState<{ id: string; name: string }[]>([]);
  const [newTestName, setNewTestName]     = useState("");
  const [newTestCode, setNewTestCode]     = useState("");
  const [creatingNew, setCreatingNew]     = useState(false);
  const isEdit = !!testResult;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema(t)),
    defaultValues: {
      test_id: "", date: new Date().toISOString().split("T")[0],
      status_workflow: "draft", result_status: "", sample_ref: "", location: "", pk_inicio: "", pk_fim: "",
      report_number: "", notes: "", work_item_id: "", supplier_id: "",
      be_campo_code: "", eme_code: "", eme_calibration_date: "", location_pk: "", weather: "", ambient_temperature: "",
    },
  });

  useEffect(() => {
    if (!open || !activeProject) return;
    // Load catalog, work items, suppliers in parallel
    setLoadingCatalog(true);
    Promise.all([
      testService.getCatalogByProject(activeProject.id),
      supabase.from("work_items").select("id, sector").eq("project_id", activeProject.id).order("sector"),
      supabase.from("suppliers").select("id, name").eq("project_id", activeProject.id).eq("status", "active").order("name"),
    ]).then(([cats, wi, sup]) => {
      setCatalog(cats);
      setWorkItems((wi.data ?? []) as { id: string; sector: string }[]);
      setSuppliers((sup.data ?? []) as { id: string; name: string }[]);
    }).catch((err) => console.error("[TestResultFormDialog] load error:", err))
      .finally(() => setLoadingCatalog(false));
  }, [open, activeProject]);

  useEffect(() => {
    if (!open) return;
    form.reset(testResult ? {
      test_id:          testResult.test_id,
      date:             testResult.date,
      status_workflow:  testResult.status_workflow ?? "draft",
      result_status:    testResult.result_status ?? "",
      sample_ref:       testResult.sample_ref ?? "",
      location:         testResult.location ?? "",
      pk_inicio:        testResult.pk_inicio != null ? String(testResult.pk_inicio) : "",
      pk_fim:           testResult.pk_fim != null ? String(testResult.pk_fim) : "",
      report_number:    testResult.report_number ?? "",
      notes:            testResult.notes ?? "",
      work_item_id:     testResult.work_item_id ?? "",
      supplier_id:      testResult.supplier_id ?? "",
      be_campo_code:    (testResult as any).be_campo_code ?? "",
      eme_code:         (testResult as any).eme_code ?? "",
      eme_calibration_date: (testResult as any).eme_calibration_date ?? "",
      location_pk:      (testResult as any).location_pk ?? "",
      weather:          (testResult as any).weather ?? "",
      ambient_temperature: (testResult as any).ambient_temperature != null ? String((testResult as any).ambient_temperature) : "",
    } : {
      test_id: "", date: new Date().toISOString().split("T")[0],
      status_workflow: "draft", result_status: "", sample_ref: "", location: "", pk_inicio: "", pk_fim: "",
      report_number: "", notes: "",
      work_item_id:  preselectedWorkItemId ?? "",
      supplier_id: "",
      be_campo_code: "", eme_code: "", eme_calibration_date: "", location_pk: "", weather: "", ambient_temperature: "",
    });
    setCreatingNew(false);
    setNewTestName(""); setNewTestCode("");
  }, [open, testResult, form, preselectedWorkItemId]);

  const handleCreateCatalogEntry = async () => {
    if (!activeProject || !newTestName.trim() || !newTestCode.trim()) return;
    setSubmitting(true);
    try {
      const entry = await testService.createCatalogEntry({
        project_id: activeProject.id,
        name:       newTestName.trim(),
        code:       newTestCode.trim().toUpperCase(),
      });
      setCatalog((p) => [...p, entry]);
      form.setValue("test_id", entry.id);
      setCreatingNew(false); setNewTestName(""); setNewTestCode("");
      toast({ title: t("tests.catalog.toast.created") });
    } catch (err) {
      console.error("[handleCreateCatalogEntry]", err);
      const info = classifySupabaseError(err);
      toast({ title: t(info.titleKey), description: info.raw, variant: "destructive" });
    } finally { setSubmitting(false); }
  };

  const navigate = useNavigate();

  const onSubmit = async (values: FormValues) => {
    if (!activeProject) return;
    setSubmitting(true);
    try {
      const input: TestResultInput = {
        project_id:       activeProject.id,
        test_id:          values.test_id,
        date:             values.date,
        status_workflow:  values.status_workflow as TestWorkflowStatus,
        result_status:    (values.result_status || undefined) as TestResultValue | undefined,
        sample_ref:       values.sample_ref || undefined,
        location:         values.location   || undefined,
        pk_inicio:        values.pk_inicio  ? Number(values.pk_inicio)  : undefined,
        pk_fim:           values.pk_fim     ? Number(values.pk_fim)     : undefined,
        report_number:    values.report_number || undefined,
        notes:            values.notes        || undefined,
        work_item_id:     values.work_item_id  || undefined,
        supplier_id:      values.supplier_id   || undefined,
      };

      let savedId: string | undefined;
      if (isEdit && testResult) {
        await testService.update(testResult.id, activeProject.id, input);
        savedId = testResult.id;
        toast({ title: t("tests.results.toast.updated") });
      } else {
        const created = await testService.create(input);
        savedId = created?.id;
        toast({ title: t("tests.results.toast.created") });
      }

      // FAIL → suggest NC
      if (values.result_status === "fail" && savedId) {
        const testName = catalog.find((c) => c.id === values.test_id)?.name ?? "Ensaio";
        const testCode = catalog.find((c) => c.id === values.test_id)?.code ?? "";
        toast({
          title: "Resultado não conforme",
          description: `${testName} (${testCode}) — Deseja abrir uma Não Conformidade?`,
          action: (
            <ToastAction
              altText="Abrir RNC"
              onClick={() => {
                navigate(`/non-conformities?new=1&test_result_id=${savedId}&description=${encodeURIComponent(`Resultado não conforme: ${testName} — ${testCode}`)}&category=qualidade`);
              }}
            >
              Abrir RNC
            </ToastAction>
          ),
          duration: 10000,
        });
      }

      onSuccess();
      onOpenChange(false);
    } catch (err) {
      console.error("[TestResultFormDialog] submit error:", err);
      const info = classifySupabaseError(err);
      toast({
        title: t(info.titleKey),
        description: info.descriptionKey ? t(info.descriptionKey) : info.raw || t("auth.errors.unexpected"),
        variant: "destructive",
      });
    } finally { setSubmitting(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">
            {isEdit ? t("tests.results.form.titleEdit") : t("tests.results.form.titleCreate")}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-1">

            {/* Traceability chain — edit only — now in its own card */}
            {isEdit && testResult && activeProject && (
              <Card className="border-primary/10">
                <CardHeader className="pb-2 pt-3 px-4">
                  <CardTitle className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                    Rastreabilidade
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-3">
                  <TraceabilityChain testResultId={testResult.id} projectId={activeProject.id} />
                </CardContent>
              </Card>
            )}
            <FormField control={form.control} name="test_id" render={({ field }) => (
              <FormItem>
                <FormLabel>{t("tests.results.form.testType")}</FormLabel>
                {loadingCatalog ? (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" />{t("common.loading")}
                  </div>
                ) : (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder={t("tests.results.form.testTypePlaceholder")} /></SelectTrigger></FormControl>
                    <SelectContent>
                      {catalog.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          <span className="font-mono text-xs text-muted-foreground mr-1">{c.code}</span>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <FormMessage />
              </FormItem>
            )} />

            {/* Quick-add catalog */}
            {!creatingNew ? (
              <button type="button" className="text-xs text-primary underline-offset-2 hover:underline"
                onClick={() => setCreatingNew(true)}>
                + {t("tests.results.form.addNewTestType")}
              </button>
            ) : (
              <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
                <p className="text-xs font-medium text-muted-foreground">{t("tests.results.form.newTestTypeLabel")}</p>
                <div className="grid grid-cols-2 gap-2">
                  <Input placeholder="CÓDIGO" value={newTestCode}
                    onChange={(e) => setNewTestCode(e.target.value.toUpperCase())} className="font-mono text-sm" />
                  <Input placeholder={t("common.name")} value={newTestName}
                    onChange={(e) => setNewTestName(e.target.value)} className="text-sm" />
                </div>
                <div className="flex gap-2">
                  <Button type="button" size="sm" variant="outline" className="text-xs"
                    onClick={() => { setCreatingNew(false); setNewTestName(""); setNewTestCode(""); }}>
                    {t("common.cancel")}
                  </Button>
                  <Button type="button" size="sm" className="text-xs"
                    onClick={handleCreateCatalogEntry}
                    disabled={!newTestName.trim() || !newTestCode.trim() || submitting}>
                    {t("tests.results.form.addTestTypeBtn")}
                  </Button>
                </div>
              </div>
            )}

            {/* Date + Status */}
            <div className="grid grid-cols-2 gap-3">
              <FormField control={form.control} name="date" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("tests.results.form.testDate")}</FormLabel>
                  <FormControl><Input type="date" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="status_workflow" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("common.status")}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      {TEST_WORKFLOW_STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>{t(`tests.status.${s}`)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            {/* Result status */}
            <FormField control={form.control} name="result_status" render={({ field }) => (
              <FormItem>
                <FormLabel>{t("tests.export.passFail")} <span className="text-xs text-muted-foreground">({t("common.optional")})</span></FormLabel>
                <Select onValueChange={(v) => field.onChange(v === "__none__" ? "" : v)} value={field.value || "__none__"}>
                  <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="__none__">—</SelectItem>
                    {TEST_RESULT_VALUES.map((v) => (
                      <SelectItem key={v} value={v}>{t(`tests.status.${v}`)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            {/* Work item */}
            <FormField control={form.control} name="work_item_id" render={({ field }) => (
              <FormItem>
                <FormLabel>{t("tests.results.form.workItem")} <span className="text-xs text-muted-foreground">({t("common.optional")})</span></FormLabel>
                <Select
                  onValueChange={(v) => field.onChange(v === "__none__" ? "" : v)}
                  value={field.value || "__none__"}
                >
                  <FormControl><SelectTrigger><SelectValue placeholder={t("tests.results.form.workItemPlaceholder")} /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="__none__">{t("tests.results.form.noWorkItem")}</SelectItem>
                    {workItems.map((wi) => (
                      <SelectItem key={wi.id} value={wi.id}>{wi.sector}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            {/* Sample + Location */}
            <div className="grid grid-cols-2 gap-3">
              <FormField control={form.control} name="sample_ref" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("tests.results.form.sampleRef")} <span className="text-xs text-muted-foreground">({t("common.optional")})</span></FormLabel>
                  <FormControl><Input placeholder="AT-KM45-01" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="report_number" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("tests.results.form.reportNumber")} <span className="text-xs text-muted-foreground">({t("common.optional")})</span></FormLabel>
                  <FormControl><Input placeholder="LAB-2026-0001" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            {/* Location + PK */}
            <FormField control={form.control} name="location" render={({ field }) => (
              <FormItem>
                <FormLabel>{t("tests.results.form.location")} <span className="text-xs text-muted-foreground">({t("common.optional")})</span></FormLabel>
                <FormControl><Input placeholder="ex: Km 45+200, Aterro Norte" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <div className="grid grid-cols-2 gap-3">
              <FormField control={form.control} name="pk_inicio" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("tests.results.form.pkStart")} <span className="text-xs text-muted-foreground">({t("common.optional")})</span></FormLabel>
                  <FormControl><Input type="number" step="0.001" placeholder="45200" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="pk_fim" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("tests.results.form.pkEnd")} <span className="text-xs text-muted-foreground">({t("common.optional")})</span></FormLabel>
                  <FormControl><Input type="number" step="0.001" placeholder="45600" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            {/* Supplier (lab) */}
            {suppliers.length > 0 && (
              <FormField control={form.control} name="supplier_id" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("tests.results.form.supplier")} <span className="text-xs text-muted-foreground">({t("common.optional")})</span></FormLabel>
                  <Select
                    onValueChange={(v) => field.onChange(v === "__none__" ? "" : v)}
                    value={field.value || "__none__"}
                  >
                    <FormControl><SelectTrigger><SelectValue placeholder={t("tests.results.form.supplierPlaceholder")} /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="__none__">{t("tests.results.form.noSupplier")}</SelectItem>
                      {suppliers.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            )}

            {/* BE-CAMPO fields */}
            <Separator />
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              {t("tests.results.form.beCampoSection", { defaultValue: "BE-CAMPO — Boletim de Ensaio de Campo" })}
            </p>
            <div className="grid grid-cols-2 gap-3">
              <FormField control={form.control} name="be_campo_code" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("tests.results.form.beCampoCode", { defaultValue: "Código BE-CAMPO" })} <span className="text-xs text-muted-foreground">({t("common.optional")})</span></FormLabel>
                  <FormControl><Input placeholder="BE-COMP-PF17A-001" className="font-mono text-sm" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="location_pk" render={({ field }) => (
                <FormItem>
                  <FormLabel>PK <span className="text-xs text-muted-foreground">({t("common.optional")})</span></FormLabel>
                  <FormControl><Input placeholder="45+200" className="font-mono text-sm" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <FormField control={form.control} name="eme_code" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("tests.results.form.emeCode", { defaultValue: "Cód. EME" })} <span className="text-xs text-muted-foreground">({t("common.optional")})</span></FormLabel>
                  <FormControl><Input placeholder="EME-001" className="font-mono text-sm" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="eme_calibration_date" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("tests.results.form.emeCalDate", { defaultValue: "Calibração" })} <span className="text-xs text-muted-foreground">({t("common.optional")})</span></FormLabel>
                  <FormControl><Input type="date" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="ambient_temperature" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("tests.results.form.temperature", { defaultValue: "Temp. (°C)" })} <span className="text-xs text-muted-foreground">({t("common.optional")})</span></FormLabel>
                  <FormControl><Input type="number" step="0.1" placeholder="22.5" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <FormField control={form.control} name="weather" render={({ field }) => (
              <FormItem>
                <FormLabel>{t("tests.results.form.weather", { defaultValue: "Meteorologia" })} <span className="text-xs text-muted-foreground">({t("common.optional")})</span></FormLabel>
                <Select onValueChange={(v) => field.onChange(v === "__none__" ? "" : v)} value={field.value || "__none__"}>
                  <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="__none__">—</SelectItem>
                    <SelectItem value="bom">Bom</SelectItem>
                    <SelectItem value="nublado">Nublado</SelectItem>
                    <SelectItem value="chuva">Chuva</SelectItem>
                    <SelectItem value="chuva_forte">Chuva Forte</SelectItem>
                    <SelectItem value="vento">Vento</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />


            <FormField control={form.control} name="notes" render={({ field }) => (
              <FormItem>
                <FormLabel>{t("tests.results.form.notes")} <span className="text-xs text-muted-foreground">({t("common.optional")})</span></FormLabel>
                <FormControl><Textarea rows={2} placeholder={t("tests.results.form.notesPlaceholder")} {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            {/* Attachments & Photos — edit only */}
            {isEdit && activeProject && testResult && (
              <>
                <Separator />
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Camera className="h-4 w-4 text-primary" />
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      {t("tests.results.form.photosAndAttachments", { defaultValue: "Fotos & Anexos" })}
                    </span>
                    <Badge variant="secondary" className="text-[10px] py-0">
                      <ImageIcon className="h-3 w-3 mr-1" />
                      {t("tests.results.form.photoHint", { defaultValue: "Anexe fotos do ensaio" })}
                    </Badge>
                  </div>
                  <AttachmentsPanel
                    projectId={activeProject.id}
                    entityType="tests"
                    entityId={testResult.id}
                  />
                </div>
              </>
            )}
            {!isEdit && (
              <div className="flex items-center gap-2 rounded-lg border border-dashed border-border bg-muted/30 px-3 py-2">
                <Camera className="h-4 w-4 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">
                  {t("tests.results.form.photoAfterSave", { defaultValue: "Após criar o ensaio, poderá anexar fotos e documentos." })}
                </p>
              </div>
            )}

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
                {t("common.cancel")}
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />}
                {isEdit ? t("common.save") : t("tests.results.form.createBtn")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
