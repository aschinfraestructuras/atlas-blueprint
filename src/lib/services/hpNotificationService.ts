/**
 * HP Notification Service — NOT-HP (Hold Point 48h notification)
 * Manages creation, confirmation, cancellation and expiration of HP notifications.
 */

import { supabase } from "@/integrations/supabase/client";
import { fullPdfHeader, projectInfoStripHtml, type PdfProjectInfo } from "./pdfProjectHeader";
import { resolveProjectLogoBase64 } from "./projectLogoResolver";

export interface HpNotification {
  id: string;
  project_id: string;
  instance_id: string;
  item_id: string | null;
  code: string;
  ppi_ref: string;
  point_no: string;
  activity: string;
  location_pk: string | null;
  planned_datetime: string;
  notified_at: string;
  notified_by: string | null;
  confirmed_at: string | null;
  confirmed_by: string | null;
  status: "pending" | "confirmed" | "expired" | "cancelled";
  notes: string | null;
  rfi_ref: string | null;
  created_at: string;
}

export interface HpNotificationInput {
  project_id: string;
  instance_id: string;
  item_id?: string | null;
  ppi_ref: string;
  point_no: string;
  activity: string;
  location_pk?: string | null;
  planned_datetime: string;
  notes?: string | null;
  rfi_ref?: string | null;
  advance_notice_override?: boolean;
  advance_notice_reason?: string | null;
}

export const hpNotificationService = {
  async create(input: HpNotificationInput): Promise<HpNotification> {
    // Generate code via DB function
    const { data: codeData, error: codeErr } = await (supabase as any).rpc(
      "fn_next_hp_notification_code",
      { p_project_id: input.project_id }
    );
    if (codeErr) throw codeErr;
    const code = codeData as string;

    const { data: { user } } = await supabase.auth.getUser();

    const { data, error } = await (supabase as any)
      .from("hp_notifications")
      .insert({
        project_id: input.project_id,
        instance_id: input.instance_id,
        item_id: input.item_id ?? null,
        code,
        ppi_ref: input.ppi_ref,
        point_no: input.point_no,
        activity: input.activity,
        location_pk: input.location_pk ?? null,
        planned_datetime: input.planned_datetime,
        notified_by: user?.id ?? null,
        notes: input.notes ?? null,
        rfi_ref: input.rfi_ref ?? null,
        advance_notice_override: input.advance_notice_override ?? false,
        advance_notice_reason: input.advance_notice_reason ?? null,
        status: "pending",
      })
      .select()
      .single();
    if (error) throw error;

    // Notify relevant project members (project_manager, quality_manager, tenant_admin)
    try {
      const { data: members } = await (supabase as any)
        .from("project_members")
        .select("user_id, role")
        .eq("project_id", input.project_id)
        .in("role", ["project_manager", "quality_manager", "tenant_admin", "admin"]);

      if (members && members.length > 0) {
        const notifications = members
          .filter((m: any) => m.user_id !== user?.id)
          .map((m: any) => ({
            project_id: input.project_id,
            user_id: m.user_id,
            type: "hp_notification",
            title: `HP Notificado: ${input.ppi_ref} — Ponto ${input.point_no}`,
            body: `Actividade: ${input.activity}. Previsto: ${new Date(input.planned_datetime).toLocaleString("pt-PT")}`,
            link_entity_type: "ppi_instance",
            link_entity_id: input.instance_id,
            is_read: false,
          }));
        if (notifications.length > 0) {
          await (supabase as any).from("notifications").insert(notifications);
        }
      }
    } catch {
      // Non-blocking: don't fail HP creation if notification insert fails
    }

    return data as HpNotification;
  },

  async listByInstance(instanceId: string): Promise<HpNotification[]> {
    const { data, error } = await (supabase as any)
      .from("hp_notifications")
      .select("*")
      .eq("instance_id", instanceId)
      .order("planned_datetime", { ascending: true });
    if (error) throw error;
    return (data ?? []) as HpNotification[];
  },

  async listByProject(projectId: string): Promise<HpNotification[]> {
    const { data, error } = await (supabase as any)
      .from("hp_notifications")
      .select("*")
      .eq("project_id", projectId)
      .order("planned_datetime", { ascending: true });
    if (error) throw error;
    return (data ?? []) as HpNotification[];
  },

  async listPendingForDeadlines(
    projectId: string,
    daysAhead = 7
  ): Promise<HpNotification[]> {
    const now = new Date();
    const future = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);

    const { data, error } = await (supabase as any)
      .from("hp_notifications")
      .select("*, ppi_instances!inner(id, is_deleted)")
      .eq("project_id", projectId)
      .eq("status", "pending")
      .eq("ppi_instances.is_deleted", false)
      .lte("planned_datetime", future.toISOString())
      .order("planned_datetime", { ascending: true });
    if (error) throw error;
    return (data ?? []) as HpNotification[];
  },

  async confirm(id: string, confirmedBy: string): Promise<HpNotification> {
    const { data, error } = await (supabase as any)
      .from("hp_notifications")
      .update({
        status: "confirmed",
        confirmed_at: new Date().toISOString(),
        confirmed_by: confirmedBy,
      })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;

    const notification = data as HpNotification;

    // Notify the original submitter that HP was confirmed
    try {
      if (notification.notified_by) {
        await (supabase as any).from("notifications").insert({
          project_id: notification.project_id,
          user_id: notification.notified_by,
          type: "hp_confirmed",
          title: `HP Confirmado: ${notification.ppi_ref} — Ponto ${notification.point_no}`,
          body: `Confirmado por: ${confirmedBy}`,
          link_entity_type: "ppi_instance",
          link_entity_id: notification.instance_id,
          is_read: false,
        });
      }
    } catch {
      // Non-blocking
    }

    return notification;
  },

  async cancel(id: string): Promise<HpNotification> {
    const { data, error } = await (supabase as any)
      .from("hp_notifications")
      .update({ status: "cancelled" })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data as HpNotification;
  },

  async checkExpired(projectId: string): Promise<number> {
    const threshold = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    const { data, error } = await (supabase as any)
      .from("hp_notifications")
      .update({ status: "expired" })
      .eq("project_id", projectId)
      .eq("status", "pending")
      .lt("planned_datetime", threshold)
      .select("id");
    if (error) throw error;
    return (data ?? []).length;
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// NOT-HP PDF Export — fiel ao NOTHPPF17A Rev.00 Março 2026
// ─────────────────────────────────────────────────────────────────────────────

export interface HpNotificationPdfOptions {
  notification: HpNotification;
  instance: { code: string; description?: string | null };
  projectName: string;
  projectId: string;
  projectMeta?: PdfProjectInfo | null;
}

export async function exportHpNotificationPdf(opts: HpNotificationPdfOptions): Promise<void> {
  const { notification: n, instance, projectName, projectId, projectMeta } = opts;

  // Resolver logo (pode ser null se não configurado)
  const logoBase64 = await resolveProjectLogoBase64(projectId);

  const w = window.open("", "_blank");
  if (!w) return;

  const esc = (v?: string | null) => (v ?? "—").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const fmtDate = (iso?: string | null) => {
    if (!iso) return "____/____/________";
    return new Date(iso).toLocaleDateString("pt-PT", { day: "2-digit", month: "2-digit", year: "numeric" });
  };
  const fmtTime = (iso?: string | null) => {
    if (!iso) return "______h";
    return new Date(iso).toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" }) + "h";
  };
  const fmtDateTime = (iso?: string | null) => iso ? `${fmtDate(iso)} ${fmtTime(iso)}` : "—";

  const statusLabel: Record<string, string> = {
    pending: "Pendente — aguarda confirmação F/IP",
    confirmed: "Confirmada",
    expired: "Expirada — sem confirmação",
    cancelled: "Cancelada",
  };

  const header = fullPdfHeader(
    logoBase64,
    projectName,
    n.code,
    "Rev.00",
    fmtDate(n.notified_at ?? n.created_at),
    projectMeta?.contractor,
    projectMeta?.client,
    projectMeta,
  );

  const infoStrip = projectInfoStripHtml(projectMeta);

  // ── Secção 3 — checkboxes condições prévias
  const checkbox = (checked = false) =>
    `<span style="display:inline-block;width:12px;height:12px;border:1.5px solid #374151;border-radius:2px;margin-right:4px;background:${checked ? "#192F48" : "none"};vertical-align:middle;"></span>`;

  const prereqs = [
    "PAME / FAV dos materiais aprovado",
    "Ensaios anteriores conformes (BE-CAMPO/LAB)",
    "HP anterior aprovado (se dependência)",
    "EMEs calibrados disponíveis",
    "Topógrafo disponível (se medição topográfica)",
  ];

  const docsNeeded = [
    `PPI-PF17A-__ (secção relevante)`,
    "FAV / PAME aprovada",
    "BE-CAMPO / BE-LAB anteriores",
    "Peças do projecto",
    "ATA-Q de HPs anteriores desta fase",
  ];

  w.document.write(`<!DOCTYPE html><html lang="pt"><head>
<meta charset="utf-8">
<title>${esc(n.code)}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 10.5px; color: #111; background: #fff; padding: 12mm 14mm; }
  h3 { font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: .1em; color: #192F48;
       border-bottom: 1.5px solid #192F48; padding-bottom: 3px; margin: 14px 0 8px; }
  .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 18px; }
  .grid3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 6px 12px; }
  .field { margin-bottom: 4px; }
  .label { font-size: 8px; font-weight: 700; text-transform: uppercase; letter-spacing: .1em; color: #6b7280; display: block; margin-bottom: 1px; }
  .value { font-size: 10.5px; color: #111; border-bottom: 1px solid #d1d5db; padding-bottom: 2px; min-height: 18px; display: block; }
  .value.mono { font-family: "Courier New", monospace; font-weight: 700; font-size: 11px; }
  .value.big  { font-size: 12px; font-weight: 800; color: #192F48; }
  .callout { background: #fef9c3; border: 1px solid #fbbf24; border-radius: 4px; padding: 6px 10px; font-size: 9.5px; margin-bottom: 10px; }
  .callout strong { color: #92400e; }
  .prereq-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 16px; margin-top: 4px; }
  .prereq-item { display: flex; align-items: center; font-size: 9.5px; gap: 4px; }
  .result-box { border: 2.5px solid #192F48; border-radius: 6px; padding: 8px 14px; margin-top: 8px; }
  .result-choices { display: flex; gap: 24px; margin-top: 6px; }
  .choice { display: flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 700; }
  .sig-row { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 40px; }
  .sig-block { text-align: center; font-size: 9.5px; }
  .sig-block .role { font-weight: 700; color: #192F48; font-size: 10px; margin-bottom: 4px; }
  .sig-line { border-top: 1px solid #374151; margin-top: 38px; padding-top: 4px; }
  .page-break { page-break-before: always; padding-top: 8mm; }
  .footer { margin-top: 24px; padding-top: 6px; border-top: 1px solid #d1d5db; display: flex; justify-content: space-between; font-size: 8px; color: #9ca3af; }
  .status-badge { display: inline-block; padding: 2px 8px; border-radius: 20px; font-size: 9px; font-weight: 700; letter-spacing: .06em;
    background: ${n.status === "confirmed" ? "#d1fae5" : n.status === "pending" ? "#fef3c7" : "#fee2e2"};
    color: ${n.status === "confirmed" ? "#065f46" : n.status === "pending" ? "#92400e" : "#991b1b"}; }
  @page { size: A4 portrait; margin: 10mm 12mm; }
  @media print { body { padding: 0; } }
</style>
</head><body>

${header}
${infoStrip}

<div class="callout">
  <strong>Regra contratual:</strong> A Fiscalização/IP deve ser notificada com mínimo de <strong>48 horas de antecedência</strong> para cada HP
  (PQO-PF17A-001 Sec. 10). Sem esta notificação, o HP não pode ser considerado válido e o trabalho não pode avançar.
</div>

<!-- SECÇÃO 1 -->
<h3>1 — Identificação da Notificação</h3>
<div class="grid3">
  <div class="field">
    <span class="label">N.º Notificação</span>
    <span class="value mono big">${esc(n.code)}</span>
  </div>
  <div class="field">
    <span class="label">Data de Emissão</span>
    <span class="value">${fmtDate(n.notified_at ?? n.created_at)}</span>
  </div>
  <div class="field">
    <span class="label">Hora de Emissão</span>
    <span class="value">${fmtTime(n.notified_at ?? n.created_at)}</span>
  </div>
</div>
<div class="field" style="margin-top:6px">
  <span class="label">Emitida Por — TQ / RMSGQ</span>
  <span class="value">${esc((n as any).notified_by_name ?? n.notified_by ?? "")}</span>
</div>

<!-- SECÇÃO 2 -->
<h3>2 — Dados do Hold Point</h3>
<div class="grid2">
  <div class="field">
    <span class="label">PPI de Referência · N.º do Ponto</span>
    <span class="value mono">${esc(n.ppi_ref)} · Ponto ${esc(n.point_no)}</span>
  </div>
  <div class="field">
    <span class="label">Estado da Notificação</span>
    <span class="value"><span class="status-badge">${esc(statusLabel[n.status] ?? n.status)}</span></span>
  </div>
  <div class="field">
    <span class="label">GR / BE-Campo Associado</span>
    <span class="value">${esc((n as any).gr_ref ?? "")}</span>
  </div>
  <div class="field">
    <span class="label">ATA-Q a Emitir</span>
    <span class="value">ATA-Q-PF17A- ____________</span>
  </div>
</div>
<div class="field" style="margin-top:6px">
  <span class="label">Actividade / Trabalho Sujeito a HP</span>
  <span class="value">${esc(n.activity)}</span>
</div>
<div class="field" style="margin-top:6px">
  <span class="label">Localização — PK / Elemento / Zona</span>
  <span class="value">${esc(n.location_pk)}</span>
</div>
${n.notes ? `<div class="field" style="margin-top:6px"><span class="label">Notas / Observações</span><span class="value">${esc(n.notes)}</span></div>` : ""}

<!-- SECÇÃO 3 -->
<h3>3 — Data e Hora Previstas para a Inspecção</h3>
<div class="grid3">
  <div class="field">
    <span class="label">Data Prevista da Inspecção HP</span>
    <span class="value">${fmtDate(n.planned_datetime)}</span>
  </div>
  <div class="field">
    <span class="label">Hora Prevista</span>
    <span class="value">${fmtTime(n.planned_datetime)}</span>
  </div>
  <div class="field">
    <span class="label">Prazo Limite de Resposta F/IP</span>
    <span class="value" style="font-size:9px;">48h antes da data/hora prevista. Sem resposta: contactar DO imediatamente.</span>
  </div>
</div>

<div style="margin-top:8px">
  <span class="label" style="margin-bottom:4px;display:block">Condições Prévias Necessárias Para o HP</span>
  <div class="prereq-grid">
    ${prereqs.map(p => `<div class="prereq-item">${checkbox()} ${p}</div>`).join("")}
    <div class="prereq-item">${checkbox()} Outro: ___________________________</div>
  </div>
</div>

<div style="margin-top:8px">
  <span class="label" style="margin-bottom:4px;display:block">Documentos a Ter Disponíveis na Inspecção</span>
  <div class="prereq-grid">
    ${docsNeeded.map(d => `<div class="prereq-item">${checkbox()} ${d}</div>`).join("")}
    <div class="prereq-item">${checkbox()} Outro: ___________________________</div>
  </div>
</div>

<!-- SECÇÃO 4 -->
<h3>4 — Destinatário e Confirmação de Recepção</h3>
<div class="grid2">
  <div class="field">
    <span class="label">Destinatário — Fiscalização / IP</span>
    <span class="value">IP — Infraestruturas de Portugal, S.A.</span>
  </div>
  <div class="field">
    <span class="label">Método de Envio</span>
    <span class="value" style="font-size:9px;">
      ${checkbox()} E-mail com acuse de leitura &nbsp;
      ${checkbox()} Plataforma documental &nbsp;
      ${checkbox()} Entrega física com assinatura
    </span>
  </div>
  <div class="field">
    <span class="label">Confirmação de Recepção pela Fiscalização</span>
    <span class="value">
      ${n.status === "confirmed" && n.confirmed_at
        ? `Confirmada em: ${fmtDateTime(n.confirmed_at)}`
        : "Confirmada em: ____/____/____ às ______h"}
    </span>
  </div>
  <div class="field">
    <span class="label">Sem Resposta — Escalado ao DO em</span>
    <span class="value">____/____/________ às ______h</span>
  </div>
</div>

<!-- ASSINATURAS PAG 1 -->
<div class="sig-row" style="margin-top:24px">
  <div class="sig-block">
    <div class="role">Emitida Por — TQ / RMSGQ</div>
    <div>Nome: ______________________________</div>
    <div style="margin-top:4px">Data/Hora: ____/____/____ ______h</div>
    <div class="sig-line">Assinatura</div>
  </div>
  <div class="sig-block">
    <div class="role">Recebida Pela Fiscalização / IP</div>
    <div>Nome: ______________________________</div>
    <div style="margin-top:4px">Data/Hora: ____/____/____ ______h</div>
    <div class="sig-line">Assinatura</div>
  </div>
</div>

<div class="footer">
  <span>Empreitada PF17A — ACE ASCH Infraestructuras + Cimontubo</span>
  <span>${esc(n.code)} · Pág. 1 / 2</span>
</div>

<!-- ═══════════════════ PÁGINA 2 ═══════════════════ -->
<div class="page-break">
${header}
${infoStrip}

<h3>5 — Resultado — Preenchido Após a Inspecção</h3>
<div class="grid2" style="margin-bottom:12px">
  <div class="field">
    <span class="label">Data / Hora Real da Inspecção HP</span>
    <span class="value">____/____/____ ______h</span>
  </div>
  <div class="field">
    <span class="label">ATA-Q Emitida</span>
    <span class="value">ATA-Q-PF17A- ____________</span>
  </div>
</div>

<div class="result-box">
  <span class="label" style="margin-bottom:4px;display:block">Resultado do HP</span>
  <div class="result-choices">
    <div class="choice">${checkbox()} Aprovado</div>
    <div class="choice">${checkbox()} Aprovado c/ Condições</div>
    <div class="choice">${checkbox()} Reprovado</div>
  </div>
  <div style="margin-top:8px">
    <span class="label">Condições / Observações (se aprovado c/ condições ou reprovado)</span>
    <span class="value" style="min-height:40px;">&nbsp;</span>
  </div>
</div>

<div style="margin-top:12px">
  <span class="label">RNC Aberta (se HP reprovado)</span>
  <span class="value">RNC-PF17A- ____________ &nbsp;&nbsp; ${checkbox()} Não aplicável</span>
</div>

<div class="sig-row" style="margin-top:32px">
  <div class="sig-block">
    <div class="role">Emitida Por — TQ</div>
    <div>Nome: ______________________________</div>
    <div style="margin-top:4px">Data/Hora: ____/____/____ ______h</div>
    <div class="sig-line">Assinatura</div>
  </div>
  <div class="sig-block">
    <div class="role">Recebida Pela Fiscalização / IP</div>
    <div>Nome: ______________________________</div>
    <div style="margin-top:4px">Data/Hora de recepção: ____/____/________</div>
    <div class="sig-line">Assinatura</div>
  </div>
</div>

<div style="margin-top:36px;padding:8px 12px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:4px;font-size:9px;color:#6b7280;">
  <strong style="color:#192F48;">Instruções de envio:</strong>
  Enviar por e-mail com confirmação de leitura (ou entregar fisicamente com acuse de recepção).
  O original fica arquivado no Dossier de Campo. Uma cópia é entregue à F/IP.
  Registar no Atlas QMS após confirmação. Código de arquivo: <strong>${esc(n.code)}</strong>.
</div>

<div class="footer">
  <span>Empreitada PF17A — ACE ASCH Infraestructuras + Cimontubo</span>
  <span>${esc(n.code)} · Pág. 2 / 2</span>
</div>
</div>

</body></html>`);

  w.document.close();
  // Pequeno delay para garantir render antes do print
  setTimeout(() => { try { w.print(); } catch { /* silenciar em caso de popup blocker */ } }, 400);
}
