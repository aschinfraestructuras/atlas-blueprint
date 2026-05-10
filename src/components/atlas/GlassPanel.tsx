import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * ATLAS GLASS PANEL
 * Translucent dark panel for use ON top of <CommandSurface>. Reusable for
 * inline KPI groups, navigation pills, side cards, hover popovers, etc.
 *
 * For an interactive (clickable) variant set `interactive`.
 * Tone applies a left-edge accent (cyan/amber/red/green) for status.
 */
type Tone = "neutral" | "cyan" | "amber" | "red" | "green";

interface GlassPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  interactive?: boolean;
  tone?: Tone;
  as?: keyof JSX.IntrinsicElements;
}

export const GlassPanel = React.forwardRef<HTMLDivElement, GlassPanelProps>(
  ({ className, interactive = false, tone = "neutral", as = "div", children, ...rest }, ref) => {
    const Comp = as as React.ElementType;
    return (
      <Comp
        ref={ref}
        className={cn(
          "atlas-glass",
          interactive && "atlas-glass--interactive",
          tone !== "neutral" && `atlas-glass--tone-${tone}`,
          className,
        )}
        {...rest}
      >
        {children}
      </Comp>
    );
  },
);
GlassPanel.displayName = "GlassPanel";
