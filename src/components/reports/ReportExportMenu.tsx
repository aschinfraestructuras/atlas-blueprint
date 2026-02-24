/**
 * ReportExportMenu — Unified export dropdown for any entity type.
 * Provides PDF (list / single) and CSV export options with i18n labels.
 */

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { FileDown, FileText, Table2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "@/hooks/use-toast";

interface ExportOption {
  label: string;
  icon: "pdf" | "csv";
  action: () => void | Promise<void>;
}

interface Props {
  options: ExportOption[];
  disabled?: boolean;
  loading?: boolean;
}

const ICONS = {
  pdf: FileText,
  csv: Table2,
};

export function ReportExportMenu({ options, disabled, loading }: Props) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);

  async function run(fn: () => void | Promise<void>) {
    setBusy(true);
    try {
      await fn();
    } catch (err) {
      toast({
        title: t("report.exportError", { defaultValue: "Erro ao exportar" }),
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          disabled={busy || disabled || loading}
        >
          {busy || loading
            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
            : <FileDown className="h-3.5 w-3.5" />}
          {t("report.export", { defaultValue: "Exportar" })}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          {t("report.exportOptions", { defaultValue: "Opções de exportação" })}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {options.map((opt, idx) => {
          const Icon = ICONS[opt.icon];
          return (
            <DropdownMenuItem
              key={idx}
              className="gap-2 text-sm"
              onClick={() => run(opt.action)}
            >
              <Icon className="h-3.5 w-3.5 text-primary" />
              {opt.label}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
