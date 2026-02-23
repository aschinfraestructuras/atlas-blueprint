import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useProject } from "@/contexts/ProjectContext";
import { usePlans } from "@/hooks/usePlans";
import { useProjectRole } from "@/hooks/useProjectRole";
import { BookOpen, Plus, Pencil } from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/EmptyState";
import { NoProjectBanner } from "@/components/NoProjectBanner";
import { PlanFormDialog } from "@/components/plans/PlanFormDialog";
import { cn } from "@/lib/utils";
import type { Plan } from "@/lib/services/planService";

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  under_review: "bg-primary/10 text-primary",
  approved: "bg-primary/20 text-primary",
  superseded: "bg-destructive/10 text-destructive",
};

export default function PlansPage() {
  const { t } = useTranslation();
  const { activeProject } = useProject();
  const { data: plans, loading, error, refetch } = usePlans();
  const { canCreate, canEdit } = useProjectRole();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);

  if (!activeProject) return <NoProjectBanner />;

  const handleNew = () => { setEditingPlan(null); setDialogOpen(true); };
  const handleEdit = (plan: Plan) => { setEditingPlan(plan); setDialogOpen(true); };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">{t("pages.plans.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("pages.plans.subtitle")}</p>
        </div>
        {canCreate && (
          <Button onClick={handleNew} size="sm" className="gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            {t("plans.newPlan")}
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
              <Skeleton className="h-4 w-12" />
            </div>
          ))}
        </div>
      ) : plans.length === 0 ? (
        <EmptyState icon={BookOpen} subtitleKey="emptyState.plans.subtitle" />
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("plans.table.type")}</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("plans.table.title")}</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("plans.table.revision")}</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("common.status")}</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("common.date")}</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {plans.map((plan) => (
                <TableRow key={plan.id} className="hover:bg-muted/20 transition-colors">
                  <TableCell>
                    <Badge variant="outline" className="text-xs font-mono">
                      {t(`plans.types.${plan.plan_type}`, { defaultValue: plan.plan_type })}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium text-sm text-foreground">{plan.title}</TableCell>
                  <TableCell className="text-sm text-muted-foreground font-mono text-xs">{plan.revision ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={cn("text-xs", STATUS_COLORS[plan.status] ?? "")}>
                      {t(`plans.status.${plan.status}`, { defaultValue: plan.status })}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(plan.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => handleEdit(plan)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <PlanFormDialog open={dialogOpen} onOpenChange={setDialogOpen} plan={editingPlan} onSuccess={refetch} />
    </div>
  );
}
