import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useProject } from "@/contexts/ProjectContext";
import { useSubcontractors } from "@/hooks/useSubcontractors";
import { HardHat, Plus, Pencil } from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/EmptyState";
import { NoProjectBanner } from "@/components/NoProjectBanner";
import { SubcontractorFormDialog } from "@/components/subcontractors/SubcontractorFormDialog";
import { cn } from "@/lib/utils";
import type { Subcontractor } from "@/lib/services/subcontractorService";

const STATUS_COLORS: Record<string, string> = {
  active: "bg-primary/20 text-primary",
  suspended: "bg-destructive/10 text-destructive",
  concluded: "bg-muted text-muted-foreground",
};

export default function SubcontractorsPage() {
  const { t } = useTranslation();
  const { activeProject } = useProject();
  const { data: subcontractors, loading, error, refetch } = useSubcontractors();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSub, setEditingSub] = useState<Subcontractor | null>(null);

  if (!activeProject) return <NoProjectBanner />;

  const handleNew = () => { setEditingSub(null); setDialogOpen(true); };
  const handleEdit = (sub: Subcontractor) => { setEditingSub(sub); setDialogOpen(true); };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">{t("pages.subcontractors.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("pages.subcontractors.subtitle")}</p>
        </div>
        <Button onClick={handleNew} size="sm" className="gap-1.5">
          <Plus className="h-3.5 w-3.5" />
          {t("subcontractors.newSubcontractor")}
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">{error}</div>
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
      ) : subcontractors.length === 0 ? (
        <EmptyState icon={HardHat} subtitleKey="emptyState.subcontractors.subtitle" />
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("common.name")}</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("subcontractors.table.trade")}</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("subcontractors.table.contactEmail")}</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("common.status")}</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("common.date")}</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {subcontractors.map((sub) => (
                <TableRow key={sub.id} className="hover:bg-muted/20 transition-colors">
                  <TableCell className="font-medium text-sm text-foreground">
                    <div className="flex items-center gap-2">
                      <HardHat className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                      {sub.name}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{sub.trade ?? "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{sub.contact_email ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={cn("text-xs", STATUS_COLORS[sub.status] ?? "")}>
                      {t(`subcontractors.status.${sub.status}`, { defaultValue: sub.status })}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(sub.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => handleEdit(sub)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <SubcontractorFormDialog open={dialogOpen} onOpenChange={setDialogOpen} subcontractor={editingSub} onSuccess={refetch} />
    </div>
  );
}
