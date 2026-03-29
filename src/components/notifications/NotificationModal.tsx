import { useState, useEffect, useCallback, useRef } from "react";
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
import { Loader2, Send, Paperclip, Plus, X, Upload, FileIcon } from "lucide-react";
import { useProject } from "@/contexts/ProjectContext";
import { distributionListService, type DistributionList } from "@/lib/services/distributionListService";
import type { ProjectContact } from "@/lib/services/projectContactService";
import { supabase } from "@/integrations/supabase/client";

interface Attachment {
  filename: string;
  base64: string;
  mimeType: string;
  size: number;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityType: "hp" | "nc" | "rfi" | "submittal" | "transmittal" | "general";
  entityId?: string;
  entityCode?: string;
  defaultSubject?: string;
  defaultMessage?: string;
  pdfBase64?: string;
  pdfFilename?: string;
}

const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024; // 10MB per file
const MAX_TOTAL_SIZE = 20 * 1024 * 1024; // 20MB total

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove data URL prefix (data:mime;base64,)
      const base64 = result.split(",")[1] || result;
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function NotificationModal({
  open, onOpenChange, entityType, entityId, entityCode,
  defaultSubject, defaultMessage, pdfBase64, pdfFilename,
}: Props) {
  const { t } = useTranslation();
  const { activeProject } = useProject();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [lists, setLists] = useState<DistributionList[]>([]);
  const [selectedListId, setSelectedListId] = useState<string>("");
  const [recipients, setRecipients] = useState<{ email: string; name: string; checked: boolean }[]>([]);
  const [subject, setSubject] = useState(defaultSubject ?? "");
  const [message, setMessage] = useState(defaultMessage ?? "");
  const [sending, setSending] = useState(false);
  const [addEmail, setAddEmail] = useState("");
  const [addName, setAddName] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);

  useEffect(() => {
    if (defaultSubject) setSubject(defaultSubject);
  }, [defaultSubject]);

  // Reset attachments when modal opens
  useEffect(() => {
    if (open) {
      setAttachments([]);
    }
  }, [open]);

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

  // ── Attachments ──
  const totalAttachmentSize = attachments.reduce((sum, a) => sum + a.size, 0)
    + (pdfBase64 ? Math.ceil((pdfBase64.length * 3) / 4) : 0);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    for (const file of Array.from(files)) {
      if (file.size > MAX_ATTACHMENT_SIZE) {
        toast.error(`${file.name}: ${t("notifications.attachments.tooLarge", { defaultValue: "Ficheiro demasiado grande (máx 10MB)" })}`);
        continue;
      }
      if (totalAttachmentSize + file.size > MAX_TOTAL_SIZE) {
        toast.error(t("notifications.attachments.totalTooLarge", { defaultValue: "Tamanho total dos anexos excede 20MB" }));
        break;
      }
      if (attachments.some(a => a.filename === file.name)) {
        toast.error(`${file.name}: ${t("notifications.attachments.duplicate", { defaultValue: "Ficheiro já adicionado" })}`);
        continue;
      }
      try {
        const base64 = await fileToBase64(file);
        setAttachments(prev => [...prev, {
          filename: file.name,
          base64,
          mimeType: file.type || "application/octet-stream",
          size: file.size,
        }]);
      } catch {
        toast.error(`${file.name}: erro ao ler ficheiro`);
      }
    }
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeAttachment = (filename: string) => {
    setAttachments(prev => prev.filter(a => a.filename !== filename));
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
      // Build attachments array for edge function
      const allAttachments: Array<{ filename: string; base64: string; mime_type: string }> = [];

      // Add pre-generated PDF if exists
      if (pdfBase64 && pdfFilename) {
        allAttachments.push({
          filename: pdfFilename,
          base64: pdfBase64,
          mime_type: "application/pdf",
        });
      }

      // Add user-selected attachments
      for (const att of attachments) {
        allAttachments.push({
          filename: att.filename,
          base64: att.base64,
          mime_type: att.mimeType,
        });
      }

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
          attachments: allAttachments.length > 0 ? allAttachments : undefined,
          // Keep backward compat fields
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
  const totalFiles = attachments.length + (pdfBase64 ? 1 : 0);

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

          {/* ── Attachments section ── */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs flex items-center gap-1.5">
                <Paperclip className="h-3 w-3" />
                {t("notifications.attachments.title", { defaultValue: "Anexos" })}
                {totalFiles > 0 && (
                  <span className="text-muted-foreground">({totalFiles})</span>
                )}
              </Label>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 text-xs gap-1"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-3 w-3" />
                {t("notifications.attachments.add", { defaultValue: "Adicionar ficheiro" })}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={handleFileSelect}
                accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.dwg,.dxf,.zip"
              />
            </div>

            {/* File list */}
            <div className="space-y-1">
              {/* Pre-generated PDF */}
              {pdfBase64 && pdfFilename && (
                <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-md border border-border bg-muted/30 text-xs">
                  <FileIcon className="h-3.5 w-3.5 text-destructive flex-shrink-0" />
                  <span className="flex-1 truncate font-medium">{pdfFilename}</span>
                  <Badge variant="secondary" className="text-[9px] px-1.5 py-0">
                    {t("notifications.attachments.auto", { defaultValue: "Auto" })}
                  </Badge>
                </div>
              )}

              {/* User-added attachments */}
              {attachments.map(att => (
                <div key={att.filename} className="flex items-center gap-2 px-2.5 py-1.5 rounded-md border border-border bg-card text-xs group">
                  <FileIcon className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                  <span className="flex-1 truncate">{att.filename}</span>
                  <span className="text-muted-foreground text-[10px]">{formatFileSize(att.size)}</span>
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => removeAttachment(att.filename)}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}

              {totalFiles === 0 && (
                <p className="text-[10px] text-muted-foreground text-center py-1.5">
                  {t("notifications.attachments.none", { defaultValue: "Sem anexos. Clique para adicionar ficheiros." })}
                </p>
              )}
            </div>

            {totalFiles > 0 && (
              <p className="text-[10px] text-muted-foreground">
                {t("notifications.attachments.totalSize", { defaultValue: "Tamanho total" })}:{" "}
                {formatFileSize(totalAttachmentSize)}
              </p>
            )}
          </div>
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
