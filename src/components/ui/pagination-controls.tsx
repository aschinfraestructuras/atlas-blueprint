/**
 * PaginationControls — reusable server-side pagination UI.
 */

import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import type { PaginationState } from "@/hooks/usePaginatedQuery";

interface PaginationControlsProps {
  pagination: PaginationState;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  pageSizeOptions?: number[];
}

export function PaginationControls({
  pagination,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [25, 50, 100],
}: PaginationControlsProps) {
  const { t } = useTranslation();
  const { page, pageSize, total, totalPages } = pagination;

  const from = Math.min((page - 1) * pageSize + 1, total);
  const to = Math.min(page * pageSize, total);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 pt-3 pb-1">
      {/* Info */}
      <span className="text-xs text-muted-foreground tabular-nums">
        {total > 0
          ? t("pagination.showing", {
              from,
              to,
              total,
              defaultValue: "{{from}}-{{to}} de {{total}}",
            })
          : t("pagination.noResults", { defaultValue: "Sem resultados" })}
      </span>

      <div className="flex items-center gap-2">
        {/* Page size */}
        <Select
          value={String(pageSize)}
          onValueChange={(v) => onPageSizeChange(Number(v))}
        >
          <SelectTrigger className="h-7 w-[80px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {pageSizeOptions.map((s) => (
              <SelectItem key={s} value={String(s)}>
                {s} / {t("pagination.page", { defaultValue: "pág" })}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Navigation */}
        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost" size="icon"
            className="h-7 w-7"
            disabled={page <= 1}
            onClick={() => onPageChange(1)}
          >
            <ChevronsLeft className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost" size="icon"
            className="h-7 w-7"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
          <span className="text-xs font-medium text-foreground px-2 tabular-nums">
            {page} / {totalPages}
          </span>
          <Button
            variant="ghost" size="icon"
            className="h-7 w-7"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost" size="icon"
            className="h-7 w-7"
            disabled={page >= totalPages}
            onClick={() => onPageChange(totalPages)}
          >
            <ChevronsRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
