import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogPortal = DialogPrimitive.Portal;
const DialogClose = DialogPrimitive.Close;

// Overlay — backdrop blur elegante em vez de preto sólido
const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50",
      // Backdrop blur moderno — muito melhor que bg-black/80
      "bg-background/40 backdrop-blur-sm",
      // Animações
      "data-[state=open]:animate-in data-[state=closed]:animate-out",
      "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className,
    )}
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

// Content — sombra profunda, rounded-2xl, slide suave
const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        // Posicionamento
        "fixed left-[50%] top-[50%] z-50",
        "translate-x-[-50%] translate-y-[-50%]",

        // Dimensões e layout
        "grid w-full max-w-lg gap-0",

        // Padding horizontal para o corpo do formulário
        // Header e Footer têm -mx-6 para neutralizar e expandir full-width
        "px-6",

        // Visual — mais arredondado e com sombra profunda
        "rounded-2xl",
        "border border-border/50",
        "bg-card",
        "shadow-[0_24px_64px_hsl(215_30%_18%/0.18),0_8px_24px_hsl(215_30%_18%/0.10)]",

        // Animações — slide from top + fade
        "duration-250",
        "data-[state=open]:animate-in data-[state=closed]:animate-out",
        "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
        "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
        "data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[46%]",
        "data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[46%]",

        className,
      )}
      {...props}
    >
      {children}

      {/* Botão fechar — círculo elegante */}
      <DialogPrimitive.Close
        className={cn(
          "absolute right-4 top-4 z-10",
          "flex h-7 w-7 items-center justify-center rounded-full",
          "bg-muted/0 text-muted-foreground",
          "border border-transparent",
          "transition-all duration-150",
          "hover:bg-muted hover:border-border/40 hover:text-foreground",
          "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1",
          "disabled:pointer-events-none",
          "data-[state=open]:bg-muted",
        )}
      >
        <X className="h-3.5 w-3.5" />
        <span className="sr-only">Fechar</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPortal>
));
DialogContent.displayName = DialogPrimitive.Content.displayName;

// Header — com linha divisória subtil em baixo
const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col gap-1.5",
      // -mx-6 neutraliza o px-6 do DialogContent → borda full-width
      "-mx-6 px-6 pt-6 pb-5",
      "border-b border-border/50",
      className,
    )}
    {...props}
  />
);
DialogHeader.displayName = "DialogHeader";

// Footer — linha divisória em cima, fundo ligeiramente diferente
const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col-reverse sm:flex-row sm:justify-end sm:gap-2",
      // -mx-6 neutraliza o px-6 do DialogContent → borda full-width
      "-mx-6 px-6 py-4",
      "border-t border-border/50",
      "bg-muted/20 rounded-b-2xl",
      className,
    )}
    {...props}
  />
);
DialogFooter.displayName = "DialogFooter";

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      "text-base font-bold leading-none tracking-tight text-foreground",
      className,
    )}
    {...props}
  />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground leading-relaxed", className)}
    {...props}
  />
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;

export {
  Dialog, DialogPortal, DialogOverlay, DialogClose, DialogTrigger,
  DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription,
};
