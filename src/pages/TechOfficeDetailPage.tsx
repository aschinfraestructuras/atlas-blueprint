import { useState, useRef, useEffect, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { useProject } from "@/contexts/ProjectContext";
import { useProjectRole } from "@/hooks/useProjectRole";
import { useReportMeta } from "@/hooks/useReportMeta";
import { useProjectLogo } from "@/hooks/useProjectLogo";
import { useWorkItems } from "@/hooks/useWorkItems";
import { technicalOfficeService, type TechnicalOfficeItem, type TechOfficeMessage, TECH_OFFICE_STATUSES } from "@/lib/services/technicalOfficeService";
import { useTechOfficeMessages } from "@/hooks/useTechnicalOffice";
import { parseSubmittalMeta, APPROVAL_RESULTS } from "@/lib/services/submittalMeta";
import { classifySupabaseError } from "@/lib/utils/supabaseError";
import { exportTechOfficeDetailPdf } from "@/lib/services/techOfficeExportService";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { AttachmentsPanel } from "@/components/attachments/AttachmentsPanel";
import { NoProjectBanner } from "@/components/NoProjectBanner";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft, Send, Trash2, AlertTriangle, MessageSquare,
  ExternalLink, LinkIcon, Download, FileText, Paperclip,
  ShieldCheck, ShieldAlert, RotateCcw, Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { EmailNotificationSection } from "@/components/notifications/EmailNotificationSection";

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  open: "bg-primary/10 text-primary",
  in_review: "bg-secondary text-secondary-foreground",
  in_progress: "bg-primary/20 text-primary",
  responded: "bg-accent text-accent-foreground",
  closed: "bg-muted text-muted-foreground",
  cancelled: "bg-destructive/10 text-destructive",
  archived: "bg-muted text-muted-foreground",
};

const PRIORITY_COLORS: Record<string, string> = {
  low: "secondary", normal: "default", high: "outline", urgent: "destructive",
};

export default function TechOfficeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuth();
  const { activeProject } = useProject();
  const { isAdmin } = useProjectRole();
  const reportMeta = useReportMeta();
  const { logoBase64 } = useProjectLogo();
  const { toast } = useToast();

  useEffect(() => {
    if (!id || id === "undefined" || id.trim() === "") {
      toast({ title: t("common.recordNotFound", { defaultValue: "Registo não encontrado." }), variant: "destructive" });
      navigate("/technical-office", { replace: true });
    }
  }, [id, navigate, t, toast]);
  const { data: workItems } = useWorkItems();

  const [item, setItem] = useState<TechnicalOfficeItem | null>(null);
  const [loading, setLoading] = useState(true);
  const { messages, loading: msgLoading, refetch: refetchMessages } = useTechOfficeMessages(id ?? null);

  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const workItemMap = useMemo(() => new Map(workItems.map(w => [w.id, w.sector])), [workItems]);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    technicalOfficeService.getById(id).then(setItem).catch(() => {
      toast({ variant: "destructive", title: t("common.error", { defaultValue: "Erro" }) });
      navigate("/technical-office");
    }).finally(() => setLoading(false));
  }, [id, navigate, t, toast]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  if (!activeProject) return <NoProjectBanner />;
  if (loading) return (
    <div className="space-y-4 max-w-4xl mx-auto">
      <Skeleton className="h-8 w-48" /><Skeleton className="h-40 w-full" /><Skeleton className="h-60 w-full" />
    </div>
  );
  if (!item || !user) return null;

  const isSubmittal = item.type === "SUBMITTAL";
  const submittalParsed = isSubmittal ? parseSubmittalMeta(item.description) : null;
  const sMeta = submittalParsed?.meta;

  const APPROVAL_DISPLAY: Record<string, { label: string; icon: typeof ShieldCheck; className: string }> = {
    pending: { label: t("submittals.approval.pending", { defaultValue: "Pendente" }), icon: Clock, className: "bg-muted/60 text-muted-foreground" },
    approved: { label: t("submittals.approval.approved", { defaultValue: "Aprovado" }), icon: ShieldCheck, className: "bg-green-500/10 text-green-700 dark:text-green-400" },
    approved_as_noted: { label: t("submittals.approval.approved_as_noted", { defaultValue: "Aprovado c/ Obs." }), icon: ShieldCheck, className: "bg-amber-500/10 text-amber-700 dark:text-amber-400" },
    rejected: { label: t("submittals.approval.rejected", { defaultValue: "Rejeitado" }), icon: ShieldAlert, className: "bg-destructive/10 text-destructive" },
    revise_resubmit: { label: t("submittals.approval.revise_resubmit", { defaultValue: "Rever e Resubmeter" }), icon: RotateCcw, className: "bg-primary/10 text-primary" },
  };

  const isOpen = !["closed", "cancelled", "archived"].includes(item.status);
  const effectiveDeadline = item.deadline ?? item.due_date;
  const isOverdue = effectiveDeadline && new Date(effectiveDeadline) < new Date() && isOpen;
  const meta = reportMeta ?? { projectName: activeProject.name, projectCode: activeProject.code, locale: "pt", generatedBy: user.email ?? undefined };

  const refreshItem = async () => {
    try { const r = await technicalOfficeService.getById(item.id); setItem(r); } catch {
      // best-effort refresh, error intentionally ignored
    }
  };

  const handleSend = async () => {
    if (!newMessage.trim()) return;
    setSending(true);
    try {
      await technicalOfficeService.addMessage(item.id, activeProject.id, user.id, newMessage.trim());
      setNewMessage("");
      refetchMessages();
      refreshItem();
    } catch (err) {
      const { title, description } = classifySupabaseError(err, t);
      toast({ variant: "destructive", title, description });
    } finally { setSending(false); }
  };

  const handleStatusChange = async (newStatus: string) => {
    try {
      await technicalOfficeService.changeStatus(item.id, activeProject.id, newStatus);
      toast({ title: t("technicalOffice.rfi.statusChanged", { defaultValue: "Estado atualizado." }) });
      refreshItem();
    } catch (err) {
      const { title, description } = classifySupabaseError(err, t);
      toast({ variant: "destructive", title, description });
    }
  };

  const handleDelete = async () => {
    try {
      await technicalOfficeService.softDelete(item.id, activeProject.id);
      toast({ title: t("technicalOffice.toast.deleted", { defaultValue: "Eliminado" }) });
      navigate("/technical-office");
    } catch (err) {
      const { title, description } = classifySupabaseError(err, t);
      toast({ variant: "destructive", title, description });
    }
  };

  const handleExportPdf = () => {
    exportTechOfficeDetailPdf(item, messages, meta, logoBase64);
  };

  const WORKFLOW_STATUSES = TECH_OFFICE_STATUSES.filter(s => s !== "cancelled");

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => navigate("/technical-office")} className="gap-1.5">
          <ArrowLeft className="h-3.5 w-3.5" />
          {t("common.back")}
        </Button>
        <div className="flex items-center gap-2">
          <EmailNotificationSection
            projectId={activeProject.id}
            entityType={isSubmittal ? "submittal" : item.type === "TRANSMITTAL" ? "transmittal" : "general"}
            entityId={item.id}
            entityCode={item.code ?? undefined}
            defaultSubject={`${item.type} — ${item.code ?? ""} — ${item.title}`}
          />
          <Button variant="outline" size="sm" onClick={handleExportPdf} className="gap-1.5">
            <Download className="h-3.5 w-3.5" /> PDF
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive gap-1.5">
                <Trash2 className="h-3.5 w-3.5" /> {t("common.delete")}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t("common.confirmDelete")}</AlertDialogTitle>
                <AlertDialogDescription>{t("technicalOffice.rfi.deleteDesc", { defaultValue: "O registo será arquivado (soft-delete)." })}</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">{t("common.delete")}</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Header card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm text-muted-foreground">{item.code}</span>
                <Badge variant="secondary" className="text-xs">{t(`technicalOffice.types.${item.type}`, { defaultValue: item.type })}</Badge>
                {isOverdue && <Badge variant="destructive" className="text-[10px] gap-1"><AlertTriangle className="h-2.5 w-2.5" />{t("technicalOffice.rfi.overdue", { defaultValue: "Atrasado" })}</Badge>}
              </div>
              <CardTitle className="text-xl">{item.title}</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={(PRIORITY_COLORS[item.priority] || "secondary") as any}>
                {t(`technicalOffice.priority.${item.priority}`, { defaultValue: item.priority })}
              </Badge>
              <Badge variant="secondary" className={cn("text-xs", STATUS_COLORS[item.status] ?? "")}>
                {t(`technicalOffice.status.${item.status}`, { defaultValue: item.status })}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t("technicalOffice.table.deadline", { defaultValue: "Prazo" })}</span>
              <p className={cn("mt-0.5", isOverdue && "text-destructive font-medium")}>{effectiveDeadline ? new Date(effectiveDeadline).toLocaleDateString() : "—"}</p>
            </div>
            <div>
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t("common.date")}</span>
              <p className="mt-0.5">{new Date(item.created_at).toLocaleDateString()}</p>
            </div>
            <div>
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t("technicalOffice.detail.respondedAt", { defaultValue: "Respondido em" })}</span>
              <p className="mt-0.5">{item.responded_at ? new Date(item.responded_at).toLocaleDateString() : "—"}</p>
            </div>
            <div>
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t("technicalOffice.rfi.workItem", { defaultValue: "Atividade" })}</span>
              <p className="mt-0.5">
                {item.work_item_id ? (
                  <Link to={`/work-items/${item.work_item_id}`} className="text-primary hover:underline inline-flex items-center gap-1">
                    {workItemMap.get(item.work_item_id) ?? item.work_item_id.slice(0, 8)}
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                ) : "—"}
              </p>
            </div>
          </div>
          {item.nc_id && (
            <div className="mt-3 flex items-center gap-2 text-sm">
              <LinkIcon className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-muted-foreground">{t("technicalOffice.rfi.linkedNc", { defaultValue: "NC Associada:" })}</span>
              <Link to={`/non-conformities/${item.nc_id}`} className="text-primary hover:underline inline-flex items-center gap-1">
                {item.nc_id.slice(0, 8)}… <ExternalLink className="h-3 w-3" />
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Submittal-specific metadata card */}
      {isSubmittal && sMeta && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">{t("submittals.detail.techData", { defaultValue: "Dados Técnicos do Submittal" })}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t("submittals.col.discipline", { defaultValue: "Disciplina" })}</span>
                <p className="mt-0.5">{sMeta.discipline ? t(`submittals.discipline.${sMeta.discipline}`, { defaultValue: sMeta.discipline }) : "—"}</p>
              </div>
              <div>
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t("submittals.col.subtype", { defaultValue: "Tipo" })}</span>
                <p className="mt-0.5">{sMeta.subtype ? t(`submittals.subtype.${sMeta.subtype}`, { defaultValue: sMeta.subtype }) : "—"}</p>
              </div>
              <div>
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t("submittals.form.supplier", { defaultValue: "Fornecedor" })}</span>
                <p className="mt-0.5">{sMeta.supplier_name || "—"}</p>
              </div>
              <div>
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t("submittals.form.subcontractor", { defaultValue: "Subempreiteiro" })}</span>
                <p className="mt-0.5">{sMeta.subcontractor_name || "—"}</p>
              </div>
              <div>
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t("submittals.form.specRef", { defaultValue: "Ref. Normativa" })}</span>
                <p className="mt-0.5 font-mono text-xs">{sMeta.spec_reference || "—"}</p>
              </div>
              <div>
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t("submittals.form.revision", { defaultValue: "Revisão" })}</span>
                <p className="mt-0.5 font-mono">Rev. {sMeta.revision || "0"}</p>
              </div>
              <div>
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t("submittals.col.approval", { defaultValue: "Aprovação" })}</span>
                <div className="mt-0.5">
                  {(() => {
                    const appr = APPROVAL_DISPLAY[sMeta.approval_result] ?? APPROVAL_DISPLAY.pending;
                    const ApprIcon = appr.icon;
                    return (
                      <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium", appr.className)}>
                        <ApprIcon className="h-3 w-3" />
                        {appr.label}
                      </span>
                    );
                  })()}
                </div>
              </div>
              <div>
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t("submittals.detail.submittedAt", { defaultValue: "Submetido em" })}</span>
                <p className="mt-0.5">{sMeta.submitted_at ? new Date(sMeta.submitted_at).toLocaleDateString() : "—"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-sm font-medium text-muted-foreground">{t("technicalOffice.rfi.changeStatus", { defaultValue: "Alterar estado:" })}</span>
        {WORKFLOW_STATUSES.map(s => (
          <Button
            key={s}
            size="sm"
            variant={item.status === s ? "default" : "outline"}
            disabled={item.status === s}
            onClick={() => handleStatusChange(s)}
            className="text-xs"
          >
            {t(`technicalOffice.status.${s}`, { defaultValue: s })}
          </Button>
        ))}
      </div>

      <Separator />

      <Tabs defaultValue="details">
        <TabsList>
          <TabsTrigger value="details" className="gap-1.5"><FileText className="h-3.5 w-3.5" />{t("technicalOffice.detail.tabDetails", { defaultValue: "Detalhes" })}</TabsTrigger>
          <TabsTrigger value="messages" className="gap-1.5"><MessageSquare className="h-3.5 w-3.5" />{t("technicalOffice.detail.tabMessages", { defaultValue: "Mensagens" })} ({messages.length})</TabsTrigger>
          <TabsTrigger value="attachments" className="gap-1.5"><Paperclip className="h-3.5 w-3.5" />{t("technicalOffice.detail.tabAttachments", { defaultValue: "Anexos" })}</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-4">
          {(() => {
            const displayDesc = isSubmittal && submittalParsed ? submittalParsed.visibleDescription : item.description;
            return displayDesc ? (
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">{t("common.description")}</CardTitle></CardHeader>
                <CardContent><p className="text-sm text-muted-foreground whitespace-pre-wrap">{displayDesc}</p></CardContent>
              </Card>
            ) : (
              <p className="text-sm text-muted-foreground">{t("technicalOffice.detail.noDescription", { defaultValue: "Sem descrição." })}</p>
            );
          })()}
          {item.recipient && (
            <div className="text-sm"><span className="text-muted-foreground font-medium">{t("technicalOffice.detail.recipient", { defaultValue: "Destinatário:" })}</span> {item.recipient}</div>
          )}
        </TabsContent>

        <TabsContent value="messages" className="space-y-4">
          <ScrollArea className="h-[320px] rounded-lg border p-4" ref={scrollRef as any}>
            {messages.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-12">
                {t("technicalOffice.rfi.noMessages", { defaultValue: "Sem mensagens." })}
              </p>
            ) : (
              <div className="space-y-3">
                {messages.map((msg) => {
                  const isMine = msg.user_id === user.id;
                  return (
                    <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                      <div className={cn("max-w-[80%] rounded-xl px-4 py-2.5 text-sm", isMine ? "bg-primary text-primary-foreground" : "bg-muted")}>
                        <p className="whitespace-pre-wrap">{msg.message}</p>
                        <p className={cn("text-[10px] mt-1.5", isMine ? "text-primary-foreground/70" : "text-muted-foreground")}>
                          {new Date(msg.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
          {isOpen && (
            <div className="flex gap-2 mt-3">
              <Textarea
                placeholder={t("technicalOffice.rfi.messagePlaceholder", { defaultValue: "Escreva uma mensagem…" })}
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                rows={2}
                className="flex-1"
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              />
              <Button onClick={handleSend} disabled={sending || !newMessage.trim()} className="self-end">
                <Send className="h-4 w-4" />
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="attachments">
          <AttachmentsPanel
            projectId={activeProject.id}
            entityType="technical_office"
            entityId={item.id}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
