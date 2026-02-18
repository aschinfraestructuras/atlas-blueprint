import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { useAttachments } from "@/hooks/useAttachments";
import { attachmentService, type EntityType } from "@/lib/services/attachmentService";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Paperclip, Upload, Download, Trash2, Loader2, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Attachment } from "@/lib/services/attachmentService";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatBytes(b: number | null | undefined): string {
  if (!b) return "";
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}

function getExt(name: string): string {
  const parts = name.split(".");
  return parts.length > 1 ? parts[parts.length - 1].toUpperCase() : "—";
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface AttachmentsPanelProps {
  /** ID do projeto ativo */
  projectId: string;
  /** Tipo de entidade: 'test' | 'non_conformity' */
  entityType: EntityType;
  /**
   * UUID da entidade.
   * Se null/undefined o painel mostra apenas a nota "guarde primeiro o registo".
   */
  entityId: string | null | undefined;
  /** Classe extra para o container */
  className?: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function AttachmentsPanel({
  projectId,
  entityType,
  entityId,
  className,
}: AttachmentsPanelProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { data: attachments, loading, refetch } = useAttachments(entityType, entityId);

  const fileInputRef     = useRef<HTMLInputElement>(null);
  const [uploading, setUploading]   = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // ── Upload ────────────────────────────────────────────────────────────────

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !entityId || !user) return;

    setUploading(true);
    try {
      await attachmentService.upload(file, projectId, entityType, entityId, user.id);
      toast({ title: t("attachments.toast.uploaded", { name: file.name }) });
      refetch();
    } catch (err) {
      toast({
        title: t("attachments.toast.uploadError"),
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  // ── Download ──────────────────────────────────────────────────────────────

  const handleDownload = async (att: Attachment) => {
    setDownloadingId(att.id);
    try {
      const url = await attachmentService.getSignedUrl(att.file_path);
      const a = window.document.createElement("a");
      a.href = url;
      a.download = att.file_name;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.click();
    } catch (err) {
      toast({
        title: t("attachments.toast.downloadError"),
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive",
      });
    } finally {
      setDownloadingId(null);
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────────

  const handleDelete = async (att: Attachment) => {
    try {
      await attachmentService.delete(att);
      toast({ title: t("attachments.toast.deleted") });
      refetch();
    } catch (err) {
      toast({
        title: t("attachments.toast.deleteError"),
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive",
      });
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <TooltipProvider>
      <div className={cn("space-y-3", className)}>
        {/* Section header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-sm font-medium text-foreground">
            <Paperclip className="h-3.5 w-3.5 text-muted-foreground" />
            {t("attachments.title")}
            {attachments.length > 0 && (
              <span className="ml-1 rounded-full bg-muted px-1.5 py-0.5 text-xs font-normal text-muted-foreground">
                {attachments.length}
              </span>
            )}
          </div>

          {entityId && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept="*/*"
                className="hidden"
                onChange={handleFileChange}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 gap-1.5 text-xs"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading
                  ? <Loader2 className="h-3 w-3 animate-spin" />
                  : <Upload className="h-3 w-3" />}
                {t("attachments.upload")}
              </Button>
            </>
          )}
        </div>

        {/* Body */}
        {!entityId ? (
          <p className="text-xs text-muted-foreground italic">
            {t("attachments.saveFirst")}
          </p>
        ) : loading ? (
          <div className="space-y-2">
            {[1, 2].map((i) => (
              <Skeleton key={i} className="h-9 w-full rounded-lg" />
            ))}
          </div>
        ) : attachments.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-muted/30 py-5 text-center">
            <Paperclip className="mx-auto h-6 w-6 text-muted-foreground/50" />
            <p className="mt-1.5 text-xs text-muted-foreground">{t("attachments.empty")}</p>
          </div>
        ) : (
          <ul className="space-y-1.5">
            {attachments.map((att) => {
              const isDownloading = downloadingId === att.id;
              return (
                <li
                  key={att.id}
                  className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm"
                >
                  {/* Icon + name */}
                  <FileText className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-foreground" title={att.file_name}>
                      {att.file_name}
                    </p>
                    <p className="text-xs text-muted-foreground/70">
                      {getExt(att.file_name)}
                      {att.file_size ? ` · ${formatBytes(att.file_size)}` : ""}
                      {" · "}
                      {new Date(att.created_at).toLocaleDateString()}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-0.5 flex-shrink-0">
                    {/* Download */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-primary"
                          onClick={() => handleDownload(att)}
                          disabled={isDownloading}
                        >
                          {isDownloading
                            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            : <Download className="h-3.5 w-3.5" />}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top">{t("attachments.download")}</TooltipContent>
                    </Tooltip>

                    {/* Delete with confirmation */}
                    <AlertDialog>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <AlertDialogTrigger asChild>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </AlertDialogTrigger>
                        </TooltipTrigger>
                        <TooltipContent side="top">{t("common.delete")}</TooltipContent>
                      </Tooltip>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>{t("attachments.deleteConfirm.title")}</AlertDialogTitle>
                          <AlertDialogDescription>
                            {t("attachments.deleteConfirm.description", { name: att.file_name })}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={() => handleDelete(att)}
                          >
                            {t("common.delete")}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </TooltipProvider>
  );
}
