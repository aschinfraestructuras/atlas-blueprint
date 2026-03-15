import { supabase } from "@/integrations/supabase/client";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export interface TrainingSession {
  id: string;
  project_id: string;
  code: string;
  session_date: string;
  session_type: string;
  title: string;
  location: string | null;
  start_time: string | null;
  end_time: string | null;
  trainer_name: string | null;
  topics: string | null;
  attendee_count: number;
  created_by: string | null;
  created_at: string;
}

export interface TrainingAttendee {
  id: string;
  session_id: string;
  name: string;
  role_function: string | null;
  company: string | null;
  signed: boolean;
}

export interface TrainingSessionInput {
  project_id: string;
  session_date: string;
  session_type: string;
  title: string;
  location?: string;
  start_time?: string;
  end_time?: string;
  trainer_name?: string;
  topics?: string;
  attendees: { name: string; role_function?: string; company?: string }[];
}

export const trainingService = {
  async create(input: TrainingSessionInput): Promise<TrainingSession> {
    // Generate code
    const { data: code, error: codeErr } = await db.rpc("fn_next_training_code", {
      p_project_id: input.project_id,
    });
    if (codeErr) throw codeErr;

    const { data: { user } } = await supabase.auth.getUser();

    const { data: session, error: sessErr } = await db
      .from("training_sessions")
      .insert({
        project_id: input.project_id,
        code,
        session_date: input.session_date,
        session_type: input.session_type,
        title: input.title,
        location: input.location || null,
        start_time: input.start_time || null,
        end_time: input.end_time || null,
        trainer_name: input.trainer_name || null,
        topics: input.topics || null,
        attendee_count: input.attendees.length,
        created_by: user?.id ?? null,
      })
      .select()
      .single();
    if (sessErr) throw sessErr;

    // Insert attendees
    if (input.attendees.length > 0) {
      const rows = input.attendees.map(a => ({
        session_id: session.id,
        name: a.name,
        role_function: a.role_function || null,
        company: a.company || null,
      }));
      const { error: attErr } = await db.from("training_attendees").insert(rows);
      if (attErr) throw attErr;
    }

    return session as TrainingSession;
  },

  async listByProject(projectId: string): Promise<TrainingSession[]> {
    const { data, error } = await db
      .from("training_sessions")
      .select("*")
      .eq("project_id", projectId)
      .order("session_date", { ascending: false });
    if (error) throw error;
    return (data ?? []) as TrainingSession[];
  },

  async getById(id: string): Promise<{ session: TrainingSession; attendees: TrainingAttendee[] }> {
    const { data: session, error: sErr } = await db
      .from("training_sessions")
      .select("*")
      .eq("id", id)
      .single();
    if (sErr) throw sErr;

    const { data: attendees, error: aErr } = await db
      .from("training_attendees")
      .select("*")
      .eq("session_id", id)
      .order("name");
    if (aErr) throw aErr;

    return {
      session: session as TrainingSession,
      attendees: (attendees ?? []) as TrainingAttendee[],
    };
  },

  async addAttendee(sessionId: string, attendee: { name: string; role_function?: string; company?: string }): Promise<void> {
    const { error } = await db.from("training_attendees").insert({
      session_id: sessionId,
      name: attendee.name,
      role_function: attendee.role_function || null,
      company: attendee.company || null,
    });
    if (error) throw error;

    // Update count
    const { count } = await db
      .from("training_attendees")
      .select("id", { count: "exact", head: true })
      .eq("session_id", sessionId);
    await db.from("training_sessions").update({ attendee_count: count ?? 0 }).eq("id", sessionId);
  },

  async deleteSession(id: string): Promise<void> {
    const { error } = await db.from("training_sessions").delete().eq("id", id);
    if (error) throw error;
  },

  exportPdf(session: TrainingSession, attendees: TrainingAttendee[], projectName: string) {
    const typeLabels: Record<string, string> = {
      initial: "Formação Inicial",
      new_personnel: "Integração de Novos Colaboradores",
      specific: "Formação Específica",
      subcontractor: "Formação de Subempreiteiro",
      other: "Outra",
    };

    const attendeeRows = attendees.map((a, i) => `
      <tr>
        <td style="padding:6px 8px;border:1px solid #d1d5db;text-align:center;">${i + 1}</td>
        <td style="padding:6px 8px;border:1px solid #d1d5db;">${a.name}</td>
        <td style="padding:6px 8px;border:1px solid #d1d5db;">${a.role_function ?? "—"}</td>
        <td style="padding:6px 8px;border:1px solid #d1d5db;">${a.company ?? "—"}</td>
        <td style="padding:6px 8px;border:1px solid #d1d5db;text-align:center;">${a.signed ? "✓" : "________________"}</td>
      </tr>
    `).join("");

    // Add empty rows for manual signing
    const emptyRows = Array.from({ length: Math.max(0, 10 - attendees.length) }).map((_, i) => `
      <tr>
        <td style="padding:6px 8px;border:1px solid #d1d5db;text-align:center;">${attendees.length + i + 1}</td>
        <td style="padding:6px 8px;border:1px solid #d1d5db;">&nbsp;</td>
        <td style="padding:6px 8px;border:1px solid #d1d5db;">&nbsp;</td>
        <td style="padding:6px 8px;border:1px solid #d1d5db;">&nbsp;</td>
        <td style="padding:6px 8px;border:1px solid #d1d5db;">&nbsp;</td>
      </tr>
    `).join("");

    const logo = `<svg width="32" height="32" viewBox="0 0 32 32" fill="none"><rect width="32" height="32" rx="6" fill="#2F4F75"/><path d="M16 4L6 9v7c0 5.25 4.25 10.15 10 11.35C21.75 26.15 26 21.25 26 16V9L16 4z" fill="white" fill-opacity="0.9"/><path d="M13 16l2 2 4-4" stroke="#2F4F75" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

    const html = `<!DOCTYPE html>
<html><head>
<meta charset="utf-8">
<title>${session.code} — Registo de Formação</title>
<style>
  @media print { body { margin: 0; } .no-print { display: none; } }
  body { margin: 0; font-family: Arial, Helvetica, sans-serif; font-size: 12px; }
  @page { size: A4 portrait; margin: 15mm; }
  table { border-collapse: collapse; width: 100%; }
</style>
</head><body>
  <div style="background:#0f1e37;color:#fff;padding:12px 20px;display:flex;justify-content:space-between;align-items:center;">
    <div style="display:flex;align-items:center;gap:12px;">
      ${logo}
      <div>
        <div style="font-size:18px;font-weight:900;letter-spacing:0.1em;">ATLAS QMS</div>
        <div style="font-size:10px;opacity:0.7;">Registo de Formação</div>
      </div>
    </div>
    <div style="text-align:right;">
      <div style="font-size:16px;font-weight:700;">${session.code}</div>
      <div style="font-size:10px;opacity:0.7;">${projectName}</div>
    </div>
  </div>

  <div style="padding:20px;">
    <table style="margin-bottom:20px;">
      <tr>
        <td style="padding:6px 8px;font-weight:700;width:160px;border:1px solid #d1d5db;background:#f3f4f6;">Tipo</td>
        <td style="padding:6px 8px;border:1px solid #d1d5db;">${typeLabels[session.session_type] ?? session.session_type}</td>
        <td style="padding:6px 8px;font-weight:700;width:100px;border:1px solid #d1d5db;background:#f3f4f6;">Data</td>
        <td style="padding:6px 8px;border:1px solid #d1d5db;">${new Date(session.session_date).toLocaleDateString("pt-PT")}</td>
      </tr>
      <tr>
        <td style="padding:6px 8px;font-weight:700;border:1px solid #d1d5db;background:#f3f4f6;">Título</td>
        <td colspan="3" style="padding:6px 8px;border:1px solid #d1d5db;">${session.title}</td>
      </tr>
      <tr>
        <td style="padding:6px 8px;font-weight:700;border:1px solid #d1d5db;background:#f3f4f6;">Local</td>
        <td style="padding:6px 8px;border:1px solid #d1d5db;">${session.location ?? "—"}</td>
        <td style="padding:6px 8px;font-weight:700;border:1px solid #d1d5db;background:#f3f4f6;">Horário</td>
        <td style="padding:6px 8px;border:1px solid #d1d5db;">${session.start_time ?? "—"} — ${session.end_time ?? "—"}</td>
      </tr>
      <tr>
        <td style="padding:6px 8px;font-weight:700;border:1px solid #d1d5db;background:#f3f4f6;">Formador</td>
        <td colspan="3" style="padding:6px 8px;border:1px solid #d1d5db;">${session.trainer_name ?? "—"}</td>
      </tr>
    </table>

    ${session.topics ? `
    <div style="margin-bottom:20px;">
      <div style="font-weight:700;font-size:11px;text-transform:uppercase;color:#6b7280;margin-bottom:6px;">Conteúdos / Tópicos</div>
      <div style="border:1px solid #d1d5db;padding:10px;white-space:pre-wrap;min-height:40px;">${session.topics}</div>
    </div>` : ""}

    <div style="font-weight:700;font-size:11px;text-transform:uppercase;color:#6b7280;margin-bottom:6px;">Lista de Presenças</div>
    <table>
      <thead>
        <tr style="background:#f3f4f6;">
          <th style="padding:6px 8px;border:1px solid #d1d5db;width:40px;">#</th>
          <th style="padding:6px 8px;border:1px solid #d1d5db;text-align:left;">Nome</th>
          <th style="padding:6px 8px;border:1px solid #d1d5db;text-align:left;">Função</th>
          <th style="padding:6px 8px;border:1px solid #d1d5db;text-align:left;">Empresa</th>
          <th style="padding:6px 8px;border:1px solid #d1d5db;width:120px;">Assinatura</th>
        </tr>
      </thead>
      <tbody>
        ${attendeeRows}
        ${emptyRows}
      </tbody>
    </table>

    <div style="margin-top:40px;display:flex;justify-content:space-between;">
      <div style="width:45%;">
        <div style="font-weight:700;font-size:11px;margin-bottom:30px;">Formador</div>
        <div style="border-top:1px solid #000;padding-top:4px;font-size:10px;">Nome: ${session.trainer_name ?? "________________"}</div>
        <div style="font-size:10px;margin-top:4px;">Assinatura: ________________</div>
      </div>
      <div style="width:45%;">
        <div style="font-weight:700;font-size:11px;margin-bottom:30px;">Responsável TQ</div>
        <div style="border-top:1px solid #000;padding-top:4px;font-size:10px;">Nome: ________________</div>
        <div style="font-size:10px;margin-top:4px;">Assinatura: ________________</div>
      </div>
    </div>
  </div>

  <div style="text-align:center;font-size:8px;color:#999;margin-top:20px;padding:8px;">
    Atlas QMS · PF17A · Gerado em ${new Date().toLocaleString("pt-PT")}
  </div>
</body></html>`;

    const w = window.open("", "_blank", "width=800,height=1000");
    if (!w) return;
    w.document.write(html);
    w.document.close();
    setTimeout(() => w.print(), 400);
  },
};
