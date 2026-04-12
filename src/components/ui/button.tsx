import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  [
    // Base — tipografia precisa, transição suave com easing premium
    "inline-flex items-center justify-center gap-2 whitespace-nowrap",
    "text-sm font-semibold tracking-[0.01em]",
    "rounded-[0.6rem]",
    "transition-all duration-200",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
    "disabled:pointer-events-none disabled:opacity-45",
    "select-none",
    "[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  ].join(" "),
  {
    variants: {
      variant: {
        // Primary — gradiente muito subtil, sombra que aparece no hover
        default: [
          "bg-primary text-primary-foreground",
          "shadow-[0_1px_2px_hsl(var(--primary)/0.3),inset_0_1px_0_hsl(0_0%_100%/0.08)]",
          "hover:bg-primary/92",
          "hover:shadow-[0_4px_14px_hsl(var(--primary)/0.4),0_2px_4px_hsl(var(--primary)/0.2)]",
          "active:scale-[0.97] active:shadow-[0_1px_2px_hsl(var(--primary)/0.3)]",
        ].join(" "),

        // Destructive — vermelho limpo com sombra suave
        destructive: [
          "bg-destructive text-destructive-foreground",
          "shadow-[0_1px_2px_hsl(var(--destructive)/0.25)]",
          "hover:bg-destructive/90",
          "hover:shadow-[0_4px_12px_hsl(var(--destructive)/0.35)]",
          "active:scale-[0.97]",
        ].join(" "),

        // Outline — borda elegante, fundo transparente, hover com tinte
        outline: [
          "border border-border bg-background/80",
          "shadow-[0_1px_2px_hsl(215_30%_18%/0.04)]",
          "hover:bg-muted/60 hover:border-border/80",
          "hover:shadow-[0_2px_8px_hsl(215_30%_18%/0.08)]",
          "active:scale-[0.97]",
        ].join(" "),

        // Secondary — neutro, discreto, para acções secundárias
        secondary: [
          "bg-secondary text-secondary-foreground",
          "shadow-[0_1px_2px_hsl(215_30%_18%/0.04)]",
          "hover:bg-secondary/70",
          "hover:shadow-[0_2px_8px_hsl(215_30%_18%/0.08)]",
          "active:scale-[0.97]",
        ].join(" "),

        // Ghost — mínimo, para toolbar e acções terciárias
        ghost: [
          "hover:bg-muted/70 hover:text-foreground",
          "active:bg-muted active:scale-[0.97]",
        ].join(" "),

        // Link — texto puro com underline no hover
        link: "text-primary underline-offset-4 hover:underline h-auto p-0 shadow-none",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm:      "h-8 rounded-[0.5rem] px-3 text-xs",
        lg:      "h-11 rounded-[0.7rem] px-6 text-base",
        xl:      "h-12 rounded-[0.7rem] px-8 text-base font-bold tracking-[0.02em]",
        icon:    "h-9 w-9",
        "icon-sm": "h-7 w-7 rounded-[0.5rem]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
