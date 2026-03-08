import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Plus, Search, ClipboardList, Pencil, Copy, Power, PowerOff, Loader2, Database } from "lucide-react";
import { usePPITemplates } from "@/hooks/usePPI";
import { useProject } from "@/contexts/ProjectContext";
import { ppiService, PPI_DISCIPLINAS, type PpiTemplate } from "@/lib/services/ppiService";
import { ppiSeedService } from "@/lib/services/ppiSeedService";
import { PPITemplateFormDialog } from "@/components/ppi/PPITemplateFormDialog";
import { PPITemplateBadge } from "@/components/ppi/PPIStatusBadge";
import { NoProjectBanner } from "@/components/NoProjectBanner";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { classifySupabaseError } from "@/lib/utils/supabaseError";

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PPITemplatesPage() {
  const { t }             = useTranslation();
  const navigate          = useNavigate();
  const { activeProject } = useProject();
  const { user }          = useAuth();
  const { data, loading, refetch } = usePPITemplates(true);

  const [formOpen,    setFormOpen]    = useState(false);
  const [editTemplate, setEditTemplate] = useState<PpiTemplate | null>(null);
  const [search,      setSearch]      = useState("");
  const [filterDiscipline, setFilterDiscipline] = useState("all");
  const [filterActive, setFilterActive] = useState("all");

  // Duplicate confirm
  const [dupTemplate, setDupTemplate] = useState<PpiTemplate | null>(null);
  const [dupCode,     setDupCode]     = useState("");
  const [duplicating, setDuplicating] = useState(false);

  // Seed PF17A
  const [seeding, setSeeding] = useState(false);

  async function handleSeedPF17A() {
    if (!activeProject || !user) return;
    setSeeding(true);
    try {
      const result = await ppiSeedService.seedAllTemplates(activeProject.id, user.id);
      if (result.created.length === 0) {
        toast({ title: t("ppi.seed.allExist") });
      } else {
        toast({
          title: t("ppi.seed.success", {
            created: result.created.length,
            items: result.itemsCreated,
            skipped: result.skipped.length,
          }),
        });
      }
      refetch();
    } catch (err) {
      const info = classifySupabaseError(err, t);
      toast({ title: t("ppi.seed.error"), description: info.description ?? info.raw, variant: "destructive" });
    } finally {
      setSeeding(false);
    }
  }

  // ── Filtering ──────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let rows = data;
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(
        (r) => r.code.toLowerCase().includes(q) || r.title.toLowerCase().includes(q)
      );
    }
    if (filterDiscipline !== "all") rows = rows.filter((r) => r.disciplina === filterDiscipline);
    if (filterActive === "active")   rows = rows.filter((r) => r.is_active);
    if (filterActive === "inactive") rows = rows.filter((r) => !r.is_active);
    return rows;
  }, [data, search, filterDiscipline, filterActive]);

  // ── Toggle active ──────────────────────────────────────────────────────────
  async function handleToggleActive(tpl: PpiTemplate) {
    if (!activeProject) return;
    try {
      if (tpl.is_active) {
        await ppiService.archiveTemplate(tpl.id, activeProject.id);
        toast({ title: t("ppi.templates.toast.archived") });
      } else {
        await ppiService.updateTemplate(tpl.id, activeProject.id, { is_active: true });
        toast({ title: t("ppi.templates.toast.activated") });
      }
      refetch();
    } catch (err) {
      const info = classifySupabaseError(err, t);
      toast({ title: info.title, description: info.description ?? info.raw, variant: "destructive" });
    }
  }

  // ── Duplicate ──────────────────────────────────────────────────────────────
  async function handleDuplicate() {
    if (!dupTemplate || !activeProject || !user) return;
    setDuplicating(true);
    try {
      // Check code uniqueness
      const { data: existing } = await supabase
        .from("ppi_templates")
        .select("id")
        .eq("project_id", activeProject.id)
        .eq("code", dupCode)
        .maybeSingle();
      if (existing) {
        toast({ title: t("ppi.templates.validation.codeUnique"), variant: "destructive" });
        return;
      }

      // Fetch items from source template
      const { items } = await ppiService.getTemplate(dupTemplate.id);

      // Create new template
      const created = await ppiService.createTemplate({
        project_id:  activeProject.id,
        code:        dupCode,
        disciplina:  dupTemplate.disciplina,
        title:       `${dupTemplate.title} (copy)`,
        description: dupTemplate.description,
        created_by:  user.id,
        version:     1,
      });

      if (items.length > 0) {
        await ppiService.addTemplateItems(
          items.map((it, idx) => ({
            template_id:         created.id,
            item_no:             it.item_no,
            check_code:          it.check_code,
            label:               it.label,
            method:              it.method,
            acceptance_criteria: it.acceptance_criteria,
            inspection_point_type: it.inspection_point_type,
            required:            it.required,
            evidence_required:   it.evidence_required,
            sort_order:          it.sort_order,
          }))
        );
      }

      toast({ title: t("ppi.templates.toast.created") });
      refetch();
    } catch (err) {
      const info = classifySupabaseError(err, t);
      toast({ title: info.title, description: info.description ?? info.raw, variant: "destructive" });
    } finally {
      setDuplicating(false);
      setDupTemplate(null);
      setDupCode("");
    }
  }

  if (!activeProject) return <NoProjectBanner />;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/ppi")} className="mt-0.5">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground mb-1">
              {t("nav.ppi")}
            </p>
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
              <ClipboardList className="h-6 w-6 text-muted-foreground" />
              {t("ppi.templates.title")}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {activeProject.name} · {data.length} {t("ppi.templates.title").toLowerCase()}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button
            variant="outline"
            onClick={handleSeedPF17A}
            disabled={seeding}
            className="gap-2"
            title={t("ppi.seed.tooltip")}
          >
            {seeding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}
            {seeding ? t("ppi.seed.running") : t("ppi.seed.button")}
          </Button>
          <Button onClick={() => { setEditTemplate(null); setFormOpen(true); }} className="gap-2">
            <Plus className="h-4 w-4" /> {t("ppi.templates.new")}
          </Button>
        </div>
      </div>

      {/* ── Filters ─────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder={t("ppi.templates.searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterDiscipline} onValueChange={setFilterDiscipline}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder={t("ppi.templates.filters.allDisciplines")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("ppi.templates.filters.allDisciplines")}</SelectItem>
            {PPI_DISCIPLINAS.map((code) => (
              <SelectItem key={code} value={code}>
                {t(`ppi.disciplinas.${code}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterActive} onValueChange={setFilterActive}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder={t("ppi.templates.filters.all")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("ppi.templates.filters.all")}</SelectItem>
            <SelectItem value="active">{t("ppi.templateStatus.active")}</SelectItem>
            <SelectItem value="inactive">{t("ppi.templateStatus.inactive")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* ── Table ───────────────────────────────────────────────────── */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          titleKey="emptyState.title"
          subtitleKey={
            !search && filterDiscipline === "all" && filterActive === "all"
              ? "ppi.templates.empty"
              : "emptyState.noResults"
          }
          {...(!search && filterDiscipline === "all" && filterActive === "all"
            ? { ctaKey: "emptyState.cta", onCta: () => setFormOpen(true) }
            : {})}
        />
      ) : (
        <div className="rounded-xl border border-border overflow-hidden bg-card shadow-card">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("ppi.templates.table.code")}
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("ppi.templates.table.title")}
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground hidden sm:table-cell">
                  {t("ppi.templates.table.disciplina")}
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground hidden md:table-cell text-center">
                  {t("ppi.templates.table.version")}
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground hidden sm:table-cell">
                  {t("ppi.templates.table.status")}
                </TableHead>
                <TableHead className="w-[130px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((tpl) => (
                <TableRow key={tpl.id} className="hover:bg-muted/20">
                  <TableCell className="font-mono text-sm font-semibold text-foreground">
                    {tpl.code}
                  </TableCell>
                  <TableCell className="text-sm">{tpl.title}</TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <span className="text-xs text-muted-foreground">
                      {t(`ppi.disciplinas.${tpl.disciplina}`, { defaultValue: tpl.disciplina })}
                    </span>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-center">
                    <span className="text-xs font-mono text-muted-foreground">v{tpl.version}</span>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <PPITemplateBadge active={tpl.is_active} />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost" size="icon" className="h-8 w-8"
                        onClick={() => { setEditTemplate(tpl); setFormOpen(true); }}
                        title={t("common.edit")}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost" size="icon" className="h-8 w-8"
                        onClick={() => { setDupTemplate(tpl); setDupCode(`${tpl.code}-COPY`); }}
                        title={t("ppi.templates.table.actions")}
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost" size="icon"
                        className={`h-8 w-8 ${tpl.is_active ? "hover:text-amber-600" : "hover:text-emerald-600"}`}
                        onClick={() => handleToggleActive(tpl)}
                        title={tpl.is_active ? t("ppi.templates.archive") : t("ppi.templates.activate")}
                      >
                        {tpl.is_active
                          ? <PowerOff className="h-3.5 w-3.5" />
                          : <Power className="h-3.5 w-3.5" />}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* ── Template form dialog ─────────────────────────────────────── */}
      <PPITemplateFormDialog
        open={formOpen}
        onOpenChange={(v) => { setFormOpen(v); if (!v) setEditTemplate(null); }}
        template={editTemplate}
        onSuccess={refetch}
      />

      {/* ── Duplicate dialog ─────────────────────────────────────────── */}
      <AlertDialog open={!!dupTemplate} onOpenChange={(v) => { if (!v) { setDupTemplate(null); setDupCode(""); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("ppi.templates.new")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("ppi.templates.form.code")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="px-1 py-2">
            <Input
              className="font-mono"
              value={dupCode}
              onChange={(e) => setDupCode(e.target.value)}
              placeholder="PPI-NEW-CODE"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDuplicate} disabled={!dupCode.trim() || duplicating}>
              {duplicating ? t("common.loading") : t("common.create")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
