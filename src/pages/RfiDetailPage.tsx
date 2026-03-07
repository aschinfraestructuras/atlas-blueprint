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
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { AttachmentsPanel } from "@/components/attachments/AttachmentsPanel";
import { NoProjectBanner } from "@/components/NoProjectBanner";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft, Send, Lock, Unlock, Trash2, AlertTriangle, MessageSquare,
  FileText, ExternalLink, LinkIcon, Download,
} from "lucide-react";
import { cn } from "@/lib/utils";

const STATUS_OPTIONS = ["open", "in_review", "answered", "closed"] as const;
const PRIORITY_COLORS: Record<string, string> = {
  low: "secondary", normal: "default", high: "outline", urgent: "destructive",
};
const STATUS_COLORS: Record<string, string> = {
  open: "bg-primary/10 text-primary",
  in_review: "bg-secondary text-secondary-foreground",
  answered: "bg-primary/20 text-primary",
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

  const workItemMap = useMemo(() => new Map(workItems.map(w => [w.id, w.sector])), [workItems]);

  // Fetch RFI
  useEffect(() => {
    if (!id) return;
    setLoading(true);
    rfiService.getById(id).then(setRfi).catch(() => {
      toast({ variant: "destructive", title: t("common.error", { defaultValue: "Erro" }) });
      navigate("/technical-office");
    }).finally(() => setLoading(false));
  }, [id]);

  // Auto-scroll messages
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  if (!activeProject) return <NoProjectBanner />;
  if (loading) return (
    <div className="space-y-4 max-w-4xl mx-auto">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-40 w-full" />
      <Skeleton className="h-60 w-full" />
    </div>
  );
  if (!rfi || !user) return null;

  const hasResponses = messages.length > 0;
  const canClose = hasResponses && rfi.status !== "closed" && rfi.status !== "cancelled";
  const isOpen = rfi.status !== "closed" && rfi.status !== "cancelled";
  const isOverdue = rfi.deadline && new Date(rfi.deadline) < new Date() && isOpen;
  const meta = { projectName: activeProject.name, projectCode: activeProject.code, locale: "pt", generatedBy: user.email ?? undefined };

  const refreshRfi = async () => {
    try { const r = await rfiService.getById(rfi.id); setRfi(r); } catch {}
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
    } finally { setSending(false); }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (newStatus === "closed" && !hasResponses) {
      toast({ variant: "destructive", title: t("technicalOffice.rfi.cannotCloseNoResponse", { defaultValue: "Não pode encerrar sem pelo menos uma resposta." }) });
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
    <div className="space-y-6 max-w-4xl mx-auto">
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
                <AlertDialogDescription>{t("technicalOffice.rfi.deleteDesc", { defaultValue: "O RFI será arquivado (soft-delete). O histórico será preservado para rastreabilidade." })}</AlertDialogDescription>
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
                <span className="font-mono text-sm text-muted-foreground">{rfi.code}</span>
                {isOverdue && <Badge variant="destructive" className="text-[10px] gap-1"><AlertTriangle className="h-2.5 w-2.5" />{t("technicalOffice.rfi.overdue", { defaultValue: "Atrasado" })}</Badge>}
              </div>
              <CardTitle className="text-xl">{rfi.subject}</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={(PRIORITY_COLORS[rfi.priority] || "secondary") as any}>
                {t(`technicalOffice.priority.${rfi.priority}`, { defaultValue: rfi.priority })}
              </Badge>
              <Badge variant="secondary" className={cn("text-xs", STATUS_COLORS[rfi.status] ?? "")}>
                {t(`technicalOffice.status.${rfi.status}`, { defaultValue: rfi.status })}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t("technicalOffice.rfi.zone", { defaultValue: "Zona" })}</span>
              <p className="mt-0.5">{rfi.zone || "—"}</p>
            </div>
            <div>
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t("technicalOffice.table.deadline", { defaultValue: "Prazo" })}</span>
              <p className={cn("mt-0.5", isOverdue && "text-destructive font-medium")}>{rfi.deadline ? new Date(rfi.deadline).toLocaleDateString() : "—"}</p>
            </div>
            <div>
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t("common.date")}</span>
              <p className="mt-0.5">{new Date(rfi.created_at).toLocaleDateString()}</p>
            </div>
            <div>
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t("technicalOffice.rfi.workItem", { defaultValue: "Atividade" })}</span>
              <p className="mt-0.5">
                {rfi.work_item_id ? (
                  <Link to={`/work-items/${rfi.work_item_id}`} className="text-primary hover:underline inline-flex items-center gap-1">
                    {workItemMap.get(rfi.work_item_id) ?? rfi.work_item_id.slice(0, 8)}
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                ) : "—"}
              </p>
            </div>
          </div>

          {/* NC link */}
          {rfi.nc_id && (
            <div className="mt-3 flex items-center gap-2 text-sm">
              <LinkIcon className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-muted-foreground">{t("technicalOffice.rfi.linkedNc", { defaultValue: "NC Associada:" })}</span>
              <Link to={`/non-conformities/${rfi.nc_id}`} className="text-primary hover:underline inline-flex items-center gap-1">
                {rfi.nc_id.slice(0, 8)}…
                <ExternalLink className="h-3 w-3" />
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

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

      {/* Workflow actions */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-sm font-medium text-muted-foreground">{t("technicalOffice.rfi.changeStatus", { defaultValue: "Alterar estado:" })}</span>
        {STATUS_OPTIONS.map(s => (
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
        {!hasResponses && rfi.status !== "closed" && (
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            {t("technicalOffice.rfi.cannotCloseNoResponse", { defaultValue: "Encerrar requer resposta" })}
          </span>
        )}
      </div>

      <Separator />

      {/* Messages thread */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <MessageSquare className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-semibold">{t("technicalOffice.rfi.messagesTitle", { defaultValue: "Histórico de Mensagens" })}</span>
          <Badge variant="secondary" className="text-xs">{messages.length}</Badge>
        </div>
        <ScrollArea className="h-[320px] rounded-lg border p-4" ref={scrollRef as any}>
          {messages.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">
              {t("technicalOffice.rfi.noMessages", { defaultValue: "Sem mensagens. Envie a primeira para iniciar a thread." })}
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
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
              }}
            />
            <Button onClick={handleSend} disabled={sending || !newMessage.trim()} className="self-end">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      <Separator />

      {/* Attachments */}
      <AttachmentsPanel
        projectId={activeProject.id}
        entityType="rfis"
        entityId={rfi.id}
      />
    </div>
  );
}
