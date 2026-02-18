import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { useProject } from "@/contexts/ProjectContext";

import { projectService, type Project } from "@/lib/services/projectService";
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
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

const schema = (t: (k: string) => string) =>
  z.object({
    name: z
      .string()
      .trim()
      .min(1, t("projects.form.validation.nameRequired"))
      .max(120, t("projects.form.validation.nameTooLong")),
    code: z
      .string()
      .trim()
      .min(1, t("projects.form.validation.codeRequired"))
      .max(30, t("projects.form.validation.codeTooLong"))
      .regex(/^[A-Za-z0-9_\-]+$/, t("projects.form.validation.codeFormat")),
    client: z.string().trim().max(120).optional().or(z.literal("")),
    location: z.string().trim().max(200).optional().or(z.literal("")),
    start_date: z.string().optional().or(z.literal("")),
    status: z.enum(["active", "archived"]),
  });

type FormValues = z.infer<ReturnType<typeof schema>>;

interface ProjectFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project?: Project | null;
  onSuccess: () => void;
}

export function ProjectFormDialog({
  open,
  onOpenChange,
  project,
  onSuccess,
}: ProjectFormDialogProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { setActiveProject, refetchProjects } = useProject();
  const [submitting, setSubmitting] = useState(false);

  const isEdit = !!project;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema(t)),
    defaultValues: {
      name: "",
      code: "",
      client: "",
      location: "",
      start_date: "",
      status: "active",
    },
  });

  // Reset form when dialog opens/closes or project changes
  useEffect(() => {
    if (open) {
      form.reset(
        project
          ? {
              name: project.name,
              code: project.code,
              client: project.client ?? "",
              location: project.location ?? "",
              start_date: project.start_date ?? "",
              status: project.status as "active" | "archived",
            }
          : { name: "", code: "", client: "", location: "", start_date: "", status: "active" }
      );
    }
  }, [open, project, form]);

  const onSubmit = async (values: FormValues) => {
    if (!user) return;
    setSubmitting(true);
    try {
      // Check code uniqueness
      const unique = await projectService.isCodeUnique(values.code, project?.id);
      if (!unique) {
        form.setError("code", { message: t("projects.form.validation.codeNotUnique") });
        setSubmitting(false);
        return;
      }

      if (isEdit && project) {
        const updated = await projectService.update(project.id, {
          name: values.name,
          code: values.code,
          client: values.client || undefined,
          location: values.location || undefined,
          start_date: values.start_date || undefined,
          status: values.status,
        });
        toast({ title: t("projects.toast.updated") });
        // If the active project was this one, refresh it
        setActiveProject(updated);
      } else {
        const created = await projectService.create({
          name: values.name,
          code: values.code,
          client: values.client || undefined,
          location: values.location || undefined,
          start_date: values.start_date || undefined,
          status: values.status,
          created_by: user.id,
        });
        setActiveProject(created);
        toast({ title: t("projects.toast.created") });
      }

      await refetchProjects();
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      toast({
        title: t("projects.toast.error"),
        description: err instanceof Error ? err.message : t("auth.errors.unexpected"),
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">
            {isEdit ? t("projects.form.titleEdit") : t("projects.form.titleCreate")}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-1">
            {/* Name */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("projects.form.name")}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t("projects.form.namePlaceholder")}
                      {...field}
                      autoFocus
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Code */}
            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t("projects.form.code")}{" "}
                    <span className="text-xs text-muted-foreground font-normal">
                      ({t("common.required")})
                    </span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t("projects.form.codePlaceholder")}
                      className="font-mono uppercase"
                      {...field}
                      onChange={(e) =>
                        field.onChange(e.target.value.toUpperCase())
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Client + Location in a 2-col grid */}
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="client"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t("projects.form.client")}{" "}
                      <span className="text-xs text-muted-foreground font-normal">
                        ({t("common.optional")})
                      </span>
                    </FormLabel>
                    <FormControl>
                      <Input placeholder={t("projects.form.clientPlaceholder")} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t("projects.form.location")}{" "}
                      <span className="text-xs text-muted-foreground font-normal">
                        ({t("common.optional")})
                      </span>
                    </FormLabel>
                    <FormControl>
                      <Input placeholder={t("projects.form.locationPlaceholder")} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Start date + Status */}
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="start_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t("projects.form.startDate")}{" "}
                      <span className="text-xs text-muted-foreground font-normal">
                        ({t("common.optional")})
                      </span>
                    </FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
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
                        <SelectItem value="active">{t("projects.status.active")}</SelectItem>
                        <SelectItem value="archived">{t("projects.status.archived")}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={submitting}
              >
                {t("common.cancel")}
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />}
                {isEdit ? t("common.save") : t("projects.form.createBtn")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
