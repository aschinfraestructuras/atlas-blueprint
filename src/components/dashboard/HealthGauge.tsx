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

// Arco SVG puro — muito mais limpo que PieChart
const SIZE   = 160;
const CX     = SIZE / 2;
const CY     = SIZE / 2 + 10;  // Ligeiramente abaixo do centro para o semicírculo
const R      = 62;
const STROKE = 11;
// Semicírculo: de 180° a 0° (da esquerda para a direita, em cima)
const ARC_START_ANGLE = 210; // 210° — ligeiramente abaixo do horizontal esquerdo
const ARC_END_ANGLE   = -30; // -30° — ligeiramente abaixo do horizontal direito
const TOTAL_DEG = ARC_START_ANGLE - ARC_END_ANGLE; // 240°

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const s = polarToCartesian(cx, cy, r, endAngle);
  const e = polarToCartesian(cx, cy, r, startAngle);
  const large = startAngle - endAngle > 180 ? 1 : 0;
  return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 0 ${e.x} ${e.y}`;
}

export function HealthGauge({ score, status, loading }: HealthGaugeProps) {
  const { t } = useTranslation();
  const st = STATUS[status];
  const clamped = Math.max(0, Math.min(100, score));

  // Calcular o ângulo de fim do arco de progresso
  const progressAngle = ARC_START_ANGLE - (clamped / 100) * TOTAL_DEG;

  const trackPath    = describeArc(CX, CY, R, ARC_START_ANGLE, ARC_END_ANGLE);
  const progressPath = describeArc(CX, CY, R, ARC_START_ANGLE, progressAngle);

  // Comprimento total do arco (para animação)
  const arcLength = (TOTAL_DEG / 360) * 2 * Math.PI * R;

  if (loading) {
    return (
      <div className="flex flex-col items-center gap-2">
        <div className="w-[160px] h-[110px] rounded-lg bg-muted animate-pulse" />
        <div className="w-16 h-5 rounded-full bg-muted animate-pulse" />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: SIZE, height: 110 }}>
        <svg width={SIZE} height={SIZE} className="absolute top-0 left-0 overflow-visible">
          <defs>
            {/* Gradiente do arco de progresso — da cor mais clara para mais escura */}
            <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%"   stopColor={st.color} stopOpacity={0.65} />
              <stop offset="100%" stopColor={st.color} stopOpacity={1}    />
            </linearGradient>
            {/* Filtro de glow */}
            <filter id="gaugeGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Track — fundo do arco */}
          <path
            d={trackPath}
            fill="none"
            stroke="hsl(var(--muted))"
            strokeWidth={STROKE}
            strokeLinecap="round"
            opacity={0.6}
          />

          {/* Progresso — arco colorido com animação */}
          {clamped > 0 && (
            <path
              d={progressPath}
              fill="none"
              stroke="url(#gaugeGradient)"
              strokeWidth={STROKE}
              strokeLinecap="round"
              filter={clamped >= 80 ? "url(#gaugeGlow)" : undefined}
              style={{
                strokeDasharray: arcLength,
                strokeDashoffset: arcLength * (1 - clamped / 100),
                transition: "stroke-dashoffset 1.2s cubic-bezier(0.16, 1, 0.3, 1)",
              }}
            />
          )}

          {/* Ponto final do progresso — pequeno círculo */}
          {clamped > 2 && clamped < 99 && (() => {
            const pt = polarToCartesian(CX, CY, R, progressAngle);
            return (
              <circle
                cx={pt.x}
                cy={pt.y}
                r={STROKE / 2 + 1}
                fill={st.color}
                opacity={0.9}
              />
            );
          })()}
        </svg>

        {/* Número central */}
        <div className="absolute inset-0 flex flex-col items-center justify-end pb-3">
          <span
            className="text-[40px] font-black tabular-nums leading-none tracking-tight"
            style={{ color: st.color }}
          >
            {clamped}
          </span>
          <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-muted-foreground/60 mt-0.5">
            / 100
          </span>
        </div>
      </div>

      {/* Badge de estado — pill com cor e ponto animado */}
      <div
        className={cn(
          "flex items-center gap-1.5",
          "px-3 py-1 rounded-full mt-1",
          "text-[10px] font-bold uppercase tracking-[0.14em]",
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
