import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface Recipient {
  email: string;
  name?: string;
}

interface EmailAttachment {
  filename: string;
  base64: string;
  mime_type: string;
}

interface RequestBody {
  project_id: string;
  entity_type: string;
  entity_id?: string;
  entity_code?: string;
  list_id?: string;
  recipients: Recipient[];
  subject: string;
  body?: string;
  attachments?: EmailAttachment[];
  // Legacy single PDF fields (backward compat)
  pdf_base64?: string;
  pdf_filename?: string;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildHtmlBody(subject: string, emailBody: string | undefined, entityCode: string | undefined, attachmentCount: number, entityType?: string, recipientId?: string, confirmationToken?: string): string {
  const confirmUrl = recipientId
    ? `https://aschquality.com/confirm-receipt?id=${recipientId}${confirmationToken ? `&token=${confirmationToken}` : ""}`
    : "";
  const today = new Date().toLocaleDateString("pt-PT");
  const typeLabel = (entityType ?? "comunicação").toUpperCase();

  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:20px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
  <!-- Header -->
  <tr><td style="background:#192F48;padding:24px 30px;text-align:center;">
    <div style="font-size:20px;font-weight:900;color:#ffffff;letter-spacing:2px;">ATLAS QMS</div>
    <div style="font-size:12px;color:#94a3b8;margin-top:4px;">Sistema de Gestão da Qualidade</div>
  </td></tr>
  <!-- Type bar -->
  <tr><td style="background:#2563eb;padding:10px 30px;text-align:center;">
    <span style="font-size:12px;font-weight:700;color:#ffffff;letter-spacing:1.5px;text-transform:uppercase;">${escapeHtml(typeLabel)}</span>
  </td></tr>
  <!-- Body -->
  <tr><td style="padding:28px 30px;">
    ${entityCode ? `<div style="font-size:16px;font-weight:700;color:#192F48;margin-bottom:16px;">${escapeHtml(entityCode)}</div>` : ""}
    <div style="font-size:14px;font-weight:700;color:#1e293b;margin-bottom:12px;">${escapeHtml(subject)}</div>
    ${emailBody ? `<div style="font-size:13px;color:#334155;line-height:1.6;margin-bottom:20px;">${escapeHtml(emailBody).replace(/\n/g, "<br/>")}</div>` : ""}
    ${attachmentCount > 0 ? `<div style="font-size:12px;color:#64748b;margin-bottom:16px;">📎 ${attachmentCount} anexo(s)</div>` : ""}
    <!-- Info table -->
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:16px 0;">
      <tr style="background:#f9fafb;"><td style="padding:8px 12px;font-size:11px;color:#6b7280;border:1px solid #e5e7eb;font-weight:700;">Tipo</td><td style="padding:8px 12px;font-size:11px;color:#1e293b;border:1px solid #e5e7eb;">${escapeHtml(typeLabel)}</td></tr>
      <tr><td style="padding:8px 12px;font-size:11px;color:#6b7280;border:1px solid #e5e7eb;font-weight:700;">Data de Envio</td><td style="padding:8px 12px;font-size:11px;color:#1e293b;border:1px solid #e5e7eb;">${today}</td></tr>
      ${entityCode ? `<tr style="background:#f9fafb;"><td style="padding:8px 12px;font-size:11px;color:#6b7280;border:1px solid #e5e7eb;font-weight:700;">Referência</td><td style="padding:8px 12px;font-size:11px;color:#1e293b;border:1px solid #e5e7eb;">${escapeHtml(entityCode)}</td></tr>` : ""}
    </table>
    ${confirmUrl ? `
    <div style="border-top:1px solid #e5e7eb;margin:24px 0;padding-top:24px;text-align:center;">
      <a href="${confirmUrl}" style="display:inline-block;padding:12px 32px;background-color:#192F48;color:#ffffff;text-decoration:none;border-radius:6px;font-size:14px;font-weight:600;">✓ Confirmar Recepção</a>
      <div style="font-size:11px;color:#94a3b8;margin-top:12px;">Clique no botão acima para confirmar que recebeu esta comunicação.</div>
    </div>
    ` : ""}
    <div style="font-size:11px;color:#94a3b8;margin-top:20px;line-height:1.5;">Esta comunicação é parte integrante do SGQ da obra. A confirmação fica registada para efeitos de auditoria.</div>
  </td></tr>
  <!-- Footer -->
  <tr><td style="background:#f3f4f6;padding:16px 30px;text-align:center;">
    <div style="font-size:10px;color:#9ca3af;">Atlas QMS · info@aschquality.com · aschquality.com · Gerado automaticamente</div>
  </td></tr>
</table>
</td></tr>
</table>
</body></html>`;
}

function buildMimeMessage(
  fromEmail: string,
  recipient: Recipient,
  subject: string,
  htmlBody: string,
  attachments: EmailAttachment[],
): string {
  const lines: string[] = [
    `From: Atlas QMS <${fromEmail}>`,
    `To: ${recipient.name ?? recipient.email} <${recipient.email}>`,
    `Subject: ${subject}`,
    `MIME-Version: 1.0`,
  ];

  if (attachments.length > 0) {
    const boundary = `----=_Part_${crypto.randomUUID().replace(/-/g, "")}`;
    lines.push(`Content-Type: multipart/mixed; boundary="${boundary}"`);
    lines.push("");

    // HTML part
    lines.push(`--${boundary}`);
    lines.push(`Content-Type: text/html; charset=utf-8`);
    lines.push(`Content-Transfer-Encoding: 7bit`);
    lines.push("");
    lines.push(htmlBody);

    // Attachment parts
    for (const att of attachments) {
      lines.push(`--${boundary}`);
      lines.push(`Content-Type: ${att.mime_type}; name="${att.filename}"`);
      lines.push(`Content-Transfer-Encoding: base64`);
      lines.push(`Content-Disposition: attachment; filename="${att.filename}"`);
      lines.push("");
      // Split base64 into 76-char lines
      for (let i = 0; i < att.base64.length; i += 76) {
        lines.push(att.base64.substring(i, i + 76));
      }
    }
    lines.push(`--${boundary}--`);
  } else {
    lines.push(`Content-Type: text/html; charset=utf-8`);
    lines.push("");
    lines.push(htmlBody);
  }

  lines.push(".");
  return lines.join("\r\n");
}

async function sendViaSMTP(
  smtpHost: string,
  smtpPort: number,
  smtpUser: string,
  smtpPass: string,
  fromEmail: string,
  recipient: Recipient,
  subject: string,
  htmlBody: string,
  attachments: EmailAttachment[],
): Promise<void> {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  const conn = await Deno.connect({ hostname: smtpHost, port: smtpPort });

  const readWithTimeout = async (c: Deno.Conn, ms = 30000): Promise<string> => {
    const buf = new Uint8Array(8192);
    const timer = new Promise<null>((_, reject) =>
      setTimeout(() => reject(new Error("SMTP read timeout")), ms),
    );
    const n = await Promise.race([c.read(buf), timer]);
    return n ? decoder.decode(buf.subarray(0, n as number)) : "";
  };

  const read = () => readWithTimeout(conn);

  const writeAndRead = async (cmd: string): Promise<string> => {
    await conn.write(encoder.encode(cmd + "\r\n"));
    return await read();
  };

  // SMTP handshake
  await read(); // greeting
  await writeAndRead("EHLO localhost");
  await writeAndRead("STARTTLS");

  // Upgrade to TLS
  const tlsConn = await Deno.startTls(conn, { hostname: smtpHost });

  const tlsRead = () => readWithTimeout(tlsConn, 60000);

  const tlsWriteAndRead = async (cmd: string): Promise<string> => {
    await tlsConn.write(encoder.encode(cmd + "\r\n"));
    return await tlsRead();
  };

  await tlsWriteAndRead("EHLO localhost");

  // AUTH LOGIN
  await tlsWriteAndRead("AUTH LOGIN");
  await tlsWriteAndRead(btoa(smtpUser));
  const authResp = await tlsWriteAndRead(btoa(smtpPass));

  if (!authResp.startsWith("235")) {
    try { tlsConn.close(); } catch { /* ignore */ }
    throw new Error("SMTP auth failed: " + authResp);
  }

  await tlsWriteAndRead(`MAIL FROM:<${fromEmail}>`);
  await tlsWriteAndRead(`RCPT TO:<${recipient.email}>`);
  await tlsWriteAndRead("DATA");

  const fullEmail = buildMimeMessage(fromEmail, recipient, subject, htmlBody, attachments);
  const emailBytes = encoder.encode(fullEmail + "\r\n");
  // Write in chunks to avoid buffer issues with large attachments
  const CHUNK = 16384;
  for (let i = 0; i < emailBytes.length; i += CHUNK) {
    await tlsConn.write(emailBytes.subarray(i, Math.min(i + CHUNK, emailBytes.length)));
  }
  const dataResp = await readWithTimeout(tlsConn, 120000); // 2min for large payloads

  if (!dataResp.startsWith("250")) {
    try { tlsConn.close(); } catch { /* ignore */ }
    throw new Error("SMTP send failed: " + dataResp);
  }

  await tlsWriteAndRead("QUIT");
  try { tlsConn.close(); } catch { /* ignore */ }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Use service role admin client to verify the JWT.
    // This delegates verification to Supabase Auth server which supports
    // both HS256 and ES256 — fixes UNAUTHORIZED_UNSUPPORTED_TOKEN_ALGORITHM.
    const supabaseAdmin = createClient(supabaseUrl, serviceKey);
    const token = authHeader.replace("Bearer ", "");

    const { data: { user }, error: userErr } = await supabaseAdmin.auth.getUser(token);
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = user.id;

    const body: RequestBody = await req.json();
    const {
      project_id, entity_type, entity_id, entity_code, list_id,
      recipients, subject, body: emailBody,
      attachments: bodyAttachments,
      pdf_base64, pdf_filename,
    } = body;

    if (!project_id || !recipients?.length || !subject) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build unified attachments list (new format + legacy fallback)
    const allAttachments: EmailAttachment[] = bodyAttachments ? [...bodyAttachments] : [];
    // If legacy pdf fields sent and not already in attachments array, add them
    if (pdf_base64 && pdf_filename && !allAttachments.some(a => a.filename === pdf_filename)) {
      allAttachments.push({ filename: pdf_filename, base64: pdf_base64, mime_type: "application/pdf" });
    }

    // Validate membership (supabaseAdmin já criado acima)
    const { data: membership } = await supabaseAdmin
      .from("project_members")
      .select("user_id")
      .eq("project_id", project_id)
      .eq("user_id", userId)
      .limit(1);

    if (!membership || membership.length === 0) {
      return new Response(JSON.stringify({ error: "Not a project member" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Log notification
    const { data: logEntry, error: logErr } = await supabaseAdmin
      .from("notifications_log")
      .insert({
        project_id,
        entity_type,
        entity_id: entity_id || null,
        entity_code: entity_code || null,
        subject,
        body: emailBody || null,
        list_id: list_id || null,
        sent_by: userId,
        pdf_attached: allAttachments.length > 0,
      })
      .select("id")
      .single();

    if (logErr) throw logErr;
    const logId = logEntry.id;

    // SMTP config
    const smtpHost = Deno.env.get("SMTP_HOST") ?? "smtp.ionos.es";
    const smtpPort = parseInt(Deno.env.get("SMTP_PORT") ?? "587");
    const smtpUser = Deno.env.get("SMTP_USERNAME") ?? "";
    const smtpPass = Deno.env.get("SMTP_PASSWORD") ?? "";
    const fromEmail = Deno.env.get("SMTP_FROM") ?? smtpUser;

    let sent = 0;
    let failed = 0;

    for (const recipient of recipients) {
      let sentStatus = "sent";

      // Insert recipient first to get the ID for confirmation link
      const { data: recipientRow, error: recipErr } = await supabaseAdmin
        .from("notification_recipients")
        .insert({
          notification_id: logId,
          email: recipient.email,
          name: recipient.name || null,
          sent_status: "pending",
        })
        .select("id, confirmation_token")
        .single();

      const recipientId = recipientRow?.id;
      const confirmationToken = recipientRow?.confirmation_token;

      // Build HTML with confirmation link per recipient
      const htmlBody = buildHtmlBody(subject, emailBody, entity_code, allAttachments.length, entity_type, recipientId, confirmationToken);

      try {
        if (smtpUser && smtpPass) {
          await sendViaSMTP(smtpHost, smtpPort, smtpUser, smtpPass, fromEmail, recipient, subject, htmlBody, allAttachments);
          sentStatus = "sent";
          sent++;
        } else {
          sentStatus = "failed";
          failed++;
          console.warn("No SMTP credentials configured");
        }
      } catch (err) {
        console.error(`Failed to send to ${recipient.email}:`, err);
        sentStatus = "failed";
        failed++;
      }

      // Update recipient status
      if (recipientId) {
        await supabaseAdmin
          .from("notification_recipients")
          .update({ sent_status: sentStatus })
          .eq("id", recipientId);
      }
    }

    return new Response(
      JSON.stringify({ sent, failed, log_id: logId }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err: any) {
    console.error("send-notification error:", err);
    return new Response(
      JSON.stringify({ error: err.message ?? "Internal error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
