import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useProject } from "@/contexts/ProjectContext";
import { useProjectRole } from "@/hooks/useProjectRole";
import { trainingService, type TrainingSession, type TrainingAttendee } from "@/lib/services/trainingService";
import { GraduationCap, Plus, FileText, Trash2, Eye, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/EmptyState";
import { NoProjectBanner } from "@/components/NoProjectBanner";
import { toast } from "@/hooks/use-toast";
import { classifySupabaseError } from "@/lib/utils/supabaseError";

const SESSION_TYPE_COLORS: Record<string, string> = {
  initial: "bg-primary/15 text-primary",
  new_personnel: "bg-chart-2/15 text-chart-2",
  specific: "bg-chart-4/15 text-chart-4",
  subcontractor: "bg-accent text-accent-foreground",
  other: "bg-muted text-muted-foreground",
};

const SESSION_TYPE_LABELS: Record<string, string> = {
  initial: "Formação Inicial",
  new_personnel: "Novos Colaboradores",
  specific: "Específica",
  subcontractor: "Subempreiteiro",
  other: "Outra",
};

interface AttendeeRow {
  name: string;
  role_function: string;
  company: string;
}

export default function TrainingPage() {
  const { t } = useTranslation();
  const { activeProject } = useProject();
  const { canCreate, canEdit } = useProjectRole();

  const [sessions, setSessions] = useState<TrainingSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [detailSession, setDetailSession] = useState<TrainingSession | null>(null);
  const [detailAttendees, setDetailAttendees] = useState<TrainingAttendee[]>([]);
  const [detailOpen, setDetailOpen] = useState(false);

  // Form state
  const [formType, setFormType] = useState("initial");
  const [formTitle, setFormTitle] = useState("");
  const [formDate, setFormDate] = useState(new Date().toISOString().slice(0, 10));
  const [formLocation, setFormLocation] = useState("");
  const [formStartTime, setFormStartTime] = useState("");
  const [formEndTime, setFormEndTime] = useState("");
  const [formTrainer, setFormTrainer] = useState("");
  const [formTopics, setFormTopics] = useState("");
  const [formAttendees, setFormAttendees] = useState<AttendeeRow[]>([{ name: "", role_function: "", company: "" }]);

  const fetchSessions = useCallback(async () => {
    if (!activeProject) return;
    setLoading(true);
    try {
      const data = await trainingService.listByProject(activeProject.id);
      setSessions(data);
    } catch {
      setSessions([]);
    } finally {
      setLoading(false);
    }
  }, [activeProject]);

  useEffect(() => { fetchSessions(); }, [fetchSessions]);

  if (!activeProject) return <NoProjectBanner />;

  const resetForm = () => {
    setFormType("initial");
    setFormTitle("");
    setFormDate(new Date().toISOString().slice(0, 10));
    setFormLocation("");
    setFormStartTime("");
    setFormEndTime("");
    setFormTrainer("");
    setFormTopics("");
    setFormAttendees([{ name: "", role_function: "", company: "" }]);
  };

  const handleCreate = async () => {
    if (!formTitle.trim()) {
      toast({ title: t("common.required", { defaultValue: "Campo obrigatório" }), variant: "destructive" });
      return;
    }
    const validAttendees = formAttendees.filter(a => a.name.trim());
    setSaving(true);
    try {
      await trainingService.create({
        project_id: activeProject.id,
        session_date: formDate,
        session_type: formType,
        title: formTitle.trim(),
        location: formLocation.trim() || undefined,
        start_time: formStartTime || undefined,
        end_time: formEndTime || undefined,
        trainer_name: formTrainer.trim() || undefined,
        topics: formTopics.trim() || undefined,
        attendees: validAttendees.map(a => ({
          name: a.name.trim(),
          role_function: a.role_function.trim() || undefined,
          company: a.company.trim() || undefined,
        })),
      });
      toast({ title: t("training.toast.created", { defaultValue: "Sessão de formação criada" }) });
      setDialogOpen(false);
      resetForm();
      fetchSessions();
    } catch (err) {
      const info = classifySupabaseError(err, t);
      toast({ title: info.title, description: info.description ?? info.raw, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t("common.confirmDelete"))) return;
    try {
      await trainingService.deleteSession(id);
      toast({ title: t("training.toast.deleted", { defaultValue: "Sessão eliminada" }) });
      fetchSessions();
    } catch (err) {
      const info = classifySupabaseError(err, t);
      toast({ title: info.title, variant: "destructive" });
    }
  };

  const handleViewDetail = async (session: TrainingSession) => {
    try {
      const { attendees } = await trainingService.getById(session.id);
      setDetailSession(session);
      setDetailAttendees(attendees);
      setDetailOpen(true);
    } catch {
      toast({ title: "Erro ao carregar detalhes", variant: "destructive" });
    }
  };

  const handleExportPdf = async (session: TrainingSession) => {
    try {
      const { attendees } = await trainingService.getById(session.id);
      trainingService.exportPdf(session, attendees, activeProject.name, logoBase64);
    } catch {
      toast({ title: "Erro ao exportar", variant: "destructive" });
    }
  };

  const addAttendeeRow = () => setFormAttendees(prev => [...prev, { name: "", role_function: "", company: "" }]);
  const removeAttendeeRow = (idx: number) => setFormAttendees(prev => prev.filter((_, i) => i !== idx));
  const updateAttendee = (idx: number, field: keyof AttendeeRow, value: string) => {
    setFormAttendees(prev => prev.map((a, i) => i === idx ? { ...a, [field]: value } : a));
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {t("training.title", { defaultValue: "Formação" })}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t("training.subtitle", { defaultValue: "Registo de sessões de formação e sensibilização" })}
          </p>
        </div>
        {canCreate && (
          <Button onClick={() => { resetForm(); setDialogOpen(true); }} size="sm" className="gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            {t("training.newSession", { defaultValue: "Nova Sessão" })}
          </Button>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: t("training.kpi.total", { defaultValue: "Total" }), value: sessions.length },
          { label: t("training.kpi.thisMonth", { defaultValue: "Este Mês" }), value: sessions.filter(s => new Date(s.session_date).getMonth() === new Date().getMonth() && new Date(s.session_date).getFullYear() === new Date().getFullYear()).length },
          { label: t("training.kpi.attendees", { defaultValue: "Formandos" }), value: sessions.reduce((s, ss) => s + ss.attendee_count, 0) },
          { label: t("training.kpi.types", { defaultValue: "Tipos" }), value: new Set(sessions.map(s => s.session_type)).size },
        ].map((k, i) => (
          <Card key={i} className="border-0 bg-card shadow-card">
            <CardContent className="p-4 text-center">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{k.label}</p>
              <p className="text-2xl font-black tabular-nums mt-1 text-foreground">{k.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      ) : sessions.length === 0 ? (
        <EmptyState icon={GraduationCap} subtitleKey="training.empty" ctaKey="training.newSession" onCta={() => { resetForm(); setDialogOpen(true); }} />
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("training.table.code", { defaultValue: "Código" })}</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("common.date")}</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("training.table.type", { defaultValue: "Tipo" })}</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("training.table.title", { defaultValue: "Título" })}</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("training.table.attendees", { defaultValue: "Formandos" })}</TableHead>
                <TableHead className="w-28" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {sessions.map(s => (
                <TableRow key={s.id} className="hover:bg-muted/20 transition-colors">
                  <TableCell className="font-mono text-xs text-muted-foreground">{s.code}</TableCell>
                  <TableCell className="text-sm">{new Date(s.session_date).toLocaleDateString("pt-PT")}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={`text-xs ${SESSION_TYPE_COLORS[s.session_type] ?? ""}`}>
                      {SESSION_TYPE_LABELS[s.session_type] ?? s.session_type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm font-medium text-foreground">{s.title}</TableCell>
                  <TableCell className="text-sm tabular-nums">{s.attendee_count}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleViewDetail(s)} title={t("common.view")}>
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleExportPdf(s)} title="PDF">
                        <FileText className="h-3.5 w-3.5" />
                      </Button>
                      {canEdit && (
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDelete(s.id)} title={t("common.delete")}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("training.newSession", { defaultValue: "Nova Sessão de Formação" })}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2 md:grid-cols-2">
            <div className="grid gap-1.5">
              <Label>{t("training.form.type", { defaultValue: "Tipo" })}</Label>
              <Select value={formType} onValueChange={setFormType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(SESSION_TYPE_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>{t("common.date")}</Label>
              <Input type="date" value={formDate} onChange={e => setFormDate(e.target.value)} />
            </div>
            <div className="grid gap-1.5 md:col-span-2">
              <Label>{t("training.form.title", { defaultValue: "Título" })} *</Label>
              <Input value={formTitle} onChange={e => setFormTitle(e.target.value)} placeholder="Ex: Sensibilização Ambiental" />
            </div>
            <div className="grid gap-1.5">
              <Label>{t("training.form.location", { defaultValue: "Local" })}</Label>
              <Input value={formLocation} onChange={e => setFormLocation(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>{t("training.form.startTime", { defaultValue: "Início" })}</Label>
                <Input type="time" value={formStartTime} onChange={e => setFormStartTime(e.target.value)} />
              </div>
              <div className="grid gap-1.5">
                <Label>{t("training.form.endTime", { defaultValue: "Fim" })}</Label>
                <Input type="time" value={formEndTime} onChange={e => setFormEndTime(e.target.value)} />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label>{t("training.form.trainer", { defaultValue: "Formador" })}</Label>
              <Input value={formTrainer} onChange={e => setFormTrainer(e.target.value)} />
            </div>
            <div className="grid gap-1.5 md:col-span-2">
              <Label>{t("training.form.topics", { defaultValue: "Conteúdos / Tópicos" })}</Label>
              <Textarea value={formTopics} onChange={e => setFormTopics(e.target.value)} rows={3} />
            </div>
          </div>

          {/* Attendees */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">{t("training.form.attendees", { defaultValue: "Formandos" })}</Label>
              <Button type="button" variant="outline" size="sm" onClick={addAttendeeRow} className="gap-1">
                <Plus className="h-3 w-3" /> {t("training.form.addAttendee", { defaultValue: "Adicionar" })}
              </Button>
            </div>
            {formAttendees.map((a, i) => (
              <div key={i} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-end">
                <Input placeholder={t("common.name")} value={a.name} onChange={e => updateAttendee(i, "name", e.target.value)} />
                <Input placeholder={t("training.form.function", { defaultValue: "Função" })} value={a.role_function} onChange={e => updateAttendee(i, "role_function", e.target.value)} />
                <Input placeholder={t("training.form.company", { defaultValue: "Empresa" })} value={a.company} onChange={e => updateAttendee(i, "company", e.target.value)} />
                <Button type="button" variant="ghost" size="icon" className="h-9 w-9" onClick={() => removeAttendeeRow(i)} disabled={formAttendees.length <= 1}>
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>{t("common.cancel")}</Button>
            <Button onClick={handleCreate} disabled={saving}>
              {saving ? t("common.loading") : t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{detailSession?.code} — {detailSession?.title}</DialogTitle>
          </DialogHeader>
          {detailSession && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase">{t("common.date")}</p>
                  <p>{new Date(detailSession.session_date).toLocaleDateString("pt-PT")}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase">{t("training.form.type", { defaultValue: "Tipo" })}</p>
                  <Badge variant="secondary" className={`text-xs ${SESSION_TYPE_COLORS[detailSession.session_type] ?? ""}`}>
                    {SESSION_TYPE_LABELS[detailSession.session_type] ?? detailSession.session_type}
                  </Badge>
                </div>
                {detailSession.location && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase">{t("training.form.location", { defaultValue: "Local" })}</p>
                    <p>{detailSession.location}</p>
                  </div>
                )}
                {detailSession.trainer_name && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase">{t("training.form.trainer", { defaultValue: "Formador" })}</p>
                    <p>{detailSession.trainer_name}</p>
                  </div>
                )}
              </div>
              {detailSession.topics && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">{t("training.form.topics", { defaultValue: "Tópicos" })}</p>
                  <p className="text-sm whitespace-pre-wrap bg-muted/30 p-3 rounded-lg">{detailSession.topics}</p>
                </div>
              )}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">
                  {t("training.form.attendees", { defaultValue: "Formandos" })} ({detailAttendees.length})
                </p>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>{t("common.name")}</TableHead>
                      <TableHead>{t("training.form.function", { defaultValue: "Função" })}</TableHead>
                      <TableHead>{t("training.form.company", { defaultValue: "Empresa" })}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detailAttendees.map((a, i) => (
                      <TableRow key={a.id}>
                        <TableCell className="text-xs text-muted-foreground">{i + 1}</TableCell>
                        <TableCell className="text-sm font-medium">{a.name}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{a.role_function ?? "—"}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{a.company ?? "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
