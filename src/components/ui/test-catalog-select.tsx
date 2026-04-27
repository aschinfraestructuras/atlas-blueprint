/**
 * TestCatalogSelect — Selector do catálogo de ensaios com agrupamento por disciplina
 *
 * 266 ensaios em 9 disciplinas — sem este componente era uma lista plana
 * impossível de navegar. Com agrupamento + pesquisa integrada, o utilizador
 * vai directamente à disciplina pretendida e filtra por nome ou código.
 *
 * Reutilizável em qualquer formulário que precise seleccionar um ensaio do catálogo.
 */
import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { TestCatalogEntry } from "@/lib/services/testService";
import {
  Select, SelectContent, SelectGroup, SelectItem,
  SelectLabel, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

// Configuração de disciplinas — ordem, labels PT/ES e cor
const DISCIPLINE_CONFIG: Record<string, { pt: string; es: string; color: string }> = {
  ferrovia:    { pt: "Via Férrea e Soldadura",      es: "Vía Férrea y Soldadura",      color: "#1d4ed8" },
  terras:      { pt: "Terras e Compactação",        es: "Tierras y Compactación",       color: "#92400e" },
  betao:       { pt: "Betão",                       es: "Hormigón",                     color: "#6b7280" },
  estruturas:  { pt: "Estruturas",                  es: "Estructuras",                  color: "#475569" },
  drenagem:    { pt: "Drenagem",                    es: "Drenaje",                      color: "#0369a1" },
  instalacoes: { pt: "Instalações e Catenária",     es: "Instalaciones y Catenaria",    color: "#7c3aed" },
  firmes:      { pt: "Firmes e Pavimentação",       es: "Firmes y Pavimentación",       color: "#b45309" },
  geral:       { pt: "Geral / Transversal",         es: "General / Transversal",        color: "#059669" },
  outros:      { pt: "Outros",                      es: "Otros",                        color: "#64748b" },
};

const DISCIPLINE_ORDER = [
  "ferrovia", "terras", "betao", "estruturas",
  "drenagem", "instalacoes", "firmes", "geral", "outros",
];

interface Props {
  catalog: TestCatalogEntry[];
  value: string;
  onValueChange: (id: string) => void;
  disabled?: boolean;
  loading?: boolean;
  placeholder?: string;
  /** Se true, filtra apenas os ensaios da disciplina especificada */
  filterDisciplina?: string;
}

export function TestCatalogSelect({
  catalog, value, onValueChange, disabled, loading, placeholder, filterDisciplina,
}: Props) {
  const { t, i18n } = useTranslation();
  const isES = i18n.language?.startsWith("es");
  const [search, setSearch] = useState("");

  // Filtrar por pesquisa e disciplina
  const filtered = useMemo(() => {
    let items = catalog;
    if (filterDisciplina) {
      items = items.filter(c => c.disciplina === filterDisciplina);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter(c =>
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        (c.standard ?? "").toLowerCase().includes(q) ||
        (c.material ?? "").toLowerCase().includes(q)
      );
    }
    return items;
  }, [catalog, filterDisciplina, search]);

  // Agrupar por disciplina — mantendo ordem definida
  const grouped = useMemo(() => {
    const map = new Map<string, TestCatalogEntry[]>();
    DISCIPLINE_ORDER.forEach(d => map.set(d, []));
    filtered.forEach(c => {
      const disc = c.disciplina ?? "outros";
      const key = map.has(disc) ? disc : "outros";
      map.get(key)!.push(c);
    });
    return Array.from(map.entries()).filter(([, items]) => items.length > 0);
  }, [filtered]);

  const getLabel = (disc: string) => {
    const cfg = DISCIPLINE_CONFIG[disc];
    if (!cfg) return disc;
    return isES ? cfg.es : cfg.pt;
  };
  const getColor = (disc: string) => DISCIPLINE_CONFIG[disc]?.color ?? "#64748b";

  // Encontrar item seleccionado para mostrar no trigger
  const selectedEntry = catalog.find(c => c.id === value);

  return (
    <Select onValueChange={onValueChange} value={value} disabled={disabled || loading}>
      <SelectTrigger>
        <SelectValue placeholder={loading ? t("common.loading") : (placeholder ?? t("tests.results.form.testTypePlaceholder"))}>
          {selectedEntry && (
            <span className="flex items-center gap-1.5">
              <span className="font-mono text-[10px] text-muted-foreground">{selectedEntry.code}</span>
              <span className="truncate">{selectedEntry.name}</span>
            </span>
          )}
        </SelectValue>
      </SelectTrigger>

      <SelectContent className="max-h-[380px]">
        {/* Pesquisa integrada — sticky no topo */}
        <div className="flex items-center gap-1.5 px-2 py-1.5 border-b border-border sticky top-0 bg-popover z-10">
          <Search className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t("common.search", { defaultValue: "Pesquisar por nome, código ou norma..." })}
            className="h-6 border-0 p-0 text-xs focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent"
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
            <SelectLabel className="flex items-center gap-2 py-1.5 sticky top-[41px] bg-popover z-[5]">
              <span
                className="inline-block w-2 h-2 rounded-full flex-shrink-0"
                style={{ background: getColor(disc) }}
              />
              <span
                className="text-[11px] font-bold uppercase tracking-wider"
                style={{ color: getColor(disc) }}
              >
                {getLabel(disc)}
                <span className="ml-1.5 text-muted-foreground font-normal normal-case tracking-normal">
                  ({items.length})
                </span>
              </span>
            </SelectLabel>

            {items.map(c => (
              <SelectItem key={c.id} value={c.id} className="pl-5">
                <span className="flex flex-col">
                  <span className="flex items-center gap-1.5">
                    <span className="font-mono text-[10px] text-muted-foreground flex-shrink-0">
                      {c.code}
                    </span>
                    <span className="text-xs font-medium leading-tight">{c.name}</span>
                  </span>
                  {(c.standard || c.material) && (
                    <span className="text-[10px] text-muted-foreground leading-tight mt-0.5">
                      {[c.standard, c.material].filter(Boolean).join(" · ")}
                    </span>
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
