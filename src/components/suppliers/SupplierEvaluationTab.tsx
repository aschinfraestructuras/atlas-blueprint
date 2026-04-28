/**
 * SupplierEvaluationTab — avaliação periódica de fornecedores/subcontratados
 * 4 critérios objectivos de 0-25 pontos, calculados a partir dos dados do Atlas
 * Total 0-100: Aprovado ≥75 | Condicional 50-74 | Suspenso <50
 */
import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useProject } from "@/contexts/ProjectContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/lib/utils/toast";
import { Plus, Star, TrendingUp, TrendingDown, Minus, Calculator, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface Evaluation {
  id: string;
  period_label: string;
  period_start: string;
  period_end: string;
  score_delivery: number | null;
  score_certificates: number | null;
  score_nc_response: number | null;
  score_conformity: number | null;
  total_score: number;
  result: "approved" | "conditional" | "suspended";
  lots_total: number;
  lots_approved: number;
  ncs_total: number;
  ncs_closed_on_time: number;
  deliveries_total: number;
  deliveries_on_time: number;
  notes: string | null;
  created_at: string;
}

interface AutoData {
  lots_total: number;
  lots_approved: number;
  ncs_total: number;
  ncs_closed_on_time: number;
}

interface Props {
  supplierId: string;
  supplierName: string;
}

const RESULT_CONFIG = {
  approved:    { label: "Aprovado",     color: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30" },
  conditional: { label: "Condicional",  color: "bg-amber-500/15 text-amber-700 border-amber-500/30" },
  suspended:   { label: "Suspenso",     color: "bg-red-500/15 text-red-700 border-red-500/30" },
};

function ScoreInput({ label, hint, value, onChange, disabled }: {
  label: string; hint: string; value: string;
  onChange: (v: string) => void; disabled?: boolean;
}) {
  const num = parseFloat(value) || 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <Label className="text-xs">{label}</Label>
        <span className="text-[10px] text-muted-foreground">{hint}</span>
      </div>
      <div className="flex items-center gap-2">
        <Input
          type="number" min={0} max={25} step={0.5}
          value={value}
          onChange={e => onChange(e.target.value)}
          className="h-8 text-xs w-20"
          disabled={disabled}
        />
        <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
          <div
            className={cn("h-full rounded-full transition-all", num >= 20 ? "bg-emerald-500" : num >= 12 ? "bg-amber-500" : "bg-red-500")}
            style={{ width: `${(num / 25) * 100}%` }}
          />
        </div>
        <span className="text-xs font-mono w-8 text-right text-muted-foreground">{num}/25</span>
      </div>
    </div>
  );
}

export function SupplierEvaluationTab({ supplierId, supplierName }: Props) {
  const { t } = useTranslation();
  const { activeProject } = useProject();
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [autoData, setAutoData] = useState<AutoData | null>(null);
  const [loadingAuto, setLoadingAuto] = useState(false);

  // Form state
  const [periodLabel, setPeriodLabel] = useState("");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [scoreDelivery, setScoreDelivery] = useState("");
  const [scoreCerts, setScoreCerts] = useState("");
  const [scoreNc, setScoreNc] = useState("");
  const [scoreConformity, setScoreConformity] = useState("");
  const [notes, setNotes] = useState("");

  const total = (parseFloat(scoreDelivery)||0) + (parseFloat(scoreCerts)||0) +
                (parseFloat(scoreNc)||0) + (parseFloat(scoreConformity)||0);
  const resultCalc = total >= 75 ? "approved" : total >= 50 ? "conditional" : "suspended";

  const fetch = useCallback(async () => {
    if (!activeProject) return;
    setLoading(true);
    const { data } = await supabase
      .from("supplier_evaluations" as any)
      .select("*")
      .eq("supplier_id", supplierId)
      .eq("project_id", activeProject.id)
      .order("period_start", { ascending: false });
    setEvaluations((data ?? []) as unknown as Evaluation[]);
    setLoading(false);
  }, [activeProject, supplierId]);

  useEffect(() => { fetch(); }, [fetch]);

  const loadAutoData = async () => {
    if (!activeProject) return;
    setLoadingAuto(true);
    // Calcular automaticamente a partir dos dados existentes
    const [lotsRes, ncsRes] = await Promise.all([
      supabase.from("material_lots").select("id, reception_status")
        .eq("project_id", activeProject.id)
        .eq("supplier_id", supplierId)
        .is("is_deleted", false),
      supabase.from("non_conformities").select("id, status, due_date")
        .eq("project_id", activeProject.id)
        .eq("supplier_id", supplierId)
        .is("is_deleted", false),
    ]);
    const lots = lotsRes.data ?? [];
    const ncs  = ncsRes.data ?? [];
    const lotsApproved = lots.filter(l => l.reception_status === "approved").length;
    const ncsClosed = ncs.filter(n => n.status === "closed").length;
    const auto: AutoData = {
      lots_total: lots.length,
      lots_approved: lotsApproved,
      ncs_total: ncs.length,
      ncs_closed_on_time: ncsClosed,
    };
    setAutoData(auto);
    // Sugerir pontuações automáticas
    if (lots.length > 0) {
      const conformityPct = lotsApproved / lots.length;
      setScoreConformity(String(Math.round(conformityPct * 25 * 10) / 10));
    }
    if (ncs.length > 0) {
      const ncPct = ncsClosed / ncs.length;
      setScoreNc(String(Math.round(ncPct * 25 * 10) / 10));
    }
    setLoadingAuto(false);
  };

  const openNew = () => {
    const now = new Date();
    const quarter = Math.ceil((now.getMonth() + 1) / 3);
    setPeriodLabel(`Q${quarter} ${now.getFullYear()}`);
    const qStart = new Date(now.getFullYear(), (quarter - 1) * 3, 1);
    const qEnd   = new Date(now.getFullYear(), quarter * 3, 0);
    setPeriodStart(qStart.toISOString().split("T")[0]);
    setPeriodEnd(qEnd.toISOString().split("T")[0]);
    setScoreDelivery(""); setScoreCerts(""); setScoreNc(""); setScoreConformity("");
    setNotes(""); setAutoData(null);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!activeProject || !periodLabel || !periodStart || !periodEnd) {
      toast({ title: "Preenche o período", variant: "destructive" }); return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from("supplier_evaluations" as any).insert({
        project_id: activeProject.id,
        supplier_id: supplierId,
        period_label: periodLabel,
        period_start: periodStart,
        period_end: periodEnd,
        score_delivery:     parseFloat(scoreDelivery) || 0,
        score_certificates: parseFloat(scoreCerts) || 0,
        score_nc_response:  parseFloat(scoreNc) || 0,
        score_conformity:   parseFloat(scoreConformity) || 0,
        lots_total: autoData?.lots_total ?? 0,
        lots_approved: autoData?.lots_approved ?? 0,
        ncs_total: autoData?.ncs_total ?? 0,
        ncs_closed_on_time: autoData?.ncs_closed_on_time ?? 0,
        notes: notes || null,
      });
      if (error) throw error;
      toast({ title: t("common.saved", { defaultValue: "Avaliação guardada" }) });
      setDialogOpen(false);
      await fetch();
    } catch (e: any) {
      toast({ title: "Erro ao guardar", description: e.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  if (loading) return <div className="py-8 text-center text-sm text-muted-foreground">A carregar...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {evaluations.length === 0
            ? "Sem avaliações registadas."
            : `${evaluations.length} avaliação${evaluations.length !== 1 ? "ões" : ""} registada${evaluations.length !== 1 ? "s" : ""}.`}
        </p>
        <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={openNew}>
          <Plus className="h-3 w-3" /> Nova Avaliação
        </Button>
      </div>

      {/* Lista de avaliações */}
      {evaluations.length > 0 && (
        <div className="space-y-2">
          {evaluations.map(ev => (
            <div key={ev.id} className="rounded-xl border border-border/50 bg-card p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">{ev.period_label}</span>
                  <Badge variant="outline" className={cn("text-[10px]", RESULT_CONFIG[ev.result]?.color)}>
                    {RESULT_CONFIG[ev.result]?.label}
                  </Badge>
                </div>
                <span className="text-xl font-bold tabular-nums">{ev.total_score}<span className="text-xs text-muted-foreground font-normal">/100</span></span>
              </div>
              <div className="grid grid-cols-4 gap-2 text-xs">
                {[
                  { label: "Prazos", score: ev.score_delivery },
                  { label: "Certificados", score: ev.score_certificates },
                  { label: "Resp. NCs", score: ev.score_nc_response },
                  { label: "Conformidade", score: ev.score_conformity },
                ].map(({ label, score }) => (
                  <div key={label} className="text-center">
                    <div className="text-muted-foreground">{label}</div>
                    <div className="font-semibold">{score ?? 0}/25</div>
                  </div>
                ))}
              </div>
              {ev.notes && <p className="text-xs text-muted-foreground border-t border-border/50 pt-1">{ev.notes}</p>}
            </div>
          ))}
        </div>
      )}

      {/* Dialog nova avaliação */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-sm">Nova Avaliação — {supplierName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {/* Período */}
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Período</Label>
                <Input value={periodLabel} onChange={e => setPeriodLabel(e.target.value)} placeholder="ex: Q2 2026" className="h-8 text-xs" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Início</Label>
                <Input type="date" value={periodStart} onChange={e => setPeriodStart(e.target.value)} className="h-8 text-xs" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Fim</Label>
                <Input type="date" value={periodEnd} onChange={e => setPeriodEnd(e.target.value)} className="h-8 text-xs" />
              </div>
            </div>

            {/* Botão calcular automaticamente */}
            <Button variant="outline" size="sm" className="w-full h-7 text-xs gap-1" onClick={loadAutoData} disabled={loadingAuto}>
              {loadingAuto ? <Loader2 className="h-3 w-3 animate-spin" /> : <Calculator className="h-3 w-3" />}
              Calcular automaticamente a partir dos dados do Atlas
            </Button>

            {autoData && (
              <div className="rounded-lg bg-muted/50 border border-border/40 p-2.5 text-xs space-y-1">
                <p className="font-semibold text-[10px] uppercase tracking-wide text-muted-foreground">Dados calculados automaticamente</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
                  <span>Lotes total: <strong>{autoData.lots_total}</strong></span>
                  <span>Lotes aprovados: <strong>{autoData.lots_approved}</strong></span>
                  <span>NCs total: <strong>{autoData.ncs_total}</strong></span>
                  <span>NCs fechadas: <strong>{autoData.ncs_closed_on_time}</strong></span>
                </div>
              </div>
            )}

            <Separator />

            {/* 4 critérios */}
            <div className="space-y-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Pontuação por critério (0–25 cada)</p>
              <ScoreInput label="Cumprimento de Prazos" hint="Entregas na data prevista" value={scoreDelivery} onChange={setScoreDelivery} />
              <ScoreInput label="Qualidade dos Certificados" hint="Certificados completos e válidos" value={scoreCerts} onChange={setScoreCerts} />
              <ScoreInput label="Resposta a Não Conformidades" hint="NCs encerradas no prazo" value={scoreNc} onChange={setScoreNc} />
              <ScoreInput label="Conformidade Técnica" hint="Lotes aprovados / total lotes" value={scoreConformity} onChange={setScoreConformity} />
            </div>

            {/* Total e resultado */}
            <div className={cn("flex items-center justify-between rounded-xl border px-4 py-2.5", RESULT_CONFIG[resultCalc]?.color)}>
              <span className="text-sm font-semibold">Total: {total.toFixed(1)}/100</span>
              <Badge variant="outline" className={RESULT_CONFIG[resultCalc]?.color}>
                {RESULT_CONFIG[resultCalc]?.label}
              </Badge>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Observações</Label>
              <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className="text-xs resize-none" placeholder="Contexto da avaliação, pontos de melhoria..." />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button size="sm" className="h-7 text-xs" onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="h-3 w-3 animate-spin mr-1" />} Guardar Avaliação
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
