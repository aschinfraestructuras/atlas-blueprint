import React from "react";
import { useTranslation } from "react-i18next";
import { LucideIcon, InboxIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: LucideIcon;
  /** i18n key para o título */
  titleKey?: string;
  /** i18n key para o subtítulo */
  subtitleKey?: string;
  /** i18n key para o botão CTA */
  ctaKey?: string;
  onCta?: () => void;
  /** Texto directo (alternativa às keys i18n) */
  title?: string;
  subtitle?: string;
  /** Acção com label directo */
  action?: { label: string; onClick: () => void };
  compact?: boolean;
  className?: string;
}

export const EmptyState = React.forwardRef<HTMLDivElement, EmptyStateProps>(
  function EmptyState(
    {
      icon: Icon = InboxIcon,
      titleKey = "emptyState.title",
      subtitleKey = "emptyState.subtitle",
      ctaKey = "emptyState.cta",
      onCta,
      title,
      subtitle,
      action,
      compact = false,
      className,
    },
    ref,
  ) {
    const { t } = useTranslation();

    const displayTitle    = title    ?? t(titleKey);
    const displaySubtitle = subtitle ?? t(subtitleKey);
    const hasAction = onCta || action;

    return (
      <div
        ref={ref}
        className={cn(
          "flex flex-col items-center justify-center text-center",
          "rounded-xl border border-dashed border-border/60 bg-muted/20",
          compact ? "py-8 px-4 gap-2" : "py-16 px-6 gap-3",
          className,
        )}
      >
        {/* Ícone com duplo anel — mais elegante */}
        <div className={cn(
          "flex items-center justify-center rounded-2xl",
          "bg-muted/80 text-muted-foreground/35",
          compact ? "w-11 h-11" : "w-16 h-16",
        )}>
          <Icon
            className={compact ? "h-5 w-5" : "h-7 w-7"}
            strokeWidth={1.5}
          />
        </div>

        {/* Texto */}
        <div className={cn("space-y-1", compact ? "max-w-[220px]" : "max-w-[280px]")}>
          <p className={cn(
            "font-semibold text-foreground/60",
            compact ? "text-sm" : "text-[0.9rem]",
          )}>
            {displayTitle}
          </p>
          <p className={cn(
            "text-muted-foreground/55 leading-snug",
            compact ? "text-[11px]" : "text-sm",
          )}>
            {displaySubtitle}
          </p>
        </div>

        {/* CTA */}
        {onCta && (
          <Button size="sm" variant="outline" className="mt-1" onClick={onCta}>
            {t(ctaKey)}
          </Button>
        )}
        {action && !onCta && (
          <Button size="sm" variant="outline" className="mt-1" onClick={action.onClick}>
            {action.label}
          </Button>
        )}
      </div>
    );
  },
);
