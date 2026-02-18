import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { useProject } from "@/contexts/ProjectContext";
import { subcontractorService, type Subcontractor } from "@/lib/services/subcontractorService";
import { useSuppliers } from "@/hooks/useSuppliers";
import { classifySupabaseError } from "@/lib/utils/supabaseError";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AttachmentsPanel } from "@/components/attachments/AttachmentsPanel";

const STATUSES = ["active", "suspended", "concluded"] as const;

const schema = z.object({
  name: z.string().min(1),
  trade: z.string().optional(),
  status: z.enum(STATUSES).default("active"),
  contact_email: z.string().email().optional().or(z.literal("")),
  supplier_id: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  subcontractor?: Subcontractor | null;
  onSuccess: () => void;
}

export function SubcontractorFormDialog({ open, onOpenChange, subcontractor, onSuccess }: Props) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { activeProject } = useProject();
  const { toast } = useToast();
  const { data: suppliers } = useSuppliers();
  const isEdit = !!subcontractor;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", trade: "", status: "active", contact_email: "", supplier_id: "" },
  });

  useEffect(() => {
    if (subcontractor) {
      form.reset({
        name: subcontractor.name,
        trade: subcontractor.trade ?? "",
        status: (subcontractor.status as typeof STATUSES[number]) ?? "active",
        contact_email: subcontractor.contact_email ?? "",
        supplier_id: subcontractor.supplier_id ?? "",
      });
    } else {
      form.reset({ name: "", trade: "", status: "active", contact_email: "", supplier_id: "" });
    }
  }, [subcontractor, open, form]);

  const onSubmit = async (values: FormValues) => {
    if (!activeProject || !user) return;
    try {
      const supplierIdValue = values.supplier_id || undefined;
      if (subcontractor) {
        await subcontractorService.update(subcontractor.id, activeProject.id, {
          name: values.name,
          trade: values.trade || undefined,
          status: values.status,
          contact_email: values.contact_email || undefined,
          supplier_id: supplierIdValue,
        });
        toast({ title: t("subcontractors.toast.updated") });
      } else {
        await subcontractorService.create({
          project_id: activeProject.id,
          created_by: user.id,
          name: values.name,
          trade: values.trade || undefined,
          status: values.status,
          contact_email: values.contact_email || undefined,
          supplier_id: supplierIdValue,
        });
        toast({ title: t("subcontractors.toast.created") });
      }
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      const { title, description } = classifySupabaseError(err, t);
      toast({ variant: "destructive", title, description });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? t("subcontractors.form.titleEdit") : t("subcontractors.form.titleCreate")}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[75vh] pr-1">
          <div className="space-y-4 pb-1">
            <Form {...form}>
              <form id="sub-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("subcontractors.form.name")}</FormLabel>
                    <FormControl>
                      <Input placeholder={t("subcontractors.form.namePlaceholder")} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="trade" render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {t("subcontractors.form.trade")}{" "}
                        <span className="text-muted-foreground text-xs">({t("common.optional")})</span>
                      </FormLabel>
                      <FormControl>
                        <Input placeholder={t("subcontractors.form.tradePlaceholder")} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="status" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("common.status")}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          {STATUSES.map((s) => (
                            <SelectItem key={s} value={s}>{t(`subcontractors.status.${s}`)}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                <FormField control={form.control} name="contact_email" render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t("subcontractors.form.contactEmail")}{" "}
                      <span className="text-muted-foreground text-xs">({t("common.optional")})</span>
                    </FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="email@empresa.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                {suppliers.length > 0 && (
                  <FormField control={form.control} name="supplier_id" render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {t("subcontractors.form.linkedSupplier")}{" "}
                        <span className="text-muted-foreground text-xs">({t("common.optional")})</span>
                      </FormLabel>
                      <Select
                        onValueChange={(v) => field.onChange(v === "__none__" ? "" : v)}
                        value={field.value || "__none__"}
                      >
                        <FormControl><SelectTrigger><SelectValue placeholder={t("subcontractors.form.linkedSupplierPlaceholder")} /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="__none__">{t("subcontractors.form.noSupplier")}</SelectItem>
                          {suppliers.map((s) => (
                            <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                )}
              </form>
            </Form>

            {isEdit && subcontractor && activeProject && (
              <>
                <Separator />
                <AttachmentsPanel
                  projectId={activeProject.id}
                  entityType="subcontractors"
                  entityId={subcontractor.id}
                />
              </>
            )}
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{t("common.cancel")}</Button>
          <Button type="submit" form="sub-form" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting
              ? t("common.loading")
              : isEdit ? t("common.save") : t("subcontractors.form.createBtn")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
