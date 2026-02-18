import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { useProject } from "@/contexts/ProjectContext";
import { documentService } from "@/lib/services/documentService";
import type { Document } from "@/lib/services/documentService";
import { toast } from "@/hooks/use-toast";
import { classifySupabaseError } from "@/lib/utils/supabaseError";
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
    title: z.string().trim().min(1, t("documents.form.validation.titleRequired")).max(200),
    doc_type: z.string().min(1, t("documents.form.validation.typeRequired")),
    status: z.string().min(1),
    revision: z.string().trim().max(20).optional().or(z.literal("")),
    file_url: z.string().url(t("documents.form.validation.fileUrlInvalid")).optional().or(z.literal("")),
  });

type FormValues = z.infer<ReturnType<typeof schema>>;

interface DocumentFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document?: Document | null;
  onSuccess: () => void;
}

export function DocumentFormDialog({ open, onOpenChange, document: doc, onSuccess }: DocumentFormDialogProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { activeProject } = useProject();
  const [submitting, setSubmitting] = useState(false);
  const isEdit = !!doc;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema(t)),
    defaultValues: { title: "", doc_type: "", status: "draft", revision: "", file_url: "" },
  });

  useEffect(() => {
    if (open) {
      form.reset(
        doc
          ? { title: doc.title, doc_type: doc.doc_type, status: doc.status, revision: doc.revision ?? "", file_url: doc.file_url ?? "" }
          : { title: "", doc_type: "", status: "draft", revision: "", file_url: "" }
      );
    }
  }, [open, doc, form]);

  const onSubmit = async (values: FormValues) => {
    if (!user || !activeProject) return;
    setSubmitting(true);
    try {
      if (isEdit && doc) {
        await documentService.update(doc.id, activeProject.id, {
          title: values.title,
          doc_type: values.doc_type,
          status: values.status,
          revision: values.revision || undefined,
          file_url: values.file_url || undefined,
        });
        toast({ title: t("documents.toast.updated") });
      } else {
        await documentService.create({
          project_id: activeProject.id,
          title: values.title,
          doc_type: values.doc_type,
          status: values.status,
          revision: values.revision || "0",
          file_url: values.file_url || undefined,
          created_by: user.id,
        });
        toast({ title: t("documents.toast.created") });
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

  const DOC_TYPES = [
    "procedure", "instruction", "plan", "report", "certificate",
    "drawing", "specification", "form", "record", "other",
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">
            {isEdit ? t("documents.form.titleEdit") : t("documents.form.titleCreate")}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-1">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("documents.form.title")}</FormLabel>
                  <FormControl>
                    <Input placeholder={t("documents.form.titlePlaceholder")} autoFocus {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="doc_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("documents.form.type")}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t("documents.form.typePlaceholder")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {DOC_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>
                            {t(`documents.docTypes.${type}`)}
                          </SelectItem>
                        ))}
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
                        <SelectItem value="draft">{t("documents.status.draft")}</SelectItem>
                        <SelectItem value="submitted">{t("documents.status.submitted")}</SelectItem>
                        <SelectItem value="approved">{t("documents.status.approved")}</SelectItem>
                        <SelectItem value="rejected">{t("documents.status.rejected")}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="revision"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t("documents.form.revision")}{" "}
                    <span className="text-xs text-muted-foreground font-normal">({t("common.optional")})</span>
                  </FormLabel>
                  <FormControl>
                    <Input placeholder={t("documents.form.revisionPlaceholder")} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="file_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t("documents.form.fileUrl")}{" "}
                    <span className="text-xs text-muted-foreground font-normal">({t("common.optional")})</span>
                  </FormLabel>
                  <FormControl>
                    <Input placeholder={t("documents.form.fileUrlPlaceholder")} {...field} />
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
                {isEdit ? t("common.save") : t("documents.form.createBtn")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
