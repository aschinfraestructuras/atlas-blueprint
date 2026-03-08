import { useTranslation } from "react-i18next";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils";

interface HealthGaugeProps {
  score: number;
  status: "healthy" | "attention" | "critical";
  loading?: boolean;
}

const STATUS_COLORS = {
  healthy: "hsl(145, 55%, 42%)",
  attention: "hsl(38, 85%, 50%)",
  critical: "hsl(0, 65%, 50%)",
};

const BG_TRACK = "hsl(var(--muted))";

export function HealthGauge({ score, status, loading }: HealthGaugeProps) {
  const { t } = useTranslation();
  const color = STATUS_COLORS[status];
  const clamped = Math.max(0, Math.min(100, score));

  const data = [
    { value: clamped },
    { value: 100 - clamped },
  ];

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-[180px] h-[100px]">
        <ResponsiveContainer width="100%" height={130}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="88%"
              startAngle={180}
              endAngle={0}
              innerRadius={65}
              outerRadius={82}
              dataKey="value"
              stroke="none"
              animationDuration={1200}
              animationEasing="ease-out"
            >
              <Cell fill={color} />
              <Cell fill={BG_TRACK} />
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        {/* Score overlay */}
        <div className="absolute inset-0 flex flex-col items-center justify-end pb-0.5">
          {loading ? (
            <div className="h-9 w-12 rounded bg-muted animate-pulse" />
          ) : (
            <>
              <span
                className="text-[36px] font-black tabular-nums leading-none"
                style={{ color }}
              >
                {clamped}
              </span>
              <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground mt-0.5">
                / 100
              </span>
            </>
          )}
        </div>
      </div>
      <span
        className={cn(
          "text-[10px] font-bold uppercase tracking-wider mt-2 px-3 py-1 rounded-full",
          status === "healthy" && "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
          status === "attention" && "bg-amber-500/10 text-amber-700 dark:text-amber-400",
          status === "critical" && "bg-destructive/10 text-destructive",
        )}
      >
        {t(`health.${status}`)}
      </span>
    </div>
  );
}
