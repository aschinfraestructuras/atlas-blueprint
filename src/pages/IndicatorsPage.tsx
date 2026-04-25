import { Suspense, lazy } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, ShieldCheck, ShieldAlert } from "lucide-react";
import { RisksTab } from "@/components/indicators/RisksTab";

const SGQMatrixPage    = lazy(() => import("./SGQMatrixPage"));
const ContractKPIsPage = lazy(() => import("./ContractKPIsPage"));

const PageSkeleton = () => (
  <div className="space-y-4 mt-4">
    {[1,2,3].map(i => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
  </div>
);

export default function IndicatorsPage() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get("tab") ?? "sgq";

  return (
    <div className="space-y-4">
      <Tabs value={tab} onValueChange={v => setSearchParams({ tab: v }, { replace: true })}>
        <TabsList className="h-9 bg-muted/50 rounded-xl border border-border/40 gap-0.5 p-1">
          <TabsTrigger value="sgq" className="gap-1.5 text-xs rounded-lg">
            <ShieldCheck className="h-3.5 w-3.5" />
            {t("nav.sgqMatrix", { defaultValue: "Matriz SGQ" })}
          </TabsTrigger>
          <TabsTrigger value="kpis" className="gap-1.5 text-xs rounded-lg">
            <TrendingUp className="h-3.5 w-3.5" />
            {t("nav.contractKpis", { defaultValue: "KPIs Contratuais" })}
          </TabsTrigger>
          <TabsTrigger value="risks" className="gap-1.5 text-xs rounded-lg">
            <ShieldAlert className="h-3.5 w-3.5" />
            {t("risks.tabLabel", { defaultValue: "Riscos e Oportunidades" })}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="sgq" className="mt-0">
          <Suspense fallback={<PageSkeleton />}>
            <SGQMatrixPage />
          </Suspense>
        </TabsContent>
        <TabsContent value="kpis" className="mt-0">
          <Suspense fallback={<PageSkeleton />}>
            <ContractKPIsPage />
          </Suspense>
        </TabsContent>
        <TabsContent value="risks" className="mt-4">
          <RisksTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
