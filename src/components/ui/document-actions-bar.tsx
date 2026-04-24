/**
 * DocumentActionsBar
 *
 * Single source of truth for document-row actions across the platform.
 * Replaces the inconsistent mix of Print / Download / Open-tab / View / Edit /
 * Delete buttons that some modules had and others did not.
 *
 * UX rationale (validated with the user):
 *   • Preview opens our PdfPreviewDialog — which itself contains Print, Open
 *     in new tab and Download PDF. This avoids button duplication on the row.
 *   • Download PDF stays as a top-level shortcut for power users who want to
 *     skip the preview and just grab the file.
 *   • Edit / Attachments / Delete are always in the same order and always use
 *     the same icons. Each one is independently optional via props, so a
 *     module that has no edit form simply omits `onEdit`.
 *
 * The bar is *purely presentational*: it does not own any state, does not call
 * services and does not assume anything about the underlying entity. The host
 * page wires the handlers — which keeps existing flows intact and lets us
 * adopt the bar incrementally without breaking anything.
 */

import { Eye, Download, Pencil, Paperclip, Trash2, Loader2, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

export interface DocumentActionsBarProps {
  /** Open the in-app preview dialog. Print / open-tab live INSIDE that dialog. */
  onPreview?: () => void;
  /** Trigger a file download. Skip the preview. */
  onDownload?: () => void;
  /** Open the edit form (or generic "open detail" when no real edit form exists — see editIcon/editLabel). */
  onEdit?: () => void;
  /** Open the attachments panel / dialog. */
  onAttachments?: () => void;
  /** Soft-delete handler. Always shown last and styled as destructive. */
  onDelete?: () => void;

  /** Disable Preview (e.g. while building the HTML report). */
  previewLoading?: boolean;
  /** Disable Download (e.g. while exporting). */
  downloadLoading?: boolean;

  /** Hide individual actions when permissions / status forbid them. */
  canEdit?: boolean;
  canDelete?: boolean;

  /**
   * Override the icon used for the "edit" slot. Useful for read-only modules
   * that reuse the slot to open a detail viewer (e.g. Field Records uses Eye).
   */
  editIcon?: LucideIcon;
  /** Override the label/tooltip for the "edit" slot (e.g. "Ver detalhe"). */
  editLabel?: string;

  /** Optional accent for the row (e.g. small / inline / large). */
  size?: "sm" | "md";
  /** Additional class names for the wrapper. */
  className?: string;
  /** When true, only icons (no labels) — used inside dense table rows. */
  iconOnly?: boolean;
}

export function DocumentActionsBar({
  onPreview,
  onDownload,
  onEdit,
  onAttachments,
  onDelete,
  previewLoading,
  downloadLoading,
  canEdit = true,
  canDelete = true,
  editIcon,
  editLabel,
  size = "sm",
  className,
  iconOnly = true,
}: DocumentActionsBarProps) {
  const { t } = useTranslation();
  const btnSize = size === "md" ? "h-8 w-8" : "h-7 w-7";
  const iconSize = size === "md" ? "h-4 w-4" : "h-3.5 w-3.5";

  const item = (
    icon: React.ReactNode,
    label: string,
    onClick: () => void,
    opts?: { disabled?: boolean; destructive?: boolean },
  ) => {
    const button = (
      <Button
        type="button"
        variant="ghost"
        size="icon"
        disabled={opts?.disabled}
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        className={cn(
          btnSize,
          "transition-colors",
          opts?.destructive
            ? "hover:text-destructive hover:bg-destructive/10"
            : "hover:text-primary hover:bg-primary/10",
        )}
        aria-label={label}
        title={label}
      >
        {icon}
        {!iconOnly && <span className="ml-1.5 text-xs">{label}</span>}
      </Button>
    );
    return (
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>{button}</TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          {label}
        </TooltipContent>
      </Tooltip>
    );
  };

  return (
    <div className={cn("flex items-center gap-0.5 justify-end", className)}>
      {onPreview &&
        item(
          previewLoading ? (
            <Loader2 className={cn(iconSize, "animate-spin")} />
          ) : (
            <Eye className={iconSize} />
          ),
          t("docActions.preview", { defaultValue: "Pré-visualizar" }),
          onPreview,
          { disabled: previewLoading },
        )}

      {onDownload &&
        item(
          downloadLoading ? (
            <Loader2 className={cn(iconSize, "animate-spin")} />
          ) : (
            <Download className={iconSize} />
          ),
          t("docActions.downloadPdf", { defaultValue: "Descarregar PDF" }),
          onDownload,
          { disabled: downloadLoading },
        )}

      {onEdit && canEdit && (() => {
        const EditIcon = editIcon ?? Pencil;
        return item(
          <EditIcon className={iconSize} />,
          editLabel ?? t("docActions.edit", { defaultValue: "Editar" }),
          onEdit,
        );
      })()}

      {onAttachments &&
        item(
          <Paperclip className={iconSize} />,
          t("docActions.attachments", { defaultValue: "Anexos" }),
          onAttachments,
        )}

      {onDelete && canDelete &&
        item(
          <Trash2 className={iconSize} />,
          t("docActions.delete", { defaultValue: "Eliminar" }),
          onDelete,
          { destructive: true },
        )}
    </div>
  );
}
