import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { useProject } from "@/contexts/ProjectContext";
import { documentService, isDocumentEditable } from "@/lib/services/documentService";
import type { Document } from "@/lib/services/documentService";
import { DOCUMENT_STATUSES } from "@/lib/services/documentService";
import type { DocumentStatus } from "@/lib/services/documentService";
import { DOCUMENT_TEMPLATES, type DocumentTemplate } from "@/lib/services/documentTemplates";
import { toast } from "@/hooks/use-toast";
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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Loader2, CheckCircle2, XCircle, SendHorizontal, RotateCcw,
  Upload, FileText, ExternalLink, Download, ClipboardList,
} from "lucide-react";
import { AttachmentsPanel } from "@/components/attachments/AttachmentsPanel";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

const STATUS_COLORS: Record<DocumentStatus, string> = {
  draft:     "bg-muted text-muted-foreground",
  in_review: "bg-primary/15 text-primary",
  approved:  "bg-chart-2/15 text-chart-2 font-semibold",
  obsolete:  "bg-amber-500/15 text-amber-600",
  archived:  "bg-muted/60 text-muted-foreground",
};

const DOC_TYPES = [
  "procedure", "instruction", "plan", "report", "certificate",
  "drawing", "specification", "form", "record", "other",
];

const DISCIPLINAS = [
  "geral", "estruturas", "geotecnia", "hidraulica", "estradas",
  "ambiente", "seguranca", "eletrica", "mecanica", "outro",
];

const schema = (t: (k: string) => string) =>
  z.object({
    title:    z.string().trim().min(1, t("documents.form.validation.titleRequired")).max(200),
    doc_type: z.string().min(1, t("documents.form.validation.typeRequired")),
    disciplina: z.string().min(1, t("documents.form.validation.disciplinaRequired")),
    status:   z.enum(DOCUMENT_STATUSES),
    revision: z.string().trim().max(20).optional().or(z.literal("")),
    code:     z.string().trim().max(50).optional().or(z.literal("")),
    issued_at: z.string().optional().or(z.literal("")),
    tags:     z.string().optional().or(z.literal("")),
    file_url: z.string().optional().or(z.literal("")),
    disciplina_outro: z.string().optional().or(z.literal("")),
    type_outro: z.string().optional().or(z.literal("")),
  });

type FormValues = z.infer<ReturnType<typeof schema>>;

interface DocumentFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document?: Document | null;
  onSuccess: () => void;
}

function formatBytes(b: number | null | undefined): string {
  if (!b) return "";
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}

export function DocumentFormDialog({ open, onOpenChange, document: doc, onSuccess }: DocumentFormDialogProps) {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { activeProject } = useProject();
  const [submitting, setSubmitting] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [viewingUrl, setViewingUrl] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isEdit = !!doc;
  const editable = !doc || isDocumentEditable(doc.status);
  const lang = i18n.language;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema(t)),
    defaultValues: { title: "", doc_type: "", disciplina: "geral", status: "draft", revision: "", code: "", issued_at: "", tags: "", file_url: "", disciplina_outro: "", type_outro: "" },
  });

  const watchDisciplina = form.watch("disciplina");
  const watchDocType = form.watch("doc_type");

  useEffect(() => {
    if (open) {
      form.reset(
        doc
          ? {
              title: doc.title,
              doc_type: doc.doc_type,
              disciplina: doc.disciplina || "geral",
              status: doc.status,
              revision: doc.revision ?? "",
              code: doc.code ?? "",
              issued_at: doc.issued_at ?? "",
              tags: (doc.tags ?? []).join(", "),
              file_url: doc.file_url ?? "",
              disciplina_outro: doc.disciplina_outro ?? "",
              type_outro: doc.type_outro ?? "",
            }
          : { title: "", doc_type: "", disciplina: "geral", status: "draft", revision: "", code: "", issued_at: "", tags: "", file_url: "", disciplina_outro: "", type_outro: "" }
      );
      setPendingFile(null);
      setSelectedTemplate("");
    }
  }, [open, doc, form]);

  // Template selection handler
  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId);
    const tpl = DOCUMENT_TEMPLATES.find((t) => t.id === templateId);
    if (!tpl) return;
    const title = lang === "es" ? tpl.title_es : tpl.title_pt;
    form.setValue("title", title);
    form.setValue("doc_type", tpl.doc_type);
    form.setValue("disciplina", tpl.disciplina);
  };

  // ── File upload on existing document ────────────────────────────────────────
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (!doc || !activeProject || !user) {
      setPendingFile(file);
      return;
    }

    setUploadingFile(true);
    try {
      await documentService.uploadFile(file, activeProject.id, doc.id, user.id);
      toast({ title: t("documents.toast.fileUploaded", { name: file.name }) });
      onSuccess();
    } catch (err) {
      toast({
        title: t("attachments.toast.uploadError"),
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive",
      });
    } finally {
      setUploadingFile(false);
    }
  };

  // ── View / download existing file ────────────────────────────────────────────
  const handleViewFile = async (download = false) => {
    if (!doc?.file_path) return;
    setViewingUrl(true);
    try {
      const url = await documentService.getSignedUrl(doc.file_path, activeProject?.id, doc.id);
      if (download) {
        const a = window.document.createElement("a");
        a.href = url; a.download = doc.file_name ?? "document"; a.target = "_blank"; a.rel = "noopener noreferrer"; a.click();
      } else {
        window.open(url, "_blank", "noopener,noreferrer");
      }
    } catch (err) {
      toast({
        title: t("attachments.toast.downloadError"),
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive",
      });
    } finally {
      setViewingUrl(false);
    }
  };

  // ── Submit ───────────────────────────────────────────────────────────────────
  const onSubmit = async (values: FormValues) => {
    if (!user || !activeProject) return;
    setSubmitting(true);

    // Parse tags
    const tagsArray = values.tags
      ? values.tags.split(",").map(s => s.trim()).filter(Boolean)
      : [];

    try {
      const extraFields: Record<string, unknown> = {
        code: values.code || null,
        issued_at: values.issued_at || null,
        tags: tagsArray.length > 0 ? tagsArray : null,
        file_url: values.file_url || null,
        disciplina_outro: values.disciplina === "outro" ? (values.disciplina_outro || null) : null,
        type_outro: values.doc_type === "other" ? (values.type_outro || null) : null,
      };

      if (isEdit && doc) {
        await documentService.update(doc.id, activeProject.id, {
          title: values.title,
          doc_type: values.doc_type,
          disciplina: values.disciplina,
          status: values.status as DocumentStatus,
          revision: values.revision || undefined,
          ...extraFields,
        } as any);
        toast({ title: t("documents.toast.updated") });
      } else {
        // Find template form_schema if selected
        const tpl = selectedTemplate ? DOCUMENT_TEMPLATES.find((t) => t.id === selectedTemplate) : null;

        const created = await documentService.create({
          project_id: activeProject.id,
          title: values.title,
          doc_type: values.doc_type,
          disciplina: values.disciplina,
          status: values.status as DocumentStatus,
          revision: values.revision || "0",
          created_by: user.id,
          ...extraFields,
        } as any);

        // If template has form_schema, save it to the document
        if (tpl?.form_schema) {
          await supabase
            .from("documents")
            .update({
              form_schema: tpl.form_schema as any,
              form_data: {} as any,
            })
            .eq("id", created.id);
        }

        // Upload pending file if selected before creating
        if (pendingFile) {
          try {
            await documentService.uploadFile(pendingFile, activeProject.id, created.id, user.id);
          } catch (uploadErr) {
            toast({
              title: t("attachments.toast.uploadError"),
              description: uploadErr instanceof Error ? uploadErr.message : String(uploadErr),
              variant: "destructive",
            });
          }
        }
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

  const handleStatusTransition = async (toStatus: DocumentStatus) => {
    if (!doc || !activeProject) return;
    setTransitioning(true);
    try {
      await documentService.changeStatus(doc.id, activeProject.id, doc.status, toStatus);
      toast({ title: t(`documents.toast.status_${toStatus}`) });
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      const info = classifySupabaseError(err);
      toast({
        title: t(info.titleKey),
        description: info.raw || t("auth.errors.unexpected"),
        variant: "destructive",
      });
    } finally {
      setTransitioning(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between gap-3">
            <DialogTitle className="text-base font-semibold">
              {isEdit ? t("documents.form.titleEdit") : t("documents.form.titleCreate")}
            </DialogTitle>
            {doc && (
              <Badge variant="secondary" className={cn("text-xs shrink-0", STATUS_COLORS[doc.status] ?? "")}>
                {t(`documents.status.${doc.status}`)}
              </Badge>
            )}
          </div>
        </DialogHeader>

        {/* Workflow action buttons (only in edit mode) */}
        {doc && (
          <div className="flex flex-wrap gap-2 py-1">
            {doc.status === "draft" && (
              <Button type="button" size="sm" variant="outline" className="gap-1.5 text-xs"
                onClick={() => handleStatusTransition("in_review")} disabled={transitioning}>
                {transitioning ? <Loader2 className="h-3 w-3 animate-spin" /> : <SendHorizontal className="h-3 w-3" />}
                {t("documents.actions.submit")}
              </Button>
            )}
            {doc.status === "in_review" && (
              <>
                <Button type="button" size="sm" className="gap-1.5 text-xs bg-primary/90 hover:bg-primary"
                  onClick={() => handleStatusTransition("approved")} disabled={transitioning}>
                  {transitioning ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                  {t("documents.actions.approve")}
                </Button>
                <Button type="button" size="sm" variant="ghost" className="gap-1.5 text-xs text-muted-foreground"
                  onClick={() => handleStatusTransition("draft")} disabled={transitioning}>
                  {transitioning ? <Loader2 className="h-3 w-3 animate-spin" /> : <RotateCcw className="h-3 w-3" />}
                  {t("documents.actions.backToDraft")}
                </Button>
              </>
            )}
            {doc.status === "approved" && (
              <Button type="button" size="sm" variant="ghost" className="gap-1.5 text-xs text-muted-foreground"
                onClick={() => handleStatusTransition("obsolete")} disabled={transitioning}>
                {transitioning ? <Loader2 className="h-3 w-3 animate-spin" /> : <RotateCcw className="h-3 w-3" />}
                {t("documents.actions.obsolete")}
              </Button>
            )}
          </div>
        )}

        {!editable && (
          <p className="rounded-md bg-muted/50 border border-border px-3 py-2 text-xs text-muted-foreground">
            {t("documents.form.lockedNotice")}
          </p>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-1">
            {/* Template selector (create mode only) */}
            {!isEdit && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium">{t("documents.form.template")}</label>
                <Select value={selectedTemplate} onValueChange={handleTemplateSelect}>
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder={t("documents.form.templatePlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t("documents.form.noTemplate")}</SelectItem>
                    {DOCUMENT_TEMPLATES.map((tpl) => (
                      <SelectItem key={tpl.id} value={tpl.id}>
                        <div className="flex items-center gap-2">
                          <ClipboardList className="h-3 w-3 text-muted-foreground" />
                          <span>{lang === "es" ? tpl.title_es : tpl.title_pt}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedTemplate && selectedTemplate !== "none" && (
                  <p className="text-[10px] text-muted-foreground">
                    {(() => {
                      const tpl = DOCUMENT_TEMPLATES.find((t) => t.id === selectedTemplate);
                      return tpl ? (lang === "es" ? tpl.description_es : tpl.description_pt) : "";
                    })()}
                  </p>
                )}
              </div>
            )}

            <FormField control={form.control} name="title" render={({ field }) => (
              <FormItem>
                <FormLabel>{t("documents.form.title")}</FormLabel>
                <FormControl>
                  <Input placeholder={t("documents.form.titlePlaceholder")}
                    disabled={!editable} autoFocus={editable} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="grid grid-cols-2 gap-3">
              <FormField control={form.control} name="doc_type" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("documents.form.type")}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={!editable}>
                    <FormControl>
                      <SelectTrigger><SelectValue placeholder={t("documents.form.typePlaceholder")} /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {DOC_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>{t(`documents.docTypes.${type}`)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="disciplina" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("documents.form.disciplina")}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={!editable}>
                    <FormControl>
                      <SelectTrigger><SelectValue placeholder={t("documents.form.disciplinaPlaceholder")} /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {DISCIPLINAS.map((d) => (
                        <SelectItem key={d} value={d}>{t(`documents.disciplinas.${d}`, { defaultValue: d })}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            {/* Conditional "outro" fields */}
            {watchDocType === "other" && (
              <FormField control={form.control} name="type_outro" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("documents.form.typeOutro")}</FormLabel>
                  <FormControl>
                    <Input placeholder={t("documents.form.typeOutro")} disabled={!editable} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            )}

            {watchDisciplina === "outro" && (
              <FormField control={form.control} name="disciplina_outro" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("documents.form.disciplinaOutro")}</FormLabel>
                  <FormControl>
                    <Input placeholder={t("documents.form.disciplinaOutro")} disabled={!editable} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            )}

            <div className="grid grid-cols-2 gap-3">
              <FormField control={form.control} name="status" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("common.status")}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={!editable}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="draft">{t("documents.status.draft")}</SelectItem>
                      <SelectItem value="in_review">{t("documents.status.in_review")}</SelectItem>
                      <SelectItem value="approved">{t("documents.status.approved")}</SelectItem>
                      <SelectItem value="obsolete">{t("documents.status.obsolete")}</SelectItem>
                      <SelectItem value="archived">{t("documents.status.archived")}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="revision" render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t("documents.form.revision")}{" "}
                    <span className="text-xs text-muted-foreground font-normal">({t("common.optional")})</span>
                  </FormLabel>
                  <FormControl>
                    <Input placeholder={t("documents.form.revisionPlaceholder")} disabled={!editable} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            {/* New fields: code, issued_at, file_url, tags */}
            <div className="grid grid-cols-2 gap-3">
              <FormField control={form.control} name="code" render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t("documents.form.code")}
                    <span className="text-xs text-muted-foreground font-normal ml-1">({t("common.optional")})</span>
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="PG-PF17A-01" disabled={!editable} className="font-mono" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="issued_at" render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t("documents.form.issuedAt")}
                    <span className="text-xs text-muted-foreground font-normal ml-1">({t("common.optional")})</span>
                  </FormLabel>
                  <FormControl>
                    <Input type="date" disabled={!editable} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="file_url" render={({ field }) => (
              <FormItem>
                <FormLabel>
                  {t("documents.form.fileUrl")}
                  <span className="text-xs text-muted-foreground font-normal ml-1">({t("common.optional")})</span>
                </FormLabel>
                <FormControl>
                  <Input placeholder="https://…" disabled={!editable} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="tags" render={({ field }) => (
              <FormItem>
                <FormLabel>
                  {t("documents.form.tags")}
                  <span className="text-xs text-muted-foreground font-normal ml-1">({t("common.optional")})</span>
                </FormLabel>
                <FormControl>
                  <Input placeholder={t("documents.form.tagsPlaceholder")} disabled={!editable} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            {/* ── Main document file ─────────────────────────────────────────── */}
            <Separator />
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">{t("documents.form.mainFile")}</p>

              {doc?.file_path && (
                <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm">
                  <FileText className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                  <span className="flex-1 truncate text-xs font-medium" title={doc.file_name ?? undefined}>
                    {doc.file_name ?? doc.file_path.split("/").pop()}
                    {doc.file_size ? ` · ${formatBytes(doc.file_size)}` : ""}
                  </span>
                  <div className="flex items-center gap-0.5 flex-shrink-0">
                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary"
                      onClick={() => handleViewFile(false)} disabled={viewingUrl} title={t("documents.actions.view")}>
                      {viewingUrl ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ExternalLink className="h-3.5 w-3.5" />}
                    </Button>
                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary"
                      onClick={() => handleViewFile(true)} disabled={viewingUrl} title={t("documents.actions.download")}>
                      <Download className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              )}

              {pendingFile && !doc && (
                <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-sm">
                  <FileText className="h-4 w-4 flex-shrink-0 text-primary" />
                  <span className="flex-1 truncate text-xs font-medium text-primary">{pendingFile.name}</span>
                  <button type="button" className="text-xs text-muted-foreground hover:text-destructive"
                    onClick={() => setPendingFile(null)}>✕</button>
                </div>
              )}

              <input ref={fileInputRef} type="file" accept="*/*" className="hidden" onChange={handleFileChange} />
              <Button type="button" variant="outline" size="sm" className="gap-1.5 text-xs"
                onClick={() => fileInputRef.current?.click()} disabled={uploadingFile || submitting}>
                {uploadingFile
                  ? <Loader2 className="h-3 w-3 animate-spin" />
                  : <Upload className="h-3 w-3" />}
                {doc?.file_path ? t("documents.form.replaceFile") : t("documents.form.attachFile")}
              </Button>
            </div>

            {/* ── Extra attachments — edit mode only ─────────── */}
            {activeProject && doc && (
              <>
                <Separator />
                <AttachmentsPanel
                  projectId={activeProject.id}
                  entityType="documents"
                  entityId={doc.id}
                />
              </>
            )}

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
                {t("common.cancel")}
              </Button>
              {editable && (
                <Button type="submit" disabled={submitting}>
                  {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />}
                  {isEdit ? t("common.save") : t("documents.form.createBtn")}
                </Button>
              )}
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
