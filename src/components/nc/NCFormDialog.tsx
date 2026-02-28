import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { useProject } from "@/contexts/ProjectContext";
import { ncService } from "@/lib/services/ncService";
import type { NonConformity } from "@/lib/services/ncService";
import { toast } from "@/hooks/use-toast";
import { classifySupabaseError } from "@/lib/utils/supabaseError";
import { withOtherRefinement } from "@/components/ui/select-with-other";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, AlertCircle } from "lucide-react";
import { AttachmentsPanel } from "@/components/attachments/AttachmentsPanel";
import { cn } from "@/lib/utils";

// ─── Schema ───────────────────────────────────────────────────────────────────

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
    // CAPA
    correction:          z.string().trim().max(2000).optional().or(z.literal("")),
    root_cause:          z.string().trim().max(2000).optional().or(z.literal("")),
    corrective_action:   z.string().trim().max(2000).optional().or(z.literal("")),
    preventive_action:   z.string().trim().max(2000).optional().or(z.literal("")),
    verification_method: z.string().trim().max(500).optional().or(z.literal("")),
    verification_result: z.string().trim().max(500).optional().or(z.literal("")),
  }).superRefine((val, ctx) => {
    withOtherRefinement(val, ctx, "category", "category_outro", t("nc.form.validation.categoryOutroRequired"));
  });

type FormValues = z.infer<ReturnType<typeof schema>>;

// ─── Props ────────────────────────────────────────────────────────────────────

interface NCFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nc?: NonConformity | null;
  /** Override de origem (ex: criado a partir de PPI ou Ensaio) */
  originOverride?: string;
  onSuccess: () => void;
}

// ─── Defaults ─────────────────────────────────────────────────────────────────

const defaultValues = (origin?: string): FormValues => ({
  title: "", description: "",
  severity: "major", category: "qualidade", category_outro: "",
  origin: origin ?? "manual", reference: "", responsible: "",
  due_date: "", detected_at: new Date().toISOString().split("T")[0],
  correction: "", root_cause: "", corrective_action: "",
  preventive_action: "", verification_method: "", verification_result: "",
});

// ─── Componente ───────────────────────────────────────────────────────────────

export function NCFormDialog({
  open, onOpenChange, nc, originOverride, onSuccess,
}: NCFormDialogProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { activeProject } = useProject();
  const [submitting, setSubmitting] = useState(false);
  const isEdit = !!nc;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema(t)),
    defaultValues: defaultValues(originOverride),
  });

  const watchedCategory = form.watch("category");

  useEffect(() => {
    if (!open) return;
    form.reset(nc ? {
      title:               nc.title ?? "",
      description:         nc.description,
      severity:            nc.severity,
      category:            nc.category ?? "qualidade",
      category_outro:      nc.category_outro ?? "",
      origin:              nc.origin ?? "manual",
      reference:           nc.reference ?? "",
      responsible:         nc.responsible ?? "",
      due_date:            nc.due_date ?? "",
      detected_at:         nc.detected_at ?? "",
      correction:          nc.correction ?? "",
      root_cause:          nc.root_cause ?? "",
      corrective_action:   nc.corrective_action ?? "",
      preventive_action:   nc.preventive_action ?? "",
      verification_method: nc.verification_method ?? "",
      verification_result: nc.verification_result ?? "",
    } : defaultValues(originOverride));
  }, [open, nc, form, originOverride]);

  const onSubmit = async (values: FormValues) => {
    if (!user || !activeProject) return;
    setSubmitting(true);
    try {
      if (isEdit && nc) {
        await ncService.update(nc.id, activeProject.id, {
          title:               values.title,
          description:         values.description,
          severity:            values.severity,
          category:            values.category,
          category_outro:      values.category === "outros" ? (values.category_outro || undefined) : undefined,
          origin:              values.origin,
          reference:           values.reference || undefined,
          responsible:         values.responsible || undefined,
          due_date:            values.due_date || undefined,
          detected_at:         values.detected_at || undefined,
          correction:          values.correction || undefined,
          root_cause:          values.root_cause || undefined,
          corrective_action:   values.corrective_action || undefined,
          preventive_action:   values.preventive_action || undefined,
          verification_method: values.verification_method || undefined,
          verification_result: values.verification_result || undefined,
        }, nc.status);
        toast({ title: t("nc.toast.updated") });
      } else {
        await ncService.create({
          project_id:     activeProject.id,
          title:          values.title,
          description:    values.description,
          severity:       values.severity,
          category:       values.category,
          category_outro: values.category === "outros" ? (values.category_outro || undefined) : undefined,
          origin:         values.origin,
          reference:      values.reference || undefined,
          responsible:    values.responsible || undefined,
          due_date:       values.due_date || undefined,
          detected_at:    values.detected_at || undefined,
        });
        toast({ title: t("nc.toast.created") });
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
      <DialogContent className="sm:max-w-[640px] max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">
            {isEdit ? t("nc.form.titleEdit") : t("nc.form.titleCreate")}
            {nc?.code && (
              <span className="ml-2 text-xs font-mono text-muted-foreground">{nc.code}</span>
            )}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-0 pt-1">
            <Tabs defaultValue="identification" className="w-full">
              <TabsList className="w-full mb-4">
                <TabsTrigger value="identification" className="flex-1 text-xs">
                  {t("nc.form.tabs.identification")}
                </TabsTrigger>
                <TabsTrigger value="capa" className="flex-1 text-xs">
                  {t("nc.form.tabs.capa")}
                </TabsTrigger>
                {isEdit && (
                  <TabsTrigger value="attachments" className="flex-1 text-xs">
                    {t("nc.form.tabs.attachments")}
                  </TabsTrigger>
                )}
              </TabsList>

              {/* ── TAB 1: IDENTIFICAÇÃO ───────────────────────────────────── */}
              <TabsContent value="identification" className="space-y-4 mt-0">

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

                {/* Descrição */}
                <FormField control={form.control} name="description" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("nc.form.description")}</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={t("nc.form.descriptionPlaceholder")}
                        className="resize-none" rows={3} {...field}
                      />
                    </FormControl>
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
                      <FormControl>
                        <Input placeholder={t("nc.form.categoryOutroPlaceholder")} {...field} />
                      </FormControl>
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
                  <FormField control={form.control} name="reference" render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {t("nc.table.reference")}{" "}
                        <span className="text-xs text-muted-foreground font-normal">({t("common.optional")})</span>
                      </FormLabel>
                      <FormControl>
                        <Input placeholder={t("nc.form.referencePlaceholder")} className="font-mono" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                {/* Responsável + Data deteção */}
                <div className="grid grid-cols-2 gap-3">
                  <FormField control={form.control} name="responsible" render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {t("nc.table.responsible")}{" "}
                        <span className="text-xs text-muted-foreground font-normal">({t("common.optional")})</span>
                      </FormLabel>
                      <FormControl>
                        <Input placeholder={t("nc.form.responsiblePlaceholder")} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="detected_at" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("nc.form.detectedAt")}</FormLabel>
                      <FormControl><Input type="date" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                {/* Prazo */}
                <FormField control={form.control} name="due_date" render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t("nc.table.dueDate")}{" "}
                      <span className="text-xs text-muted-foreground font-normal">({t("common.optional")})</span>
                    </FormLabel>
                    <FormControl><Input type="date" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </TabsContent>

              {/* ── TAB 2: CAPA ───────────────────────────────────────────── */}
              <TabsContent value="capa" className="space-y-4 mt-0">
                <div className="rounded-lg bg-muted/40 border border-border px-4 py-2 text-xs text-muted-foreground">
                  {t("nc.form.capaHint")}
                </div>

                <FormField control={form.control} name="correction" render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t("nc.form.correction")}{" "}
                      <span className="text-xs text-muted-foreground font-normal">({t("common.optional")})</span>
                    </FormLabel>
                    <FormControl>
                      <Textarea placeholder={t("nc.form.correctionPlaceholder")} className="resize-none" rows={2} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="root_cause" render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t("nc.form.rootCause")}{" "}
                      <span className="text-xs text-muted-foreground font-normal">({t("common.optional")})</span>
                    </FormLabel>
                    <FormControl>
                      <Textarea placeholder={t("nc.form.rootCausePlaceholder")} className="resize-none" rows={3} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="corrective_action" render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t("nc.form.correctiveAction")}{" "}
                      <span className="text-xs text-muted-foreground font-normal">({t("common.optional")})</span>
                    </FormLabel>
                    <FormControl>
                      <Textarea placeholder={t("nc.form.correctiveActionPlaceholder")} className="resize-none" rows={2} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="preventive_action" render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t("nc.form.preventiveAction")}{" "}
                      <span className="text-xs text-muted-foreground font-normal">({t("common.optional")})</span>
                    </FormLabel>
                    <FormControl>
                      <Textarea placeholder={t("nc.form.preventiveActionPlaceholder")} className="resize-none" rows={2} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <Separator />

                <div className="grid grid-cols-2 gap-3">
                  <FormField control={form.control} name="verification_method" render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {t("nc.form.verificationMethod")}{" "}
                        <span className="text-xs text-muted-foreground font-normal">({t("common.optional")})</span>
                      </FormLabel>
                      <FormControl>
                        <Input placeholder={t("nc.form.verificationMethodPlaceholder")} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="verification_result" render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {t("nc.form.verificationResult")}{" "}
                        <span className="text-xs text-muted-foreground font-normal">({t("common.optional")})</span>
                      </FormLabel>
                      <FormControl>
                        <Input placeholder={t("nc.form.verificationResultPlaceholder")} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              </TabsContent>

              {/* ── TAB 3: ANEXOS (só em modo edição) ─────────────────────── */}
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
