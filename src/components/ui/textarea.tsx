import * as React from "react";
import { cn } from "@/lib/utils";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[80px] w-full",
          "rounded-[0.6rem] border border-border/80",
          "bg-background px-3 py-2.5",
          "text-sm font-medium leading-relaxed",
          "placeholder:text-muted-foreground/55 placeholder:font-normal",
          "shadow-[0_1px_2px_hsl(215_30%_18%/0.04)]",
          "transition-all duration-200 resize-y",
          "hover:border-border hover:shadow-[0_1px_3px_hsl(215_30%_18%/0.07)]",
          "focus-visible:outline-none focus-visible:border-primary/60",
          "focus-visible:shadow-[0_0_0_3px_hsl(var(--primary)/0.12),0_1px_3px_hsl(215_30%_18%/0.06)]",
          "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-muted/30",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Textarea.displayName = "Textarea";

export { Textarea };
