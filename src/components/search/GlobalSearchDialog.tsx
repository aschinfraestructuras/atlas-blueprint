import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useProject } from "@/contexts/ProjectContext";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Search, FileText, AlertTriangle, FlaskConical, Truck, HardHat, Construction, Package, Inbox } from "lucide-react";
import { cn } from "@/lib/utils";

interface SearchResult {
  type: string;
  id: string;
  label: string;
  sub?: string;
  url: string;
}

const TYPE_CONFIG: Record<string, { icon: React.ElementType; color: string; labelKey: string }> = {
  documents: { icon: FileText, color: "hsl(var(--module-documents))", labelKey: "Documentos" },
  rfis: { icon: Inbox, color: "hsl(var(--module-plans))", labelKey: "RFIs" },
  non_conformities: { icon: AlertTriangle, color: "hsl(var(--module-nc))", labelKey: "Não Conformidades" },
  test_results: { icon: FlaskConical, color: "hsl(var(--module-tests))", labelKey: "Ensaios" },
  materials: { icon: Package, color: "hsl(var(--module-suppliers))", labelKey: "Materiais" },
  suppliers: { icon: Truck, color: "hsl(var(--module-suppliers))", labelKey: "Fornecedores" },
  subcontractors: { icon: HardHat, color: "hsl(var(--module-subcontractors))", labelKey: "Subempreiteiros" },
  work_items: { icon: Construction, color: "hsl(var(--module-projects))", labelKey: "Atividades" },
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GlobalSearchDialog({ open, onOpenChange }: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { activeProject } = useProject();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const doSearch = useCallback(async (q: string) => {
    if (!activeProject || q.length < 2) { setResults([]); return; }
    setLoading(true);
    const pid = activeProject.id;
    const like = `%${q}%`;

    try {
      const [docs, rfis, ncs, tests, mats, supps, subs, wis] = await Promise.all([
        supabase.from("documents").select("id, title, code").eq("project_id", pid).eq("is_deleted", false)
          .or(`title.ilike.${like},code.ilike.${like}`).limit(5),
        supabase.from("rfis").select("id, code, subject").eq("project_id", pid).eq("is_deleted", false)
          .or(`code.ilike.${like},subject.ilike.${like}`).limit(5),
        supabase.from("non_conformities").select("id, code, title, reference").eq("project_id", pid)
          .or(`code.ilike.${like},title.ilike.${like},reference.ilike.${like}`).limit(5),
        supabase.from("test_results" as any).select("id, code, report_number, sample_ref").eq("project_id", pid)
          .or(`code.ilike.${like},report_number.ilike.${like},sample_ref.ilike.${like}`).limit(5),
        supabase.from("materials").select("id, code, name").eq("project_id", pid)
          .or(`code.ilike.${like},name.ilike.${like}`).limit(5),
        supabase.from("suppliers" as any).select("id, name").eq("project_id", pid)
          .ilike("name", like).limit(5),
        supabase.from("subcontractors").select("id, name").eq("project_id", pid)
          .ilike("name", like).limit(5),
        supabase.from("work_items" as any).select("id, sector, lote, pk_inicio, pk_fim").eq("project_id", pid)
          .or(`sector.ilike.${like},lote.ilike.${like}`).limit(5),
      ]);

      const r: SearchResult[] = [];
      (docs.data ?? []).forEach(d => r.push({ type: "documents", id: d.id, label: d.title, sub: d.code ?? undefined, url: `/documents/${d.id}` }));
      (rfis.data ?? []).forEach(d => r.push({ type: "rfis", id: d.id, label: d.subject, sub: d.code ?? undefined, url: `/technical-office/rfis/${d.id}` }));
      (ncs.data ?? []).forEach(d => r.push({ type: "non_conformities", id: d.id, label: d.title ?? d.reference ?? "NC", sub: d.code ?? undefined, url: `/non-conformities/${d.id}` }));
      (tests.data ?? []).forEach((d: any) => r.push({ type: "test_results", id: d.id, label: d.code ?? d.report_number ?? "Ensaio", sub: d.sample_ref ?? undefined, url: `/tests` }));
      (mats.data ?? []).forEach(d => r.push({ type: "materials", id: d.id, label: d.name, sub: d.code, url: `/materials/${d.id}` }));
      (supps.data ?? []).forEach((d: any) => r.push({ type: "suppliers", id: d.id, label: d.name, url: `/suppliers/${d.id}` }));
      (subs.data ?? []).forEach(d => r.push({ type: "subcontractors", id: d.id, label: d.name, url: `/subcontractors/${d.id}` }));
      (wis.data ?? []).forEach((d: any) => r.push({ type: "work_items", id: d.id, label: `${d.sector ?? ""} ${d.lote ?? ""}`.trim() || "Work Item", sub: d.pk_inicio ? `PK ${d.pk_inicio}–${d.pk_fim}` : undefined, url: `/work-items/${d.id}` }));

      setResults(r);
    } catch (err) {
      console.error("[GlobalSearch]", err);
    } finally {
      setLoading(false);
    }
  }, [activeProject]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(query), 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, doSearch]);

  useEffect(() => {
    if (!open) { setQuery(""); setResults([]); }
  }, [open]);

  // Group results by type
  const grouped = results.reduce<Record<string, SearchResult[]>>((acc, r) => {
    (acc[r.type] = acc[r.type] || []).push(r);
    return acc;
  }, {});

  function handleSelect(url: string) {
    onOpenChange(false);
    navigate(url);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 gap-0">
        <DialogHeader className="p-4 pb-0">
          <DialogTitle className="sr-only">{t("globalSearch.title", { defaultValue: "Pesquisa Global" })}</DialogTitle>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("globalSearch.placeholder", { defaultValue: "Pesquisar por código, nome, referência…" })}
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="pl-10 border-0 border-b rounded-none focus-visible:ring-0 text-sm"
              autoFocus
            />
          </div>
        </DialogHeader>
        <div className="max-h-[400px] overflow-y-auto p-2">
          {loading && <p className="text-xs text-muted-foreground text-center py-6">{t("common.loading")}</p>}
          {!loading && query.length >= 2 && results.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-6">{t("globalSearch.noResults", { defaultValue: "Sem resultados." })}</p>
          )}
          {Object.entries(grouped).map(([type, items]) => {
            const cfg = TYPE_CONFIG[type] ?? { icon: FileText, color: "hsl(var(--muted-foreground))", labelKey: type };
            const Icon = cfg.icon;
            return (
              <div key={type} className="mb-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-2 py-1 flex items-center gap-1.5">
                  <Icon className="h-3 w-3" style={{ color: cfg.color }} />
                  {cfg.labelKey}
                </p>
                {items.map(item => (
                  <button
                    key={item.id}
                    onClick={() => handleSelect(item.url)}
                    className={cn(
                      "w-full text-left px-3 py-2 rounded-md text-sm flex items-center gap-3",
                      "hover:bg-accent transition-colors"
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-foreground truncate font-medium text-xs">{item.label}</p>
                      {item.sub && <p className="text-[10px] text-muted-foreground truncate">{item.sub}</p>}
                    </div>
                  </button>
                ))}
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
