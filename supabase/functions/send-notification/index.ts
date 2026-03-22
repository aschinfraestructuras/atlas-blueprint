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

function buildHtmlBody(subject: string, emailBody: string | undefined, entityCode: string | undefined, attachmentCount: number): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #1a1a2e;">${escapeHtml(subject)}</h2>
      ${emailBody ? `<p style="color: #333; line-height: 1.6;">${escapeHtml(emailBody).replace(/\n/g, "<br/>")}</p>` : ""}
      ${entityCode ? `<p style="color: #666; font-size: 12px;">Ref: ${escapeHtml(entityCode)}</p>` : ""}
      ${attachmentCount > 0 ? `<p style="color: #666; font-size: 12px;">📎 ${attachmentCount} anexo(s)</p>` : ""}
      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
      <p style="color: #999; font-size: 11px;">Atlas Quality Management System</p>
    </div>
  `;
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

  const read = async (): Promise<string> => {
    const buf = new Uint8Array(4096);
    const n = await conn.read(buf);
    return n ? decoder.decode(buf.subarray(0, n)) : "";
  };

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

  const tlsRead = async (): Promise<string> => {
    const buf = new Uint8Array(4096);
    const n = await tlsConn.read(buf);
    return n ? decoder.decode(buf.subarray(0, n)) : "";
  };

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
  await tlsConn.write(encoder.encode(fullEmail + "\r\n"));
  const dataResp = await tlsRead();

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
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabaseUser = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userErr } = await supabaseUser.auth.getUser();
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

    // Use service role for DB ops
    const supabaseAdmin = createClient(supabaseUrl, serviceKey);

    // Validate membership
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

    const htmlBody = buildHtmlBody(subject, emailBody, entity_code, allAttachments.length);

    let sent = 0;
    let failed = 0;

    for (const recipient of recipients) {
      let sentStatus = "sent";
      try {
        if (smtpUser && smtpPass) {
          await sendViaSMTP(smtpHost, smtpPort, smtpUser, smtpPass, fromEmail, recipient, subject, htmlBody, allAttachments);
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

      // Log recipient
      await supabaseAdmin.from("notification_recipients").insert({
        notification_id: logId,
        email: recipient.email,
        name: recipient.name || null,
        sent_status: sentStatus,
      });
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
