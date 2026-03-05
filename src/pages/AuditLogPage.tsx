import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useProject } from "@/contexts/ProjectContext";
import { useAuditLog } from "@/hooks/useAuditLog";
import { ScrollText, Filter } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/EmptyState";
import { NoProjectBanner } from "@/components/NoProjectBanner";
import { cn } from "@/lib/utils";

const ACTION_COLORS: Record<string, string> = {
  INSERT:              "bg-primary/10 text-primary",
  UPDATE:              "bg-muted text-muted-foreground",
  DELETE:              "bg-destructive/10 text-destructive",
  status_change:       "bg-primary/15 text-primary",
  attachment_add:      "bg-primary/10 text-primary",
  attachment_download: "bg-muted text-muted-foreground",
  attachment_delete:   "bg-destructive/10 text-destructive",
};

const MODULES = [
  "documents",
  "non_conformities",
  "tests",
  "suppliers",
  "subcontractors",
  "survey",
  "technical_office",
  "plans",
];

export default function AuditLogPage() {
  const { t } = useTranslation();
  const { activeProject } = useProject();

  const [moduleFilter, setModuleFilter] = useState<string>("all");
  const [dateFrom, setDateFrom]         = useState("");
  const [dateTo, setDateTo]             = useState("");
  const [applied, setApplied]           = useState<{ module?: string; dateFrom?: string; dateTo?: string }>({});

  const { data: entries, loading, error } = useAuditLog(applied);

  if (!activeProject) return <NoProjectBanner />;

  const handleApply = () => {
    setApplied({
      module: moduleFilter === "all" ? undefined : moduleFilter,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
    });
  };

  const handleReset = () => {
    setModuleFilter("all");
    setDateFrom("");
    setDateTo("");
    setApplied({});
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          {t("pages.auditLog.title")}
        </h1>
        <p className="text-sm text-muted-foreground">{t("pages.auditLog.subtitle")}</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-muted/30 p-4">
        <div className="flex flex-col gap-1 min-w-[160px]">
          <label className="text-xs font-medium text-muted-foreground">{t("audit.filters.module")}</label>
          <Select value={moduleFilter} onValueChange={setModuleFilter}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder={t("audit.filters.allModules")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("audit.filters.allModules")}</SelectItem>
              {MODULES.map((m) => (
                <SelectItem key={m} value={m}>{t(`audit.modules.${m}`, { defaultValue: m })}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted-foreground">{t("audit.filters.from")}</label>
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="h-8 text-xs w-36"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted-foreground">{t("audit.filters.to")}</label>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="h-8 text-xs w-36"
          />
        </div>

        <div className="flex gap-2 ml-auto">
          <Button size="sm" variant="ghost" onClick={handleReset} className="h-8 text-xs">
            {t("common.cancel")}
          </Button>
          <Button size="sm" onClick={handleApply} className="h-8 gap-1.5 text-xs">
            <Filter className="h-3 w-3" />
            {t("audit.filters.apply")}
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading ? (
        <div className="rounded-xl border border-border overflow-hidden divide-y divide-border">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-3">
              <Skeleton className="h-4 w-1/4" />
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
      ) : entries.length === 0 ? (
        <EmptyState icon={ScrollText} subtitleKey="emptyState.auditLog.subtitle" />
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("audit.table.timestamp")}
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("audit.table.module")}
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("audit.table.action")}
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("audit.table.description")}
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("audit.table.user")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry) => (
                <TableRow key={entry.id} className="hover:bg-muted/20 transition-colors">
                  <TableCell className="text-xs text-muted-foreground font-mono whitespace-nowrap">
                    {new Date(entry.created_at).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-sm text-foreground capitalize">
                    {entry.module
                      ? t(`audit.modules.${entry.module}`, { defaultValue: entry.module })
                      : entry.entity}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={cn("text-xs", ACTION_COLORS[entry.action] ?? "bg-muted text-muted-foreground")}
                    >
                      {t(`audit.actions.${entry.action}`, { defaultValue: entry.action })}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-[260px]">
                    <span className="truncate block" title={entry.description ?? undefined}>
                      {entry.description ?? "—"}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {entry.user_display_name || "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
