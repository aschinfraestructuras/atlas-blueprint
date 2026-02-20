import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useProject } from "@/contexts/ProjectContext";
import { testService } from "@/lib/services/testService";
import type { TestCatalogEntry, TestResult } from "@/lib/services/testService";
import { classifySupabaseError } from "@/lib/utils/supabaseError";
import { toast } from "@/hooks/use-toast";
import {
  FlaskConical, Plus, Pencil, Search, Filter, Archive, Copy,
  CheckCircle2, XCircle, Clock, AlertCircle, BookOpen,
} from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/EmptyState";
import { NoProjectBanner } from "@/components/NoProjectBanner";
import { CatalogFormDialog } from "@/components/tests/CatalogFormDialog";
import { TestResultFormDialog } from "@/components/tests/TestResultFormDialog";
import { cn } from "@/lib/utils";
import { TEST_DISCIPLINES } from "@/lib/services/testService";

// ─── Status helpers ───────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  draft:        "bg-muted text-muted-foreground",
  pending:      "bg-muted text-muted-foreground",
  in_progress:  "bg-blue-500/10 text-blue-600",
  completed:    "bg-violet-500/10 text-violet-600",
  approved:     "bg-primary/15 text-primary",
  archived:     "bg-muted/60 text-muted-foreground",
  pass:         "bg-primary/15 text-primary",
  fail:         "bg-destructive/10 text-destructive",
  inconclusive: "bg-orange-500/10 text-orange-600",
};

function StatusIcon({ status }: { status: string }) {
  const cls = "h-3.5 w-3.5 flex-shrink-0";
  if (status === "approved" || status === "pass") return <CheckCircle2 className={cls} />;
  if (status === "fail")                          return <XCircle      className={cls} />;
  if (status === "in_progress")                  return <Clock        className={cls} />;
  if (status === "completed")                    return <CheckCircle2 className={cls} />;
  return <AlertCircle className={cls} />;
}

// ─── Catalog tab ──────────────────────────────────────────────────────────────

function CatalogTab() {
  const { t }             = useTranslation();
  const { activeProject } = useProject();
  const [catalog, setCatalog]       = useState<TestCatalogEntry[]>([]);
  const [loading, setLoading]       = useState(false);
  const [search, setSearch]         = useState("");
  const [filterDisc, setFilterDisc] = useState("all");
  const [showInactive, setShowInactive] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing]       = useState<TestCatalogEntry | null>(null);

  const load = useCallback(async () => {
    if (!activeProject) return;
    setLoading(true);
    try {
      const data = await testService.getCatalogByProject(activeProject.id, showInactive);
      setCatalog(data);
    } catch (err) {
      console.error("[CatalogTab] load error:", err);
    } finally { setLoading(false); }
  }, [activeProject, showInactive]);

  useEffect(() => { load(); }, [load]);

  const filtered = catalog.filter((c) => {
    const q = search.toLowerCase();
    const matchSearch = !q || c.code.toLowerCase().includes(q) || c.name.toLowerCase().includes(q) ||
      (c.standards ?? []).some((s) => s.toLowerCase().includes(q));
    const matchDisc = filterDisc === "all" || c.disciplina === filterDisc;
    return matchSearch && matchDisc;
  });

  const handleArchive = async (entry: TestCatalogEntry) => {
    if (!activeProject) return;
    try {
      await testService.archiveCatalogEntry(entry.id, activeProject.id, !entry.active);
      toast({ title: entry.active ? t("tests.catalog.toast.archived") : t("tests.catalog.toast.activated") });
      load();
    } catch (err) {
      console.error("[handleArchive]", err);
      const info = classifySupabaseError(err);
      toast({ title: t(info.titleKey), description: info.raw, variant: "destructive" });
    }
  };

  const handleClone = async (entry: TestCatalogEntry) => {
    if (!activeProject) return;
    try {
      await testService.cloneCatalogEntry(entry.id, activeProject.id);
      toast({ title: t("tests.catalog.toast.cloned") });
      load();
    } catch (err) {
      console.error("[handleClone]", err);
      const info = classifySupabaseError(err);
      toast({ title: t(info.titleKey), description: info.raw, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder={t("tests.catalog.searchPlaceholder")}
            className="pl-8 h-8 text-sm"
          />
        </div>
        <Select value={filterDisc} onValueChange={setFilterDisc}>
          <SelectTrigger className="h-8 w-[160px] text-sm">
            <Filter className="h-3 w-3 mr-1.5 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("tests.catalog.filters.allDisciplines")}</SelectItem>
            {TEST_DISCIPLINES.map((d) => (
              <SelectItem key={d} value={d}>{t(`ppi.disciplinas.${d}`, { defaultValue: d })}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant={showInactive ? "default" : "outline"}
          size="sm"
          className="h-8 text-xs gap-1.5"
          onClick={() => setShowInactive((v) => !v)}
        >
          {showInactive ? t("tests.catalog.filters.hideInactive") : t("tests.catalog.filters.showInactive")}
        </Button>
        <Button size="sm" className="h-8 gap-1.5 ml-auto" onClick={() => { setEditing(null); setDialogOpen(true); }}>
          <Plus className="h-3.5 w-3.5" />
          {t("tests.catalog.newEntry")}
        </Button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full rounded" />)}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={BookOpen} subtitleKey="tests.catalog.empty" />
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("tests.catalog.table.code")}</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("tests.catalog.table.name")}</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("tests.catalog.table.disciplina")}</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("tests.catalog.table.standards")}</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("tests.catalog.table.unit")}</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("common.status")}</TableHead>
                <TableHead className="w-28" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((entry) => (
                <TableRow key={entry.id} className={cn("hover:bg-muted/20 transition-colors", !entry.active && "opacity-50")}>
                  <TableCell className="font-mono text-xs font-semibold text-foreground">{entry.code}</TableCell>
                  <TableCell className="text-sm text-foreground font-medium max-w-[200px]">
                    <div className="truncate">{entry.name}</div>
                    {entry.acceptance_criteria && (
                      <div className="text-xs text-muted-foreground truncate mt-0.5">{entry.acceptance_criteria}</div>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {t(`ppi.disciplinas.${entry.disciplina}`, { defaultValue: entry.disciplina })}
                  </TableCell>
                  <TableCell className="text-xs">
                    <div className="flex flex-wrap gap-1">
                      {(entry.standards ?? []).slice(0, 2).map((s) => (
                        <Badge key={s} variant="outline" className="font-mono text-[10px] py-0">{s}</Badge>
                      ))}
                      {(entry.standards ?? []).length > 2 && (
                        <Badge variant="outline" className="text-[10px] py-0">+{(entry.standards ?? []).length - 2}</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground font-mono">{entry.unit ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={cn("text-xs", entry.active ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground")}>
                      {entry.active ? t("tests.catalog.status.active") : t("tests.catalog.status.archived")}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground"
                        title={t("common.edit")}
                        onClick={() => { setEditing(entry); setDialogOpen(true); }}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground"
                        title={t("tests.catalog.clone")} onClick={() => handleClone(entry)}>
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground"
                        title={entry.active ? t("tests.catalog.archive") : t("tests.catalog.activate")}
                        onClick={() => handleArchive(entry)}>
                        <Archive className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <CatalogFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        entry={editing}
        onSuccess={load}
      />
    </div>
  );
}

// ─── Results tab ──────────────────────────────────────────────────────────────

function ResultsTab({ initialWorkItemId }: { initialWorkItemId?: string }) {
  const { t }             = useTranslation();
  const { activeProject } = useProject();
  const [results, setResults]       = useState<TestResult[]>([]);
  const [loading, setLoading]       = useState(false);
  const [search, setSearch]         = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterDisc, setFilterDisc]   = useState("all");
  const [dialogOpen, setDialogOpen]   = useState(false);
  const [editing, setEditing]         = useState<TestResult | null>(null);

  const load = useCallback(async () => {
    if (!activeProject) return;
    setLoading(true);
    try {
      const data = await testService.getByProject(
        activeProject.id,
        filterStatus !== "all" ? { status: filterStatus } : undefined,
      );
      setResults(data);
    } catch (err) {
      console.error("[ResultsTab] load error:", err);
    } finally { setLoading(false); }
  }, [activeProject, filterStatus]);

  useEffect(() => { load(); }, [load]);

  const filtered = results.filter((r) => {
    const q = search.toLowerCase();
    const tc = r.tests_catalog as any;
    const matchSearch = !q
      || (r.code ?? "").toLowerCase().includes(q)
      || (tc?.name ?? "").toLowerCase().includes(q)
      || (tc?.code ?? "").toLowerCase().includes(q)
      || (r.sample_ref ?? "").toLowerCase().includes(q)
      || (r.location ?? "").toLowerCase().includes(q);
    const matchDisc = filterDisc === "all" || (tc?.disciplina ?? "") === filterDisc;
    return matchSearch && matchDisc;
  });

  const STATUSES = ["draft", "in_progress", "completed", "approved", "archived", "pending", "pass", "fail", "inconclusive"];

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder={t("tests.results.searchPlaceholder")}
            className="pl-8 h-8 text-sm"
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="h-8 w-[150px] text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("tests.results.filters.allStatuses")}</SelectItem>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>{t(`tests.status.${s}`, { defaultValue: s })}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterDisc} onValueChange={setFilterDisc}>
          <SelectTrigger className="h-8 w-[155px] text-sm">
            <Filter className="h-3 w-3 mr-1.5 text-muted-foreground" /><SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("tests.results.filters.allDisciplines")}</SelectItem>
            {TEST_DISCIPLINES.map((d) => (
              <SelectItem key={d} value={d}>{t(`ppi.disciplinas.${d}`, { defaultValue: d })}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button size="sm" className="h-8 gap-1.5 ml-auto"
          onClick={() => { setEditing(null); setDialogOpen(true); }}>
          <Plus className="h-3.5 w-3.5" />
          {t("tests.results.newResult")}
        </Button>
      </div>

      {/* Stats row */}
      {results.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {[
            { label: t("tests.stats.total"),    value: results.length,                                     color: "" },
            { label: t("tests.stats.approved"), value: results.filter((r) => r.status === "approved" || r.pass_fail === "pass").length, color: "text-primary" },
            { label: t("tests.stats.failed"),   value: results.filter((r) => r.pass_fail === "fail").length, color: "text-destructive" },
            { label: t("tests.stats.pending"),  value: results.filter((r) => ["draft","pending","in_progress"].includes(r.status)).length, color: "text-muted-foreground" },
          ].map((stat) => (
            <div key={stat.label} className="rounded-lg border border-border px-3 py-2 bg-muted/20 flex items-center gap-2">
              <span className={cn("text-lg font-bold", stat.color)}>{stat.value}</span>
              <span className="text-xs text-muted-foreground">{stat.label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full rounded" />)}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={FlaskConical} subtitleKey="tests.results.empty" />
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("tests.results.table.code")}</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("tests.results.table.test")}</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("tests.results.table.sampleRef")}</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("tests.results.table.location")}</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("common.status")}</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("common.date")}</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r) => {
                const tc = r.tests_catalog as any;
                return (
                  <TableRow key={r.id} className="hover:bg-muted/20 transition-colors">
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {r.code ?? "—"}
                    </TableCell>
                    <TableCell className="text-sm text-foreground font-medium">
                      <div className="flex items-center gap-2">
                        <FlaskConical className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                        <div className="min-w-0">
                          <div className="truncate max-w-[180px]">{tc?.name ?? t("tests.unknownTest")}</div>
                          {tc?.code && <div className="text-[10px] font-mono text-muted-foreground">{tc.code}</div>}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{r.sample_ref ?? "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {r.location ?? (r.pk_inicio != null ? `PK ${r.pk_inicio}` : "—")}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={cn("text-xs gap-1", STATUS_COLORS[r.status] ?? "")}>
                        <StatusIcon status={r.status} />
                        {t(`tests.status.${r.status}`, { defaultValue: r.status })}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(r.date).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground"
                        onClick={() => { setEditing(r); setDialogOpen(true); }} title={t("common.edit")}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <TestResultFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        testResult={editing}
        preselectedWorkItemId={initialWorkItemId}
        onSuccess={load}
      />
    </div>
  );
}

// ─── Demo data seed ───────────────────────────────────────────────────────────

async function seedDemoData(projectId: string, t: (k: string) => string) {
  // Check if already seeded
  const existing = await testService.getCatalogByProject(projectId, true);
  if (existing.length >= 5) {
    toast({ title: t("tests.demo.alreadyExists") });
    return;
  }

  // Create 10 catalog entries
  const catalogDefs = [
    { code: "TST-SOIL-DENS", name: "Densidade In Situ (Cápsula)", disciplina: "terras", standards: ["ASTM D2937","NP 143"], unit: "%", frequency: "1 por cada 2.000 m²", acceptance_criteria: "Grau compactação ≥ 95% SPD" },
    { code: "TST-SOIL-PROC", name: "Proctor Modificado", disciplina: "terras", standards: ["ASTM D1557","NP 143"], unit: "g/cm³", frequency: "1 por cada 2.000 m³", acceptance_criteria: "Ref. para controlo de compactação" },
    { code: "TST-SOIL-CBR",  name: "CBR de Laboratório", disciplina: "terras", standards: ["NP 143","ASTM D1883"], unit: "%", frequency: "1 por cada lote", acceptance_criteria: "CBR ≥ valor projeto" },
    { code: "TST-CONC-COMP", name: "Resistência à Compressão — Betão", disciplina: "betao", standards: ["EN 12390-3","NP EN 206"], unit: "MPa", frequency: "1 série por cada 100 m³", acceptance_criteria: "fck ≥ classe especificada" },
    { code: "TST-CONC-ABAT", name: "Abaixamento (Slump Test)", disciplina: "betao", standards: ["EN 12350-2"], unit: "mm", frequency: "1 por carga de betão", acceptance_criteria: "S2: 50–90 mm, S3: 100–150 mm" },
    { code: "TST-BITU-MARS", name: "Ensaio de Marshall", disciplina: "firmes", standards: ["EN 12697-34"], unit: "kN", frequency: "1 por lote de mistura", acceptance_criteria: "Estabilidade ≥ 8 kN, Fluência 2–4 mm" },
    { code: "TST-BITU-ITSR", name: "ITSR — Sensibilidade à Água", disciplina: "firmes", standards: ["EN 12697-12"], unit: "%", frequency: "1 por tipo de mistura", acceptance_criteria: "ITSR ≥ 80%" },
    { code: "TST-BITU-CORE", name: "Extração de Carotes — Espessura", disciplina: "firmes", standards: ["EN 12697-27"], unit: "mm", frequency: "1 por km por camada", acceptance_criteria: "Espessura ≥ projeto – 5 mm" },
    { code: "TST-WELD-VIS",  name: "Inspeção Visual de Soldadura", disciplina: "estruturas", standards: ["EN ISO 17637"], unit: "—", frequency: "100% juntas estruturais", acceptance_criteria: "Sem defeitos visíveis classes B/C" },
    { code: "TST-COAT-DFT",  name: "Espessura de Revestimento (DFT)", disciplina: "estruturas", standards: ["ISO 19840","SSPC-PA 2"], unit: "µm", frequency: "5 medições por m²", acceptance_criteria: "DFT ≥ NDFT do sistema" },
  ];

  const created: TestCatalogEntry[] = [];
  for (const def of catalogDefs) {
    try {
      const entry = await testService.createCatalogEntry({ project_id: projectId, ...def });
      created.push(entry);
    } catch (err) {
      console.warn("[seedDemoData] catalog skip:", (err as Error).message);
    }
  }

  if (created.length === 0) {
    toast({ title: t("tests.demo.alreadyExists") });
    return;
  }

  // Create 20 results distributed across catalog entries
  const samples = [
    { idx: 0, sample_ref: "DS-KM12-01", location: "Km 12+200", status: "approved", pass_fail: "pass",  pk_inicio: 12200, pk_fim: 12200, report_number: "LAB-2026-0101" },
    { idx: 0, sample_ref: "DS-KM12-02", location: "Km 12+400", status: "approved", pass_fail: "pass",  pk_inicio: 12400, pk_fim: 12400, report_number: "LAB-2026-0102" },
    { idx: 1, sample_ref: "PR-KM12-01", location: "Km 12+000", status: "approved", pass_fail: "pass",  report_number: "LAB-2026-0103" },
    { idx: 1, sample_ref: "PR-KM15-01", location: "Km 15+000", status: "in_progress", report_number: "LAB-2026-0104" },
    { idx: 2, sample_ref: "CBR-LOTE1",  location: "Lote 1",    status: "completed", pass_fail: "pass",  report_number: "LAB-2026-0105" },
    { idx: 3, sample_ref: "BT-C30-001", location: "Viga V1",   status: "approved", pass_fail: "pass",  report_number: "LAB-2026-0106" },
    { idx: 3, sample_ref: "BT-C30-002", location: "Viga V2",   status: "approved", pass_fail: "fail",  report_number: "LAB-2026-0107" },
    { idx: 3, sample_ref: "BT-C30-003", location: "Laje L1",   status: "in_progress", report_number: "LAB-2026-0108" },
    { idx: 4, sample_ref: "AB-L001",    location: "Entrega 1",  status: "approved", pass_fail: "pass" },
    { idx: 4, sample_ref: "AB-L002",    location: "Entrega 2",  status: "approved", pass_fail: "pass" },
    { idx: 4, sample_ref: "AB-L003",    location: "Entrega 3",  status: "draft" },
    { idx: 5, sample_ref: "MAC-AC16-K1",location: "Km 10+000", status: "approved", pass_fail: "pass",  report_number: "LAB-2026-0112" },
    { idx: 5, sample_ref: "MAC-AC16-K2",location: "Km 11+000", status: "completed", pass_fail: "inconclusive", report_number: "LAB-2026-0113" },
    { idx: 6, sample_ref: "ITSR-L1",    location: "Lote A",     status: "approved", pass_fail: "pass",  report_number: "LAB-2026-0114" },
    { idx: 7, sample_ref: "CORE-KM10", location: "Km 10+200", status: "approved", pass_fail: "pass",  report_number: "LAB-2026-0115" },
    { idx: 7, sample_ref: "CORE-KM11", location: "Km 11+400", status: "approved", pass_fail: "fail",  report_number: "LAB-2026-0116" },
    { idx: 8, sample_ref: "WLD-J001",  location: "Viga V3-J1", status: "approved", pass_fail: "pass" },
    { idx: 8, sample_ref: "WLD-J002",  location: "Viga V3-J2", status: "in_progress" },
    { idx: 9, sample_ref: "DFT-V3-A",  location: "Viga V3 face A", status: "approved", pass_fail: "pass", report_number: "LAB-2026-0119" },
    { idx: 9, sample_ref: "DFT-V3-B",  location: "Viga V3 face B", status: "draft" },
  ];

  let count = 0;
  for (const s of samples) {
    const cat = created[s.idx];
    if (!cat) continue;
    try {
      await supabase.from("test_results").insert({
        project_id:    projectId,
        test_id:       cat.id,
        date:          new Date(Date.now() - Math.random() * 30 * 86400000).toISOString().split("T")[0],
        status:        s.status,
        pass_fail:     (s as any).pass_fail ?? null,
        sample_ref:    s.sample_ref,
        location:      s.location,
        pk_inicio:     (s as any).pk_inicio ?? null,
        pk_fim:        (s as any).pk_fim ?? null,
        report_number: (s as any).report_number ?? null,
        result_payload:{},
      });
      count++;
    } catch (err) {
      console.warn("[seedDemoData] result skip:", err);
    }
  }

  toast({ title: `${t("tests.demo.created")}: ${created.length} ${t("tests.demo.catalogEntries")}, ${count} ${t("tests.demo.results")}` });
}

// Import supabase for seed function
import { supabase } from "@/integrations/supabase/client";

// ─── Main page ────────────────────────────────────────────────────────────────

export default function TestsPage() {
  const { t }             = useTranslation();
  const { activeProject } = useProject();
  const [seeding, setSeeding] = useState(false);

  if (!activeProject) return <NoProjectBanner />;

  const handleSeedDemo = async () => {
    setSeeding(true);
    try {
      await seedDemoData(activeProject.id, t);
    } finally { setSeeding(false); }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <FlaskConical className="h-6 w-6 text-muted-foreground" />
            {t("pages.tests.title")}
          </h1>
          <p className="text-sm text-muted-foreground">{t("pages.tests.subtitle")}</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleSeedDemo}
          disabled={seeding}
          className="text-xs gap-1.5"
        >
          {seeding ? t("common.loading") : t("tests.demo.button")}
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="results">
        <TabsList>
          <TabsTrigger value="results" className="gap-1.5">
            <FlaskConical className="h-3.5 w-3.5" />
            {t("tests.tabs.results")}
          </TabsTrigger>
          <TabsTrigger value="catalog" className="gap-1.5">
            <BookOpen className="h-3.5 w-3.5" />
            {t("tests.tabs.catalog")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="results" className="mt-5">
          <ResultsTab />
        </TabsContent>
        <TabsContent value="catalog" className="mt-5">
          <CatalogTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
