import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FlaskConical, CheckCircle2, XCircle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface TestTimelineEntry {
  id: string;
  date: string;
  pass_fail: string | null;
  status: string;
  code?: string;
  test_name?: string;
}

interface Props {
  tests: TestTimelineEntry[];
  loading?: boolean;
}

/**
 * Visual timeline of test results for a work item.
 * Shows a horizontal sequence of pass/fail dots with a conformity rate.
 */
export function TestsTimelineChart({ tests, loading }: Props) {
  const { t } = useTranslation();

  const sorted = useMemo(
    () => [...tests].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [tests],
  );

  const stats = useMemo(() => {
    const pass = tests.filter(tr => tr.pass_fail === "pass" || tr.status === "approved").length;
    const fail = tests.filter(tr => tr.pass_fail === "fail").length;
    const pending = tests.filter(tr => ["draft", "in_progress", "pending"].includes(tr.status)).length;
    return { pass, fail, pending, total: tests.length };
  }, [tests]);

  if (tests.length === 0) return null;

  const conformRate = stats.total > 0 ? Math.round(((stats.pass) / stats.total) * 100) : 0;

  return (
    <Card className="shadow-card">
      <CardHeader className="pb-2 pt-4 px-5">
        <CardTitle className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground flex items-center gap-1.5">
          <FlaskConical className="h-3.5 w-3.5" />
          {t("workItems.detail.testsTimeline.title", { defaultValue: "Histórico de Ensaios" })}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-5 pb-4 space-y-3">
        {/* Conformity rate bar */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500",
                conformRate >= 80 ? "bg-primary" : conformRate >= 50 ? "bg-amber-500" : "bg-destructive",
              )}
              style={{ width: `${conformRate}%` }}
            />
          </div>
          <span className={cn(
            "text-sm font-black tabular-nums",
            conformRate >= 80 ? "text-primary" : conformRate >= 50 ? "text-amber-600" : "text-destructive",
          )}>
            {conformRate}%
          </span>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-[10px]">
          <span className="inline-flex items-center gap-1 text-primary font-medium">
            <CheckCircle2 className="h-3 w-3" /> {stats.pass} {t("tests.status.pass", { defaultValue: "Conforme" })}
          </span>
          <span className="inline-flex items-center gap-1 text-destructive font-medium">
            <XCircle className="h-3 w-3" /> {stats.fail} {t("tests.status.fail", { defaultValue: "Não Conforme" })}
          </span>
          <span className="inline-flex items-center gap-1 text-muted-foreground font-medium">
            <Clock className="h-3 w-3" /> {stats.pending} {t("tests.status.pending", { defaultValue: "Pendente" })}
          </span>
        </div>

        {/* Dot timeline */}
        <div className="flex items-center gap-1 flex-wrap">
          {sorted.map((tr) => {
            const color =
              tr.pass_fail === "pass" || tr.status === "approved"
                ? "bg-primary"
                : tr.pass_fail === "fail"
                  ? "bg-destructive"
                  : tr.status === "in_progress"
                    ? "bg-blue-500"
                    : "bg-muted-foreground/30";
            return (
              <div
                key={tr.id}
                className={cn("w-3 h-3 rounded-full transition-transform hover:scale-150 cursor-default", color)}
                title={`${tr.test_name ?? tr.code ?? ""} — ${new Date(tr.date).toLocaleDateString()} — ${tr.pass_fail ?? tr.status}`}
              />
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
