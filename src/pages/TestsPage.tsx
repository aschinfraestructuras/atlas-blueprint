import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useProject } from "@/contexts/ProjectContext";
import { useTests } from "@/hooks/useTests";
import { FlaskConical, Plus, Pencil } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/EmptyState";
import { NoProjectBanner } from "@/components/NoProjectBanner";
import { TestFormDialog } from "@/components/tests/TestFormDialog";
import { cn } from "@/lib/utils";
import type { TestResult } from "@/lib/services/testService";

const STATUS_COLORS: Record<string, string> = {
  pending:     "bg-muted text-muted-foreground",
  pass:        "bg-primary/15 text-primary",
  fail:        "bg-destructive/10 text-destructive",
  inconclusive:"bg-orange-500/10 text-orange-600",
};

export default function TestsPage() {
  const { t } = useTranslation();
  const { activeProject } = useProject();
  const { data: tests, loading, error, refetch } = useTests();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTest, setEditingTest] = useState<TestResult | null>(null);

  if (!activeProject) return <NoProjectBanner />;

  const handleEdit = (test: TestResult) => {
    setEditingTest(test);
    setDialogOpen(true);
  };

  const handleNew = () => {
    setEditingTest(null);
    setDialogOpen(true);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {t("pages.tests.title")}
          </h1>
          <p className="text-sm text-muted-foreground">{t("pages.tests.subtitle")}</p>
        </div>
        <Button onClick={handleNew} size="sm" className="gap-1.5">
          <Plus className="h-3.5 w-3.5" />
          {t("tests.newTest")}
        </Button>
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
      ) : tests.length === 0 ? (
        <EmptyState icon={FlaskConical} subtitleKey="emptyState.tests.subtitle" />
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("tests.table.name")}
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("tests.table.sampleRef")}
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("tests.table.location")}
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("common.status")}
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("common.date")}
                </TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {tests.map((test) => (
                <TableRow key={test.id} className="hover:bg-muted/20 transition-colors">
                  <TableCell className="font-medium text-sm text-foreground">
                    <div className="flex items-center gap-2">
                      <FlaskConical className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                      <span className="truncate max-w-[200px]">
                        {(test.tests_catalog as any)?.name ?? t("tests.unknownTest")}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {test.sample_ref ?? "—"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {test.location ?? "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={cn("text-xs", STATUS_COLORS[test.status] ?? "")}>
                      {t(`tests.status.${test.status}`)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(test.date).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-foreground"
                      onClick={() => handleEdit(test)}
                      title={t("common.edit")}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <TestFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        testResult={editingTest}
        onSuccess={refetch}
      />
    </div>
  );
}
