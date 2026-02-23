import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useProject } from "@/contexts/ProjectContext";
import { useSurveys } from "@/hooks/useSurveys";
import { useProjectRole } from "@/hooks/useProjectRole";
import { Map, Plus, Pencil } from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/EmptyState";
import { NoProjectBanner } from "@/components/NoProjectBanner";
import { SurveyFormDialog } from "@/components/survey/SurveyFormDialog";
import { cn } from "@/lib/utils";
import type { SurveyRecord } from "@/lib/services/surveyService";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-muted text-muted-foreground",
  validated: "bg-primary/20 text-primary",
  rejected: "bg-destructive/10 text-destructive",
};

export default function SurveyPage() {
  const { t } = useTranslation();
  const { activeProject } = useProject();
  const { data: records, loading, error, refetch } = useSurveys();
  const { canCreate, canEdit } = useProjectRole();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<SurveyRecord | null>(null);

  if (!activeProject) return <NoProjectBanner />;

  const handleNew = () => { setEditingRecord(null); setDialogOpen(true); };
  const handleEdit = (r: SurveyRecord) => { setEditingRecord(r); setDialogOpen(true); };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">{t("pages.survey.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("pages.survey.subtitle")}</p>
        </div>
        {canCreate && (
          <Button onClick={handleNew} size="sm" className="gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            {t("survey.newRecord")}
          </Button>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">{error}</div>
      )}

      {loading ? (
        <div className="rounded-xl border border-border overflow-hidden divide-y divide-border">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-3">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
      ) : records.length === 0 ? (
        <EmptyState icon={Map} subtitleKey="emptyState.survey.subtitle" />
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("survey.table.areaPk")}</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("common.description")}</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("common.date")}</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("common.status")}</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.map((record) => (
                <TableRow key={record.id} className="hover:bg-muted/20 transition-colors">
                  <TableCell className="font-medium text-sm text-foreground font-mono">{record.area_or_pk}</TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                    {record.description ?? "—"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(record.date).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={cn("text-xs", STATUS_COLORS[record.status] ?? "")}>
                      {t(`survey.status.${record.status}`, { defaultValue: record.status })}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => handleEdit(record)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <SurveyFormDialog open={dialogOpen} onOpenChange={setDialogOpen} record={editingRecord} onSuccess={refetch} />
    </div>
  );
}
