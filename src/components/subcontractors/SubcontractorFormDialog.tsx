import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { useProject } from "@/contexts/ProjectContext";
import { subcontractorService, type Subcontractor } from "@/lib/services/subcontractorService";
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

const STATUSES = ["active", "suspended", "concluded"] as const;

const schema = z.object({
  name: z.string().min(1),
  trade: z.string().optional(),
  status: z.enum(STATUSES).default("active"),
  contact_email: z.string().email().optional().or(z.literal("")),
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

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", trade: "", status: "active", contact_email: "" },
  });

  useEffect(() => {
    if (subcontractor) {
      form.reset({
        name: subcontractor.name,
        trade: subcontractor.trade ?? "",
        status: (subcontractor.status as typeof STATUSES[number]) ?? "active",
        contact_email: subcontractor.contact_email ?? "",
      });
    } else {
      form.reset({ name: "", trade: "", status: "active", contact_email: "" });
    }
  }, [subcontractor, open, form]);

  const onSubmit = async (values: FormValues) => {
    if (!activeProject || !user) return;
    try {
      if (subcontractor) {
        await subcontractorService.update(subcontractor.id, activeProject.id, {
          name: values.name,
          trade: values.trade || undefined,
          status: values.status,
          contact_email: values.contact_email || undefined,
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
            {subcontractor ? t("subcontractors.form.titleEdit") : t("subcontractors.form.titleCreate")}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                  <FormLabel>{t("subcontractors.form.trade")} <span className="text-muted-foreground text-xs">({t("common.optional")})</span></FormLabel>
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
                <FormLabel>{t("subcontractors.form.contactEmail")} <span className="text-muted-foreground text-xs">({t("common.optional")})</span></FormLabel>
                <FormControl>
                  <Input type="email" placeholder="email@empresa.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{t("common.cancel")}</Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? t("common.loading") : subcontractor ? t("common.save") : t("subcontractors.form.createBtn")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
