import { useTranslation } from "react-i18next";
import { useProject } from "@/contexts/ProjectContext";
import { useNonConformities } from "@/hooks/useNonConformities";
import { AlertTriangle, Calendar } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/EmptyState";
import { NoProjectBanner } from "@/components/NoProjectBanner";
import { cn } from "@/lib/utils";

const SEVERITY_COLORS: Record<string, string> = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-primary/10 text-primary",
  high: "bg-destructive/15 text-destructive",
  critical: "bg-destructive text-destructive-foreground",
};

const STATUS_COLORS: Record<string, string> = {
  open: "bg-destructive/10 text-destructive",
  under_review: "bg-primary/10 text-primary",
  closed: "bg-muted text-muted-foreground",
};

export default function NonConformitiesPage() {
  const { t } = useTranslation();
  const { activeProject } = useProject();
  const { data: ncs, loading, error } = useNonConformities();

  if (!activeProject) return <NoProjectBanner />;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          {t("pages.nonConformities.title")}
        </h1>
        <p className="text-sm text-muted-foreground">{t("pages.nonConformities.subtitle")}</p>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading ? (
        <div className="rounded-xl border border-border overflow-hidden divide-y divide-border">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-3">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-4 w-1/4" />
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
      ) : ncs.length === 0 ? (
        <EmptyState icon={AlertTriangle} subtitleKey="emptyState.nonConformities.subtitle" />
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("nc.table.reference")}
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("common.description")}
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("nc.table.severity")}
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("common.status")}
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("nc.table.responsible")}
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("nc.table.dueDate")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ncs.map((nc) => (
                <TableRow key={nc.id} className="hover:bg-muted/20 transition-colors">
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {nc.reference ?? "—"}
                  </TableCell>
                  <TableCell className="text-sm text-foreground max-w-[240px]">
                    <p className="truncate">{nc.description}</p>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={cn("text-xs", SEVERITY_COLORS[nc.severity] ?? "")}
                    >
                      {t(`nc.severity.${nc.severity}`)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={cn("text-xs", STATUS_COLORS[nc.status] ?? "")}
                    >
                      {t(`nc.status.${nc.status}`)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {nc.responsible ?? "—"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {nc.due_date ? (
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(nc.due_date).toLocaleDateString()}
                      </div>
                    ) : "—"}
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
