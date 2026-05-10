import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * ATLAS COMMAND SURFACE
 * Reusable cinematic dark navy surface with blueprint grid + diagonal cyan
 * light beams. Carries the Atlas visual identity (login page family).
 *
 * Use as the wrapper for: dashboard hero, module page headers, executive
 * panels, premium empty states, project selectors, etc.
 *
 * Children render above all decorative layers (z-index isolated).
 */
interface CommandSurfaceProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Compact variant — smaller radius/grid, ideal for module headers. */
  compact?: boolean;
  /** Render the animated cyan light beams. Default: true. */
  beams?: boolean;
}

export const CommandSurface = React.forwardRef<HTMLDivElement, CommandSurfaceProps>(
  ({ className, compact = false, beams = true, children, ...rest }, ref) => (
    <div
      ref={ref}
      className={cn(
        "atlas-command-surface",
        compact && "atlas-command-surface--compact",
        className,
      )}
      {...rest}
    >
      {beams && <div className="atlas-light-beams" aria-hidden />}
      {children}
    </div>
  ),
);
CommandSurface.displayName = "CommandSurface";
