import { useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, ExternalLink, FileText, Loader2, Printer } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { toast } from "@/lib/utils/toast";

interface PdfPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Direct URL to the document (HTML blob URL or remote PDF). */
  url: string | null | undefined;
  title?: string | null;
  subtitle?: string | null;
  /** Optional filename suggestion for the Download button (without extension is fine). */
  downloadName?: string | null;
  /**
   * When true (default) the iframe contains an HTML report and the
   * "Descarregar PDF" button rasterises it into a real multi-page A4 PDF
   * using jsPDF + html2canvas. Set to false for pre-built PDFs (Storage).
   */
  htmlSource?: boolean;
}

/**
 * In-app document viewer with a real-PDF download path.
 *
 * Why two download options?
 *  - "Descarregar PDF" runs the iframe HTML through html2canvas + jsPDF and
 *    produces a proper *.pdf file (works on every browser/mobile, no print
 *    dialog needed). This is the user-facing "true PDF" requested.
 *  - "Imprimir" opens the system print dialog so power users can still
 *    archive a vector PDF or send it to a physical printer.
 *  - "Nova aba" exposes the raw URL for previewing in a separate tab.
 */
export function PdfPreviewDialog({
  open,
  onOpenChange,
  url,
  title,
  subtitle,
  downloadName,
  htmlSource = true,
}: PdfPreviewDialogProps) {
  const { t } = useTranslation();
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [downloading, setDownloading] = useState(false);

  const baseName = (downloadName || title || "documento").replace(/\.[a-z0-9]+$/i, "");
  const pdfName = `${baseName}.pdf`;

  async function handleDownloadPdf() {
    if (!url) return;
    if (!htmlSource) {
      // Direct binary file — just trigger the browser download
      const a = document.createElement("a");
      a.href = url;
      a.download = pdfName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      return;
    }

    setDownloading(true);
    try {
      // Lazy-load heavy deps so the dialog stays light
      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
      ]);

      const iframe = iframeRef.current;
      const doc = iframe?.contentDocument;
      const body = doc?.body;
      if (!iframe || !doc || !body) {
        throw new Error("iframe-not-ready");
      }

      // Render the full document at high DPI
      const renderTarget = doc.documentElement;
      const canvas = await html2canvas(renderTarget, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
        windowWidth: renderTarget.scrollWidth,
        windowHeight: renderTarget.scrollHeight,
      });

      // ── A4 layout with proper margins ──────────────────────────────
      // 10mm safety margin on all sides (matches @page margin used in templates)
      const pdf = new jsPDF("p", "mm", "a4");
      const pageW = pdf.internal.pageSize.getWidth();   // 210mm
      const pageH = pdf.internal.pageSize.getHeight();  // 297mm
      const marginX = 10;
      const marginY = 10;
      const printableW = pageW - marginX * 2;
      const printableH = pageH - marginY * 2;

      // Scale image to printable width keeping aspect ratio
      const imgW = printableW;
      const imgH = (canvas.height * imgW) / canvas.width;

      const imgData = canvas.toDataURL("image/jpeg", 0.92);

      if (imgH <= printableH) {
        // Fits on one page
        pdf.addImage(imgData, "JPEG", marginX, marginY, imgW, imgH, undefined, "FAST");
      } else {
        // Slice the canvas into A4-printable chunks and add one image per page,
        // so margins are preserved on every page (no edge-to-edge bleed).
        const pxPerMm = canvas.width / printableW;
        const sliceHpx = Math.floor(printableH * pxPerMm);
        let renderedPx = 0;
        let pageIndex = 0;

        const sliceCanvas = document.createElement("canvas");
        sliceCanvas.width = canvas.width;
        const sctx = sliceCanvas.getContext("2d");
        if (!sctx) throw new Error("canvas-2d-context-unavailable");

        while (renderedPx < canvas.height) {
          const remainingPx = canvas.height - renderedPx;
          const currentSlicePx = Math.min(sliceHpx, remainingPx);
          sliceCanvas.height = currentSlicePx;
          sctx.fillStyle = "#ffffff";
          sctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
          sctx.drawImage(
            canvas,
            0, renderedPx, canvas.width, currentSlicePx,
            0, 0, canvas.width, currentSlicePx,
          );
          const sliceData = sliceCanvas.toDataURL("image/jpeg", 0.92);
          const sliceMm = currentSlicePx / pxPerMm;
          if (pageIndex > 0) pdf.addPage();
          pdf.addImage(sliceData, "JPEG", marginX, marginY, imgW, sliceMm, undefined, "FAST");
          renderedPx += currentSlicePx;
          pageIndex += 1;
        }
      }

      pdf.save(pdfName);
    } catch (err) {
      console.error("[PdfPreviewDialog] download PDF failed", err);
      toast({
        title: t("pdfPreview.downloadFailed", { defaultValue: "Não foi possível gerar o PDF." }),
        description: t("pdfPreview.downloadFailedHint", {
          defaultValue: "Tente abrir em nova aba e usar 'Guardar como PDF' do navegador.",
        }),
        variant: "destructive",
      });
    } finally {
      setDownloading(false);
    }
  }

  function handlePrint() {
    const win = iframeRef.current?.contentWindow;
    if (!win) return;
    try { win.focus(); win.print(); } catch { /* user cancelled */ }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "max-w-6xl w-[96vw] h-[92vh] p-0 overflow-hidden flex flex-col gap-0",
          "border-border/60",
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
                  variant="default"
                  size="sm"
                  className="h-8 gap-1.5 text-xs"
                  onClick={handleDownloadPdf}
                  disabled={downloading}
                >
                  {downloading
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    : <Download className="h-3.5 w-3.5" />}
                  {t("pdfPreview.downloadPdf", { defaultValue: "Descarregar PDF" })}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5 text-xs hidden sm:inline-flex"
                  onClick={handlePrint}
                >
                  <Printer className="h-3.5 w-3.5" />
                  {t("common.print", { defaultValue: "Imprimir" })}
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
              ref={iframeRef}
              src={url}
              className="w-full h-full border-0 bg-white"
              title={title ?? "Document preview"}
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
