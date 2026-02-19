import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useProject } from "@/contexts/ProjectContext";
import { workItemService, type WorkItem } from "@/lib/services/workItemService";
import { ppiService, type PpiTemplate } from "@/lib/services/ppiService";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, AlertTriangle, Info, LayoutTemplate, ExternalLink } from "lucide-react";
import { toast } from "@/hooks/use-toast";

// ─── Schema ───────────────────────────────────────────────────────────────────

const makeSchema = (t: (k: string) => string) =>
  z.object({
    work_item_id: z.string().min(1, t("ppi.instances.validation.workItemRequired")),
    template_id:  z.string().optional(),
    code:         z.string().optional(),
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

export function PPIInstanceFormDialog({
  open,
  onOpenChange,
  preselectedWorkItemId,
  onSuccess,
}: Props) {
  const { t }             = useTranslation();
  const { user }          = useAuth();
  const { activeProject } = useProject();
  const navigate          = useNavigate();

  const [workItems,  setWorkItems]  = useState<WorkItem[]>([]);
  const [templates,  setTemplates]  = useState<PpiTemplate[]>([]);
  const [loadingWI,  setLoadingWI]  = useState(false);
  const [loadingTpl, setLoadingTpl] = useState(false);
  const [noActiveTemplates, setNoActiveTemplates] = useState(false);
  const [disciplineMismatch, setDisciplineMismatch] = useState<{
    workItemDisciplina: string;
    templateDisciplina: string;
  } | null>(null);

  const schema = makeSchema(t);
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      work_item_id: preselectedWorkItemId ?? "",
      template_id:  "",
      code:         "",
      inspector_id: "",
    },
  });

  const watchedWorkItemId = form.watch("work_item_id");
  const watchedTemplateId = form.watch("template_id");

  // ── Load data when dialog opens ────────────────────────────────────────────

  useEffect(() => {
    if (!open || !activeProject) return;
    form.reset({
      work_item_id: preselectedWorkItemId ?? "",
      template_id:  "",
      code:         "",
      inspector_id: "",
    });
    setDisciplineMismatch(null);
    setNoActiveTemplates(false);

    setLoadingWI(true);
    workItemService.getByProject(activeProject.id)
      .then(setWorkItems)
      .catch(() => setWorkItems([]))
      .finally(() => setLoadingWI(false));

    setLoadingTpl(true);
    // Only load ACTIVE templates — business rule enforced at UI level too
    ppiService.listTemplates(activeProject.id, { includeInactive: false })
      .then((tpls) => {
        setTemplates(tpls);
        setNoActiveTemplates(tpls.length === 0);
      })
      .catch(() => {
        setTemplates([]);
        setNoActiveTemplates(false);
      })
      .finally(() => setLoadingTpl(false));
  }, [open, activeProject, preselectedWorkItemId, form]);

  // ── Discipline mismatch check ──────────────────────────────────────────────

  useEffect(() => {
    if (!watchedWorkItemId || !watchedTemplateId || watchedTemplateId === "__none__") {
      setDisciplineMismatch(null);
      return;
    }
    const wi  = workItems.find((w) => w.id === watchedWorkItemId);
    const tpl = templates.find((tp) => tp.id === watchedTemplateId);
    if (wi && tpl && wi.disciplina !== tpl.disciplina) {
      setDisciplineMismatch({
        workItemDisciplina: wi.disciplina,
        templateDisciplina: tpl.disciplina,
      });
    } else {
      setDisciplineMismatch(null);
    }
  }, [watchedWorkItemId, watchedTemplateId, workItems, templates]);

  // ── Validate chosen template is still active (server-side guard defence) ───

  function getSelectedTemplate(): PpiTemplate | undefined {
    if (!watchedTemplateId || watchedTemplateId === "__none__") return undefined;
    return templates.find((tp) => tp.id === watchedTemplateId);
  }

  // ── Submit ─────────────────────────────────────────────────────────────────

  async function onSubmit(values: FormValues) {
    if (!activeProject || !user) return;

    // Client-side active-template guard (belt-and-suspenders)
    const selectedTpl = getSelectedTemplate();
    if (selectedTpl && !selectedTpl.is_active) {
      toast({
        title: t("ppi.instances.toast.error"),
        description: t("ppi.instances.errors.inactiveTemplate"),
        variant: "destructive",
      });
      return;
    }

    try {
      const effectiveTemplateId =
        values.template_id && values.template_id !== "__none__"
          ? values.template_id
          : null;

      const input = {
        project_id:   activeProject.id,
        work_item_id: values.work_item_id,
        code:         values.code?.trim() || "",
        inspector_id: values.inspector_id || null,
        created_by:   user.id,
      };

      let instanceId: string;

      if (effectiveTemplateId) {
        const result = await ppiService.createInstanceFromTemplate(input, effectiveTemplateId);
        instanceId = result.id;
        if (result.hadExistingItems) {
          toast({
            title: t("ppi.instances.toast.created"),
            description: t("ppi.instances.toast.hadExistingItems"),
          });
        } else {
          toast({ title: t("ppi.instances.toast.created") });
        }
      } else {
        const result = await ppiService.createBlankInstance(input);
        instanceId = result.id;
        toast({ title: t("ppi.instances.toast.created") });
      }

      onOpenChange(false);
      onSuccess(instanceId);
    } catch (err) {
      // ── Proper error classification — NEVER shows [object Object] ──────────
      const info = classifySupabaseError(err, t);
      toast({
        title: info.title,
        description: info.description ?? info.raw,
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
            <FormField
              control={form.control}
              name="work_item_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t("ppi.instances.form.workItem")}{" "}
                    <span className="text-destructive">*</span>
                  </FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={loadingWI || !!preselectedWorkItemId}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue
                          placeholder={
                            loadingWI
                              ? t("common.loading")
                              : t("ppi.instances.form.selectWorkItem")
                          }
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {workItems.map((wi) => (
                        <SelectItem key={wi.id} value={wi.id}>
                          {wi.sector}
                          {wi.obra ? ` · ${wi.obra}` : ""}
                          {` (${t(`workItems.disciplines.${wi.disciplina}`, { defaultValue: wi.disciplina })})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* No-active-templates empty state */}
            {!loadingTpl && noActiveTemplates && (
              <Alert className="border-warning/40 bg-warning/5 py-3">
                <LayoutTemplate className="h-4 w-4 text-warning" />
                <AlertDescription className="text-warning-foreground text-xs ml-1 space-y-1.5">
                  <p>{t("ppi.instances.errors.noActiveTemplates")}</p>
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    className="h-auto p-0 text-xs font-medium underline text-warning"
                    onClick={() => {
                      onOpenChange(false);
                      navigate("/ppi?tab=templates");
                    }}
                  >
                    {t("ppi.instances.errors.goToTemplates")}
                    <ExternalLink className="h-3 w-3 ml-1" />
                  </Button>
                </AlertDescription>
              </Alert>
            )}

            {/* Template (optional) — only shown when templates exist */}
            {!noActiveTemplates && (
              <FormField
                control={form.control}
                name="template_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("ppi.instances.form.template")}</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value ?? ""}
                      disabled={loadingTpl}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue
                            placeholder={
                              loadingTpl
                                ? t("common.loading")
                                : t("ppi.instances.form.selectTemplate")
                            }
                          />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="__none__">
                          {t("ppi.instances.form.noTemplate")}
                        </SelectItem>
                        {templates.map((tpl) => (
                          <SelectItem key={tpl.id} value={tpl.id}>
                            [{tpl.code}] {tpl.title} —{" "}
                            {t(`ppi.disciplinas.${tpl.disciplina}`, {
                              defaultValue: tpl.disciplina,
                            })}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Discipline mismatch warning */}
            {disciplineMismatch && (
              <Alert className="border-warning/40 bg-warning/5 py-2">
                <AlertTriangle className="h-4 w-4 text-warning" />
                <AlertDescription className="text-warning-foreground text-xs ml-1">
                  {t("ppi.instances.form.disciplineMismatch", {
                    workItem: t(
                      `workItems.disciplines.${disciplineMismatch.workItemDisciplina}`,
                      { defaultValue: disciplineMismatch.workItemDisciplina }
                    ),
                    template: t(
                      `ppi.disciplinas.${disciplineMismatch.templateDisciplina}`,
                      { defaultValue: disciplineMismatch.templateDisciplina }
                    ),
                  })}
                </AlertDescription>
              </Alert>
            )}

            {/* Code — optional, auto-generated if empty */}
            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-1.5">
                    {t("ppi.instances.form.code")}
                    <span className="text-[10px] font-normal text-muted-foreground">
                      ({t("ppi.instances.form.codeAutoHint")})
                    </span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t("ppi.instances.form.codePlaceholder")}
                      {...field}
                      className="font-mono"
                    />
                  </FormControl>
                  <div className="flex items-center gap-1 text-[11px] text-muted-foreground mt-0.5">
                    <Info className="h-3 w-3 flex-shrink-0" />
                    {t("ppi.instances.form.codeAutoDescription", {
                      example: `PPI-${activeProject?.code ?? "PRJ"}-0001`,
                    })}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                {t("common.cancel")}
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && (
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />
                )}
                {isSubmitting
                  ? t("ppi.instances.form.saving")
                  : t("ppi.instances.form.createBtn")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
