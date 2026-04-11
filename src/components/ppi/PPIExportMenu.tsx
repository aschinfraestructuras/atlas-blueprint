/**
 * PPIExportMenu
 * Reusable export dropdown for both single-instance and bulk use-cases.
 *
 * Props:
 *  - instances: already-enriched PpiInstanceForExport[]
 *  - loading: show spinner while instances are being fetched
 *  - projectName: for PDF/CSV headers
 *  - locale: "pt" | "es"
 *  - variant: "single" → only PDF; "bulk" → PDF+ZIP+CSV options
 */

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useProjectLogo } from "@/hooks/useProjectLogo";
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
import {
  exportSinglePdf,
  exportBulkPdf,
  exportInstancesCsv,
  exportItemsCsv,
  type PpiInstanceForExport,
  type ExportLabels,
} from "@/lib/services/ppiExportService";
import { toast } from "@/lib/utils/toast";
import i18n from "@/i18n";

interface Props {
  instances: PpiInstanceForExport[];
  loading?: boolean;
  projectName: string;
  variant?: "single" | "bulk";
}

/** Build i18n-aware label object from translation function */
function buildLabels(t: (k: string, opts?: Record<string, unknown>) => string): ExportLabels {
  return {
    appName:        t("common.appName"),
    reportTitle:    t("ppi.export.reportTitle"),
    generatedOn:    t("ppi.export.generatedOn"),
    project:        t("ppi.export.fields.project"),
    code:           t("ppi.instances.table.code"),
    workItem:       t("ppi.instances.detail.workItem"),
    template:       t("ppi.instances.detail.template"),
    status:         t("common.status"),
    openedAt:       t("ppi.instances.table.openedAt"),
    closedAt:       t("ppi.instances.table.closedAt"),
    inspector:      t("ppi.instances.table.inspector"),
    discipline:     t("ppi.export.fields.discipline"),
    inspectionDate: t("ppi.export.inspectionDate"),
    checklistTitle: t("ppi.instances.detail.checklistTitle"),
    itemNo:         t("ppi.instances.items.itemNo"),
    checkCode:      t("ppi.instances.items.checkCode"),
    label:          t("ppi.instances.items.label"),
    result:         t("ppi.instances.items.result"),
    notes:          t("ppi.instances.items.notes"),
    checkedBy:      t("ppi.instances.items.checkedBy"),
    checkedAt:      t("ppi.instances.items.checkedAt"),
    requiresNc:     t("ppi.instances.items.requiresNc"),
    linkedNc:       t("ppi.export.fields.linkedNc"),
    attachmentCount: t("ppi.export.fields.attachmentCount"),
    progress:       t("ppi.instances.table.progress"),
    reviewed:       t("ppi.instances.detail.reviewed"),
    ok:             t("ppi.instances.results.ok"),
    nok:            t("ppi.instances.results.nok"),
    na:             t("ppi.instances.results.na"),
    pending:        t("ppi.instances.results.pending"),
    bulkReportTitle: t("ppi.export.bulkReportTitle"),
    page:           t("ppi.export.page"),
    of:             t("ppi.export.of"),
    projectName:    t("ppi.export.fields.project"),
    resultLabels: {
      ok:      t("ppi.instances.results.ok"),
      pass:    t("ppi.instances.results.ok"),
      nok:     t("ppi.instances.results.nok"),
      fail:    t("ppi.instances.results.nok"),
      na:      t("ppi.instances.results.na"),
      pending: t("ppi.instances.results.pending"),
    },
    statusLabels: {
      draft:       t("ppi.status.draft"),
      in_progress: t("ppi.status.in_progress"),
      submitted:   t("ppi.status.submitted"),
      approved:    t("ppi.status.approved"),
      rejected:    t("ppi.status.rejected"),
      archived:    t("ppi.status.archived"),
    },
  };
}

export function PPIExportMenu({ instances, loading, projectName, variant = "bulk" }: Props) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const { logoUrl, logoBase64 } = useProjectLogo();

  const locale = i18n.language?.slice(0, 2) ?? "pt";
  const logo = logoBase64 || logoUrl;

  async function run(fn: () => void | Promise<void>) {
    if (instances.length === 0) {
      toast({ title: t("ppi.export.noData"), variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      await fn();
    } catch (err) {
      toast({
        title: t("ppi.export.error"),
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  }

  const labels = buildLabels(t);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5" disabled={busy || loading}>
          {busy || loading
            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
            : <FileDown className="h-3.5 w-3.5" />}
          {t("ppi.export.button")}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          {t("ppi.export.menuTitle")}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {/* ─── PDF exports ─────────────────────────────────────────── */}
        {variant === "single" && (
          <DropdownMenuItem
            className="gap-2 text-sm"
            onClick={() => run(() => exportSinglePdf(instances[0], labels, locale, projectName, logo))}
          >
            <FileText className="h-3.5 w-3.5 text-primary" />
            {t("ppi.export.pdfSingle")}
          </DropdownMenuItem>
        )}

        {variant === "bulk" && (
          <DropdownMenuItem
            className="gap-2 text-sm"
            onClick={() => run(() => exportBulkPdf(instances, labels, locale, projectName, logo))}
          >
            <FileText className="h-3.5 w-3.5 text-primary" />
            {t("ppi.export.pdfBulk")}
            <span className="ml-auto text-[10px] text-muted-foreground">{instances.length}</span>
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator />

        {/* ─── CSV exports ─────────────────────────────────────────── */}
        <DropdownMenuLabel className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground pt-1">
          CSV
        </DropdownMenuLabel>

        <DropdownMenuItem
          className="gap-2 text-sm"
          onClick={() =>
            run(() =>
              exportInstancesCsv(instances, labels, locale, projectName, "ppi-instances.csv")
            )
          }
        >
          <Table2 className="h-3.5 w-3.5 text-muted-foreground" />
          {t("ppi.export.csvInstances")}
        </DropdownMenuItem>

        <DropdownMenuItem
          className="gap-2 text-sm"
          onClick={() =>
            run(() =>
              exportItemsCsv(instances, labels, locale, projectName, "ppi-items.csv")
            )
          }
        >
          <Table2 className="h-3.5 w-3.5 text-muted-foreground" />
          {t("ppi.export.csvItems")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
