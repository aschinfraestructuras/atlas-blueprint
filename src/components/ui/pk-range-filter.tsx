import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { X } from "lucide-react";

interface PKRangeFilterProps {
  onFilter: (from: number | null, to: number | null) => void;
}

/** Formata "30+500" → 30500 ou null */
function parsePK(s: string): number | null {
  const clean = s.trim().replace("+", "");
  if (!clean) return null;
  const n = parseInt(clean, 10);
  return isNaN(n) ? null : n;
}

/** Formata 30500 → "30+500" */
export function formatPK(n: number): string {
  const km = Math.floor(n / 1000);
  const m = String(n % 1000).padStart(3, "0");
  return `${km}+${m}`;
}

export function PKRangeFilter({ onFilter }: PKRangeFilterProps) {
  const { t } = useTranslation();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [active, setActive] = useState(false);

  const apply = () => {
    const f = parsePK(from);
    const t2 = parsePK(to);
    if (f !== null || t2 !== null) {
      onFilter(f, t2);
      setActive(true);
    }
  };

  const clear = () => {
    setFrom("");
    setTo("");
    setActive(false);
    onFilter(null, null);
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") apply();
  };

  return (
    <div className="flex items-end gap-2">
      <div className="flex flex-col gap-1">
        <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">
          {t("common.pkFrom", { defaultValue: "PK Início" })}
        </Label>
        <Input
          value={from}
          onChange={e => setFrom(e.target.value)}
          onKeyDown={handleKey}
          placeholder="30+000"
          className={`h-8 w-24 text-xs font-mono ${active ? "border-primary" : ""}`}
        />
      </div>
      <div className="flex flex-col gap-1">
        <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">
          {t("common.pkTo", { defaultValue: "PK Fim" })}
        </Label>
        <Input
          value={to}
          onChange={e => setTo(e.target.value)}
          onKeyDown={handleKey}
          placeholder="32+000"
          className={`h-8 w-24 text-xs font-mono ${active ? "border-primary" : ""}`}
        />
      </div>
      {active ? (
        <Button variant="outline" size="sm" onClick={clear} className="h-8 gap-1 text-xs">
          <X className="h-3 w-3" />
          {t("common.clear", { defaultValue: "Limpar" })}
        </Button>
      ) : (
        <Button variant="outline" size="sm" onClick={apply} className="h-8 text-xs">
          {t("common.apply", { defaultValue: "Aplicar" })}
        </Button>
      )}
    </div>
  );
}
