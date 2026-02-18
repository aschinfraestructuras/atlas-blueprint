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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

const schema = (t: (k: string) => string) =>
  z.object({
    description: z.string().trim().min(1, t("nc.form.validation.descriptionRequired")).max(1000),
    severity: z.string().min(1, t("nc.form.validation.severityRequired")),
    status: z.string().min(1),
    reference: z.string().trim().max(50).optional().or(z.literal("")),
    responsible: z.string().trim().max(120).optional().or(z.literal("")),
    due_date: z.string().optional().or(z.literal("")),
  });

type FormValues = z.infer<ReturnType<typeof schema>>;

interface NCFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nc?: NonConformity | null;
  onSuccess: () => void;
}

export function NCFormDialog({ open, onOpenChange, nc, onSuccess }: NCFormDialogProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { activeProject } = useProject();
  const [submitting, setSubmitting] = useState(false);
  const isEdit = !!nc;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema(t)),
    defaultValues: { description: "", severity: "medium", status: "open", reference: "", responsible: "", due_date: "" },
  });

  useEffect(() => {
    if (open) {
      form.reset(
        nc
          ? {
              description: nc.description,
              severity: nc.severity,
              status: nc.status,
              reference: nc.reference ?? "",
              responsible: nc.responsible ?? "",
              due_date: nc.due_date ?? "",
            }
          : { description: "", severity: "medium", status: "open", reference: "", responsible: "", due_date: "" }
      );
    }
  }, [open, nc, form]);

  const onSubmit = async (values: FormValues) => {
    if (!user || !activeProject) return;
    setSubmitting(true);
    try {
      if (isEdit && nc) {
        await ncService.update(nc.id, activeProject.id, {
          description: values.description,
          severity: values.severity,
          status: values.status,
          reference: values.reference || undefined,
          responsible: values.responsible || undefined,
          due_date: values.due_date || undefined,
        });
        toast({ title: t("nc.toast.updated") });
      } else {
        await ncService.create({
          project_id: activeProject.id,
          description: values.description,
          severity: values.severity,
          status: values.status,
          reference: values.reference || undefined,
          responsible: values.responsible || undefined,
          due_date: values.due_date || undefined,
          created_by: user.id,
        });
        toast({ title: t("nc.toast.created") });
      }
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      toast({
        title: t("nc.toast.error"),
        description: err instanceof Error ? err.message : t("auth.errors.unexpected"),
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">
            {isEdit ? t("nc.form.titleEdit") : t("nc.form.titleCreate")}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-1">
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("nc.form.description")}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t("nc.form.descriptionPlaceholder")}
                      className="resize-none"
                      rows={3}
                      autoFocus
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="severity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("nc.table.severity")}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="low">{t("nc.severity.low")}</SelectItem>
                        <SelectItem value="medium">{t("nc.severity.medium")}</SelectItem>
                        <SelectItem value="high">{t("nc.severity.high")}</SelectItem>
                        <SelectItem value="critical">{t("nc.severity.critical")}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("common.status")}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="open">{t("nc.status.open")}</SelectItem>
                        <SelectItem value="under_review">{t("nc.status.under_review")}</SelectItem>
                        <SelectItem value="closed">{t("nc.status.closed")}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="reference"
                render={({ field }) => (
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
                )}
              />

              <FormField
                control={form.control}
                name="due_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t("nc.table.dueDate")}{" "}
                      <span className="text-xs text-muted-foreground font-normal">({t("common.optional")})</span>
                    </FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="responsible"
              render={({ field }) => (
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
              )}
            />

            <DialogFooter className="pt-2">
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
