import React from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  /** Small uppercase module label shown above the title */
  module?: string;
  title: React.ReactNode;
  subtitle?: string;
  /** Optional icon rendered inside a tinted badge */
  icon?: React.ElementType;
  /** HSL color string used to tint the icon badge */
  iconColor?: string;
  /** Right-side action buttons / controls */
  actions?: React.ReactNode;
  className?: string;
}

/**
 * Unified page header used across all module pages.
 * Provides consistent typographic hierarchy and layout.
 */
export function PageHeader({
  module,
  title,
  subtitle,
  icon: Icon,
  iconColor,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn("flex items-start justify-between gap-4", className)}>
      {/* Left: text hierarchy */}
      <div className="min-w-0 flex-1">
        {/* Module / breadcrumb row */}
        {(module || Icon) && (
          <div className="flex items-center gap-2 mb-2">
            {Icon && (
              <div
                className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg"
                style={
                  iconColor
                    ? {
                        background: `${iconColor}1A`,
                        border: `1px solid ${iconColor}30`,
                      }
                    : { background: "hsl(var(--muted))" }
                }
              >
                <Icon
                  className="h-3.5 w-3.5"
                  style={iconColor ? { color: iconColor } : { color: "hsl(var(--muted-foreground))" }}
                />
              </div>
            )}
            {module && (
              <span className="text-[10px] font-extrabold uppercase tracking-[0.22em] text-muted-foreground/60 select-none">
                {module}
              </span>
            )}
          </div>
        )}

        {/* Main title */}
        <h1 className="text-[26px] font-black tracking-tight text-foreground leading-tight">
          {title}
        </h1>

        {/* Subtitle / context */}
        {subtitle && (
          <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">{subtitle}</p>
        )}
      </div>

      {/* Right: actions */}
      {actions && (
        <div className="flex items-center gap-2 flex-shrink-0 pt-0.5">{actions}</div>
      )}
    </div>
  );
}
