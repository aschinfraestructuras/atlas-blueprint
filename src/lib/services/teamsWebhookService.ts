/**
 * teamsWebhookService — Cliente para o Edge Function teams-notification.
 * Chama o EF com auth e deixa o servidor fazer o POST ao Teams.
 */
import { supabase } from "@/integrations/supabase/client";

export type TeamsEventType =
  | "hp_created" | "hp_confirmed"
  | "nc_open"    | "nc_overdue"
  | "test_fail"  | "custom";

export interface TeamsNotificationPayload {
  project_id: string;
  event_type: TeamsEventType;
  title: string;
  summary: string;
  details?: Record<string, string>;
  link?: string;
  urgency?: "normal" | "high" | "critical";
}

/**
 * Envia notificação Teams via Edge Function.
 * Falha silenciosamente — nunca bloqueia o fluxo principal.
 */
export async function sendTeamsNotification(
  payload: TeamsNotificationPayload,
): Promise<void> {
  try {
    await supabase.functions.invoke("teams-notification", { body: payload });
  } catch {
    // Silencioso — Teams é melhor-esforço, não crítico
  }
}

// ── Helpers tipados para os eventos mais comuns ────────────────────────────

export function teamsHpCreated(opts: {
  projectId: string;
  hpCode: string;
  ppiRef: string;
  activity: string;
  locationPk: string | null;
  plannedDate: string;
  baseUrl?: string;
}) {
  return sendTeamsNotification({
    project_id: opts.projectId,
    event_type: "hp_created",
    urgency: "high",
    title: `NOT-HP criada — ${opts.hpCode}`,
    summary: `Nova notificação de Hold Point registada no Atlas QMS. A Fiscalização/IP deve confirmar até 48h antes da inspecção.`,
    details: {
      "Referência":    opts.hpCode,
      "PPI":           opts.ppiRef,
      "Actividade":    opts.activity,
      "PK / Local":    opts.locationPk ?? "—",
      "Data prevista": opts.plannedDate,
    },
    link: opts.baseUrl ? `${opts.baseUrl}/ppi` : undefined,
  });
}

export function teamsHpConfirmed(opts: {
  projectId: string;
  hpCode: string;
  confirmedBy: string;
  baseUrl?: string;
}) {
  return sendTeamsNotification({
    project_id: opts.projectId,
    event_type: "hp_confirmed",
    urgency: "normal",
    title: `HP Confirmado — ${opts.hpCode}`,
    summary: `O Hold Point foi confirmado pela Fiscalização/IP. Pode prosseguir com os trabalhos.`,
    details: {
      "Referência":      opts.hpCode,
      "Confirmado por":  opts.confirmedBy,
    },
    link: opts.baseUrl ? `${opts.baseUrl}/ppi` : undefined,
  });
}

export function teamsNcOpen(opts: {
  projectId: string;
  ncCode: string;
  title: string;
  severity: string;
  dueDate: string | null;
  baseUrl?: string;
}) {
  const urgency = opts.severity === "critical" ? "critical"
    : opts.severity === "major" ? "high"
    : "normal";

  return sendTeamsNotification({
    project_id: opts.projectId,
    event_type: "nc_open",
    urgency,
    title: `NC Aberta — ${opts.ncCode}`,
    summary: opts.title,
    details: {
      "Referência":   opts.ncCode,
      "Gravidade":    opts.severity,
      "Prazo":        opts.dueDate ?? "Sem prazo definido",
    },
    link: opts.baseUrl ? `${opts.baseUrl}/non-conformities` : undefined,
  });
}
