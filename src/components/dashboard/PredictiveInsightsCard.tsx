import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Sparkles, TrendingDown, TrendingUp, Minus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface MonthlyPoint { month: string; open?: number; closed?: number; pass?: number; fail?: number; total?: number }

interface Props {
  ncMonthly: MonthlyPoint[];
  testsMonthly: MonthlyPoint[];
  ppiApproved: number;
  ppiTotal: number;
  loading?: boolean;
}

interface Insight {
  tone: "good" | "warn" | "bad" | "neutral";
  icon: React.ElementType;
  title: string;
  detail: string;
}

function pctChange(curr: number, prev: number): number | null {
  if (prev === 0 && curr === 0) return 0;
  if (prev === 0) return null;
  return Math.round(((curr - prev) / prev) * 100);
}

export function PredictiveInsightsCard({ ncMonthly, testsMonthly, ppiApproved, ppiTotal, loading }: Props) {
  const { t } = useTranslation();

  const insights = useMemo((): Insight[] => {
    const out: Insight[] = [];

    // 1) Tendência NCs (últimos 2 meses)
    if (ncMonthly.length >= 2) {
      const curr = ncMonthly[ncMonthly.length - 1].open ?? 0;
      const prev = ncMonthly[ncMonthly.length - 2].open ?? 0;
      const change = pctChange(curr, prev);
      if (change !== null) {
        if (change > 30) {
          out.push({
            tone: "bad",
            icon: TrendingUp,
            title: t("insights.ncSpike", { defaultValue: "Pico de NCs" }),
            detail: t("insights.ncSpikeDetail", { defaultValue: "{{n}}% mais NCs vs mês anterior", n: change }),
          });
        } else if (change < -20) {
          out.push({
            tone: "good",
            icon: TrendingDown,
            title: t("insights.ncImproving", { defaultValue: "NCs a baixar" }),
            detail: t("insights.ncImprovingDetail", { defaultValue: "{{n}}% menos NCs vs mês anterior", n: Math.abs(change) }),
          });
        } else if (Math.abs(change) <= 10) {
          out.push({
            tone: "neutral",
            icon: Minus,
            title: t("insights.ncStable", { defaultValue: "NCs estáveis" }),
            detail: t("insights.ncStableDetail", { defaultValue: "Variação {{n}}% — sob controlo", n: change }),
          });
        }
      }
    }

    // 2) Taxa de conformidade dos ensaios
    if (testsMonthly.length >= 1) {
      const last = testsMonthly[testsMonthly.length - 1];
      const total = (last.pass ?? 0) + (last.fail ?? 0);
      if (total > 0) {
        const passRate = Math.round(((last.pass ?? 0) / total) * 100);
        if (passRate >= 90) {
          out.push({
            tone: "good",
            icon: TrendingUp,
            title: t("insights.testsExcellent", { defaultValue: "Ensaios excelentes" }),
            detail: t("insights.testsExcellentDetail", { defaultValue: "{{n}}% de conformidade este mês", n: passRate }),
          });
        } else if (passRate < 70) {
          out.push({
            tone: "bad",
            icon: TrendingDown,
            title: t("insights.testsLow", { defaultValue: "Conformidade baixa" }),
            detail: t("insights.testsLowDetail", { defaultValue: "Apenas {{n}}% pass — investigar materiais", n: passRate }),
          });
        }
      }
    }

    // 3) PPIs aprovação
    if (ppiTotal > 0) {
      const ppiPct = Math.round((ppiApproved / ppiTotal) * 100);
      if (ppiPct >= 80) {
        out.push({
          tone: "good",
          icon: Sparkles,
          title: t("insights.ppiHealthy", { defaultValue: "PPIs no caminho certo" }),
          detail: t("insights.ppiHealthyDetail", { defaultValue: "{{n}}% aprovados — fluxo saudável", n: ppiPct }),
        });
      } else if (ppiPct < 50) {
        out.push({
          tone: "warn",
          icon: TrendingDown,
          title: t("insights.ppiLag", { defaultValue: "PPIs em atraso" }),
          detail: t("insights.ppiLagDetail", { defaultValue: "Apenas {{n}}% aprovados — acelerar revisões", n: ppiPct }),
        });
      }
    }

    if (out.length === 0) {
      out.push({
        tone: "neutral",
        icon: Sparkles,
        title: t("insights.noData", { defaultValue: "Sem dados suficientes" }),
        detail: t("insights.noDataDetail", { defaultValue: "Continue a registar para activar previsões" }),
      });
    }

    return out.slice(0, 3);
  }, [ncMonthly, testsMonthly, ppiApproved, ppiTotal, t]);

  const toneCls: Record<Insight["tone"], string> = {
    good:    "border-emerald-500/30 bg-emerald-500/5",
    warn:    "border-amber-500/30 bg-amber-500/5",
    bad:     "border-destructive/30 bg-destructive/5",
    neutral: "border-border/40 bg-muted/30",
  };
  const toneIcon: Record<Insight["tone"], string> = {
    good:    "text-emerald-600 bg-emerald-500/10",
    warn:    "text-amber-600 bg-amber-500/10",
    bad:     "text-destructive bg-destructive/10",
    neutral: "text-muted-foreground bg-muted/50",
  };

  return (
    <Card className="border border-border/60 bg-card shadow-card overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/20">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
          </div>
          <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-muted-foreground">
            {t("insights.title", { defaultValue: "Insights Preditivos" })}
          </p>
          <span className="ml-auto text-[9px] text-muted-foreground/60 italic">
            {t("insights.basedOn", { defaultValue: "Baseado nos últimos 6 meses" })}
          </span>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-16 bg-muted/40 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {insights.map((ins, i) => {
              const Icon = ins.icon;
              return (
                <div
                  key={i}
                  className={cn(
                    "rounded-lg border p-2.5 flex items-start gap-2 animate-fade-in",
                    toneCls[ins.tone],
                  )}
                  style={{ animationDelay: `${i * 80}ms`, animationFillMode: "both" }}
                >
                  <div className={cn("flex items-center justify-center w-7 h-7 rounded-md flex-shrink-0", toneIcon[ins.tone])}>
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-bold text-foreground leading-tight">{ins.title}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug">{ins.detail}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
