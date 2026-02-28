import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useProject } from "@/contexts/ProjectContext";
import { rfiService, type Rfi } from "@/lib/services/rfiService";
import { useRfiMessages } from "@/hooks/useRfis";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Send, Lock, Trash2, AlertTriangle, MessageSquare } from "lucide-react";
import { toast } from "sonner";

const PRIORITY_COLORS: Record<string, string> = {
  low: "secondary",
  normal: "default",
  high: "outline",
  urgent: "destructive",
};

const STATUS_COLORS: Record<string, string> = {
  open: "default",
  awaiting_response: "secondary",
  closed: "outline",
  cancelled: "destructive",
};

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  rfi: Rfi | null;
  onRefresh: () => void;
}

export function RfiDetailDialog({ open, onOpenChange, rfi, onRefresh }: Props) {
  const { user } = useAuth();
  const { activeProject } = useProject();
  const { messages, loading: msgLoading, refetch: refetchMessages } = useRfiMessages(rfi?.id ?? null);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  if (!rfi || !activeProject || !user) return null;

  const hasResponses = messages.length > 0;
  const isCreator = rfi.created_by === user.id;
  const canClose = hasResponses && rfi.status !== "closed" && rfi.status !== "cancelled";

  const handleSend = async () => {
    if (!newMessage.trim()) return;
    setSending(true);
    try {
      await rfiService.addMessage(rfi.id, activeProject.id, user.id, newMessage.trim());
      // Update status to awaiting_response if creator sends, or back to open if respondent
      if (rfi.status === "open" && isCreator) {
        await rfiService.update(rfi.id, activeProject.id, { status: "awaiting_response" } as any);
      }
      setNewMessage("");
      refetchMessages();
      onRefresh();
    } catch {
      toast.error("Erro ao enviar mensagem");
    } finally {
      setSending(false);
    }
  };

  const handleClose = async () => {
    try {
      await rfiService.closeRfi(rfi.id, activeProject.id);
      toast.success("RFI encerrado");
      onRefresh();
      onOpenChange(false);
    } catch {
      toast.error("Erro ao encerrar RFI");
    }
  };

  const handleDelete = async () => {
    try {
      await rfiService.softDelete(rfi.id, activeProject.id);
      toast.success("RFI eliminado (rastreabilidade mantida)");
      onRefresh();
      onOpenChange(false);
    } catch {
      toast.error("Erro ao eliminar RFI");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <DialogTitle className="flex items-center gap-2">
              <span className="font-mono text-sm text-muted-foreground">{rfi.code}</span>
              {rfi.subject}
            </DialogTitle>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant={(STATUS_COLORS[rfi.status] || "secondary") as any}>{rfi.status}</Badge>
            <Badge variant={(PRIORITY_COLORS[rfi.priority] || "secondary") as any}>{rfi.priority}</Badge>
            {rfi.zone && <Badge variant="outline">{rfi.zone}</Badge>}
            {rfi.deadline && <span className="text-xs text-muted-foreground">Prazo: {new Date(rfi.deadline).toLocaleDateString()}</span>}
          </div>
        </DialogHeader>

        {rfi.description && (
          <p className="text-sm text-muted-foreground px-1">{rfi.description}</p>
        )}

        <Separator />

        {/* Messages thread */}
        <div className="flex-1 min-h-0">
          <div className="flex items-center gap-2 mb-2">
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Histórico de Mensagens</span>
            <span className="text-xs text-muted-foreground">({messages.length})</span>
          </div>
          <ScrollArea className="h-[300px] rounded-md border p-3" ref={scrollRef as any}>
            {messages.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Sem mensagens. Envie a primeira mensagem para iniciar o RFI.</p>
            ) : (
              <div className="space-y-3">
                {messages.map((msg) => {
                  const isMine = msg.user_id === user.id;
                  return (
                    <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${isMine ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                        <p className="whitespace-pre-wrap">{msg.message}</p>
                        <p className={`text-[10px] mt-1 ${isMine ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                          {new Date(msg.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Input */}
        {rfi.status !== "closed" && rfi.status !== "cancelled" && (
          <div className="flex gap-2">
            <Textarea
              placeholder="Escreva uma mensagem..."
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

        {/* Actions */}
        <div className="flex justify-between items-center pt-2 border-t">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                <Trash2 className="h-3.5 w-3.5 mr-1" />Eliminar
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Eliminar RFI</AlertDialogTitle>
                <AlertDialogDescription>
                  O RFI será marcado como eliminado mas o histórico será preservado para rastreabilidade documental.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Eliminar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <div className="flex gap-2">
            {canClose ? (
              <Button variant="outline" size="sm" onClick={handleClose}>
                <Lock className="h-3.5 w-3.5 mr-1" />Encerrar RFI
              </Button>
            ) : !hasResponses && rfi.status === "open" ? (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />Só pode encerrar após resposta
              </span>
            ) : null}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
