import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, ExternalLink, FileText } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

interface PdfPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Direct URL to the PDF (or any file the browser can render inline). */
  url: string | null | undefined;
  title?: string | null;
  subtitle?: string | null;
  /** Optional filename suggestion for the Download button. */
  downloadName?: string | null;
}

/**
 * Large, professional in-app PDF viewer.
 * - Near-fullscreen dialog (6xl / 92vh) for an immersive reading experience.
 * - Toolbar with Download and "Open in new tab" actions.
 * - Lazy iframe; shows a friendly fallback when URL is missing.
 */
export function PdfPreviewDialog({
  open,
  onOpenChange,
  url,
  title,
  subtitle,
  downloadName,
}: PdfPreviewDialogProps) {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "max-w-6xl w-[96vw] h-[92vh] p-0 overflow-hidden flex flex-col gap-0",
          "border-border/60"
        )}
      >
        {/* Toolbar */}
        <DialogHeader className="px-5 py-3 border-b border-border/60 bg-muted/30 flex-row items-center justify-between space-y-0 gap-3 flex-shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
              <FileText className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0 pr-8">
              <DialogTitle className="text-sm font-semibold truncate text-left">
                {title || t("pdfPreview.untitled", { defaultValue: "Documento" })}
              </DialogTitle>
              {subtitle && (
                <p className="text-[11px] text-muted-foreground truncate mt-0.5">{subtitle}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {url && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5 text-xs"
                  asChild
                >
                  <a href={url} download={downloadName ?? undefined} target="_blank" rel="noreferrer">
                    <Download className="h-3.5 w-3.5" />
                    {t("common.download", { defaultValue: "Descarregar" })}
                  </a>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5 text-xs"
                  asChild
                >
                  <a href={url} target="_blank" rel="noreferrer">
                    <ExternalLink className="h-3.5 w-3.5" />
                    {t("common.openNewTab", { defaultValue: "Nova aba" })}
                  </a>
                </Button>
              </>
            )}
          </div>
        </DialogHeader>

        {/* Viewer body */}
        <div className="flex-1 min-h-0 bg-muted/20">
          {url ? (
            <iframe
              src={url}
              className="w-full h-full border-0"
              title={title ?? "PDF preview"}
              loading="lazy"
            />
          ) : (
            <div className="h-full w-full flex flex-col items-center justify-center gap-2 text-muted-foreground">
              <FileText className="h-10 w-10 opacity-40" />
              <p className="text-sm">
                {t("pdfPreview.noFile", { defaultValue: "Sem ficheiro para pré-visualizar." })}
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
