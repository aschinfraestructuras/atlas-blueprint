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

  // Semicircle: 180° arc. We use startAngle=180, endAngle=0
  const data = [
    { value: clamped },
    { value: 100 - clamped },
  ];

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-[200px] h-[110px]">
        <ResponsiveContainer width="100%" height={140}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="85%"
              startAngle={180}
              endAngle={0}
              innerRadius={70}
              outerRadius={90}
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
        <div className="absolute inset-0 flex flex-col items-center justify-end pb-1">
          {loading ? (
            <div className="h-10 w-14 rounded bg-muted animate-pulse" />
          ) : (
            <>
              <span
                className="text-4xl font-black tabular-nums leading-none"
                style={{ color }}
              >
                {clamped}
              </span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-0.5">
                / 100
              </span>
            </>
          )}
        </div>
      </div>
      <span
        className={cn(
          "text-xs font-bold uppercase tracking-wider mt-1 px-2.5 py-0.5 rounded-full",
          status === "healthy" && "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
          status === "attention" && "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
          status === "critical" && "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
        )}
      >
        {t(`health.${status}`)}
      </span>
    </div>
  );
}
