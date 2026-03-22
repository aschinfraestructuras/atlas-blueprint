import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Send, Paperclip, Plus, X } from "lucide-react";
import { useProject } from "@/contexts/ProjectContext";
import { distributionListService, type DistributionList } from "@/lib/services/distributionListService";
import type { ProjectContact } from "@/lib/services/projectContactService";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityType: "hp" | "nc" | "rfi" | "submittal" | "transmittal" | "general";
  entityId?: string;
  entityCode?: string;
  defaultSubject?: string;
  pdfBase64?: string;
  pdfFilename?: string;
}

export function NotificationModal({
  open, onOpenChange, entityType, entityId, entityCode,
  defaultSubject, pdfBase64, pdfFilename,
}: Props) {
  const { t } = useTranslation();
  const { activeProject } = useProject();
  const [lists, setLists] = useState<DistributionList[]>([]);
  const [selectedListId, setSelectedListId] = useState<string>("");
  const [recipients, setRecipients] = useState<{ email: string; name: string; checked: boolean }[]>([]);
  const [subject, setSubject] = useState(defaultSubject ?? "");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [addEmail, setAddEmail] = useState("");
  const [addName, setAddName] = useState("");

  useEffect(() => {
    if (defaultSubject) setSubject(defaultSubject);
  }, [defaultSubject]);

  const loadLists = useCallback(async () => {
    if (!activeProject) return;
    try {
      const all = await distributionListService.list(activeProject.id);
      setLists(all);
      const def = all.find(l => l.entity_type === entityType && l.is_default);
      if (def) {
        setSelectedListId(def.id);
        loadMembers(def.id);
      } else if (all.length > 0) {
        setSelectedListId(all[0].id);
        loadMembers(all[0].id);
      }
    } catch { /* ignore */ }
  }, [activeProject, entityType]);

  useEffect(() => {
    if (open) loadLists();
  }, [open, loadLists]);

  const loadMembers = async (listId: string) => {
    try {
      const members = await distributionListService.getMembersOfList(listId);
      setRecipients(members.map(m => ({ email: m.email, name: m.name, checked: true })));
    } catch { /* ignore */ }
  };

  const handleListChange = (listId: string) => {
    setSelectedListId(listId);
    loadMembers(listId);
  };

  const toggleRecipient = (email: string) => {
    setRecipients(prev => prev.map(r => r.email === email ? { ...r, checked: !r.checked } : r));
  };

  const handleAddManual = () => {
    if (!addEmail.trim() || !/\S+@\S+\.\S+/.test(addEmail)) return;
    if (recipients.some(r => r.email === addEmail.trim())) return;
    setRecipients(prev => [...prev, { email: addEmail.trim(), name: addName.trim() || addEmail.trim(), checked: true }]);
    setAddEmail("");
    setAddName("");
  };

  const removeRecipient = (email: string) => {
    setRecipients(prev => prev.filter(r => r.email !== email));
  };

  const handleSend = async () => {
    if (!activeProject) return;
    const selected = recipients.filter(r => r.checked);
    if (selected.length === 0) {
      toast.error(t("notifications.recipients", { defaultValue: "Destinatários" }) + " — " + t("common.required"));
      return;
    }
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-notification", {
        body: {
          project_id: activeProject.id,
          entity_type: entityType,
          entity_id: entityId,
          entity_code: entityCode,
          list_id: selectedListId || undefined,
          recipients: selected.map(r => ({ email: r.email, name: r.name })),
          subject,
          body: message,
          pdf_base64: pdfBase64,
          pdf_filename: pdfFilename,
        },
      });
      if (error) throw error;
      const sent = data?.sent ?? selected.length;
      toast.success(t("notifications.sentSuccess", { count: sent, defaultValue: `Enviado para ${sent} destinatário(s)` }));
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err?.message ?? t("common.error"));
    } finally {
      setSending(false);
    }
  };

  const checkedCount = recipients.filter(r => r.checked).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-4 w-4" />
            {t("notifications.sendBtn", { defaultValue: "Enviar Notificação" })}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Distribution list selector */}
          <div className="space-y-1.5">
            <Label className="text-xs">{t("notifications.selectList", { defaultValue: "Seleccionar lista" })}</Label>
            <Select value={selectedListId} onValueChange={handleListChange}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder={t("notifications.selectList")} />
              </SelectTrigger>
              <SelectContent>
                {lists.map(l => (
                  <SelectItem key={l.id} value={l.id}>
                    {l.name} ({l.entity_type})
                    {l.is_default && " ★"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Recipients */}
          <div className="space-y-1.5">
            <Label className="text-xs">
              {t("notifications.recipients", { defaultValue: "Destinatários" })} ({checkedCount})
            </Label>
            <div className="max-h-32 overflow-y-auto rounded-md border border-border p-2 space-y-1">
              {recipients.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-2">
                  {t("notifications.selectList")}
                </p>
              )}
              {recipients.map(r => (
                <label key={r.email} className="flex items-center gap-2 text-xs hover:bg-muted/30 rounded px-1 py-0.5 cursor-pointer">
                  <Checkbox checked={r.checked} onCheckedChange={() => toggleRecipient(r.email)} />
                  <span className="flex-1 truncate">{r.name}</span>
                  <span className="text-muted-foreground truncate">{r.email}</span>
                  <button type="button" className="text-muted-foreground hover:text-destructive" onClick={() => removeRecipient(r.email)}>
                    <X className="h-3 w-3" />
                  </button>
                </label>
              ))}
            </div>
            {/* Add manual recipient */}
            <div className="flex gap-1.5">
              <Input
                placeholder={t("contacts.name", { defaultValue: "Nome" })}
                value={addName}
                onChange={e => setAddName(e.target.value)}
                className="h-7 text-xs flex-1"
              />
              <Input
                placeholder="email@exemplo.com"
                value={addEmail}
                onChange={e => setAddEmail(e.target.value)}
                className="h-7 text-xs flex-1"
                type="email"
              />
              <Button size="sm" variant="outline" className="h-7 px-2" onClick={handleAddManual}>
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          </div>

          {/* Subject */}
          <div className="space-y-1.5">
            <Label className="text-xs">{t("notifications.subject", { defaultValue: "Assunto" })}</Label>
            <Input value={subject} onChange={e => setSubject(e.target.value)} className="h-8 text-xs" />
          </div>

          {/* Message */}
          <div className="space-y-1.5">
            <Label className="text-xs">{t("notifications.message", { defaultValue: "Mensagem" })}</Label>
            <Textarea value={message} onChange={e => setMessage(e.target.value)} rows={4} className="text-xs resize-none" />
          </div>

          {/* PDF badge */}
          {pdfBase64 && (
            <Badge variant="secondary" className="gap-1.5 text-xs">
              <Paperclip className="h-3 w-3" />
              {t("notifications.pdfAttached", { defaultValue: "PDF em anexo" })}
              {pdfFilename && ` — ${pdfFilename}`}
            </Badge>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button onClick={handleSend} disabled={sending || checkedCount === 0 || !subject.trim()} className="gap-1.5">
            {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            {t("notifications.sendBtn", { defaultValue: "Enviar Notificação" })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
