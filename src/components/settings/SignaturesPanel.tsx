/**
 * SignaturesPanel — gestão de assinaturas por trabalhador
 * Aparece em Definições → tab "Assinaturas"
 * Permite fazer upload de imagem de assinatura por trabalhador
 * e configurar quem assina cada tipo de documento
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useProject } from "@/contexts/ProjectContext";
import { uploadSignature, removeSignature, fetchSignatureBase64 } from "@/lib/services/signatureService";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/lib/utils/toast";
import { Upload, Trash2, Pen, CheckCircle2, User, Loader2, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface Worker {
  id: string;
  name: string;
  org_function: string | null;
  role_function: string | null;
  signature_storage_path: string | null;
  signature_b64?: string | null;
}

interface SigConfig {
  id: string;
  doc_type: string;
  slot_label: string;
  slot_order: number;
  worker_id: string | null;
}

const DOC_TYPE_LABELS: Record<string, string> = {
  rmsgq:        "Relatório Mensal SGQ (RMSGQ)",
  nc:           "Não Conformidades (RNC)",
  hp_notification: "Notificação Hold Point",
  weld:         "Ficha de Soldadura",
  ppi:          "Plano de Pontos de Inspecção (PPI)",
  field_record: "Boletim de Ensaio de Campo",
  compaction:   "Ensaio de Compactação",
  soil:         "Ensaio de Solo / Proctor",
  concrete:     "Betão Estrutural",
};

export function SignaturesPanel() {
  const { t } = useTranslation();
  const { activeProject } = useProject();
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [configs, setConfigs] = useState<SigConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingFor, setUploadingFor] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!activeProject) return;
    setLoading(true);
    const [wRes, cRes] = await Promise.all([
      supabase.from("project_workers")
        .select("id, name, org_function, role_function, signature_storage_path")
        .eq("project_id", activeProject.id)
        .eq("status", "active")
        .order("org_order", { nullsFirst: false }),
      supabase.from("document_signature_config" as any)
        .select("id, doc_type, slot_label, slot_order, worker_id")
        .eq("project_id", activeProject.id)
        .order("doc_type").order("slot_order"),
    ]);

    const ws = (wRes.data ?? []) as Worker[];
    // Carregar assinaturas em paralelo
    const wsWithSig = await Promise.all(ws.map(async w => ({
      ...w,
      signature_b64: w.signature_storage_path
        ? await fetchSignatureBase64(w.signature_storage_path)
        : null,
    })));

    setWorkers(wsWithSig);
    setConfigs((cRes.data ?? []) as SigConfig[]);
    setLoading(false);
  }, [activeProject]);

  useEffect(() => { load(); }, [load]);

  const handleFileSelect = async (workerId: string, file: File) => {
    if (!activeProject) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Ficheiro inválido", description: "Utiliza PNG ou JPG", variant: "destructive" });
      return;
    }
    setUploading(workerId);
    try {
      await uploadSignature(activeProject.id, workerId, file);
      toast({ title: "Assinatura guardada" });
      await load();
    } catch (e: any) {
      toast({ title: "Erro ao guardar assinatura", description: e.message, variant: "destructive" });
    } finally { setUploading(null); }
  };

  const handleRemove = async (workerId: string) => {
    if (!activeProject) return;
    setUploading(workerId);
    try {
      await removeSignature(activeProject.id, workerId);
      toast({ title: "Assinatura removida" });
      await load();
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    } finally { setUploading(null); }
  };

  const handleSlotWorkerChange = async (configId: string, workerId: string) => {
    const val = workerId === "__none__" ? null : workerId;
    await supabase.from("document_signature_config" as any)
      .update({ worker_id: val })
      .eq("id", configId);
    setConfigs(prev => prev.map(c => c.id === configId ? { ...c, worker_id: val } : c));
  };

  if (loading) return <div className="py-8 text-center text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin inline mr-2" />A carregar...</div>;

  const docTypes = [...new Set(configs.map(c => c.doc_type))];

  return (
    <div className="space-y-6">

      {/* ── Secção 1 — Assinaturas por trabalhador ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold">Assinaturas da Equipa</p>
            <p className="text-xs text-muted-foreground">Upload de imagem de assinatura por trabalhador (PNG, fundo branco)</p>
          </div>
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={load}>
            <RefreshCw className="h-3 w-3" />
          </Button>
        </div>

        {workers.length === 0 && (
          <div className="rounded-xl border border-dashed border-border/60 py-8 text-center text-sm text-muted-foreground">
            Sem trabalhadores activos — adiciona a equipa primeiro em Definições → Equipa.
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {workers.map(w => (
            <div key={w.id} className="rounded-xl border border-border/50 bg-card p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center">
                    <User className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold">{w.name}</p>
                    <p className="text-[10px] text-muted-foreground">{w.org_function || w.role_function || "—"}</p>
                  </div>
                </div>
                {w.signature_b64
                  ? <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-700 border-emerald-500/30 gap-1">
                      <CheckCircle2 className="h-2.5 w-2.5" /> Assinatura OK
                    </Badge>
                  : <Badge variant="outline" className="text-[10px] text-muted-foreground gap-1">
                      <Pen className="h-2.5 w-2.5" /> Sem assinatura
                    </Badge>}
              </div>

              {/* Preview da assinatura */}
              {w.signature_b64 && (
                <div className="rounded-lg border border-border/40 bg-white p-2 flex items-center justify-center h-16">
                  <img src={w.signature_b64} alt="assinatura" className="max-h-12 max-w-full object-contain" />
                </div>
              )}

              {/* Botões */}
              <div className="flex gap-2">
                <Button
                  variant="outline" size="sm" className="flex-1 h-7 text-xs gap-1"
                  disabled={uploading === w.id}
                  onClick={() => { setUploadingFor(w.id); fileInputRef.current?.click(); }}
                >
                  {uploading === w.id
                    ? <Loader2 className="h-3 w-3 animate-spin" />
                    : <Upload className="h-3 w-3" />}
                  {w.signature_b64 ? "Substituir" : "Upload"}
                </Button>
                {w.signature_b64 && (
                  <Button
                    variant="ghost" size="sm" className="h-7 text-xs text-destructive hover:text-destructive gap-1"
                    disabled={uploading === w.id}
                    onClick={() => handleRemove(w.id)}
                  >
                    <Trash2 className="h-3 w-3" /> Remover
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Input de ficheiro escondido */}
        <input
          ref={fileInputRef} type="file" accept="image/png,image/jpeg" className="hidden"
          onChange={e => {
            const file = e.target.files?.[0];
            if (file && uploadingFor) handleFileSelect(uploadingFor, file);
            e.target.value = "";
          }}
        />
      </div>

      <Separator />

      {/* ── Secção 2 — Configuração por tipo de documento ── */}
      <div className="space-y-3">
        <div>
          <p className="text-sm font-semibold">Quem assina cada documento</p>
          <p className="text-xs text-muted-foreground">Associa cada cargo ao trabalhador correspondente em cada tipo de documento</p>
        </div>

        <div className="space-y-4">
          {docTypes.map(docType => {
            const slots = configs.filter(c => c.doc_type === docType).sort((a,b) => a.slot_order - b.slot_order);
            return (
              <div key={docType} className="rounded-xl border border-border/50 bg-card p-3 space-y-2.5">
                <p className="text-xs font-semibold text-foreground">{DOC_TYPE_LABELS[docType] ?? docType}</p>
                {slots.map(slot => (
                  <div key={slot.id} className="flex items-center gap-3">
                    <Label className="text-xs text-muted-foreground w-44 shrink-0">{slot.slot_label}</Label>
                    <Select
                      value={slot.worker_id ?? "__none__"}
                      onValueChange={v => handleSlotWorkerChange(slot.id, v)}
                    >
                      <SelectTrigger className="h-7 text-xs flex-1">
                        <SelectValue placeholder="Nenhum" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">— Nenhum —</SelectItem>
                        {workers.map(w => (
                          <SelectItem key={w.id} value={w.id}>
                            {w.name} {w.signature_b64 ? "✓" : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
