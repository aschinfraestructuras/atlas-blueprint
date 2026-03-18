import { useState, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useProject } from "@/contexts/ProjectContext";
import { useLaboratories } from "@/hooks/useLaboratories";
import { laboratoryService, type Laboratory, type LaboratoryInput } from "@/lib/services/laboratoryService";
import { exportLaboratoryPdf, type LabTestRow } from "@/lib/services/laboratoryExportService";
import { classifySupabaseError } from "@/lib/utils/supabaseError";
import { useProjectLogo } from "@/hooks/useProjectLogo";
import { toast } from "@/hooks/use-toast";
import { ModuleKPICard } from "@/components/ModuleKPICard";
import { EmptyState } from "@/components/EmptyState";
import { NoProjectBanner } from "@/components/NoProjectBanner";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  FlaskConical, Plus, Pencil, Trash2, Search, Loader2,
  Building2, Award, CheckCircle2, XCircle, Clock, FileDown, Eye, AlertTriangle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { differenceInDays, parseISO } from "date-fns";

// ─── Accreditation Badge ──────────────────────────────────────────────────────
function AccreditationBadge({ validUntil }: { validUntil: string | null | undefined }) {
  if (!validUntil) return null;
  const days = differenceInDays(parseISO(validUntil), new Date());
  if (days < 0) return <Badge variant="destructive" className="text-[9px]">Acred. expirada</Badge>;
  if (days < 30) return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 text-[9px]">Expira em {days}d</Badge>;
  return null;
}

// ─── Lab Form Dialog ──────────────────────────────────────────────────────────
function LabFormDialog({ open, onOpenChange, lab, onSuccess }: {
  open: boolean; onOpenChange: (o: boolean) => void; lab: Laboratory | null; onSuccess: () => void;
}) {
  const { t } = useTranslation();
  const { activeProject } = useProject();
  const [saving, setSaving] = useState(false);
  const [supplierId, setSupplierId] = useState("");
  const [accBody, setAccBody] = useState("");
  const [accCode, setAccCode] = useState("");
  const [accValidUntil, setAccValidUntil] = useState("");
  const [scope, setScope] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [suppliers, setSuppliers] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    if (!activeProject) return;
    supabase.from("suppliers").select("id, name").eq("project_id", activeProject.id)
      .then(({ data }) => setSuppliers(data ?? []));
  }, [activeProject]);

  useEffect(() => {
    if (lab) {
      setSupplierId(lab.supplier_id); setAccBody(lab.accreditation_body ?? "");
      setAccCode(lab.accreditation_code ?? ""); setScope(lab.scope ?? "");
      setAccValidUntil((lab as any).accreditation_valid_until ?? "");
      setContactName(lab.contact_name ?? ""); setContactEmail(lab.contact_email ?? "");
      setContactPhone(lab.contact_phone ?? ""); setNotes(lab.notes ?? "");
    } else {
      setSupplierId(""); setAccBody(""); setAccCode(""); setScope(""); setAccValidUntil("");
      setContactName(""); setContactEmail(""); setContactPhone(""); setNotes("");
    }
  }, [lab, open]);

  const handleSave = async () => {
    if (!activeProject || !supplierId) return;
    setSaving(true);
    try {
      const input: any = {
        project_id: activeProject.id, supplier_id: supplierId,
        accreditation_body: accBody || undefined, accreditation_code: accCode || undefined,
        accreditation_valid_until: accValidUntil || null,
        scope: scope || undefined, contact_name: contactName || undefined,
        contact_email: contactEmail || undefined, contact_phone: contactPhone || undefined,
        notes: notes || undefined,
      };
      if (lab) {
        await laboratoryService.update(lab.id, activeProject.id, input);
      } else {
        await laboratoryService.create(input);
      }
      toast({ title: lab ? t("common.save") : t("common.create") });
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      const info = classifySupabaseError(err);
      toast({ title: t(info.titleKey), description: info.raw, variant: "destructive" });
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{lab ? t("laboratories.form.titleEdit") : t("laboratories.form.titleCreate")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>{t("laboratories.selectSupplier")}</Label>
            <Select value={supplierId} onValueChange={setSupplierId} disabled={!!lab}>
              <SelectTrigger><SelectValue placeholder={t("laboratories.selectSupplierPlaceholder")} /></SelectTrigger>
              <SelectContent>
                {suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{t("laboratories.accreditationBody")}</Label>
              <Input value={accBody} onChange={(e) => setAccBody(e.target.value)} placeholder={t("laboratories.accreditationBodyPlaceholder")} />
            </div>
            <div className="space-y-1.5">
              <Label>{t("laboratories.accreditationCode")}</Label>
              <Input value={accCode} onChange={(e) => setAccCode(e.target.value)} placeholder={t("laboratories.accreditationCodePlaceholder")} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Validade da Acreditação</Label>
            <Input type="date" value={accValidUntil} onChange={(e) => setAccValidUntil(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>{t("laboratories.scope")}</Label>
            <Textarea value={scope} onChange={(e) => setScope(e.target.value)} rows={2} placeholder={t("laboratories.scopePlaceholder")} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5"><Label>{t("laboratories.contactName")}</Label><Input value={contactName} onChange={(e) => setContactName(e.target.value)} /></div>
            <div className="space-y-1.5"><Label>{t("laboratories.contactEmail")}</Label><Input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} /></div>
            <div className="space-y-1.5"><Label>{t("laboratories.contactPhone")}</Label><Input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} /></div>
          </div>
          <div className="space-y-1.5">
            <Label>{t("laboratories.notes", { defaultValue: "Observações" })}</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder={t("laboratories.notesPlaceholder", { defaultValue: "Observações adicionais…" })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t("common.cancel")}</Button>
          <Button onClick={handleSave} disabled={saving || !supplierId}>
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
            {lab ? t("laboratories.form.saveBtn") : t("laboratories.form.createBtn")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Lab Detail Dialog ──────────────────────────────────────────────────────
function LabDetailDialog({ open, onOpenChange, lab }: {
  open: boolean; onOpenChange: (o: boolean) => void; lab: Laboratory | null;
}) {
  const { t } = useTranslation();
  const { activeProject } = useProject();
  const { logoBase64 } = useProjectLogo();
  const [stats, setStats] = useState({ total: 0, pass: 0, fail: 0, pending: 0 });
  const [tests, setTests] = useState<LabTestRow[]>([]);
  const [catalogTypes, setCatalogTypes] = useState<string[]>([]);

  useEffect(() => {
    if (!open || !lab || !activeProject) return;
    laboratoryService.getLabStats(activeProject.id, lab.supplier_id).then(setStats).catch(() => {});
    // Recent tests
    // Recent tests
    (supabase as any).from("test_results")
      .select("code, material, result_status, date")
      .eq("project_id", activeProject.id)
      .eq("supplier_id", lab.supplier_id)
      .eq("is_deleted", false)
      .order("date", { ascending: false })
      .limit(20)
      .then(({ data }: any) => setTests((data ?? []) as LabTestRow[]));
    // Catalog types (lab_required)
    (supabase as any).from("tests_catalog")
      .select("test_name, discipline")
      .eq("project_id", activeProject.id)
      .eq("lab_required", true)
      .then(({ data }: any) => {
        setCatalogTypes((data ?? []).map((r: any) => `${r.discipline} — ${r.test_name}`));
      });
  }, [open, lab, activeProject]);

  if (!lab) return null;

  const InfoRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div className="py-1">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <div className="text-sm mt-0.5">{value ?? "—"}</div>
    </div>
  );

  const handleExportPdf = () => {
    exportLaboratoryPdf(lab, stats, tests, logoBase64, activeProject?.name ?? "");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <DialogTitle className="flex-1">{lab.suppliers?.name ?? "Laboratório"}</DialogTitle>
            <AccreditationBadge validUntil={(lab as any).accreditation_valid_until} />
            <Button variant="outline" size="sm" onClick={handleExportPdf}>
              <FileDown className="h-3.5 w-3.5 mr-1" /> PDF
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            <InfoRow label="Entidade Acreditação" value={lab.accreditation_body} />
            <InfoRow label="Código Acreditação" value={lab.accreditation_code} />
            <InfoRow label="Validade" value={(lab as any).accreditation_valid_until} />
            <InfoRow label="Âmbito" value={lab.scope} />
            <InfoRow label="Contacto" value={lab.contact_name} />
            <InfoRow label="Email" value={lab.contact_email} />
            <InfoRow label="Telefone" value={lab.contact_phone} />
          </div>

          {lab.notes && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Observações</p>
              <p className="text-sm mt-0.5 whitespace-pre-wrap">{lab.notes}</p>
            </div>
          )}

          <Separator />

          {/* KPIs */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">KPIs de Ensaios</p>
            <div className="grid grid-cols-4 gap-3">
              <div className="rounded-lg border border-border p-3 text-center">
                <p className="text-lg font-bold tabular-nums text-foreground">{stats.total}</p>
                <p className="text-[10px] text-muted-foreground">Total</p>
              </div>
              <div className="rounded-lg border border-border p-3 text-center">
                <p className="text-lg font-bold tabular-nums text-green-600">{stats.pass}</p>
                <p className="text-[10px] text-muted-foreground">Conformes</p>
              </div>
              <div className="rounded-lg border border-border p-3 text-center">
                <p className="text-lg font-bold tabular-nums text-red-600">{stats.fail}</p>
                <p className="text-[10px] text-muted-foreground">Não Conformes</p>
              </div>
              <div className="rounded-lg border border-border p-3 text-center">
                <p className="text-lg font-bold tabular-nums text-yellow-600">{stats.pending}</p>
                <p className="text-[10px] text-muted-foreground">Pendentes</p>
              </div>
            </div>
          </div>

          {/* Catalog types */}
          {catalogTypes.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Tipos de Ensaio (Catálogo)</p>
              <div className="flex flex-wrap gap-1.5">
                {catalogTypes.map((ct, i) => (
                  <Badge key={i} variant="outline" className="text-[10px]">{ct}</Badge>
                ))}
              </div>
            </div>
          )}

          {/* Recent tests */}
          {tests.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Ensaios Recentes</p>
              <div className="rounded-lg border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40">
                      <TableHead className="text-xs">Código</TableHead>
                      <TableHead className="text-xs">Tipo</TableHead>
                      <TableHead className="text-xs">Resultado</TableHead>
                      <TableHead className="text-xs">Data</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tests.slice(0, 10).map((t, i) => (
                      <TableRow key={i}>
                      <TableCell className="text-xs font-mono">{t.code ?? "—"}</TableCell>
                        <TableCell className="text-xs">{t.material ?? "—"}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn("text-[9px]",
                            t.result_status === "pass" && "border-green-500 text-green-700",
                            t.result_status === "fail" && "border-red-500 text-red-700",
                          )}>{t.result_status ?? "—"}</Badge>
                        </TableCell>
                        <TableCell className="text-xs">{t.date ?? "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────
export default function LaboratoriesPage() {
  const { t } = useTranslation();
  const { activeProject } = useProject();
  const { logoBase64 } = useProjectLogo();
  const { data: labs, loading, refetch } = useLaboratories();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Laboratory | null>(null);
  const [detailLab, setDetailLab] = useState<Laboratory | null>(null);
  const [search, setSearch] = useState("");

  if (!activeProject) return <NoProjectBanner />;

  const filtered = labs.filter((l) => {
    if (!search) return true;
    const q = search.toLowerCase();
    const name = l.suppliers?.name ?? "";
    return name.toLowerCase().includes(q) || (l.accreditation_code ?? "").toLowerCase().includes(q);
  });

  const expiredCount = labs.filter(l => {
    const v = (l as any).accreditation_valid_until;
    return v && differenceInDays(parseISO(v), new Date()) < 0;
  }).length;

  const handleDelete = async (lab: Laboratory) => {
    if (!activeProject) return;
    try {
      await laboratoryService.softDelete(lab.id, activeProject.id);
      toast({ title: t("common.delete") });
      refetch();
    } catch (err) {
      const info = classifySupabaseError(err);
      toast({ title: t(info.titleKey), description: info.raw, variant: "destructive" });
    }
  };

  const handleExportSingle = async (lab: Laboratory) => {
    const stats = await laboratoryService.getLabStats(activeProject.id, lab.supplier_id);
    const { data: testsData } = await (supabase as any).from("test_results")
      .select("code, material, result_status, date")
      .eq("project_id", activeProject.id)
      .eq("supplier_id", lab.supplier_id)
      .eq("is_deleted", false)
      .order("date", { ascending: false })
      .limit(20);
    exportLaboratoryPdf(lab, stats, (testsData ?? []) as LabTestRow[], logoBase64, activeProject.name);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Building2 className="h-6 w-6 text-muted-foreground" />
            {t("laboratories.title")}
          </h1>
          <p className="text-sm text-muted-foreground">{t("laboratories.subtitle")}</p>
        </div>
        <Button size="sm" className="h-8 gap-1.5" onClick={() => { setEditing(null); setDialogOpen(true); }}>
          <Plus className="h-3.5 w-3.5" />
          {t("laboratories.form.createBtn")}
        </Button>
      </div>

      {/* Expiration alert */}
      {expiredCount > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          <span>{expiredCount} laboratório(s) com acreditação expirada</span>
        </div>
      )}

      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <ModuleKPICard icon={Building2} label={t("laboratories.stats.total")} value={labs.length} />
        <ModuleKPICard icon={Award} label={t("laboratories.accreditationCode")} value={labs.filter(l => l.accreditation_code).length} />
        <ModuleKPICard icon={CheckCircle2} label={t("laboratories.stats.tests30d")} value={0} />
        <ModuleKPICard icon={FlaskConical} label={t("laboratories.stats.pass30d")} value={0} />
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder={t("common.search")} className="pl-8 h-8 text-sm" />
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full rounded" />)}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={Building2} subtitleKey="emptyState.tests.subtitle" />
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("laboratories.selectSupplier")}</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("laboratories.accreditationBody")}</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Validade</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("laboratories.scope")}</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("laboratories.contactName")}</TableHead>
                <TableHead className="w-32" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((lab) => (
                <TableRow key={lab.id} className="hover:bg-muted/20 transition-colors">
                  <TableCell className="text-sm font-medium text-foreground">{lab.suppliers?.name ?? "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {lab.accreditation_body && lab.accreditation_code
                      ? `${lab.accreditation_body} — ${lab.accreditation_code}`
                      : "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-muted-foreground">{(lab as any).accreditation_valid_until ?? "—"}</span>
                      <AccreditationBadge validUntil={(lab as any).accreditation_valid_until} />
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">{lab.scope ?? "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {lab.contact_name ?? lab.contact_email ?? "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary"
                        onClick={() => setDetailLab(lab)} title="Ver Ficha">
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary"
                        onClick={() => handleExportSingle(lab)} title="Exportar PDF">
                        <FileDown className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground"
                        onClick={() => { setEditing(lab); setDialogOpen(true); }}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDelete(lab)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <LabFormDialog open={dialogOpen} onOpenChange={setDialogOpen} lab={editing} onSuccess={refetch} />
      <LabDetailDialog open={!!detailLab} onOpenChange={(v) => { if (!v) setDetailLab(null); }} lab={detailLab} />
    </div>
  );
}
