/**
 * ConfirmHpPage — rota pública /confirm-hp?token=xxx
 * Mostra detalhes do HP antes de pedir confirmação.
 */

import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { createClient } from "@supabase/supabase-js";
import {
  CheckCircle, Loader2, XCircle, ClipboardCheck,
  Calendar, MapPin, AlertTriangle, Building2,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const SUPABASE_URL      = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

type PageStatus = "loading_preview" | "form" | "submitting" | "confirmed" | "already_confirmed" | "error";

interface HpPreview {
  found: boolean; already_used: boolean; code: string; ppi_ref: string;
  point_no: string; activity: string; location_pk: string | null;
  planned_at: string; status: string; confirmed_by: string | null;
}

export default function ConfirmHpPage() {
  const [params]  = useSearchParams();
  const token     = params.get("token");
  const [status,  setStatus]  = useState<PageStatus>("loading_preview");
  const [preview, setPreview] = useState<HpPreview | null>(null);
  const [name,    setName]    = useState("");
  const [entity,  setEntity]  = useState("IP — Infraestruturas de Portugal, S.A.");
  const [errorMsg, setErrorMsg] = useState("");

  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  const fmtDate = (iso?: string | null) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleString("pt-PT", {
      day: "2-digit", month: "long", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  };

  useEffect(() => {
    if (!token) { setStatus("error"); setErrorMsg("Link inválido — token em falta."); return; }
    (async () => {
      try {
        const { data, error } = await client.rpc("fn_preview_hp_by_token", { p_token: token });
        if (error) throw error;
        if (!data?.found) { setStatus("error"); setErrorMsg("Link inválido ou notificação anulada."); return; }
        setPreview(data as HpPreview);
        setStatus(data.already_used ? "already_confirmed" : "form");
      } catch (err: any) { setStatus("error"); setErrorMsg(err?.message ?? "Erro ao carregar detalhes."); }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const handleConfirm = async () => {
    if (!name.trim() || !token) return;
    setStatus("submitting");
    try {
      const { data, error } = await client.rpc("fn_confirm_hp_by_token", {
        p_token: token, p_name: name.trim(), p_entity: entity.trim(),
      });
      if (error) throw error;
      if (!data?.success) { setErrorMsg(data?.error ?? "Erro."); setStatus("error"); return; }
      setStatus("confirmed");
    } catch (err: any) { setErrorMsg(err?.message ?? "Erro ao processar."); setStatus("error"); }
  };

  const DetailCard = ({ dim = false }: { dim?: boolean }) => !preview ? null : (
    <div className={`rounded-xl border-2 ${dim ? "border-gray-200 bg-gray-50" : "border-blue-100 bg-blue-50"} p-4 space-y-3`}>
      <div className="flex items-start gap-3">
        <ClipboardCheck className={`h-5 w-5 mt-0.5 shrink-0 ${dim ? "text-gray-400" : "text-blue-600"}`} />
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Notificação HP</p>
          <p className={`text-base font-bold font-mono ${dim ? "text-gray-500" : "text-[#192F48]"}`}>{preview.code}</p>
          <p className="text-xs text-gray-500 mt-0.5">{preview.ppi_ref} · Ponto {preview.point_no}</p>
        </div>
      </div>
      <div className="flex items-start gap-3">
        <Building2 className={`h-4 w-4 mt-0.5 shrink-0 ${dim ? "text-gray-400" : "text-blue-500"}`} />
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Actividade / Ponto de Controlo</p>
          <p className="text-sm font-medium text-gray-800">{preview.activity}</p>
        </div>
      </div>
      {preview.location_pk && (
        <div className="flex items-start gap-3">
          <MapPin className={`h-4 w-4 mt-0.5 shrink-0 ${dim ? "text-gray-400" : "text-blue-500"}`} />
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Localização</p>
            <p className="text-sm font-mono text-gray-800">{preview.location_pk}</p>
          </div>
        </div>
      )}
      <div className="flex items-start gap-3">
        <Calendar className={`h-4 w-4 mt-0.5 shrink-0 ${dim ? "text-gray-400" : "text-blue-500"}`} />
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Data e Hora Previstas da Inspecção</p>
          <p className={`text-sm font-semibold ${dim ? "text-gray-500" : "text-[#192F48]"}`}>{fmtDate(preview.planned_at)}</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 to-gray-50 flex items-start justify-center p-4 pt-8">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="bg-[#192F48] px-6 py-5 flex items-center gap-3">
          <ClipboardCheck className="h-6 w-6 text-blue-300" />
          <div>
            <h1 className="font-bold text-white text-base">Atlas QMS · PF17A</h1>
            <p className="text-xs text-blue-200">Confirmação de Presença — Hold Point 48h</p>
          </div>
        </div>

        <div className="px-6 py-6 space-y-5">

          {status === "loading_preview" && (
            <div className="flex flex-col items-center gap-3 py-10">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <p className="text-sm text-gray-500">A carregar detalhes…</p>
            </div>
          )}

          {status === "form" && (
            <>
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-sm text-amber-800">
                  Foi solicitada a sua <strong>presença obrigatória</strong> para aprovação do seguinte ponto de controlo em obra ferroviária.
                </p>
              </div>
              <DetailCard />
              <div className="space-y-3 pt-1">
                <p className="text-sm font-semibold text-gray-700">Confirme a sua presença:</p>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Nome completo *</label>
                  <input type="text" className="w-full border-2 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                    placeholder="Nome do representante da Fiscalização"
                    value={name} onChange={e => setName(e.target.value)} autoFocus />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Entidade</label>
                  <input type="text" className="w-full border-2 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                    value={entity} onChange={e => setEntity(e.target.value)} />
                </div>
              </div>
              <Button className="w-full h-12 text-sm font-semibold rounded-xl" disabled={!name.trim()} onClick={handleConfirm}>
                <CheckCircle className="h-4 w-4 mr-2" /> Confirmar Presença
              </Button>
              <p className="text-[11px] text-gray-400 text-center">ACE ASCH Infraestructuras + Cimontubo · Empreitada PF17A — Linha do Sul</p>
            </>
          )}

          {status === "submitting" && (
            <div className="flex flex-col items-center gap-3 py-10">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <p className="text-sm text-gray-500">A registar confirmação…</p>
            </div>
          )}

          {status === "confirmed" && (
            <>
              <div className="flex flex-col items-center gap-2 py-2">
                <div className="rounded-full bg-emerald-100 p-3"><CheckCircle className="h-10 w-10 text-emerald-600" /></div>
                <h2 className="text-lg font-bold text-emerald-700">Presença Confirmada</h2>
                <p className="text-sm text-gray-500 text-center">O seu registo foi guardado no Atlas QMS. Obrigado.</p>
              </div>
              <DetailCard />
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-xs text-gray-700 space-y-1">
                <p><strong>Confirmado por:</strong> {name}</p>
                <p><strong>Entidade:</strong> {entity}</p>
                <p><strong>Data:</strong> {fmtDate(new Date().toISOString())}</p>
              </div>
              <p className="text-[11px] text-gray-400 text-center">Este registo será incluído na documentação final de obra (DFO-PF17A-001).</p>
            </>
          )}

          {status === "already_confirmed" && (
            <>
              <div className="flex flex-col items-center gap-2 py-2">
                <div className="rounded-full bg-blue-100 p-3"><CheckCircle className="h-10 w-10 text-blue-500" /></div>
                <h2 className="text-lg font-bold text-blue-700">Já Confirmado</h2>
                <p className="text-sm text-gray-500 text-center">
                  Esta notificação já foi confirmada{preview?.confirmed_by ? ` por ${preview.confirmed_by}` : ""}.
                </p>
              </div>
              <DetailCard dim />
              <p className="text-[11px] text-gray-400 text-center">Em caso de dúvida contacte o Técnico de Qualidade.</p>
            </>
          )}

          {status === "error" && (
            <div className="flex flex-col items-center gap-4 py-8">
              <div className="rounded-full bg-red-100 p-3"><XCircle className="h-10 w-10 text-destructive" /></div>
              <h2 className="text-base font-bold text-destructive">Não foi possível processar</h2>
              <p className="text-sm text-gray-600 text-center">{errorMsg || "Link inválido ou expirado."}</p>
              <p className="text-xs text-gray-400 text-center">Se necessitar de assistência contacte o TQ da empreitada.</p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
