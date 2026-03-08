import React from "react";
import { useTranslation } from "react-i18next";
import { LucideIcon, InboxIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  icon?: LucideIcon;
  titleKey?: string;
  subtitleKey?: string;
  ctaKey?: string;
  onCta?: () => void;
}

export const EmptyState = React.forwardRef<HTMLDivElement, EmptyStateProps>(
  function EmptyState(
    {
      icon: Icon = InboxIcon,
      titleKey = "emptyState.title",
      subtitleKey = "emptyState.subtitle",
      ctaKey = "emptyState.cta",
      onCta,
    },
    ref,
  ) {
    const { t } = useTranslation();

    return (
      <div
        ref={ref}
        className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card py-20 px-6 text-center"
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-4">
          <Icon className="h-5 w-5 text-muted-foreground" />
        </div>
        <h3 className="text-sm font-semibold text-foreground mb-1">{t(titleKey)}</h3>
        <p className="text-sm text-muted-foreground max-w-xs">{t(subtitleKey)}</p>
        {onCta && (
          <Button size="sm" className="mt-6" onClick={onCta}>
            {t(ctaKey)}
          </Button>
        )}
      </div>
    );
  },
);
