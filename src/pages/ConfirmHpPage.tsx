/**
 * ConfirmHpPage — rota pública /confirm-hp?token=xxx
 * Permite à Fiscalização/IP confirmar presença num HP sem necessidade de login.
 * Usa RPC fn_confirm_hp_by_token com SECURITY DEFINER.
 */

import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { createClient } from "@supabase/supabase-js";
import { CheckCircle, Loader2, XCircle, ClipboardCheck, Calendar, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

type PageStatus = "form" | "loading" | "confirmed" | "already_confirmed" | "error";

export default function ConfirmHpPage() {
  const [params] = useSearchParams();
  const token = params.get("token");

  const [status, setStatus] = useState<PageStatus>("form");
  const [name, setName]     = useState("");
  const [entity, setEntity] = useState("IP — Infraestruturas de Portugal, S.A.");
  const [details, setDetails] = useState<{
    code: string; ppi_ref: string; point_no: string; activity: string; planned_at: string;
  } | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!token) setStatus("error");
  }, [token]);

  const handleConfirm = async () => {
    if (!name.trim() || !token) return;
    setStatus("loading");

    try {
      const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      const { data, error } = await client.rpc("fn_confirm_hp_by_token", {
        p_token:  token,
        p_name:   name.trim(),
        p_entity: entity.trim(),
      });

      if (error) throw error;
      if (!data?.success) {
        setErrorMsg(data?.error ?? "Token inválido ou já utilizado.");
        setStatus("error");
        return;
      }

      setDetails(data);
      setStatus("confirmed");
    } catch (err: any) {
      setErrorMsg(err?.message ?? "Erro ao processar confirmação.");
      setStatus("error");
    }
  };

  const fmtDate = (iso?: string) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleString("pt-PT", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg overflow-hidden">
        {/* Cabeçalho */}
        <div className="bg-[#192F48] px-6 py-5 text-white">
          <div className="flex items-center gap-3">
            <ClipboardCheck className="h-6 w-6 text-blue-300" />
            <div>
              <h1 className="font-bold text-base">Atlas QMS · PF17A</h1>
              <p className="text-xs text-blue-200">Confirmação de Presença — Hold Point 48h</p>
            </div>
          </div>
        </div>

        <div className="px-6 py-6">
          {/* FORM */}
          {status === "form" && (
            <div className="space-y-5">
              <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
                <strong>Notificação de Hold Point</strong> — foi solicitada a sua presença para inspecção e aprovação de um ponto de controlo em obra ferroviária.
              </div>

              <p className="text-sm text-gray-600">
                Por favor confirme a sua presença preenchendo os campos abaixo.
              </p>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Nome completo *
                  </label>
                  <input
                    type="text"
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Nome do representante da Fiscalização"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Entidade
                  </label>
                  <input
                    type="text"
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={entity}
                    onChange={e => setEntity(e.target.value)}
                  />
                </div>
              </div>

              <Button
                className="w-full"
                disabled={!name.trim()}
                onClick={handleConfirm}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Confirmar Presença
              </Button>

              <p className="text-[11px] text-gray-400 text-center">
                ACE ASCH Infraestructuras + Cimontubo · Empreitada PF17A — Linha do Sul
              </p>
            </div>
          )}

          {/* LOADING */}
          {status === "loading" && (
            <div className="flex flex-col items-center gap-4 py-8">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <p className="text-sm text-gray-600">A processar confirmação…</p>
            </div>
          )}

          {/* CONFIRMADO */}
          {status === "confirmed" && details && (
            <div className="space-y-4">
              <div className="flex flex-col items-center gap-2 py-4">
                <CheckCircle className="h-12 w-12 text-emerald-500" />
                <h2 className="text-lg font-bold text-emerald-700">Presença Confirmada</h2>
                <p className="text-sm text-gray-500">Obrigado pela confirmação.</p>
              </div>

              <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-4 space-y-2">
                <div className="flex items-start gap-2">
                  <ClipboardCheck className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-gray-700">Notificação</p>
                    <p className="text-sm font-mono font-bold">{details.code}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-gray-700">Ponto de Controlo</p>
                    <p className="text-sm">{details.ppi_ref} · Ponto {details.point_no}</p>
                    <p className="text-xs text-gray-500">{details.activity}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Calendar className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-gray-700">Data Prevista</p>
                    <p className="text-sm font-semibold">{fmtDate(details.planned_at)}</p>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg px-4 py-3 text-xs text-gray-500">
                Confirmado por: <strong className="text-gray-700">{name}</strong> · {entity}
              </div>

              <p className="text-[11px] text-gray-400 text-center">
                Esta confirmação foi registada no Atlas QMS com timestamp e será incluída na documentação da obra.
              </p>
            </div>
          )}

          {/* ERRO */}
          {status === "error" && (
            <div className="flex flex-col items-center gap-4 py-8">
              <XCircle className="h-10 w-10 text-destructive" />
              <h2 className="text-base font-bold text-destructive">Não foi possível confirmar</h2>
              <p className="text-sm text-gray-600 text-center">
                {errorMsg || "Link inválido, expirado ou já utilizado anteriormente."}
              </p>
              <p className="text-xs text-gray-400 text-center">
                Se necessitar de assistência, contacte o Técnico de Qualidade da empreitada.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
