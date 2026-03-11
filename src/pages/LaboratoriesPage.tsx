import { useState, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useProject } from "@/contexts/ProjectContext";
import { useLaboratories } from "@/hooks/useLaboratories";
import { laboratoryService, type Laboratory, type LaboratoryInput } from "@/lib/services/laboratoryService";
import { classifySupabaseError } from "@/lib/utils/supabaseError";
import { toast } from "@/hooks/use-toast";
import { ModuleKPICard } from "@/components/ModuleKPICard";
import { EmptyState } from "@/components/EmptyState";
import { NoProjectBanner } from "@/components/NoProjectBanner";
import { PageHeader } from "@/components/ui/page-header";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  FlaskConical, Plus, Pencil, Trash2, Search, Loader2,
  Building2, Award, CheckCircle2, XCircle, Clock,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

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
      setContactName(lab.contact_name ?? ""); setContactEmail(lab.contact_email ?? "");
      setContactPhone(lab.contact_phone ?? ""); setNotes(lab.notes ?? "");
    } else {
      setSupplierId(""); setAccBody(""); setAccCode(""); setScope("");
      setContactName(""); setContactEmail(""); setContactPhone(""); setNotes("");
    }
  }, [lab, open]);

  const handleSave = async () => {
    if (!activeProject || !supplierId) return;
    setSaving(true);
    try {
      const input: LaboratoryInput = {
        project_id: activeProject.id, supplier_id: supplierId,
        accreditation_body: accBody || undefined, accreditation_code: accCode || undefined,
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

// ─── Page ────────────────────────────────────────────────────────────────────
export default function LaboratoriesPage() {
  const { t } = useTranslation();
  const { activeProject } = useProject();
  const { data: labs, loading, refetch } = useLaboratories();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Laboratory | null>(null);
  const [search, setSearch] = useState("");

  if (!activeProject) return <NoProjectBanner />;

  const filtered = labs.filter((l) => {
    if (!search) return true;
    const q = search.toLowerCase();
    const name = l.suppliers?.name ?? "";
    return name.toLowerCase().includes(q) || (l.accreditation_code ?? "").toLowerCase().includes(q);
  });

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

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Building2 className="h-6 w-6 text-muted-foreground" />
            Laboratórios
          </h1>
          <p className="text-sm text-muted-foreground">Gestão de laboratórios acreditados do projeto</p>
        </div>
        <Button size="sm" className="h-8 gap-1.5" onClick={() => { setEditing(null); setDialogOpen(true); }}>
          <Plus className="h-3.5 w-3.5" />
          {t("common.create")}
        </Button>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <ModuleKPICard icon={Building2} label="Laboratórios Ativos" value={labs.length} />
        <ModuleKPICard icon={Award} label="Acreditados" value={labs.filter(l => l.accreditation_code).length} />
        <ModuleKPICard icon={CheckCircle2} label="Com ensaios" value={0} />
        <ModuleKPICard icon={FlaskConical} label="Total Ensaios" value={0} />
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
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Fornecedor</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Acreditação</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Âmbito</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Contacto</TableHead>
                <TableHead className="w-24" />
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
                  <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">{lab.scope ?? "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {lab.contact_name ?? lab.contact_email ?? "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
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
    </div>
  );
}
