import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { useAttachments } from "@/hooks/useAttachments";
import { attachmentService, type EntityType, type GeoData } from "@/lib/services/attachmentService";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Paperclip, Upload, Download, Trash2, Loader2,
  FileText, FileSpreadsheet, FileImage, FileArchive, File,
  Camera, MapPin,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Attachment } from "@/lib/services/attachmentService";

// ─── Accepted file types ─────────────────────────────────────────────────────

const ACCEPTED_EXTENSIONS = ".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.dwg,.dxf,.jpg,.jpeg,.png,.gif,.bmp,.tiff,.mp4,.zip,.7z";

const ALLOWED_SET = new Set([
  "pdf", "doc", "docx", "xls", "xlsx", "csv", "txt",
  "dwg", "dxf", "jpg", "jpeg", "png", "gif", "bmp", "tiff",
  "mp4", "zip", "7z",
]);

function isFileAllowed(fileName: string): boolean {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  return ALLOWED_SET.has(ext);
}

// ─── Mobile detection ────────────────────────────────────────────────────────

function isTouchDevice(): boolean {
  return "ontouchstart" in window || navigator.maxTouchPoints > 0;
}

// ─── Image compression ──────────────────────────────────────────────────────

function compressImage(file: File, maxDim = 1920, quality = 0.85): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = document.createElement("img");
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let w = img.naturalWidth;
      let h = img.naturalHeight;
      if (w > maxDim || h > maxDim) {
        if (w > h) { h = Math.round(h * (maxDim / w)); w = maxDim; }
        else { w = Math.round(w * (maxDim / h)); h = maxDim; }
      }
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) { resolve(file); return; }
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob(
        (blob) => {
          if (!blob) { resolve(file); return; }
          // Create a new file from the blob
          const name = file.name.replace(/\.[^.]+$/, ".jpg");
          const compressed = new (window.File as any)([blob], name, {
            type: "image/jpeg",
            lastModified: Date.now(),
          }) as File;
          resolve(compressed);
        },
        "image/jpeg",
        quality
      );
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Failed to load image")); };
    img.src = url;
  });
}

// ─── File icon helpers ───────────────────────────────────────────────────────

function getExt(name: string): string {
  const parts = name.split(".");
  return parts.length > 1 ? parts[parts.length - 1].toUpperCase() : "—";
}

function getFileIcon(name: string) {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  const cls = "h-4 w-4 flex-shrink-0";

  if (ext === "pdf")
    return <FileText className={cls} style={{ color: "hsl(0, 65%, 48%)" }} />;
  if (ext === "doc" || ext === "docx")
    return <FileText className={cls} style={{ color: "hsl(215, 70%, 50%)" }} />;
  if (ext === "xls" || ext === "xlsx" || ext === "csv")
    return <FileSpreadsheet className={cls} style={{ color: "hsl(142, 55%, 38%)" }} />;
  if (ext === "dwg" || ext === "dxf")
    return <File className={cls} style={{ color: "hsl(30, 80%, 50%)" }} />;
  if (["jpg", "jpeg", "png", "gif", "bmp", "tiff"].includes(ext))
    return <FileImage className={cls} style={{ color: "hsl(270, 55%, 55%)" }} />;
  if (ext === "zip" || ext === "7z")
    return <FileArchive className={cls} style={{ color: "hsl(45, 75%, 45%)" }} />;
  return <FileText className={cls + " text-muted-foreground"} />;
}

function isImageFile(name: string): boolean {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  return ["jpg", "jpeg", "png", "gif", "bmp", "tiff"].includes(ext);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatBytes(b: number | null | undefined): string {
  if (!b) return "";
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface AttachmentsPanelProps {
  projectId: string;
  entityType: EntityType;
  entityId: string | null | undefined;
  readOnly?: boolean;
  className?: string;
  /** Show camera button more prominently (e.g. in PPI evidence tab) */
  cameraProminent?: boolean;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function AttachmentsPanel({
  projectId,
  entityType,
  entityId,
  readOnly = false,
  className,
  cameraProminent = false,
}: AttachmentsPanelProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { data: attachments, loading, refetch } = useAttachments(entityType, entityId);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [thumbnails, setThumbnails] = useState<Record<string, string>>({});

  // Camera preview state
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [compressing, setCompressing] = useState(false);

  const showCamera = isTouchDevice();

  // ── Thumbnail loader ──────────────────────────────────────────────────────

  const loadThumbnail = async (att: Attachment) => {
    if (thumbnails[att.id] || !isImageFile(att.file_name)) return;
    try {
      const url = await attachmentService.getSignedUrl(att.file_path);
      setThumbnails((prev) => ({ ...prev, [att.id]: url }));
    } catch {
      // silent
    }
  };

  // ── Camera capture ────────────────────────────────────────────────────────

  const handleCameraCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setCompressing(true);
    try {
      const compressed = await compressImage(file);
      const url = URL.createObjectURL(compressed);
      setPreviewFile(compressed);
      setPreviewUrl(url);
    } catch {
      toast({ title: t("attachments.compressing"), variant: "destructive" });
    } finally {
      setCompressing(false);
    }
  };

  const handleConfirmCamera = async () => {
    if (!previewFile || !entityId || !user) return;
    setUploading(true);
    try {
      await attachmentService.upload(previewFile, projectId, entityType, entityId, user.id);
      toast({ title: t("attachments.toast.uploaded", { name: previewFile.name }) });
      refetch();
    } catch (err) {
      toast({
        title: t("attachments.toast.uploadError"),
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewFile(null);
      setPreviewUrl(null);
    }
  };

  const handleCancelCamera = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewFile(null);
    setPreviewUrl(null);
  };

  // ── Upload ────────────────────────────────────────────────────────────────

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !entityId || !user) return;

    if (!isFileAllowed(file.name)) {
      toast({
        title: t("attachments.typeNotAllowed"),
        description: `Extensão ".${file.name.split(".").pop()}" não é aceite.`,
        variant: "destructive",
      });
      return;
    }

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
      const url = await attachmentService.getSignedUrl(
        att.file_path,
        projectId,
        entityType,
        att.entity_id,
        att.file_name
      );
      const a = window.document.createElement("a");
      a.href = url;
      a.download = att.file_name;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.click();
      toast({ title: t("attachments.toast.downloaded") });
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

  const canUpload = !readOnly && !!entityId && !!user;

  return (
    <TooltipProvider>
      <div className={cn("space-y-3", className)}>
        {/* Section header */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-1.5 text-sm font-medium text-foreground">
            <Paperclip className="h-3.5 w-3.5 text-muted-foreground" />
            {t("attachments.title")}
            {attachments.length > 0 && (
              <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-xs font-normal">
                {attachments.length}
              </Badge>
            )}
          </div>

          {canUpload && (
            <div className="flex items-center gap-1.5">
              {/* Camera button — mobile only */}
              {showCamera && (
                <>
                  <input
                    ref={cameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={handleCameraCapture}
                  />
                  <Button
                    type="button"
                    variant={cameraProminent ? "default" : "outline"}
                    size="sm"
                    className={cn("gap-1.5 text-xs", cameraProminent ? "h-8" : "h-7")}
                    onClick={() => cameraInputRef.current?.click()}
                    disabled={uploading || compressing}
                  >
                    {compressing
                      ? <Loader2 className="h-3 w-3 animate-spin" />
                      : <Camera className={cn("h-3 w-3", cameraProminent && "h-3.5 w-3.5")} />}
                    {t("attachments.camera")}
                  </Button>
                </>
              )}

              {/* File upload button */}
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED_EXTENSIONS}
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
            </div>
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
              const isImg = isImageFile(att.file_name);
              // Lazy load thumbnail
              if (isImg && !thumbnails[att.id]) {
                loadThumbnail(att);
              }
              return (
                <li
                  key={att.id}
                  className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm"
                >
                  {/* Icon or thumbnail */}
                  {isImg && thumbnails[att.id] ? (
                    <img
                      src={thumbnails[att.id]}
                      alt={att.file_name}
                      className="h-12 w-12 rounded object-cover flex-shrink-0 border border-border"
                    />
                  ) : (
                    getFileIcon(att.file_name)
                  )}
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

                    {!readOnly && (
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
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {/* Camera preview dialog */}
        <Dialog open={!!previewUrl} onOpenChange={(v) => { if (!v) handleCancelCamera(); }}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-sm">
                <Camera className="h-4 w-4" />
                {t("attachments.previewTitle")}
              </DialogTitle>
            </DialogHeader>
            {previewUrl && (
              <div className="space-y-3">
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="w-full rounded-lg border border-border object-contain max-h-[60vh]"
                />
                {previewFile && (
                  <p className="text-xs text-muted-foreground text-center">
                    {formatBytes(previewFile.size)}
                  </p>
                )}
              </div>
            )}
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={handleCancelCamera} disabled={uploading}>
                {t("common.cancel")}
              </Button>
              <Button onClick={handleConfirmCamera} disabled={uploading} className="gap-1.5">
                {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                {t("attachments.confirmUpload")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
