/**
 * Adaptador de toast unificado.
 * Aceita a API { title, description, variant } do shadcn/use-toast
 * mas usa o sonner internamente para consistência visual.
 *
 * Uso: import { toast } from "@/lib/utils/toast"
 * Substitui gradualmente os imports de "@/hooks/use-toast"
 */
import { toast as sonnerToast } from "sonner";

interface ToastOptions {
  title?: string;
  description?: string;
  variant?: "default" | "destructive";
  duration?: number;
  action?: React.ReactNode;
}

export function toast(options: ToastOptions | string) {
  if (typeof options === "string") {
    sonnerToast(options);
    return;
  }
  const { title, description, variant, duration } = options;
  const message = title ?? "";
  const opts = { description, duration: duration ?? 4000 };
  if (variant === "destructive") {
    sonnerToast.error(message, opts);
  } else {
    sonnerToast.success(message, opts);
  }
}

// Re-exportar sonnerToast para quem precisar de API nativa
export { sonnerToast };
