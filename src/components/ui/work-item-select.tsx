/**
 * WorkItemSelect — Selector reutilizável de frentes de obra (work items)
 * 
 * Funcionalidades:
 * - Agrupamento por disciplina com cabeçalho a negrito e separador visual
 * - Pesquisa/filtro integrado por nome, elemento ou parte
 * - Indicador colorido de disciplina por grupo
 * - Reutilizável em qualquer formulário que precise seleccionar um work item
 */
import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { WorkItem } from "@/lib/services/workItemService";
import {
  Select, SelectContent, SelectGroup, SelectItem,
  SelectLabel, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

// Ordem e cores das disciplinas — determina a ordem dos grupos
const DISCIPLINE_CONFIG: Record<string, { label_pt: string; label_es: string; color: string }> = {
  ferrovia:    { label_pt: "Via Férrea e AMV",       label_es: "Vía Férrea y AMV",        color: "#1d4ed8" },
  terras:      { label_pt: "Terraplanagens",          label_es: "Movimiento de Tierras",   color: "#92400e" },
  betao:       { label_pt: "Betão e Obras de Arte",  label_es: "Hormigón y Obras de Arte",color: "#6b7280" },
  drenagem:    { label_pt: "Drenagem",               label_es: "Drenaje",                 color: "#0369a1" },
  instalacoes: { label_pt: "Instalações e Catenária",label_es: "Instalaciones y Catenaria",color: "#7c3aed" },
  outros:      { label_pt: "Outros",                 label_es: "Otros",                   color: "#059669" },
};

const DISCIPLINE_ORDER = ["ferrovia","terras","betao","drenagem","instalacoes","outros"];

interface Props {
  workItems: WorkItem[];
  value: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
  loading?: boolean;
  placeholder?: string;
}

export function WorkItemSelect({
  workItems, value, onValueChange, disabled, loading, placeholder,
}: Props) {
  const { t, i18n } = useTranslation();
  const isES = i18n.language?.startsWith("es");
  const [search, setSearch] = useState("");

  // Filtrar por pesquisa
  const filtered = useMemo(() => {
    if (!search.trim()) return workItems;
    const q = search.toLowerCase();
    return workItems.filter(wi =>
      (wi.sector ?? "").toLowerCase().includes(q) ||
      (wi.elemento ?? "").toLowerCase().includes(q) ||
      (wi.parte ?? "").toLowerCase().includes(q) ||
      (wi.obra ?? "").toLowerCase().includes(q)
    );
  }, [workItems, search]);

  // Agrupar por disciplina — mantendo ordem definida
  const grouped = useMemo(() => {
    const map = new Map<string, WorkItem[]>();
    // Inicializar na ordem certa
    DISCIPLINE_ORDER.forEach(d => map.set(d, []));
    filtered.forEach(wi => {
      const disc = wi.disciplina ?? "outros";
      const key = map.has(disc) ? disc : "outros";
      map.get(key)!.push(wi);
    });
    // Remover grupos vazios
    return Array.from(map.entries()).filter(([, items]) => items.length > 0);
  }, [filtered]);

  const getDisciplineLabel = (disc: string) => {
    const cfg = DISCIPLINE_CONFIG[disc];
    if (!cfg) return disc;
    return isES ? cfg.label_es : cfg.label_pt;
  };

  const getDisciplineColor = (disc: string) =>
    DISCIPLINE_CONFIG[disc]?.color ?? "#6b7280";

  const getItemLabel = (wi: WorkItem) => {
    // Mostrar só a parte relevante — sem repetir o prefixo da disciplina
    const parts: string[] = [];
    if (wi.elemento) parts.push(wi.elemento);
    else if (wi.sector) parts.push(wi.sector);
    if (wi.parte) parts.push(`(${wi.parte})`);
    return parts.join(" ") || wi.sector || wi.obra || wi.id.slice(0,8);
  };

  return (
    <Select
      onValueChange={onValueChange}
      value={value}
      disabled={disabled || loading}
    >
      <SelectTrigger>
        <SelectValue
          placeholder={loading ? t("common.loading") : (placeholder ?? t("ppi.instances.form.selectWorkItem"))}
        />
      </SelectTrigger>
      <SelectContent className="max-h-[360px]">
        {/* Campo de pesquisa dentro do dropdown */}
        <div className="flex items-center gap-1.5 px-2 py-1.5 border-b border-border sticky top-0 bg-popover z-10">
          <Search className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t("common.search", { defaultValue: "Pesquisar..." })}
            className="h-6 border-0 p-0 text-xs focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent"
            // Impedir que teclas de navegação do Select interceptem a pesquisa
            onKeyDown={e => e.stopPropagation()}
          />
        </div>

        {grouped.length === 0 && (
          <div className="px-3 py-4 text-xs text-center text-muted-foreground">
            {t("common.noResults", { defaultValue: "Sem resultados" })}
          </div>
        )}

        {grouped.map(([disc, items]) => (
          <SelectGroup key={disc}>
            <SelectLabel className="flex items-center gap-2 py-1.5">
              {/* Indicador de cor da disciplina */}
              <span
                className="inline-block w-2 h-2 rounded-full flex-shrink-0"
                style={{ background: getDisciplineColor(disc) }}
              />
              <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: getDisciplineColor(disc) }}>
                {getDisciplineLabel(disc)}
                <span className="ml-1.5 text-muted-foreground font-normal normal-case tracking-normal">
                  ({items.length})
                </span>
              </span>
            </SelectLabel>

            {items.map(wi => (
              <SelectItem
                key={wi.id}
                value={wi.id}
                className="pl-5 text-xs"
              >
                <span className="flex flex-col">
                  <span className="font-medium leading-tight">{getItemLabel(wi)}</span>
                  {wi.lote && (
                    <span className="text-[10px] text-muted-foreground leading-tight">{wi.lote}</span>
                  )}
                </span>
              </SelectItem>
            ))}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  );
}
