/**
 * htmlPreview — utilitários de pré-visualização HTML como PDF.
 *
 * Os exports do Atlas QMS são HTML estilizado convertido para PDF pelo browser
 * via janela de impressão. Para apresentar uma pré-visualização profissional
 * dentro da própria aplicação, geramos um Blob URL que pode ser carregado no
 * `PdfPreviewDialog` (iframe). O utilizador pode depois descarregar ou abrir
 * em separador novo, mantendo o fluxo de impressão original intacto.
 */

const ACTIVE_URLS = new Set<string>();

/**
 * Cria um Blob URL para um documento HTML completo.
 * Lembre-se de chamar `revokeHtmlPreviewUrl` quando o dialog fechar.
 */
export function buildHtmlPreviewUrl(html: string): string {
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  ACTIVE_URLS.add(url);
  return url;
}

/** Liberta um URL gerado por `buildHtmlPreviewUrl`. Seguro chamar várias vezes. */
export function revokeHtmlPreviewUrl(url: string | null | undefined): void {
  if (!url) return;
  if (ACTIVE_URLS.has(url)) {
    ACTIVE_URLS.delete(url);
  }
  try {
    URL.revokeObjectURL(url);
  } catch {
    /* noop */
  }
}
