import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  [
    "inline-flex items-center gap-1",
    "rounded-full",
    "border",
    "px-2.5 py-0.5",
    "text-xs font-semibold tracking-[0.02em]",
    "transition-colors duration-150",
    "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  ].join(" "),
  {
    variants: {
      variant: {
        // Primary — sólido, para estados importantes
        default:
          "border-transparent bg-primary text-primary-foreground shadow-[0_1px_2px_hsl(var(--primary)/0.25)] hover:bg-primary/85",

        // Secondary — neutro suave
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/70",

        // Destructive — vermelho
        destructive:
          "border-transparent bg-destructive text-destructive-foreground shadow-[0_1px_2px_hsl(var(--destructive)/0.25)] hover:bg-destructive/85",

        // Outline — só borda, transparente — para estados menos críticos
        outline:
          "bg-transparent text-foreground border-border/70",

        // Success — verde, para estados positivos
        success:
          "border-transparent bg-emerald-500/12 text-emerald-700 border-emerald-500/20 dark:text-emerald-400",

        // Warning — âmbar
        warning:
          "border-transparent bg-amber-500/12 text-amber-700 border-amber-500/20 dark:text-amber-400",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
