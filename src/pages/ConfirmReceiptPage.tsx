import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { createClient } from "@supabase/supabase-js";
import { CheckCircle, Loader2, XCircle } from "lucide-react";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export default function ConfirmReceiptPage() {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const recipientId = params.get("id");
  const [status, setStatus] = useState<"loading" | "confirmed" | "error">("loading");
  const [subject, setSubject] = useState("");
  const [confirmedAt, setConfirmedAt] = useState("");

  useEffect(() => {
    if (!recipientId) {
      setStatus("error");
      return;
    }

    const token = params.get("token") ?? "";
    const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: {
        headers: { "x-confirmation-token": token },
      },
    });

    (async () => {
      try {
        // Check if already confirmed
        const { data: recipient, error: readErr } = await client
          .from("notification_recipients")
          .select("id, confirmed_at, notification_id")
          .eq("id", recipientId)
          .single();

        if (readErr || !recipient) {
          setStatus("error");
          return;
        }

        if (recipient.confirmed_at) {
          setConfirmedAt(new Date(recipient.confirmed_at).toLocaleString());
          const { data: log } = await client
            .from("notifications_log")
            .select("subject")
            .eq("id", recipient.notification_id)
            .single();
          if (log) setSubject(log.subject);
          setStatus("confirmed");
          return;
        }

        // Confirm now
        const { error: updateErr } = await client
          .from("notification_recipients")
          .update({ confirmed_at: new Date().toISOString() })
          .eq("id", recipientId);

        if (updateErr) {
          setStatus("error");
          return;
        }

        const now = new Date().toLocaleString();
        setConfirmedAt(now);

        const { data: log } = await client
          .from("notifications_log")
          .select("subject")
          .eq("id", recipient.notification_id)
          .single();
        if (log) setSubject(log.subject);

        setStatus("confirmed");
      } catch {
        setStatus("error");
      }
    })();
  }, [recipientId]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6">
        {/* Logo */}
        <div className="flex justify-center">
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <span className="text-xl font-black text-primary">A</span>
          </div>
        </div>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">Atlas Quality Management System</p>

        {status === "loading" && (
          <div className="space-y-3 py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
            <p className="text-sm text-muted-foreground">{t("common.loading", { defaultValue: "A carregar..." })}</p>
          </div>
        )}

        {status === "confirmed" && (
          <div className="space-y-4 py-6">
            <CheckCircle className="h-16 w-16 text-emerald-500 mx-auto" />
            <h1 className="text-2xl font-bold text-foreground">
              {t("notifications.confirmTitle", { defaultValue: "Recepção Confirmada" })}
            </h1>
            {subject && (
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{t("notifications.subject", { defaultValue: "Assunto" })}:</span> {subject}
              </p>
            )}
            {confirmedAt && (
              <p className="text-xs text-muted-foreground">{confirmedAt}</p>
            )}
            <p className="text-sm text-muted-foreground mt-4">
              {t("notifications.confirmMsg", { defaultValue: "A sua recepção foi registada. Pode fechar esta janela." })}
            </p>
          </div>
        )}

        {status === "error" && (
          <div className="space-y-4 py-6">
            <XCircle className="h-16 w-16 text-destructive mx-auto" />
            <h1 className="text-xl font-bold text-foreground">
              {t("common.error", { defaultValue: "Erro" })}
            </h1>
            <p className="text-sm text-muted-foreground">
              {t("notifications.confirmError", { defaultValue: "Não foi possível confirmar a recepção. O link pode ser inválido." })}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
