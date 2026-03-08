import { useState, useRef, useEffect, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { useProject } from "@/contexts/ProjectContext";
import { useProjectRole } from "@/hooks/useProjectRole";
import { useWorkItems } from "@/hooks/useWorkItems";
import { rfiService, type Rfi, type RfiMessage } from "@/lib/services/rfiService";
import { useRfiMessages } from "@/hooks/useRfis";
import { classifySupabaseError } from "@/lib/utils/supabaseError";
import { exportRfiDetailPdf } from "@/lib/services/rfiExportService";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { AttachmentsPanel } from "@/components/attachments/AttachmentsPanel";
import { NoProjectBanner } from "@/components/NoProjectBanner";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft, Send, Lock, Unlock, Trash2, AlertTriangle, MessageSquare,
  FileText, ExternalLink, LinkIcon, Download, Clock, User, CalendarDays, MapPin, FileCode,
} from "lucide-react";
import { cn } from "@/lib/utils";

const STATUS_OPTIONS = ["open", "in_review", "answered", "closed"] as const;

const PRIORITY_COLORS: Record<string, string> = {
  normal: "bg-muted text-muted-foreground",
  urgent: "bg-amber-500/15 text-amber-600",
  critical: "bg-destructive/10 text-destructive",
};

const STATUS_COLORS: Record<string, string> = {
  open: "bg-primary/10 text-primary",
  in_review: "bg-secondary text-secondary-foreground",
  answered: "bg-emerald-500/15 text-emerald-600",
  closed: "bg-muted text-muted-foreground",
  cancelled: "bg-destructive/10 text-destructive",
};

export default function RfiDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuth();
  const { activeProject } = useProject();
  const { isAdmin } = useProjectRole();
  const { toast } = useToast();

  useEffect(() => {
    if (!id || id === "undefined" || id.trim() === "") {
      toast({ title: t("common.recordNotFound", { defaultValue: "Registo não encontrado." }), variant: "destructive" });
      navigate("/technical-office", { replace: true });
    }
  }, [id]);

  const { data: workItems } = useWorkItems();

  const [rfi, setRfi] = useState<Rfi | null>(null);
  const [loading, setLoading] = useState(true);
  const { messages, loading: msgLoading, refetch: refetchMessages } = useRfiMessages(id ?? null);

  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Response fields
  const [responseText, setResponseText] = useState("");
  const [respondedBy, setRespondedBy] = useState("");
  const [submittingResponse, setSubmittingResponse] = useState(false);

  const workItemMap = useMemo(() => new Map(workItems.map((w) => [w.id, w.sector])), [workItems]);

  // Fetch RFI
  useEffect(() => {
    if (!id) return;
    setLoading(true);
    rfiService
      .getById(id)
      .then((data) => {
        setRfi(data);
        setResponseText((data as any).response_text ?? "");
        setRespondedBy((data as any).responded_by ?? "");
      })
      .catch(() => {
        toast({ variant: "destructive", title: t("common.error", { defaultValue: "Erro" }) });
        navigate("/technical-office");
      })
      .finally(() => setLoading(false));
  }, [id]);

  // Auto-scroll messages
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  if (!activeProject) return <NoProjectBanner />;

  if (loading)
    return (
      <div className="space-y-4 max-w-5xl mx-auto">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-60 w-full" />
      </div>
    );

  if (!rfi || !user) return null;

  const hasResponses = messages.length > 0 || !!(rfi as any).response_text;
  const canClose = hasResponses && rfi.status !== "closed" && rfi.status !== "cancelled";
  const isOpen = rfi.status !== "closed" && rfi.status !== "cancelled";
  const responseDeadline = (rfi as any).response_deadline;
  const respondedAt = (rfi as any).responded_at;
  const ptCode = (rfi as any).pt_code;
  const discipline = (rfi as any).discipline;
  const ppiRef = (rfi as any).ppi_ref;
  const docReference = (rfi as any).doc_reference;

  const today = new Date();
  const isOverdue = responseDeadline && new Date(responseDeadline) < today && isOpen;
  const daysRemaining = responseDeadline
    ? Math.ceil((new Date(responseDeadline).getTime() - today.getTime()) / 86400000)
    : null;

  const meta = {
    projectName: activeProject.name,
    projectCode: activeProject.code,
    locale: "pt",
    generatedBy: user.email ?? undefined,
  };

  const refreshRfi = async () => {
    try {
      const r = await rfiService.getById(rfi.id);
      setRfi(r);
      setResponseText((r as any).response_text ?? "");
      setRespondedBy((r as any).responded_by ?? "");
    } catch {}
  };

  const handleSend = async () => {
    if (!newMessage.trim()) return;
    setSending(true);
    try {
      await rfiService.addMessage(rfi.id, activeProject.id, user.id, newMessage.trim());
      setNewMessage("");
      refetchMessages();
      refreshRfi();
    } catch (err) {
      const { title, description } = classifySupabaseError(err, t);
      toast({ variant: "destructive", title, description });
    } finally {
      setSending(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (newStatus === "closed" && !hasResponses) {
      toast({
        variant: "destructive",
        title: t("technicalOffice.rfi.cannotCloseNoResponse", { defaultValue: "Encerrar requer pelo menos uma resposta." }),
      });
      return;
    }
    try {
      await rfiService.update(rfi.id, activeProject.id, { status: newStatus } as any);
      toast({ title: t("technicalOffice.rfi.statusChanged", { defaultValue: "Estado atualizado." }) });
      refreshRfi();
    } catch (err) {
      const { title, description } = classifySupabaseError(err, t);
      toast({ variant: "destructive", title, description });
    }
  };

  const handleRegisterResponse = async () => {
    if (!responseText.trim()) {
      toast({ variant: "destructive", title: t("rfi.detail.responseRequired", { defaultValue: "Resposta obrigatória." }) });
      return;
    }
    setSubmittingResponse(true);
    try {
      await rfiService.update(rfi.id, activeProject.id, {
        status: "answered",
        response_text: responseText.trim(),
        responded_by: respondedBy.trim() || null,
        responded_at: new Date().toISOString(),
      } as any);
      toast({ title: t("rfi.detail.responseRegistered", { defaultValue: "Resposta registada com sucesso." }) });
      refreshRfi();
    } catch (err) {
      const { title, description } = classifySupabaseError(err, t);
      toast({ variant: "destructive", title, description });
    } finally {
      setSubmittingResponse(false);
    }
  };

  const handleDelete = async () => {
    try {
      await rfiService.softDelete(rfi.id, activeProject.id);
      toast({ title: t("technicalOffice.toast.rfiDeleted", { defaultValue: "RFI eliminado" }) });
      navigate("/technical-office");
    } catch (err) {
      const { title, description } = classifySupabaseError(err, t);
      toast({ variant: "destructive", title, description });
    }
  };

  const handleExportPdf = () => {
    exportRfiDetailPdf(rfi, messages, meta);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => navigate("/technical-office")} className="gap-1.5">
          <ArrowLeft className="h-3.5 w-3.5" />
          {t("common.back")}
        </Button>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExportPdf} className="gap-1.5">
            <Download className="h-3.5 w-3.5" />
            PDF
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive gap-1.5">
                <Trash2 className="h-3.5 w-3.5" />
                {t("common.delete")}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t("technicalOffice.rfi.deleteTitle", { defaultValue: "Eliminar RFI?" })}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t("technicalOffice.rfi.deleteDesc", { defaultValue: "O RFI será arquivado. O histórico será preservado." })}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  {t("common.delete")}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Header card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-2xl font-bold text-foreground">{rfi.code}</span>
                {ptCode && (
                  <Badge variant="secondary" className="bg-primary/10 text-primary text-xs">
                    {ptCode}
                  </Badge>
                )}
                {isOverdue && (
                  <Badge variant="destructive" className="text-[10px] gap-1">
                    <AlertTriangle className="h-2.5 w-2.5" />
                    {t("technicalOffice.rfi.overdue", { defaultValue: "Atrasado" })}
                  </Badge>
                )}
              </div>
              <CardTitle className="text-lg font-medium text-muted-foreground">{rfi.subject}</CardTitle>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {discipline && (
                <Badge variant="outline" className="text-xs">
                  {t(`nc.discipline.${discipline}`, { defaultValue: discipline })}
                </Badge>
              )}
              <Badge variant="secondary" className={cn("text-xs", PRIORITY_COLORS[rfi.priority] ?? "")}>
                {t(`rfi.priority.${rfi.priority}`, { defaultValue: rfi.priority })}
              </Badge>
              <Badge variant="secondary" className={cn("text-xs", STATUS_COLORS[rfi.status] ?? "")}>
                {t(`technicalOffice.status.${rfi.status}`, { defaultValue: rfi.status })}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Deadline countdown */}
          {responseDeadline && (
            <div
              className={cn(
                "mb-4 p-3 rounded-lg border flex items-center gap-3",
                isOverdue ? "bg-destructive/10 border-destructive/30" : daysRemaining && daysRemaining <= 7 ? "bg-amber-500/10 border-amber-500/30" : "bg-muted/50 border-border"
              )}
            >
              <Clock className={cn("h-4 w-4", isOverdue ? "text-destructive" : "text-muted-foreground")} />
              <div className="text-sm">
                <span className="font-medium">
                  {t("rfi.detail.responseDeadline", { defaultValue: "Prazo de resposta:" })}
                </span>{" "}
                {new Date(responseDeadline).toLocaleDateString()}
                {isOverdue ? (
                  <span className="text-destructive font-semibold ml-2">
                    ({t("rfi.status.overdue", { defaultValue: "ATRASADO" })})
                  </span>
                ) : daysRemaining !== null ? (
                  <span className={cn("ml-2", daysRemaining <= 3 ? "text-amber-600 font-semibold" : "text-muted-foreground")}>
                    ({daysRemaining} {t("rfi.detail.daysRemaining", { defaultValue: "dias restantes" })})
                  </span>
                ) : null}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Main content - 3 zones */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left zone (2/3) - Description + Messages */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          {rfi.description && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">{t("common.description")}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{rfi.description}</p>
              </CardContent>
            </Card>
          )}

          {/* Quick info row */}
          <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground bg-muted/30 rounded-lg px-4 py-2.5">
            {rfi.zone && (
              <span className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" />
                {rfi.zone}
              </span>
            )}
            {docReference && (
              <span className="flex items-center gap-1.5">
                <FileCode className="h-3.5 w-3.5" />
                {docReference}
              </span>
            )}
            {ppiRef && (
              <span className="flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5" />
                PPI: {ppiRef}
              </span>
            )}
          </div>

          {/* Messages thread */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-sm font-semibold">{t("technicalOffice.rfi.messagesTitle", { defaultValue: "Histórico de Mensagens" })}</CardTitle>
                <Badge variant="secondary" className="text-xs">{messages.length}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[280px] rounded-lg border p-4" ref={scrollRef as any}>
                {messages.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-12">
                    {t("technicalOffice.rfi.noMessages", { defaultValue: "Sem mensagens. Envie a primeira." })}
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

              {/* Input */}
              {isOpen && (
                <div className="flex gap-2 mt-3">
                  <Textarea
                    placeholder={t("technicalOffice.rfi.messagePlaceholder", { defaultValue: "Escreva uma mensagem…" })}
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    rows={2}
                    className="flex-1"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                  />
                  <Button onClick={handleSend} disabled={sending || !newMessage.trim()} className="self-end">
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Attachments */}
          <AttachmentsPanel projectId={activeProject.id} entityType="rfis" entityId={rfi.id} />
        </div>

        {/* Right zone (1/3) - Details + Response + Links */}
        <div className="space-y-4">
          {/* Details card */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">{t("rfi.detail.details", { defaultValue: "Detalhes" })}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("nc.form.discipline", { defaultValue: "Disciplina" })}</span>
                <span>{discipline ? t(`nc.discipline.${discipline}`, { defaultValue: discipline }) : "—"}</span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("rfi.detail.zone", { defaultValue: "Zona/PK" })}</span>
                <span>{rfi.zone || "—"}</span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("rfi.detail.docRef", { defaultValue: "Ref. Doc." })}</span>
                <span className="text-right max-w-[140px] truncate">{docReference || "—"}</span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("rfi.detail.ppiRef", { defaultValue: "PPI Ref." })}</span>
                <span>{ppiRef || "—"}</span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("common.date")}</span>
                <span>{new Date(rfi.created_at).toLocaleDateString()}</span>
              </div>
            </CardContent>
          </Card>

          {/* Response card */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">{t("rfi.detail.response", { defaultValue: "Resposta" })}</CardTitle>
            </CardHeader>
            <CardContent>
              {rfi.status === "open" || rfi.status === "in_review" ? (
                <div className="space-y-3">
                  <Textarea
                    placeholder={t("rfi.detail.responseTextPlaceholder", { defaultValue: "Texto da resposta…" })}
                    value={responseText}
                    onChange={(e) => setResponseText(e.target.value)}
                    rows={4}
                  />
                  <Input
                    placeholder={t("rfi.detail.respondedByPlaceholder", { defaultValue: "Respondido por (nome/cargo)" })}
                    value={respondedBy}
                    onChange={(e) => setRespondedBy(e.target.value)}
                  />
                  <Button onClick={handleRegisterResponse} disabled={submittingResponse || !responseText.trim()} className="w-full">
                    {submittingResponse ? t("common.loading") : t("rfi.detail.registerResponse", { defaultValue: "Registar Resposta" })}
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {(rfi as any).response_text ? (
                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3">
                      <p className="text-sm whitespace-pre-wrap">{(rfi as any).response_text}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        {(rfi as any).responded_by && (
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {(rfi as any).responded_by}
                          </span>
                        )}
                        {respondedAt && (
                          <span className="flex items-center gap-1">
                            <CalendarDays className="h-3 w-3" />
                            {new Date(respondedAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">{t("rfi.detail.noResponseYet", { defaultValue: "Sem resposta registada." })}</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Close button */}
          {rfi.status === "answered" && (
            <Button onClick={() => handleStatusChange("closed")} className="w-full gap-1.5">
              <Lock className="h-3.5 w-3.5" />
              {t("rfi.detail.closeRfi", { defaultValue: "Fechar RFI" })}
            </Button>
          )}

          {/* Links card */}
          {rfi.nc_id && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">{t("rfi.detail.links", { defaultValue: "Ligações" })}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 text-sm">
                  <LinkIcon className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-muted-foreground">{t("technicalOffice.rfi.linkedNc", { defaultValue: "NC Associada:" })}</span>
                  <Link to={`/non-conformities/${rfi.nc_id}`} className="text-primary hover:underline inline-flex items-center gap-1">
                    {rfi.nc_id.slice(0, 8)}…
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Workflow buttons */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">{t("technicalOffice.rfi.changeStatus", { defaultValue: "Alterar estado" })}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {STATUS_OPTIONS.map((s) => (
                <Button
                  key={s}
                  size="sm"
                  variant={rfi.status === s ? "default" : "outline"}
                  disabled={rfi.status === s || (s === "closed" && !hasResponses)}
                  onClick={() => handleStatusChange(s)}
                  className="text-xs"
                >
                  {s === "closed" && <Lock className="h-3 w-3 mr-1" />}
                  {s === "open" && rfi.status === "closed" && <Unlock className="h-3 w-3 mr-1" />}
                  {t(`technicalOffice.status.${s}`, { defaultValue: s })}
                </Button>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
