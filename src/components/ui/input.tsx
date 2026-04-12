import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          // Base — dimensões e layout
          "flex h-9 w-full",
          "rounded-[0.6rem]",
          "px-3 py-2",
          "text-sm font-medium",

          // Cor e fundo
          "bg-background",
          "border border-border/80",
          "text-foreground",
          "placeholder:text-muted-foreground/55 placeholder:font-normal",

          // Sombra subtil em repouso
          "shadow-[0_1px_2px_hsl(215_30%_18%/0.04)]",

          // Transição suave com easing premium
          "transition-all duration-200",

          // Focus — sem o anel duro standard; border muda de cor + sombra glow
          "focus-visible:outline-none",
          "focus-visible:border-primary/60",
          "focus-visible:shadow-[0_0_0_3px_hsl(var(--primary)/0.12),0_1px_3px_hsl(215_30%_18%/0.06)]",
          "focus-visible:bg-background",

          // Hover — borda ligeiramente mais escura
          "hover:border-border hover:shadow-[0_1px_3px_hsl(215_30%_18%/0.07)]",

          // Estados especiais
          "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
          "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-muted/30",
          "read-only:bg-muted/20 read-only:cursor-default",

          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
