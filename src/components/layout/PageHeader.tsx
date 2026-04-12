import { cn } from "@/lib/utils";

interface PageHeaderProps {
  /** Texto acima do título — ex: "INSPECÇÕES PPI" */
  eyebrow?: string;
  /** Título principal da página */
  title: string;
  /** Subtítulo / contexto — ex: "Linha do Sul — PF17A · 1 inspecção" */
  subtitle?: string;
  /** Ícone ou elemento à esquerda do título */
  icon?: React.ElementType;
  /** Acções à direita (botões, filtros, etc.) */
  actions?: React.ReactNode;
  /** Classes adicionais */
  className?: string;
}

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  icon: Icon,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row sm:items-end justify-between gap-4",
        "animate-fade-in",
        className,
      )}
      style={{ animationDuration: "200ms", animationFillMode: "both" }}
    >
      {/* Lado esquerdo — títulos */}
      <div className="space-y-1 min-w-0">
        {eyebrow && (
          <p className="text-[9px] font-extrabold uppercase tracking-[0.25em] text-muted-foreground/50">
            {eyebrow}
          </p>
        )}
        <div className="flex items-center gap-3">
          {Icon && (
            <div className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: "hsl(var(--primary) / 0.09)" }}>
              <Icon className="h-4.5 w-4.5 text-primary" style={{ width: "1.125rem", height: "1.125rem" }} />
            </div>
          )}
          <h1 className="text-[1.65rem] font-black tracking-tight text-foreground leading-tight truncate">
            {title}
          </h1>
        </div>
        {subtitle && (
          <p className="text-sm text-muted-foreground/80 leading-snug mt-0.5">
            {subtitle}
          </p>
        )}
      </div>

      {/* Lado direito — acções */}
      {actions && (
        <div className="flex items-center gap-2 flex-shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
}
