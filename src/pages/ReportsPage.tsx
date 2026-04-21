import { Suspense, lazy } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { FileBarChart2, BarChart3 } from "lucide-react";

const QCReportPage    = lazy(() => import("./QCReportPage"));
const MonthlyPage     = lazy(() => import("./MonthlyReportPage"));

const PageSkeleton = () => (
  <div className="space-y-4 mt-4">
    {[1,2,3].map(i => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
  </div>
);

export default function ReportsPage() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get("tab") ?? "monthly";

  return (
    <div className="space-y-4">
      <Tabs value={tab} onValueChange={v => setSearchParams({ tab: v }, { replace: true })}>
        <TabsList className="h-9 bg-muted/50 rounded-xl border border-border/40 gap-0.5 p-1">
          <TabsTrigger value="monthly" className="gap-1.5 text-xs rounded-lg">
            <FileBarChart2 className="h-3.5 w-3.5" />
            {t("nav.monthlyReport", { defaultValue: "Relatório Mensal SGQ" })}
          </TabsTrigger>
          <TabsTrigger value="qc" className="gap-1.5 text-xs rounded-lg">
            <BarChart3 className="h-3.5 w-3.5" />
            {t("nav.qcReport", { defaultValue: "Relatório QC" })}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="monthly" className="mt-0">
          <Suspense fallback={<PageSkeleton />}>
            <MonthlyPage />
          </Suspense>
        </TabsContent>
        <TabsContent value="qc" className="mt-0">
          <Suspense fallback={<PageSkeleton />}>
            <QCReportPage />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
}
