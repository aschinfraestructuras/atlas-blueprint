import { useId } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

interface HealthGaugeProps {
  score: number;
  status: "healthy" | "attention" | "critical";
  loading?: boolean;
}

// Cores exatas por estado — mais vivas e distintas
const STATUS = {
  healthy:   { color: "hsl(145 60% 38%)", label: "Saudável",  glow: "hsl(145 60% 38% / 0.3)"  },
  attention: { color: "hsl(38 90% 46%)",  label: "Atenção",   glow: "hsl(38 90% 46% / 0.3)"   },
  critical:  { color: "hsl(0 68% 48%)",   label: "Crítico",   glow: "hsl(0 68% 48% / 0.3)"    },
};

// Arco SVG de 240°, aberto em baixo (−120° → +120°, 0° = topo)
const SIZE     = 160;
const STROKE   = 11;
const R        = 62;
const CX       = SIZE / 2;
const CY       = R + STROKE / 2 + 4;
const HEIGHT   = Math.ceil(CY + R * 0.5 + STROKE / 2 + 2);
const START    = -120;
const END      = 120;

function polar(angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: CX + R * Math.sin(rad), y: CY - R * Math.cos(rad) };
}

const s0 = polar(START);
const s1 = polar(END);
const ARC_PATH = `M ${s0.x} ${s0.y} A ${R} ${R} 0 1 1 ${s1.x} ${s1.y}`;

export function HealthGauge({ score, status, loading }: HealthGaugeProps) {
  const { t } = useTranslation();
  // Id único por instância: com ids repetidos todos os medidores usavam o gradiente do primeiro
  const uid = useId().replace(/:/g, "");
  const st = STATUS[status];
  const clamped = Math.max(0, Math.min(100, score));
  const tip = polar(START + (clamped / 100) * (END - START));

  if (loading) {
    return (
      <div className="flex flex-col items-center gap-2">
        <div className="rounded-lg bg-muted animate-pulse" style={{ width: SIZE, height: HEIGHT }} />
        <div className="w-16 h-5 rounded-full bg-muted animate-pulse" />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: SIZE, height: HEIGHT }}>
        <svg width={SIZE} height={HEIGHT} viewBox={`0 0 ${SIZE} ${HEIGHT}`} className="absolute inset-0">
          <defs>
            <linearGradient id={`gauge-grad-${uid}`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%"   stopColor={st.color} stopOpacity={0.65} />
              <stop offset="100%" stopColor={st.color} stopOpacity={1}    />
            </linearGradient>
          </defs>

          {/* Fundo do arco */}
          <path d={ARC_PATH} fill="none" stroke="hsl(var(--muted))" strokeWidth={STROKE} strokeLinecap="round" />

          {/* Progresso: o mesmo arco, revelado com dasharray normalizado a 100 */}
          {clamped > 0 && (
            <path
              d={ARC_PATH}
              pathLength={100}
              fill="none"
              stroke={`url(#gauge-grad-${uid})`}
              strokeWidth={STROKE}
              strokeLinecap="round"
              style={{
                strokeDasharray: 100,
                strokeDashoffset: 100 - clamped,
                transition: "stroke-dashoffset 1.2s cubic-bezier(0.16, 1, 0.3, 1)",
              }}
            />
          )}

          {clamped > 2 && clamped < 99 && (
            <circle cx={tip.x} cy={tip.y} r={STROKE / 2 + 1} fill={st.color} />
          )}
        </svg>

        {/* Número central */}
        <div className="absolute left-0 right-0 flex flex-col items-center" style={{ top: CY - 26 }}>
          <span
            className="text-[40px] font-black tabular-nums leading-none tracking-tight"
            style={{ color: st.color }}
          >
            {clamped}
          </span>
          <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground mt-0.5">
            / 100
          </span>
        </div>
      </div>

      {/* Badge de estado — pill com cor e ponto animado */}
      <div
        className={cn(
          "flex items-center gap-1.5",
          "px-3 py-1 rounded-full mt-2",
          "text-[11px] font-bold uppercase tracking-[0.14em]",
        )}
        style={{
          backgroundColor: st.color.replace(")", " / 0.10)").replace("hsl(", "hsl("),
          color: st.color,
        }}
      >
        {/* Ponto pulsante quando saudável */}
        <span
          className={cn(
            "w-1.5 h-1.5 rounded-full",
            status === "healthy" && "animate-pulse",
          )}
          style={{ backgroundColor: st.color }}
        />
        {t(`health.${status}`, {
          defaultValue: st.label,
        })}
      </div>
    </div>
  );
}
