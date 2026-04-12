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
        "flex flex-col sm:flex-row sm:items-end justify-between gap-3",
        "animate-fade-in",
        className,
      )}
      style={{ animationDuration: "200ms", animationFillMode: "both" }}
    >
      {/* Lado esquerdo — títulos */}
      <div className="space-y-0.5 min-w-0">
        {eyebrow && (
          <p className="text-[9px] font-black uppercase tracking-[0.22em] text-muted-foreground/55">
            {eyebrow}
          </p>
        )}
        <div className="flex items-center gap-2.5">
          {Icon && (
            <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-primary/8 flex items-center justify-center">
              <Icon className="h-4 w-4 text-primary" />
            </div>
          )}
          <h1 className="text-[1.6rem] font-black tracking-tight text-foreground leading-tight truncate">
            {title}
          </h1>
        </div>
        {subtitle && (
          <p className="text-sm text-muted-foreground leading-snug">
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
