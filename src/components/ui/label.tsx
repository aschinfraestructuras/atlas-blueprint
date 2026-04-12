import * as React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const labelVariants = cva([
  // Tamanho e peso precisos — legível e distinctivo
  "text-sm font-semibold leading-none",
  // Cor ligeiramente mais escura que muted-foreground
  "text-foreground/80",
  // Tracking subtil para melhor legibilidade
  "tracking-[0.005em]",
  // Estado disabled coerente com os inputs
  "peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
].join(" "));

const Label = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root> & VariantProps<typeof labelVariants>
>(({ className, ...props }, ref) => (
  <LabelPrimitive.Root
    ref={ref}
    className={cn(labelVariants(), className)}
    {...props}
  />
));
Label.displayName = LabelPrimitive.Root.displayName;

export { Label };
