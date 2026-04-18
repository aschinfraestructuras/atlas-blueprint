import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Keyboard } from "lucide-react";

const SHORTCUTS = [
  { keys: ["?"],          action: "shortcuts.openOverlay",  fallback: "Abrir este painel" },
  { keys: ["Ctrl", "K"],  action: "shortcuts.search",       fallback: "Pesquisa global" },
  { keys: ["G", "D"],     action: "shortcuts.gotoDashboard",fallback: "Ir para Dashboard" },
  { keys: ["G", "N"],     action: "shortcuts.gotoNc",       fallback: "Ir para NCs" },
  { keys: ["G", "P"],     action: "shortcuts.gotoPpi",      fallback: "Ir para PPIs" },
  { keys: ["G", "T"],     action: "shortcuts.gotoTests",    fallback: "Ir para Ensaios" },
  { keys: ["G", "M"],     action: "shortcuts.gotoMap",      fallback: "Ir para Mapa" },
  { keys: ["Esc"],        action: "shortcuts.close",        fallback: "Fechar diálogos" },
];

export function KeyboardShortcutsOverlay() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Não disparar quando o utilizador está a escrever
      const target = e.target as HTMLElement;
      const isTyping = target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.isContentEditable;
      if (isTyping) return;
      if (e.key === "?" || (e.shiftKey && e.key === "/")) {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Keyboard className="h-4 w-4 text-primary" />
            {t("shortcuts.title", { defaultValue: "Atalhos de Teclado" })}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-1">
          {SHORTCUTS.map((s, i) => (
            <div key={i} className="flex items-center justify-between py-1.5 border-b border-border/40 last:border-0">
              <span className="text-xs text-foreground">
                {t(s.action, { defaultValue: s.fallback })}
              </span>
              <div className="flex items-center gap-1">
                {s.keys.map((k, j) => (
                  <kbd
                    key={j}
                    className="inline-flex items-center justify-center min-w-[24px] h-6 px-1.5 text-[10px] font-bold font-mono bg-muted border border-border rounded shadow-sm text-foreground"
                  >
                    {k}
                  </kbd>
                ))}
              </div>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-muted-foreground/70 text-center pt-2">
          {t("shortcuts.hint", { defaultValue: "Carrega ? em qualquer página para abrir este painel" })}
        </p>
      </DialogContent>
    </Dialog>
  );
}
