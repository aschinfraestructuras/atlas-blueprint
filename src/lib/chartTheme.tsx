/**
 * ATLAS QMS — Sistema de cores unificado para todos os gráficos
 * Uma fonte de verdade. Todos os gráficos importam daqui.
 * Paleta coerente com o primary (navy azul) e neutros quentes.
 */
import * as React from "react";


// Paleta principal — 6 cores harmoniosas
export const CHART_COLORS = {
  primary:   "hsl(215 65% 38%)",   // Navy azul — principal
  success:   "hsl(145 55% 38%)",   // Verde — conforme / aprovado
  warning:   "hsl(38 88% 48%)",    // Âmbar — atenção / pendente
  danger:    "hsl(0 65% 50%)",     // Vermelho — não conforme / rejeitado
  purple:    "hsl(250 50% 52%)",   // Roxo — neutro alternativo
  teal:      "hsl(185 52% 40%)",   // Teal — complementar
  muted:     "hsl(215 12% 72%)",   // Cinza — dados vazios / track
} as const;

// Sequência para gráficos com múltiplas séries
export const CHART_SEQUENCE = [
  CHART_COLORS.primary,
  CHART_COLORS.success,
  CHART_COLORS.warning,
  CHART_COLORS.purple,
  CHART_COLORS.teal,
  CHART_COLORS.danger,
];

export function chartGradient(color: string, id: string) {
  return { id, color };
}

// Estilos partilhados do recharts — light + dark mode correctos
export const CHART_STYLE = {
  grid: {
    strokeDasharray: "3 4",
    stroke: "hsl(var(--border))",   // adapta-se ao dark mode
    strokeOpacity: 0.5,
  },
  axis: {
    tick:     { fontSize: 10, fill: "hsl(var(--muted-foreground))", fontWeight: 500 },
    line:     { stroke: "transparent" },
    axisLine: { stroke: "transparent" },
  },
  tooltip: {
    cursor: { stroke: "hsl(var(--border))", strokeWidth: 1, strokeDasharray: "4 2" },
  },
  dot:       { r: 0 },
  activeDot: { r: 4, stroke: "hsl(var(--card))", strokeWidth: 2, fill: "currentColor" },
} as const;

// Tooltip personalizado — componente React
// Wrapped in forwardRef because Recharts forwards a ref to the tooltip content.
export const ChartTooltipContent = React.forwardRef<HTMLDivElement, {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
  unit?: string;
}>(function ChartTooltipContent({ active, payload, label, unit }, ref) {
  if (!active || !payload?.length) return null;
  return (
    <div ref={ref} style={{
      background: "hsl(var(--card))",
      border: "1px solid hsl(var(--border))",
      borderRadius: "0.625rem",
      padding: "8px 12px",
      boxShadow: "0 8px 24px hsl(215 30% 18% / 0.12), 0 2px 6px hsl(215 30% 18% / 0.06)",
      fontSize: 11,
      fontFamily: "var(--font-sans)",
      minWidth: 100,
    }}>
      {label && (
        <p style={{
          color: "hsl(var(--muted-foreground))",
          marginBottom: 4,
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          fontSize: 9,
        }}>
          {label}
        </p>
      )}
      {payload.map((p, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, marginTop: i > 0 ? 2 : 0 }}>
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: p.color, flexShrink: 0 }} />
          <span style={{ color: "hsl(var(--muted-foreground))", fontWeight: 500 }}>{p.name}:</span>
          <span style={{ color: "hsl(var(--foreground))", fontWeight: 700, marginLeft: "auto", paddingLeft: 8 }}>
            {p.value}{unit ?? ""}
          </span>
        </div>
      ))}
    </div>
  );
});

