import { useState, useEffect, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useProject } from "@/contexts/ProjectContext";
import { useAuth } from "@/contexts/AuthContext";
import { useProjectRole } from "@/hooks/useProjectRole";
import { useProjectLogo } from "@/hooks/useProjectLogo";
import { supabase } from "@/integrations/supabase/client";
import { NoProjectBanner } from "@/components/NoProjectBanner";
import { AttachmentsPanel } from "@/components/attachments/AttachmentsPanel";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "@/lib/utils/toast";
import { cn } from "@/lib/utils";
import { fullPdfHeader } from "@/lib/services/pdfProjectHeader";
import jsPDF from "jspdf";
import {
  Users, Plus, Pencil, Trash2, Search, Download, ShieldCheck,
  GraduationCap, FileText, AlertTriangle, CheckCircle2, Clock,
  Building2, HardHat, Phone, Mail, Calendar, ChevronRight,
} from "lucide-react";

// ── Tipos ──────────────────────────────────────────────────────────────────

interface Worker {
  id: string; project_id: string; subcontractor_id: string | null;
  name: string; company: string | null; role_function: string | null;
  worker_number: string | null; status: string; has_safety_training: boolean;
  notes: string | null; birth_date: string | null; id_number: string | null;
  contact_phone: string | null; contact_email: string | null;
  entry_date: string | null; exit_date: string | null;
  discipline: string | null; ip_qual_status: string | null;
}

interface Qualification {
  id: string; worker_id: string | null; worker_name: string | null;
  qualification: string; cert_ref: string | null; issued_by: string | null;
  valid_from: string | null; valid_until: string | null;
  standard_ref: string | null; scope: string | null;
  ip_qualification_code: string | null; renewal_date: string | null;
  exam_entity: string | null; training_hours: number | null;
  qualification_type: string | null;
  worker?: { name: string; company: string | null; role_function: string | null };
}

interface TrainingSession {
  id: string; title: string; session_date: string; session_type: string;
  trainer: string | null; location: string | null; hours: number | null;
  attendees: { id: string; name: string; company: string | null; worker_id: string | null; signed: boolean }[];
}

// ── Constantes ─────────────────────────────────────────────────────────────

const QUAL_TYPES = [
  "IET77_DIR_TECNICO", "IET77_RESP_SEGURANCA", "IET77_RESP_TRABALHOS",
  "RGSXII_CHEFE_TRABALHOS", "RGSXII_CONTROLADOR_VI",
  "EN14730_ALUMINOTERMICO", "EN_ISO_9712_NII_FERROVIARIO", "TOPOGRAFO_CERTIFICADO",
];

const DISCIPLINES = [
  "terraplenagem", "via_ferrovia", "drenagem", "catenaria",
  "sinalizacao", "telecomunicacoes", "topografia", "betao", "geral",
];

const db = supabase as any;

// ── Utilitários ────────────────────────────────────────────────────────────

function certExpiry(dateStr: string | null): "ok" | "alert" | "urgent" | "expired" | "none" {
  if (!dateStr) return "none";
  const diff = Math.floor((new Date(dateStr).getTime() - Date.now()) / 86400000);
  if (diff < 0) return "expired";
  if (diff <= 30) return "urgent";
  if (diff <= 90) return "alert";
  return "ok";
}

function ExpiryBadge({ date, t }: { date: string | null; t: (k: string, o?: any) => string }) {
  const s = certExpiry(date);
  if (s === "none") return <span className="text-xs text-muted-foreground">—</span>;
  const cfg = {
    ok:      { cls: "bg-green-500/15 text-green-700 dark:text-green-400", label: t("team.expiry.ok") },
    alert:   { cls: "bg-amber-500/15 text-amber-700", label: date ? new Date(date).toLocaleDateString("pt-PT") : "" },
    urgent:  { cls: "bg-orange-500/15 text-orange-700", label: date ? new Date(date).toLocaleDateString("pt-PT") : "" },
    expired: { cls: "bg-destructive/15 text-destructive", label: t("team.expiry.expired") },
  }[s];
  return (
    <span className={cn("inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full", cfg.cls)}>
      {(s === "urgent" || s === "expired") && <AlertTriangle className="h-2.5 w-2.5" />}
      {cfg.label}
    </span>
  );
}

// ── Formulário Trabalhador ─────────────────────────────────────────────────

const EMPTY_WORKER_FORM = {
  name: "", company: "ASCH", role_function: "", worker_number: "",
  status: "active", has_safety_training: false, notes: "",
  birth_date: "", id_number: "", contact_phone: "", contact_email: "",
  entry_date: "", exit_date: "", discipline: "__none__", ip_qual_status: "__none__",
  subcontractor_id: "__none__",
};

interface WorkerFormDialogProps {
  open: boolean; onOpenChange: (v: boolean) => void;
  worker: Worker | null; subcontractors: { id: string; name: string }[];
  onSaved: () => void; projectId: string;
}

function WorkerFormDialog({ open, onOpenChange, worker, subcontractors, onSaved, projectId }: WorkerFormDialogProps) {
  const { t } = useTranslation();
  const [form, setForm] = useState(EMPTY_WORKER_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      if (worker) {
        setForm({
          name: worker.name,
          company: worker.company ?? "ASCH",
          role_function: worker.role_function ?? "",
          worker_number: worker.worker_number ?? "",
          status: worker.status,
          has_safety_training: worker.has_safety_training,
          notes: worker.notes ?? "",
          birth_date: worker.birth_date ?? "",
          id_number: worker.id_number ?? "",
          contact_phone: worker.contact_phone ?? "",
          contact_email: worker.contact_email ?? "",
          entry_date: worker.entry_date ?? "",
          exit_date: worker.exit_date ?? "",
          discipline: worker.discipline ?? "__none__",
          ip_qual_status: worker.ip_qual_status ?? "__none__",
          subcontractor_id: worker.subcontractor_id ?? "__none__",
        });
      } else {
        setForm(EMPTY_WORKER_FORM);
      }
    }
  }, [open, worker]);

  const f = (k: string, v: unknown) => setForm(p => ({ ...p, [k]: v }));

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const payload = {
        project_id: projectId,
        name: form.name.trim(),
        company: form.company.trim() || null,
        role_function: form.role_function.trim() || null,
        worker_number: form.worker_number.trim() || null,
        status: form.status,
        has_safety_training: form.has_safety_training,
        notes: form.notes.trim() || null,
        birth_date: form.birth_date || null,
        id_number: form.id_number.trim() || null,
        contact_phone: form.contact_phone.trim() || null,
        contact_email: form.contact_email.trim() || null,
        entry_date: form.entry_date || null,
        exit_date: form.exit_date || null,
        discipline: form.discipline === "__none__" ? null : form.discipline,
        ip_qual_status: form.ip_qual_status === "__none__" ? null : form.ip_qual_status,
        subcontractor_id: form.subcontractor_id === "__none__" ? null : form.subcontractor_id,
      };
      if (worker) {
        const { error } = await db.from("project_workers").update({ ...payload, updated_at: new Date().toISOString() }).eq("id", worker.id);
        if (error) throw error;
        toast({ title: t("team.toast.workerUpdated") });
      } else {
        const { error } = await db.from("project_workers").insert(payload);
        if (error) throw error;
        toast({ title: t("team.toast.workerCreated") });
      }
      onSaved(); onOpenChange(false);
    } catch (err: any) {
      toast({ title: t("team.toast.error"), description: err?.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HardHat className="h-4 w-4" />
            {worker ? t("team.workers.edit") : t("team.workers.add")}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Identificação */}
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{t("team.section.identification")}</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1">
              <Label className="text-xs">{t("team.workers.form.name")} *</Label>
              <Input value={form.name} onChange={e => f("name", e.target.value)} className="h-8 text-xs" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t("team.workers.form.company")}</Label>
              <Input value={form.company} onChange={e => f("company", e.target.value)} className="h-8 text-xs" placeholder="ASCH, Railworks..." />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t("team.workers.form.subcontractor")}</Label>
              <Select value={form.subcontractor_id} onValueChange={v => f("subcontractor_id", v)}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">{t("team.workers.form.asch")} (ASCH)</SelectItem>
                  {subcontractors.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t("team.workers.form.function")}</Label>
              <Input value={form.role_function} onChange={e => f("role_function", e.target.value)} className="h-8 text-xs" placeholder="Soldador, Topógrafo..." />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t("team.workers.form.discipline")}</Label>
              <Select value={form.discipline} onValueChange={v => f("discipline", v)}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">—</SelectItem>
                  {DISCIPLINES.map(d => <SelectItem key={d} value={d}>{t(`team.disciplines.${d}`, { defaultValue: d })}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t("team.workers.form.workerNumber")}</Label>
              <Input value={form.worker_number} onChange={e => f("worker_number", e.target.value)} className="h-8 text-xs" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t("team.workers.form.idNumber")}</Label>
              <Input value={form.id_number} onChange={e => f("id_number", e.target.value)} className="h-8 text-xs" placeholder="CC / BI / NIF" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t("team.workers.form.birthDate")}</Label>
              <Input type="date" value={form.birth_date} onChange={e => f("birth_date", e.target.value)} className="h-8 text-xs" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t("team.workers.form.contactPhone")}</Label>
              <Input value={form.contact_phone} onChange={e => f("contact_phone", e.target.value)} className="h-8 text-xs" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t("team.workers.form.contactEmail")}</Label>
              <Input type="email" value={form.contact_email} onChange={e => f("contact_email", e.target.value)} className="h-8 text-xs" />
            </div>
          </div>

          <Separator />

          {/* Presença em obra */}
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{t("team.section.presence")}</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">{t("team.workers.form.entryDate")}</Label>
              <Input type="date" value={form.entry_date} onChange={e => f("entry_date", e.target.value)} className="h-8 text-xs" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t("team.workers.form.exitDate")}</Label>
              <Input type="date" value={form.exit_date} onChange={e => f("exit_date", e.target.value)} className="h-8 text-xs" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t("team.workers.form.status")}</Label>
              <Select value={form.status} onValueChange={v => f("status", v)}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">{t("team.status.active")}</SelectItem>
                  <SelectItem value="inactive">{t("team.status.inactive")}</SelectItem>
                  <SelectItem value="suspended">{t("team.status.suspended")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t("team.workers.form.ipQualStatus")}</Label>
              <Select value={form.ip_qual_status} onValueChange={v => f("ip_qual_status", v)}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">—</SelectItem>
                  <SelectItem value="qualified">{t("team.ipStatus.qualified")}</SelectItem>
                  <SelectItem value="pending">{t("team.ipStatus.pending")}</SelectItem>
                  <SelectItem value="expired">{t("team.ipStatus.expired")}</SelectItem>
                  <SelectItem value="not_required">{t("team.ipStatus.not_required")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <Switch checked={form.has_safety_training} onCheckedChange={v => f("has_safety_training", v)} />
            <Label className="text-xs cursor-pointer">{t("team.workers.form.safetyTraining")}</Label>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">{t("common.notes")}</Label>
            <Textarea value={form.notes} onChange={e => f("notes", e.target.value)} rows={2} className="text-xs resize-none" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t("common.cancel")}</Button>
          <Button onClick={handleSave} disabled={saving || !form.name.trim()} className="gap-1.5">
            {saving ? <Clock className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
            {t("common.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Formulário Qualificação ─────────────────────────────────────────────────

const EMPTY_QUAL_FORM = {
  worker_id: "__none__", worker_name: "",
  qualification: "IET77_DIR_TECNICO", cert_ref: "", issued_by: "",
  valid_from: "", valid_until: "", standard_ref: "", scope: "",
  ip_qualification_code: "", renewal_date: "", exam_entity: "", training_hours: "",
};

interface QualFormDialogProps {
  open: boolean; onOpenChange: (v: boolean) => void;
  workers: Worker[]; projectId: string; onSaved: () => void;
  preselectedWorkerId?: string;
}

function QualFormDialog({ open, onOpenChange, workers, projectId, onSaved, preselectedWorkerId }: QualFormDialogProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [form, setForm] = useState(EMPTY_QUAL_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm({ ...EMPTY_QUAL_FORM, worker_id: preselectedWorkerId ?? "__none__" });
    }
  }, [open, preselectedWorkerId]);

  const f = (k: string, v: unknown) => setForm(p => ({ ...p, [k]: v }));

  const handleSave = async () => {
    if (form.worker_id === "__none__" && !form.worker_name.trim()) return;
    setSaving(true);
    try {
      const selectedWorker = workers.find(w => w.id === form.worker_id);
      const { error } = await db.from("worker_qualifications").insert({
        project_id: projectId,
        worker_id: form.worker_id === "__none__" ? null : form.worker_id,
        worker_name: selectedWorker?.name ?? form.worker_name.trim(),
        qualification: form.qualification,
        cert_ref: form.cert_ref.trim() || null,
        issued_by: form.issued_by.trim() || null,
        valid_from: form.valid_from || null,
        valid_until: form.valid_until || null,
        standard_ref: form.standard_ref.trim() || null,
        scope: form.scope.trim() || null,
        ip_qualification_code: form.ip_qualification_code.trim() || null,
        renewal_date: form.renewal_date || null,
        exam_entity: form.exam_entity.trim() || null,
        training_hours: form.training_hours ? Number(form.training_hours) : null,
        created_by: user?.id,
      });
      if (error) throw error;
      toast({ title: t("team.toast.qualCreated") });
      onSaved(); onOpenChange(false);
    } catch (err: any) {
      toast({ title: t("team.toast.error"), description: err?.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" />
            {t("team.qualifications.add")}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">{t("team.qualifications.worker")} *</Label>
            <Select value={form.worker_id} onValueChange={v => f("worker_id", v)}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder={t("team.qualifications.selectWorker")} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">{t("team.qualifications.externalWorker")}</SelectItem>
                {workers.map(w => (
                  <SelectItem key={w.id} value={w.id}>
                    {w.name} <span className="text-muted-foreground ml-1">({w.company ?? "ASCH"})</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.worker_id === "__none__" && (
              <Input value={form.worker_name} onChange={e => f("worker_name", e.target.value)}
                placeholder={t("team.qualifications.workerNamePlaceholder")} className="h-8 text-xs mt-1" />
            )}
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{t("team.qualifications.type")} *</Label>
            <Select value={form.qualification} onValueChange={v => f("qualification", v)}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {QUAL_TYPES.map(q => <SelectItem key={q} value={q}>{t(`subcontractors.qualifications.types.${q}`, { defaultValue: q })}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">{t("team.qualifications.certRef")}</Label>
              <Input value={form.cert_ref} onChange={e => f("cert_ref", e.target.value)} className="h-8 text-xs" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t("team.qualifications.issuedBy")}</Label>
              <Input value={form.issued_by} onChange={e => f("issued_by", e.target.value)} className="h-8 text-xs" placeholder="IP, ADIF..." />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t("team.qualifications.validFrom")}</Label>
              <Input type="date" value={form.valid_from} onChange={e => f("valid_from", e.target.value)} className="h-8 text-xs" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t("team.qualifications.validUntil")}</Label>
              <Input type="date" value={form.valid_until} onChange={e => f("valid_until", e.target.value)} className="h-8 text-xs" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t("subcontractors.qualifications.standardRef")}</Label>
              <Input value={form.standard_ref} onChange={e => f("standard_ref", e.target.value)} className="h-8 text-xs" placeholder="EN 14730-2, IP GR.PR.005..." />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t("subcontractors.qualifications.examEntity")}</Label>
              <Input value={form.exam_entity} onChange={e => f("exam_entity", e.target.value)} className="h-8 text-xs" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t("subcontractors.qualifications.ipCode")}</Label>
              <Input value={form.ip_qualification_code} onChange={e => f("ip_qualification_code", e.target.value)} className="h-8 text-xs" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t("subcontractors.qualifications.renewalDate")}</Label>
              <Input type="date" value={form.renewal_date} onChange={e => f("renewal_date", e.target.value)} className="h-8 text-xs" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t("subcontractors.qualifications.trainingHours")}</Label>
              <Input type="number" min={0} value={form.training_hours} onChange={e => f("training_hours", e.target.value)} className="h-8 text-xs" />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{t("subcontractors.qualifications.scope")}</Label>
            <Input value={form.scope} onChange={e => f("scope", e.target.value)} className="h-8 text-xs" placeholder="Ex: Soldadura aluminotérmica 60E1" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t("common.cancel")}</Button>
          <Button onClick={handleSave} disabled={saving || (form.worker_id === "__none__" && !form.worker_name.trim())} className="gap-1.5">
            {t("common.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Ficha do Trabalhador (Sheet lateral) ────────────────────────────────────

interface WorkerSheetProps {
  worker: Worker | null; open: boolean; onOpenChange: (v: boolean) => void;
  qualifications: Qualification[]; trainings: TrainingSession[];
  projectId: string; onAddQual: () => void;
}

function WorkerSheet({ worker, open, onOpenChange, qualifications, trainings, projectId, onAddQual }: WorkerSheetProps) {
  const { t } = useTranslation();
  if (!worker) return null;
  const workerQuals = qualifications.filter(q => q.worker_id === worker.id);
  const workerTrainings = trainings.filter(s => s.attendees.some(a => a.worker_id === worker.id));

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader className="pb-4">
          <SheetTitle className="flex items-center gap-2">
            <HardHat className="h-4 w-4" />
            {worker.name}
          </SheetTitle>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="secondary" className="text-xs">{worker.company ?? "ASCH"}</Badge>
            {worker.role_function && <Badge variant="outline" className="text-xs">{worker.role_function}</Badge>}
            <Badge className={cn("text-xs", worker.status === "active" ? "bg-green-500/15 text-green-700" : "bg-muted text-muted-foreground")}>
              {t(`team.status.${worker.status}`)}
            </Badge>
          </div>
        </SheetHeader>

        <Tabs defaultValue="info" className="space-y-3">
          <TabsList className="h-8 text-xs">
            <TabsTrigger value="info" className="text-xs">{t("team.detail.info")}</TabsTrigger>
            <TabsTrigger value="quals" className="text-xs gap-1">
              {t("team.detail.qualifications")}
              {workerQuals.length > 0 && <span className="text-[9px] bg-primary/15 text-primary px-1 rounded-full">{workerQuals.length}</span>}
            </TabsTrigger>
            <TabsTrigger value="trainings" className="text-xs gap-1">
              {t("team.detail.trainings")}
              {workerTrainings.length > 0 && <span className="text-[9px] bg-primary/15 text-primary px-1 rounded-full">{workerTrainings.length}</span>}
            </TabsTrigger>
            <TabsTrigger value="docs" className="text-xs">{t("team.detail.documents")}</TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="space-y-3 mt-2">
            <div className="grid grid-cols-2 gap-2 text-xs">
              {[
                [t("team.workers.form.workerNumber"), worker.worker_number],
                [t("team.workers.form.idNumber"), worker.id_number],
                [t("team.workers.form.birthDate"), worker.birth_date ? new Date(worker.birth_date).toLocaleDateString("pt-PT") : null],
                [t("team.workers.form.discipline"), worker.discipline ? t(`team.disciplines.${worker.discipline}`, { defaultValue: worker.discipline }) : null],
                [t("team.workers.form.entryDate"), worker.entry_date ? new Date(worker.entry_date).toLocaleDateString("pt-PT") : null],
                [t("team.workers.form.exitDate"), worker.exit_date ? new Date(worker.exit_date).toLocaleDateString("pt-PT") : null],
              ].map(([label, val], i) => val ? (
                <div key={i} className="space-y-0.5">
                  <p className="text-[10px] text-muted-foreground">{label}</p>
                  <p className="font-medium">{val}</p>
                </div>
              ) : null)}
              {worker.contact_phone && (
                <div className="space-y-0.5">
                  <p className="text-[10px] text-muted-foreground flex items-center gap-1"><Phone className="h-2.5 w-2.5" />{t("team.workers.form.contactPhone")}</p>
                  <p className="font-medium">{worker.contact_phone}</p>
                </div>
              )}
              {worker.contact_email && (
                <div className="space-y-0.5 col-span-2">
                  <p className="text-[10px] text-muted-foreground flex items-center gap-1"><Mail className="h-2.5 w-2.5" />{t("team.workers.form.contactEmail")}</p>
                  <p className="font-medium">{worker.contact_email}</p>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/40 border border-border/50">
              {worker.has_safety_training
                ? <CheckCircle2 className="h-4 w-4 text-green-500" />
                : <AlertTriangle className="h-4 w-4 text-amber-500" />}
              <span className="text-xs">{t("team.workers.form.safetyTraining")}</span>
            </div>
            {worker.notes && <p className="text-xs text-muted-foreground bg-muted/30 rounded p-2">{worker.notes}</p>}
          </TabsContent>

          <TabsContent value="quals" className="space-y-2 mt-2">
            <Button size="sm" variant="outline" className="gap-1.5 w-full" onClick={onAddQual}>
              <Plus className="h-3.5 w-3.5" />{t("team.qualifications.add")}
            </Button>
            {workerQuals.length === 0
              ? <p className="text-xs text-muted-foreground text-center py-4">{t("team.qualifications.empty")}</p>
              : workerQuals.map(q => (
                <div key={q.id} className="rounded-lg border border-border p-3 space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs font-semibold">{t(`subcontractors.qualifications.types.${q.qualification}`, { defaultValue: q.qualification })}</p>
                    <ExpiryBadge date={q.valid_until} t={t} />
                  </div>
                  <div className="grid grid-cols-2 gap-1 text-[10px] text-muted-foreground">
                    {q.cert_ref && <span>Ref: {q.cert_ref}</span>}
                    {q.issued_by && <span>{t("team.qualifications.issuedBy")}: {q.issued_by}</span>}
                    {q.valid_until && <span>{t("team.qualifications.validUntil")}: {new Date(q.valid_until).toLocaleDateString("pt-PT")}</span>}
                    {q.ip_qualification_code && <span>IP: {q.ip_qualification_code}</span>}
                    {q.standard_ref && <span className="col-span-2">Norma: {q.standard_ref}</span>}
                  </div>
                </div>
              ))}
          </TabsContent>

          <TabsContent value="trainings" className="space-y-2 mt-2">
            {workerTrainings.length === 0
              ? <p className="text-xs text-muted-foreground text-center py-4">{t("team.trainings.empty")}</p>
              : workerTrainings.map(s => (
                <div key={s.id} className="rounded-lg border border-border p-3 space-y-1">
                  <p className="text-xs font-semibold">{s.title}</p>
                  <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(s.session_date).toLocaleDateString("pt-PT")}</span>
                    {s.hours && <span>{s.hours}h</span>}
                    {s.location && <span>{s.location}</span>}
                  </div>
                </div>
              ))}
          </TabsContent>

          <TabsContent value="docs" className="mt-2">
            <AttachmentsPanel projectId={projectId} entityType="project_workers" entityId={worker.id} />
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}

// ── Página Principal ────────────────────────────────────────────────────────

export default function TeamPage() {
  const { t } = useTranslation();
  const { activeProject } = useProject();
  const { canCreate } = useProjectRole();
  const { logoBase64 } = useProjectLogo();

  const [workers, setWorkers] = useState<Worker[]>([]);
  const [qualifications, setQualifications] = useState<Qualification[]>([]);
  const [trainings, setTrainings] = useState<TrainingSession[]>([]);
  const [subcontractors, setSubcontractors] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialogs — todos fora de TabsContent
  const [workerDialogOpen, setWorkerDialogOpen] = useState(false);
  const [editingWorker, setEditingWorker] = useState<Worker | null>(null);
  const [qualDialogOpen, setQualDialogOpen] = useState(false);
  const [preselectedWorkerId, setPreselectedWorkerId] = useState<string | undefined>();
  const [deleteWorker, setDeleteWorker] = useState<Worker | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [sheetWorker, setSheetWorker] = useState<Worker | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  // Filtros
  const [search, setSearch] = useState("");
  const [filterCompany, setFilterCompany] = useState("__all__");
  const [filterStatus, setFilterStatus] = useState("active");
  const [filterDiscipline, setFilterDiscipline] = useState("__all__");
  const [qualSearch, setQualSearch] = useState("");
  const [filterExpiry, setFilterExpiry] = useState("__all__");

  const pid = activeProject?.id ?? "";

  const fetchAll = useCallback(async () => {
    if (!pid) return;
    setLoading(true);
    try {
      const [wRes, qRes, sRes, tsRes] = await Promise.all([
        db.from("project_workers").select("*").eq("project_id", pid).order("name"),
        db.from("worker_qualifications").select("*, worker:worker_id(name,company,role_function)").eq("project_id", pid).order("created_at", { ascending: false }),
        db.from("subcontractors").select("id, name").eq("project_id", pid).eq("is_deleted", false).order("name"),
        db.from("training_sessions").select("*, attendees:training_attendees(id,name,company,worker_id,signed)").eq("project_id", pid).order("session_date", { ascending: false }),
      ]);
      setWorkers((wRes.data ?? []) as Worker[]);
      setQualifications((qRes.data ?? []) as Qualification[]);
      setSubcontractors((sRes.data ?? []) as { id: string; name: string }[]);
      setTrainings((tsRes.data ?? []) as TrainingSession[]);
    } finally { setLoading(false); }
  }, [pid]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Filtros workers
  const filteredWorkers = useMemo(() => {
    return workers.filter(w => {
      if (filterStatus !== "__all__" && w.status !== filterStatus) return false;
      if (filterCompany !== "__all__" && (w.company ?? "ASCH") !== filterCompany) return false;
      if (filterDiscipline !== "__all__" && w.discipline !== filterDiscipline) return false;
      if (search) {
        const q = search.toLowerCase();
        return w.name.toLowerCase().includes(q) || (w.role_function ?? "").toLowerCase().includes(q) || (w.company ?? "").toLowerCase().includes(q);
      }
      return true;
    });
  }, [workers, filterStatus, filterCompany, filterDiscipline, search]);

  // Filtros qualificações
  const filteredQuals = useMemo(() => {
    return qualifications.filter(q => {
      if (filterExpiry === "expiring") return ["alert", "urgent"].includes(certExpiry(q.valid_until));
      if (filterExpiry === "expired") return certExpiry(q.valid_until) === "expired";
      if (qualSearch) {
        const s = qualSearch.toLowerCase();
        return (q.worker_name ?? "").toLowerCase().includes(s)
          || (q.cert_ref ?? "").toLowerCase().includes(s)
          || (q.standard_ref ?? "").toLowerCase().includes(s);
      }
      return true;
    });
  }, [qualifications, filterExpiry, qualSearch]);

  // KPIs
  const kpis = useMemo(() => ({
    total: workers.length,
    active: workers.filter(w => w.status === "active").length,
    withSafety: workers.filter(w => w.has_safety_training).length,
    expiringQuals: qualifications.filter(q => ["alert", "urgent", "expired"].includes(certExpiry(q.valid_until))).length,
    companies: [...new Set(workers.map(w => w.company ?? "ASCH"))].length,
  }), [workers, qualifications]);

  // Empresas únicas para filtro
  const companies = useMemo(() => [...new Set(workers.map(w => w.company ?? "ASCH"))].sort(), [workers]);

  const handleOpenEdit = (w: Worker) => { setEditingWorker(w); setWorkerDialogOpen(true); };
  const handleAddQualForWorker = (workerId: string) => { setPreselectedWorkerId(workerId); setSheetOpen(false); setQualDialogOpen(true); };

  const handleDelete = async () => {
    if (!deleteWorker) return;
    setDeleting(true);
    try {
      await db.from("project_workers").delete().eq("id", deleteWorker.id);
      toast({ title: t("team.toast.workerDeleted") });
      setDeleteWorker(null); fetchAll();
    } catch (err: any) {
      toast({ title: t("team.toast.error"), description: err?.message, variant: "destructive" });
    } finally { setDeleting(false); }
  };

  // ── PDF export (IP GR.PR.005) ─────────────────────────────────────────
  const handleExportPdf = () => {
    if (!activeProject) return;
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const date = new Date().toLocaleDateString("pt-PT");
    const projectName = activeProject.name;
    const pw = doc.internal.pageSize.getWidth();

    let html = `<div style="font-family:Arial,sans-serif;font-size:10px;padding:8px">`;
    html += fullPdfHeader(logoBase64, projectName, "REG-PESSOAL", "0", date);
    html += `<h2 style="font-size:13px;margin:8px 0 4px">${t("team.pdf.title")}</h2>`;
    html += `<table style="width:100%;border-collapse:collapse;font-size:8px">
      <thead><tr style="background:#1e3a5f;color:#fff">
        <th style="padding:4px;text-align:left">${t("team.workers.col.name")}</th>
        <th style="padding:4px">${t("team.workers.col.company")}</th>
        <th style="padding:4px">${t("team.workers.col.function")}</th>
        <th style="padding:4px">${t("team.workers.form.discipline")}</th>
        <th style="padding:4px">${t("team.workers.form.status")}</th>
        <th style="padding:4px">${t("team.workers.form.entryDate")}</th>
        <th style="padding:4px">${t("team.workers.form.safetyTraining")}</th>
        <th style="padding:4px">${t("team.pdf.quals")}</th>
        <th style="padding:4px">${t("team.pdf.ipStatus")}</th>
      </tr></thead><tbody>`;

    filteredWorkers.forEach((w, i) => {
      const wQuals = qualifications.filter(q => q.worker_id === w.id);
      const qualSummary = wQuals.map(q => {
        const type = q.qualification.replace(/_/g, " ");
        const exp = q.valid_until ? `(válido até ${new Date(q.valid_until).toLocaleDateString("pt-PT")})` : "";
        return `${type} ${exp}`;
      }).join("; ") || "—";
      const bg = i % 2 === 0 ? "#fff" : "#f5f7fa";
      html += `<tr style="background:${bg}">
        <td style="padding:3px;border:1px solid #ddd;font-weight:bold">${w.name}</td>
        <td style="padding:3px;border:1px solid #ddd;text-align:center">${w.company ?? "ASCH"}</td>
        <td style="padding:3px;border:1px solid #ddd">${w.role_function ?? "—"}</td>
        <td style="padding:3px;border:1px solid #ddd;text-align:center">${w.discipline ? t(`team.disciplines.${w.discipline}`, { defaultValue: w.discipline }) : "—"}</td>
        <td style="padding:3px;border:1px solid #ddd;text-align:center">${t(`team.status.${w.status}`)}</td>
        <td style="padding:3px;border:1px solid #ddd;text-align:center">${w.entry_date ? new Date(w.entry_date).toLocaleDateString("pt-PT") : "—"}</td>
        <td style="padding:3px;border:1px solid #ddd;text-align:center">${w.has_safety_training ? "✓" : "✗"}</td>
        <td style="padding:3px;border:1px solid #ddd;font-size:7px">${qualSummary}</td>
        <td style="padding:3px;border:1px solid #ddd;text-align:center">${w.ip_qual_status ? t(`team.ipStatus.${w.ip_qual_status}`) : "—"}</td>
      </tr>`;
    });
    html += `</tbody></table></div>`;

    doc.html(html, {
      callback: d => d.save(`REG-PESSOAL-${activeProject.code}-${date.replace(/\//g, "-")}.pdf`),
      x: 5, y: 5, width: pw - 10, windowWidth: 1100,
    });
  };

  if (!activeProject) return <NoProjectBanner />;

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      <PageHeader
        title={t("team.title")}
        subtitle={t("team.subtitle")}
        icon={Users}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-1.5" onClick={handleExportPdf}>
              <Download className="h-3.5 w-3.5" />{t("team.pdf.export")}
            </Button>
            {canCreate && (
              <Button size="sm" className="gap-1.5" onClick={() => { setEditingWorker(null); setWorkerDialogOpen(true); }}>
                <Plus className="h-3.5 w-3.5" />{t("team.workers.add")}
              </Button>
            )}
          </div>
        }
      />

      {/* KPIs */}
      {!loading && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          {[
            { label: t("team.kpi.total"), value: kpis.total, icon: Users, color: "" },
            { label: t("team.kpi.active"), value: kpis.active, icon: CheckCircle2, color: "text-green-600" },
            { label: t("team.kpi.safetyTrained"), value: kpis.withSafety, icon: ShieldCheck, color: "text-primary" },
            { label: t("team.kpi.companies"), value: kpis.companies, icon: Building2, color: "" },
            { label: t("team.kpi.expiringCerts"), value: kpis.expiringQuals, icon: AlertTriangle, color: kpis.expiringQuals > 0 ? "text-amber-500" : "" },
          ].map(({ label, value, icon: Icon, color }) => (
            <Card key={label} className="border bg-card">
              <CardContent className="p-3 flex items-center gap-2">
                <Icon className={cn("h-4 w-4 text-muted-foreground flex-shrink-0", color)} />
                <div>
                  <p className="text-[10px] text-muted-foreground">{label}</p>
                  <p className={cn("text-lg font-bold", color)}>{value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Tabs defaultValue="workers">
        <TabsList className="h-9 bg-muted/50 rounded-xl border border-border/40 gap-0.5 p-1">
          <TabsTrigger value="workers" className="gap-1.5 text-xs rounded-lg">
            <HardHat className="h-3.5 w-3.5" />{t("team.tab.workers")}
            <span className="text-[9px] bg-primary/15 text-primary px-1.5 rounded-full font-bold">{workers.length}</span>
          </TabsTrigger>
          <TabsTrigger value="qualifications" className="gap-1.5 text-xs rounded-lg">
            <ShieldCheck className="h-3.5 w-3.5" />{t("team.tab.qualifications")}
            {kpis.expiringQuals > 0 && <span className="text-[9px] bg-amber-500/15 text-amber-600 px-1.5 rounded-full font-bold">{kpis.expiringQuals}</span>}
          </TabsTrigger>
          <TabsTrigger value="trainings" className="gap-1.5 text-xs rounded-lg">
            <GraduationCap className="h-3.5 w-3.5" />{t("team.tab.trainings")}
          </TabsTrigger>
        </TabsList>

        {/* ── Tab Pessoal ──────────────────────────────────────────────── */}
        <TabsContent value="workers" className="mt-4 space-y-3">
          <div className="flex flex-wrap gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder={t("team.workers.search")} className="pl-8 h-8 text-xs" />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="h-8 text-xs w-[120px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">{t("team.filter.allStatus")}</SelectItem>
                <SelectItem value="active">{t("team.status.active")}</SelectItem>
                <SelectItem value="inactive">{t("team.status.inactive")}</SelectItem>
                <SelectItem value="suspended">{t("team.status.suspended")}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterCompany} onValueChange={setFilterCompany}>
              <SelectTrigger className="h-8 text-xs w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">{t("team.filter.allCompanies")}</SelectItem>
                {companies.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterDiscipline} onValueChange={setFilterDiscipline}>
              <SelectTrigger className="h-8 text-xs w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">{t("team.filter.allDisciplines")}</SelectItem>
                {DISCIPLINES.map(d => <SelectItem key={d} value={d}>{t(`team.disciplines.${d}`, { defaultValue: d })}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="space-y-2">{[1,2,3,4].map(i => <Skeleton key={i} className="h-12 rounded-lg" />)}</div>
          ) : filteredWorkers.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">{t("team.workers.empty")}</div>
          ) : (
            <Card className="border bg-card">
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">{t("team.workers.col.name")}</TableHead>
                      <TableHead className="text-xs">{t("team.workers.col.company")}</TableHead>
                      <TableHead className="text-xs">{t("team.workers.col.function")}</TableHead>
                      <TableHead className="text-xs">{t("team.workers.form.discipline")}</TableHead>
                      <TableHead className="text-xs">{t("team.workers.form.status")}</TableHead>
                      <TableHead className="text-xs">{t("team.kpi.safetyTrained")}</TableHead>
                      <TableHead className="text-xs">{t("team.tab.qualifications")}</TableHead>
                      <TableHead className="w-[80px]" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredWorkers.map(w => {
                      const wQuals = qualifications.filter(q => q.worker_id === w.id);
                      const hasExpiring = wQuals.some(q => ["alert","urgent","expired"].includes(certExpiry(q.valid_until)));
                      return (
                        <TableRow key={w.id} className="cursor-pointer hover:bg-muted/20"
                          onClick={() => { setSheetWorker(w); setSheetOpen(true); }}>
                          <TableCell className="text-xs font-semibold">{w.name}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{w.company ?? "ASCH"}</TableCell>
                          <TableCell className="text-xs">{w.role_function ?? "—"}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {w.discipline ? t(`team.disciplines.${w.discipline}`, { defaultValue: w.discipline }) : "—"}
                          </TableCell>
                          <TableCell>
                            <Badge className={cn("text-[10px]", w.status === "active" ? "bg-green-500/15 text-green-700" : "bg-muted text-muted-foreground")}>
                              {t(`team.status.${w.status}`)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {w.has_safety_training
                              ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                              : <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              {wQuals.length > 0 && (
                                <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-semibold">{wQuals.length}</span>
                              )}
                              {hasExpiring && <AlertTriangle className="h-3 w-3 text-amber-500" />}
                            </div>
                          </TableCell>
                          <TableCell onClick={e => e.stopPropagation()}>
                            <div className="flex items-center gap-0.5">
                              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleOpenEdit(w)}>
                                <Pencil className="h-3 w-3" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive/70 hover:text-destructive" onClick={() => setDeleteWorker(w)}>
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ── Tab Qualificações ─────────────────────────────────────────── */}
        <TabsContent value="qualifications" className="mt-4 space-y-3">
          <div className="flex flex-wrap gap-2">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input value={qualSearch} onChange={e => setQualSearch(e.target.value)} placeholder={t("team.qualifications.search")} className="pl-8 h-8 text-xs" />
            </div>
            <Select value={filterExpiry} onValueChange={setFilterExpiry}>
              <SelectTrigger className="h-8 text-xs w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">{t("team.filter.allExpiry")}</SelectItem>
                <SelectItem value="expiring">{t("team.filter.expiringSoon")}</SelectItem>
                <SelectItem value="expired">{t("team.expiry.expired")}</SelectItem>
              </SelectContent>
            </Select>
            {canCreate && (
              <Button size="sm" className="gap-1.5 h-8" onClick={() => { setPreselectedWorkerId(undefined); setQualDialogOpen(true); }}>
                <Plus className="h-3.5 w-3.5" />{t("team.qualifications.add")}
              </Button>
            )}
          </div>

          {loading ? (
            <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-14 rounded-lg" />)}</div>
          ) : filteredQuals.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">{t("team.qualifications.empty")}</div>
          ) : (
            <Card className="border bg-card">
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">{t("team.qualifications.worker")}</TableHead>
                      <TableHead className="text-xs">{t("team.qualifications.type")}</TableHead>
                      <TableHead className="text-xs">{t("team.qualifications.certRef")}</TableHead>
                      <TableHead className="text-xs">{t("team.qualifications.issuedBy")}</TableHead>
                      <TableHead className="text-xs">{t("subcontractors.qualifications.standardRef")}</TableHead>
                      <TableHead className="text-xs">{t("team.qualifications.validUntil")}</TableHead>
                      <TableHead className="text-xs">{t("team.qualifications.status")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredQuals.map(q => (
                      <TableRow key={q.id}>
                        <TableCell className="text-xs font-medium">
                          {(q as any).worker?.name ?? q.worker_name ?? "—"}
                          {(q as any).worker?.company && (
                            <span className="text-[10px] text-muted-foreground ml-1">({(q as any).worker.company})</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs">
                          {t(`subcontractors.qualifications.types.${q.qualification}`, { defaultValue: q.qualification })}
                        </TableCell>
                        <TableCell className="text-xs font-mono text-muted-foreground">{q.cert_ref ?? "—"}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{q.issued_by ?? "—"}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{q.standard_ref ?? "—"}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {q.valid_until ? new Date(q.valid_until).toLocaleDateString("pt-PT") : "—"}
                        </TableCell>
                        <TableCell><ExpiryBadge date={q.valid_until} t={t} /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ── Tab Formações ──────────────────────────────────────────────── */}
        <TabsContent value="trainings" className="mt-4 space-y-3">
          {loading ? (
            <div className="space-y-2">{[1,2].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
          ) : trainings.length === 0 ? (
            <div className="text-center py-12">
              <GraduationCap className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">{t("team.trainings.empty")}</p>
              <p className="text-xs text-muted-foreground/60 mt-1">{t("team.trainings.emptyHint")}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {trainings.map(s => (
                <div key={s.id} className="rounded-xl border border-border bg-card p-4 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold">{s.title}</p>
                      <div className="flex items-center gap-3 text-[10px] text-muted-foreground mt-0.5">
                        <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(s.session_date).toLocaleDateString("pt-PT")}</span>
                        {s.hours && <span>{s.hours}h</span>}
                        {s.trainer && <span>{s.trainer}</span>}
                        {s.location && <span>{s.location}</span>}
                      </div>
                    </div>
                    <Badge variant="outline" className="text-[10px]">{t(`training.types.${s.session_type}`, { defaultValue: s.session_type })}</Badge>
                  </div>
                  {s.attendees.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {s.attendees.map(a => (
                        <span key={a.id} className={cn("text-[10px] px-1.5 py-0.5 rounded-md border", a.signed ? "border-green-500/30 bg-green-500/10 text-green-700" : "border-border bg-muted/50 text-muted-foreground")}>
                          {a.signed && <CheckCircle2 className="h-2.5 w-2.5 inline mr-0.5" />}{a.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ── Dialogs — fora de todos os TabsContent ──────────────────────── */}
      <WorkerFormDialog
        open={workerDialogOpen} onOpenChange={setWorkerDialogOpen}
        worker={editingWorker} subcontractors={subcontractors}
        onSaved={fetchAll} projectId={pid}
      />

      <QualFormDialog
        open={qualDialogOpen} onOpenChange={setQualDialogOpen}
        workers={workers} projectId={pid} onSaved={fetchAll}
        preselectedWorkerId={preselectedWorkerId}
      />

      <WorkerSheet
        worker={sheetWorker} open={sheetOpen} onOpenChange={setSheetOpen}
        qualifications={qualifications} trainings={trainings}
        projectId={pid} onAddQual={() => { if (sheetWorker) handleAddQualForWorker(sheetWorker.id); }}
      />

      <AlertDialog open={!!deleteWorker} onOpenChange={v => { if (!v) setDeleteWorker(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("team.workers.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("team.workers.deleteDesc", { name: deleteWorker?.name ?? "" })}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
