import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useProject } from "@/contexts/ProjectContext";
import { useProjectRole } from "@/hooks/useProjectRole";
import { useProjectLogo } from "@/hooks/useProjectLogo";
import { trainingService, type TrainingSession, type TrainingAttendee } from "@/lib/services/trainingService";
import { projectWorkerService, type ProjectWorker } from "@/lib/services/projectWorkerService";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { GraduationCap, Plus, FileText, Trash2, Eye, X, Users, AlertTriangle, BarChart2, Pencil } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/EmptyState";
import { NoProjectBanner } from "@/components/NoProjectBanner";
import { AttachmentsPanel } from "@/components/attachments/AttachmentsPanel";
import { toast } from "@/lib/utils/toast";
import { classifySupabaseError } from "@/lib/utils/supabaseError";

const SESSION_TYPE_COLORS: Record<string, string> = {
  initial: "bg-primary/15 text-primary",
  new_personnel: "bg-chart-2/15 text-chart-2",
  specific: "bg-chart-4/15 text-chart-4",
  subcontractor: "bg-accent text-accent-foreground",
  other: "bg-muted text-muted-foreground",
};

const SESSION_TYPE_KEYS: Record<string, string> = {
  initial: "training.sessionTypes.initial",
  new_personnel: "training.sessionTypes.new_personnel",
  specific: "training.sessionTypes.specific",
  subcontractor: "training.sessionTypes.subcontractor",
  other: "training.sessionTypes.other",
};

interface AttendeeRow {
  name: string;
  role_function: string;
  company: string;
}

  // Validity helper
  function getSessionValidity(sessionDate: string) {
    const validUntil = new Date(sessionDate);
    validUntil.setFullYear(validUntil.getFullYear() + 1);
    const now = new Date();
    const daysLeft = Math.ceil((validUntil.getTime() - now.getTime()) / 86400000);
    if (daysLeft < 0) return { status: "expired" as const, daysLeft, validUntil };
    if (daysLeft <= 30) return { status: "expiring" as const, daysLeft, validUntil };
    return { status: "valid" as const, daysLeft, validUntil };
  }

export default function TrainingPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { activeProject } = useProject();
  const { canCreate, canEdit } = useProjectRole();
  const { logoBase64 } = useProjectLogo();

  const [sessions, setSessions] = useState<TrainingSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("sessions");
  const [detailSession, setDetailSession] = useState<TrainingSession | null>(null);
  const [detailAttendees, setDetailAttendees] = useState<TrainingAttendee[]>([]);
  const [detailOpen, setDetailOpen] = useState(false);
  const [workersSheetOpen, setWorkersSheetOpen] = useState(false);
  const [untrained, setUntrained] = useState<ProjectWorker[]>([]);
  const [untrainedView, setUntrainedView] = useState<any[]>([]);
  const [coverageData, setCoverageData] = useState({ trained: 0, total: 0 });

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
  // null = create mode; non-null = edit mode (id of session being edited)
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);

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

  // Fetch workers coverage — try view first, fallback to service
  useEffect(() => {
    if (!activeProject) return;
    (async () => {
      try {
        // Try vw_workers_training_status view
        const { data: viewData } = await supabase
          .from("vw_workers_training_status" as any)
          .select("*")
          .eq("project_id", activeProject.id)
          .neq("training_status", "trained");
        if (viewData && viewData.length >= 0) {
          setUntrainedView(viewData);
        }
        // Also get coverage from worker service
        const workers = await projectWorkerService.list(activeProject.id);
        const active = workers.filter(w => w.status === "active");
        const trained = active.filter(w => w.has_safety_training);
        setCoverageData({ trained: trained.length, total: active.length });
        setUntrained(active.filter(w => !w.has_safety_training));
      } catch { /* ignore */ }
    })();
  }, [activeProject]);

  // useState tem de estar antes do return condicional — Rules of Hooks
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

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
    setEditingSessionId(null);
  };

  /** Open dialog pre-filled with the session for editing (loads attendees too). */
  const handleEdit = async (session: TrainingSession) => {
    try {
      const { attendees } = await trainingService.getById(session.id);
      setFormType(session.session_type);
      setFormTitle(session.title);
      setFormDate(session.session_date);
      setFormLocation(session.location ?? "");
      setFormStartTime(session.start_time ?? "");
      setFormEndTime(session.end_time ?? "");
      setFormTrainer(session.trainer_name ?? "");
      setFormTopics(session.topics ?? "");
      setFormAttendees(
        attendees.length > 0
          ? attendees.map(a => ({ name: a.name, role_function: a.role_function ?? "", company: a.company ?? "" }))
          : [{ name: "", role_function: "", company: "" }],
      );
      setEditingSessionId(session.id);
      setDialogOpen(true);
    } catch {
      toast({ title: t("training.toast.loadError", { defaultValue: "Erro ao carregar detalhes" }), variant: "destructive" });
    }
  };

  const handleCreate = async () => {
    if (!formTitle.trim()) {
      toast({ title: t("common.required", { defaultValue: "Campo obrigatório" }), variant: "destructive" });
      return;
    }
    const validAttendees = formAttendees.filter(a => a.name.trim());
    setSaving(true);
    try {
      const payload = {
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
      };
      if (editingSessionId) {
        await trainingService.update(editingSessionId, payload);
        toast({ title: t("training.toast.updated", { defaultValue: "Sessão actualizada" }) });
      } else {
        await trainingService.create({ project_id: activeProject.id, ...payload });
        toast({ title: t("training.toast.created", { defaultValue: "Sessão de formação criada" }) });
      }
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

  const confirmDeleteSession = async () => {
    if (!deleteTargetId) return;
    try {
      await trainingService.deleteSession(deleteTargetId);
      toast({ title: t("training.toast.deleted", { defaultValue: "Sessão eliminada" }) });
      fetchSessions();
    } catch (err) {
      const info = classifySupabaseError(err, t);
      toast({ title: info.title, variant: "destructive" });
    } finally {
      setDeleteTargetId(null);
    }
  };

  const handleViewDetail = async (session: TrainingSession) => {
    try {
      const { attendees } = await trainingService.getById(session.id);
      setDetailSession(session);
      setDetailAttendees(attendees);
      setDetailOpen(true);
    } catch {
      toast({ title: t("training.toast.loadError", { defaultValue: "Erro ao carregar detalhes" }), variant: "destructive" });
    }
  };

  const handleExportPdf = async (session: TrainingSession) => {
    try {
      const { attendees } = await trainingService.getById(session.id);
      trainingService.exportPdf(session, attendees, activeProject.name, logoBase64);
    } catch {
      toast({ title: t("training.toast.exportError", { defaultValue: "Erro ao exportar" }), variant: "destructive" });
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

      {/* KPIs — sempre visíveis */}
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


      {/* ── Tabs: Sessões / Presenças / Cobertura ─────────────────────── */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="h-9 p-1 bg-muted/50 rounded-xl border border-border/40 gap-0.5">
          <TabsTrigger value="sessions" className="gap-1.5 text-xs font-semibold rounded-lg data-[state=active]:shadow-sm">
            <GraduationCap className="h-3 w-3" />{t("training.tab.sessions", { defaultValue: "Sessões" })}
            {sessions.length > 0 && <span className="ml-1 text-[9px] bg-muted px-1.5 py-0 rounded-full font-bold">{sessions.length}</span>}
          </TabsTrigger>
          <TabsTrigger value="attendees" className="gap-1.5 text-xs font-semibold rounded-lg data-[state=active]:shadow-sm">
            <Users className="h-3 w-3" />{t("training.tab.attendees", { defaultValue: "Presenças" })}
          </TabsTrigger>
          <TabsTrigger value="coverage" className="gap-1.5 text-xs font-semibold rounded-lg data-[state=active]:shadow-sm">
            <BarChart2 className="h-3 w-3" />{t("training.tab.coverage", { defaultValue: "Cobertura" })}
            {untrained.length > 0 && <span className="ml-1 text-[9px] bg-amber-500/20 text-amber-600 px-1.5 py-0 rounded-full font-bold">{untrained.length}</span>}
          </TabsTrigger>
        </TabsList>

        {/* TAB: Sessões */}
        <TabsContent value="sessions" className="mt-4">
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
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("training.validUntil", { defaultValue: "Válida até" })}</TableHead>
                <TableHead className="w-28" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {sessions.map(s => {
                const validity = getSessionValidity(s.session_date);
                return (
                <TableRow key={s.id} className="hover:bg-muted/20 transition-colors">
                  <TableCell className="font-mono text-xs text-muted-foreground">{s.code}</TableCell>
                  <TableCell className="text-sm">{new Date(s.session_date).toLocaleDateString("pt-PT")}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={`text-xs ${SESSION_TYPE_COLORS[s.session_type] ?? ""}`}>
                      {t(SESSION_TYPE_KEYS[s.session_type] ?? s.session_type)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm font-medium text-foreground">{s.title}</TableCell>
                  <TableCell className="text-sm tabular-nums">{s.attendee_count}</TableCell>
                  <TableCell>
                    <Badge variant={validity.status === "expired" ? "destructive" : validity.status === "expiring" ? "secondary" : "secondary"}
                      className={`text-[10px] ${validity.status === "valid" ? "bg-emerald-500/10 text-emerald-600" : validity.status === "expiring" ? "bg-amber-500/10 text-amber-600" : ""}`}
                    >
                      {validity.status === "expired"
                        ? t("training.expired", { defaultValue: "Expirada" })
                        : validity.status === "expiring"
                          ? `${t("training.validUntil", { defaultValue: "Expira em" })} ${validity.daysLeft}d`
                          : validity.validUntil.toLocaleDateString("pt-PT")}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleViewDetail(s)} title={t("common.view")}>
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleExportPdf(s)} title="PDF">
                        <FileText className="h-3.5 w-3.5" />
                      </Button>
                      {canEdit && (
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDeleteTargetId(s.id)} title={t("common.delete")}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

        </TabsContent>

        {/* TAB: Presenças — lista consolidada de formandos por sessão */}
        <TabsContent value="attendees" className="mt-4">
          {loading ? (
            <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : sessions.length === 0 ? (
            <EmptyState icon={Users} subtitleKey="training.empty" />
          ) : (
            <div className="rounded-xl border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("common.name")}</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("training.form.function", { defaultValue: "Função" })}</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("training.form.company", { defaultValue: "Empresa" })}</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("training.table.title", { defaultValue: "Sessão" })}</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("common.date")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {untrainedView.length > 0 ? untrainedView.map((w: any, i: number) => (
                    <TableRow key={i} className="hover:bg-muted/20">
                      <TableCell className="text-sm font-medium">{w.worker_name ?? w.name ?? "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{w.role_function ?? w.function ?? "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{w.company ?? "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{w.last_session_title ?? "—"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground tabular-nums">
                        {w.last_session_date ? new Date(w.last_session_date).toLocaleDateString(t("common.locale", { defaultValue: "pt-PT" })) : "—"}
                      </TableCell>
                    </TableRow>
                  )) : sessions.flatMap(s =>
                    Array.from({ length: s.attendee_count }).map((_, i) => (
                      <TableRow key={`${s.id}-${i}`} className="hover:bg-muted/20">
                        <TableCell className="text-sm text-muted-foreground italic">{t("training.attendeeGeneric", { n: i + 1, defaultValue: `Formando ${i + 1}` })}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">—</TableCell>
                        <TableCell className="text-sm text-muted-foreground">—</TableCell>
                        <TableCell className="text-sm font-medium">{s.title}</TableCell>
                        <TableCell className="text-xs text-muted-foreground tabular-nums">{new Date(s.session_date).toLocaleDateString(t("common.locale", { defaultValue: "pt-PT" }))}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        {/* TAB: Cobertura */}
        <TabsContent value="coverage" className="mt-4 space-y-4">
      {/* Coverage KPI */}
      {coverageData.total > 0 && (() => {
        const pct = Math.round((coverageData.trained / coverageData.total) * 100);
        const colorClass = pct >= 80 ? "text-emerald-600" : pct >= 50 ? "text-amber-500" : "text-destructive";
        const barColor = pct >= 80 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-500" : "bg-destructive";
        return (
          <Card className="border border-border bg-card shadow-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                    {t("training.kpi.coverage", { defaultValue: "Cobertura da Equipa" })}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-lg font-black tabular-nums ${colorClass}`}>{pct}%</span>
                  <span className="text-xs text-muted-foreground">{coverageData.trained}/{coverageData.total}</span>
                </div>
              </div>
              <Progress value={pct} className={`h-2 [&>div]:${barColor}`} />
              {untrained.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3 gap-1.5 text-xs"
                  onClick={() => setWorkersSheetOpen(true)}
                >
                  <AlertTriangle className="h-3 w-3" />
                  {t("training.noSafetyTraining", { defaultValue: "Trabalhadores sem formação" })} ({untrained.length})
                </Button>
              )}
            </CardContent>
          </Card>
        );
      })()}

        </TabsContent>
      </Tabs>
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
                  {Object.entries(SESSION_TYPE_KEYS).map(([k, i18nKey]) => (
                    <SelectItem key={k} value={k}>{t(i18nKey)}</SelectItem>
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
                    {t(SESSION_TYPE_KEYS[detailSession.session_type] ?? detailSession.session_type)}
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
              {activeProject && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">
                    {t("team.attachments.title", { defaultValue: "Anexos" })}
                  </p>
                  <AttachmentsPanel projectId={activeProject.id} entityType="training_sessions" entityId={detailSession.id} />
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Workers without training Sheet */}
      <Sheet open={workersSheetOpen} onOpenChange={setWorkersSheetOpen}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              {t("training.noSafetyTraining", { defaultValue: "Trabalhadores sem formação" })}
            </SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-2">
            {(untrainedView.length > 0 ? untrainedView : untrained).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                {t("common.noData")}
              </p>
            ) : untrainedView.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("common.name")}</TableHead>
                    <TableHead>{t("training.form.company", { defaultValue: "Empresa" })}</TableHead>
                    <TableHead>{t("common.status")}</TableHead>
                    <TableHead>{t("common.date")}</TableHead>
                    <TableHead className="w-20" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {untrainedView.map((w: any, idx: number) => (
                    <TableRow key={w.worker_id ?? idx}>
                      <TableCell className="text-sm font-medium">{w.worker_name ?? "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{w.company ?? w.subcontractor_name ?? "—"}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={cn("text-[10px]",
                          w.training_status === "attended_not_signed" ? "bg-amber-500/10 text-amber-600" : "bg-destructive/10 text-destructive"
                        )}>
                          {t(`training.status.${w.training_status}`, { defaultValue: w.training_status })}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{w.last_training_date ? new Date(w.last_training_date).toLocaleDateString("pt-PT") : "—"}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" className="text-xs gap-1" onClick={() => {
                          setWorkersSheetOpen(false); resetForm();
                          setFormAttendees([{ name: w.worker_name ?? "", role_function: "", company: w.company ?? "" }]);
                          setDialogOpen(true);
                        }}>
                          <Plus className="h-3 w-3" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("common.name")}</TableHead>
                    <TableHead>{t("training.form.company", { defaultValue: "Empresa" })}</TableHead>
                    <TableHead>{t("training.form.function", { defaultValue: "Função" })}</TableHead>
                    <TableHead className="w-20" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {untrained.map(w => (
                    <TableRow key={w.id}>
                      <TableCell className="text-sm font-medium">{w.name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{w.company ?? "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{w.role_function ?? "—"}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" className="text-xs gap-1" onClick={() => {
                          setWorkersSheetOpen(false); resetForm();
                          setFormAttendees([{ name: w.name, role_function: w.role_function ?? "", company: w.company ?? "" }]);
                          setDialogOpen(true);
                        }}>
                          <Plus className="h-3 w-3" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </SheetContent>
      </Sheet>
      <AlertDialog open={!!deleteTargetId} onOpenChange={(v) => !v && setDeleteTargetId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>{t("common.deleteConfirmTitle")}</AlertDialogTitle><AlertDialogDescription>{t("common.deleteConfirmDesc")}</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel><AlertDialogAction onClick={confirmDeleteSession} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">{t("common.confirm")}</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
