import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useProject } from "@/contexts/ProjectContext";
import { useTechnicalOffice } from "@/hooks/useTechnicalOffice";
import { useProjectRole } from "@/hooks/useProjectRole";
import { Inbox, Plus, Pencil } from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/EmptyState";
import { NoProjectBanner } from "@/components/NoProjectBanner";
import { TechnicalOfficeFormDialog } from "@/components/technical-office/TechnicalOfficeFormDialog";
import { cn } from "@/lib/utils";
import type { TechnicalOfficeItem } from "@/lib/services/technicalOfficeService";

const TYPE_COLORS: Record<string, string> = {
  RFI: "bg-primary/10 text-primary",
  Submittal: "bg-secondary text-secondary-foreground",
  Clarification: "bg-muted text-muted-foreground",
};

const STATUS_COLORS: Record<string, string> = {
  open: "bg-primary/10 text-primary",
  in_progress: "bg-primary/20 text-primary",
  closed: "bg-muted text-muted-foreground",
  cancelled: "bg-destructive/10 text-destructive",
};

export default function TechnicalOfficePage() {
  const { t } = useTranslation();
  const { activeProject } = useProject();
  const { data: items, loading, error, refetch } = useTechnicalOffice();
  const { canCreate, canEdit } = useProjectRole();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<TechnicalOfficeItem | null>(null);

  if (!activeProject) return <NoProjectBanner />;

  const handleNew = () => { setEditingItem(null); setDialogOpen(true); };
  const handleEdit = (item: TechnicalOfficeItem) => { setEditingItem(item); setDialogOpen(true); };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">{t("pages.technicalOffice.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("pages.technicalOffice.subtitle")}</p>
        </div>
        {canCreate && (
          <Button onClick={handleNew} size="sm" className="gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            {t("technicalOffice.newItem")}
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
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState icon={Inbox} subtitleKey="emptyState.technicalOffice.subtitle" />
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("technicalOffice.table.type")}</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("technicalOffice.table.title")}</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("common.status")}</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("technicalOffice.table.dueDate")}</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("common.date")}</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id} className="hover:bg-muted/20 transition-colors">
                  <TableCell>
                    <Badge variant="secondary" className={cn("text-xs", TYPE_COLORS[item.type] ?? "")}>
                      {t(`technicalOffice.types.${item.type}`, { defaultValue: item.type })}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium text-sm text-foreground">{item.title}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={cn("text-xs", STATUS_COLORS[item.status] ?? "")}>
                      {t(`technicalOffice.status.${item.status}`, { defaultValue: item.status })}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {item.due_date ? new Date(item.due_date).toLocaleDateString() : "—"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(item.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => handleEdit(item)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <TechnicalOfficeFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        item={editingItem}
        onSuccess={refetch}
      />
    </div>
  );
}
