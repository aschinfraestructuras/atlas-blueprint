import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { useProject } from "@/contexts/ProjectContext";
import { workItemService, type WorkItem } from "@/lib/services/workItemService";
import {
  ppiService,
  PPI_DISCIPLINAS,
  type PpiTemplate,
  type PpiInstanceStatus,
} from "@/lib/services/ppiService";
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
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

// ─── Schema ───────────────────────────────────────────────────────────────────

const makeSchema = (t: (k: string) => string) =>
  z.object({
    work_item_id: z.string().min(1, t("ppi.instances.validation.workItemRequired")),
    template_id:  z.string().optional(),
    code:         z.string().min(1, t("ppi.instances.validation.codeRequired")),
    inspector_id: z.string().optional(),
  });

type FormValues = z.infer<ReturnType<typeof makeSchema>>;

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** Pre-fill work_item_id (from WorkItem detail page shortcut) */
  preselectedWorkItemId?: string;
  onSuccess: (instanceId: string) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function PPIInstanceFormDialog({ open, onOpenChange, preselectedWorkItemId, onSuccess }: Props) {
  const { t }             = useTranslation();
  const { user }          = useAuth();
  const { activeProject } = useProject();

  const [workItems,  setWorkItems]  = useState<WorkItem[]>([]);
  const [templates,  setTemplates]  = useState<PpiTemplate[]>([]);
  const [loadingWI,  setLoadingWI]  = useState(false);
  const [loadingTpl, setLoadingTpl] = useState(false);
  const [codeError,  setCodeError]  = useState<string | null>(null);

  const schema = makeSchema(t);
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { work_item_id: preselectedWorkItemId ?? "", template_id: "", code: "", inspector_id: "" },
  });

  // ── Load data when dialog opens ────────────────────────────────────────────

  useEffect(() => {
    if (!open || !activeProject) return;
    form.reset({
      work_item_id: preselectedWorkItemId ?? "",
      template_id:  "",
      code:         "",
      inspector_id: "",
    });
    setCodeError(null);

    setLoadingWI(true);
    workItemService.getByProject(activeProject.id)
      .then(setWorkItems)
      .finally(() => setLoadingWI(false));

    setLoadingTpl(true);
    ppiService.listTemplates(activeProject.id)
      .then(setTemplates)
      .finally(() => setLoadingTpl(false));
  }, [open, activeProject, preselectedWorkItemId, form]);

  // ── Submit ─────────────────────────────────────────────────────────────────

  async function onSubmit(values: FormValues) {
    if (!activeProject || !user) return;
    setCodeError(null);

    // Check code uniqueness
    const { data: existing } = await supabase
      .from("ppi_instances")
      .select("id")
      .eq("project_id", activeProject.id)
      .eq("code", values.code)
      .maybeSingle();

    if (existing) {
      setCodeError(t("ppi.instances.validation.codeUnique"));
      return;
    }

    try {
      const input = {
        project_id:   activeProject.id,
        work_item_id: values.work_item_id,
        code:         values.code,
        inspector_id: values.inspector_id || null,
        created_by:   user.id,
      };

      const effectiveTemplateId = values.template_id && values.template_id !== "__none__"
        ? values.template_id
        : null;

      let instanceId: string;
      if (effectiveTemplateId) {
        const result = await ppiService.createInstanceFromTemplate(input, effectiveTemplateId);
        instanceId = result.id;
      } else {
        const result = await ppiService.createBlankInstance(input);
        instanceId = result.id;
      }

      toast({ title: t("ppi.instances.toast.created") });
      onOpenChange(false);
      onSuccess(instanceId);
    } catch (err) {
      toast({
        title: t("ppi.instances.toast.error"),
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive",
      });
    }
  }

  const isSubmitting = form.formState.isSubmitting;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>{t("ppi.instances.form.titleCreate")}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

            {/* Work Item */}
            <FormField control={form.control} name="work_item_id" render={({ field }) => (
              <FormItem>
                <FormLabel>
                  {t("ppi.instances.form.workItem")} <span className="text-destructive">*</span>
                </FormLabel>
                <Select onValueChange={field.onChange} value={field.value} disabled={loadingWI || !!preselectedWorkItemId}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={
                        loadingWI ? t("common.loading") : t("ppi.instances.form.selectWorkItem")
                      } />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {workItems.map((wi) => (
                      <SelectItem key={wi.id} value={wi.id}>
                        {wi.sector}
                        {wi.obra ? ` · ${wi.obra}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            {/* Template (optional) */}
            <FormField control={form.control} name="template_id" render={({ field }) => (
              <FormItem>
                <FormLabel>{t("ppi.instances.form.template")}</FormLabel>
                <Select onValueChange={field.onChange} value={field.value ?? ""} disabled={loadingTpl}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={
                        loadingTpl ? t("common.loading") : t("ppi.instances.form.selectTemplate")
                      } />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="__none__">{t("ppi.instances.form.noTemplate")}</SelectItem>
                    {templates.map((tpl) => (
                      <SelectItem key={tpl.id} value={tpl.id}>
                        [{tpl.code}] {tpl.title} — {t(`ppi.disciplinas.${tpl.disciplina}`, { defaultValue: tpl.disciplina })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            {/* Code */}
            <FormField control={form.control} name="code" render={({ field }) => (
              <FormItem>
                <FormLabel>
                  {t("ppi.instances.form.code")} <span className="text-destructive">*</span>
                </FormLabel>
                <FormControl>
                  <Input placeholder={t("ppi.instances.form.codePlaceholder")} {...field} className="font-mono" />
                </FormControl>
                {codeError && (
                  <p className="flex items-center gap-1 text-xs text-destructive mt-1">
                    <AlertCircle className="h-3 w-3" /> {codeError}
                  </p>
                )}
                <FormMessage />
              </FormItem>
            )} />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                {t("common.cancel")}
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />}
                {isSubmitting ? t("ppi.instances.form.saving") : t("ppi.instances.form.createBtn")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
