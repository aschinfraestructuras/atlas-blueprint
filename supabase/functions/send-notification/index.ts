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

interface RequestBody {
  project_id: string;
  entity_type: string;
  entity_id?: string;
  entity_code?: string;
  list_id?: string;
  recipients: Recipient[];
  subject: string;
  body?: string;
  pdf_base64?: string;
  pdf_filename?: string;
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

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } = await supabaseUser.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub;

    const body: RequestBody = await req.json();
    const { project_id, entity_type, entity_id, entity_code, list_id, recipients, subject, body: emailBody, pdf_base64, pdf_filename } = body;

    if (!project_id || !recipients?.length || !subject) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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
        pdf_attached: !!pdf_base64,
      })
      .select("id")
      .single();

    if (logErr) throw logErr;
    const logId = logEntry.id;

    // Send emails via SMTP
    const smtpHost = Deno.env.get("SMTP_HOST") ?? "smtp.ionos.es";
    const smtpPort = parseInt(Deno.env.get("SMTP_PORT") ?? "587");
    const smtpUser = Deno.env.get("SMTP_USERNAME") ?? "";
    const smtpPass = Deno.env.get("SMTP_PASSWORD") ?? "";
    const fromEmail = Deno.env.get("SMTP_FROM") ?? smtpUser;

    let sent = 0;
    let failed = 0;

    for (const recipient of recipients) {
      let sentStatus = "sent";
      try {
        if (smtpUser && smtpPass) {
          // Build email content
          const htmlBody = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #1a1a2e;">${escapeHtml(subject)}</h2>
              ${emailBody ? `<p style="color: #333; line-height: 1.6;">${escapeHtml(emailBody).replace(/\n/g, "<br/>")}</p>` : ""}
              ${entity_code ? `<p style="color: #666; font-size: 12px;">Ref: ${escapeHtml(entity_code)}</p>` : ""}
              ${pdf_base64 ? `<p style="color: #666; font-size: 12px;">📎 ${escapeHtml(pdf_filename ?? "document.pdf")} (em anexo)</p>` : ""}
              <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
              <p style="color: #999; font-size: 11px;">Atlas Quality Management System</p>
            </div>
          `;

          // Use Deno's built-in capabilities to connect to SMTP
          const conn = await Deno.connect({ hostname: smtpHost, port: smtpPort });
          const encoder = new TextEncoder();
          const decoder = new TextDecoder();

          const read = async (): Promise<string> => {
            const buf = new Uint8Array(4096);
            const n = await conn.read(buf);
            return n ? decoder.decode(buf.subarray(0, n)) : "";
          };

          const write = async (cmd: string) => {
            await conn.write(encoder.encode(cmd + "\r\n"));
          };

          const writeAndRead = async (cmd: string): Promise<string> => {
            await write(cmd);
            return await read();
          };

          // SMTP handshake
          await read(); // greeting
          await writeAndRead(`EHLO localhost`);
          await writeAndRead(`STARTTLS`);

          // Upgrade to TLS
          const tlsConn = await Deno.startTls(conn, { hostname: smtpHost });
          
          const tlsRead = async (): Promise<string> => {
            const buf = new Uint8Array(4096);
            const n = await tlsConn.read(buf);
            return n ? decoder.decode(buf.subarray(0, n)) : "";
          };

          const tlsWrite = async (cmd: string) => {
            await tlsConn.write(encoder.encode(cmd + "\r\n"));
          };

          const tlsWriteAndRead = async (cmd: string): Promise<string> => {
            await tlsWrite(cmd);
            return await tlsRead();
          };

          await tlsWriteAndRead(`EHLO localhost`);

          // AUTH LOGIN
          await tlsWriteAndRead(`AUTH LOGIN`);
          await tlsWriteAndRead(btoa(smtpUser));
          const authResp = await tlsWriteAndRead(btoa(smtpPass));

          if (!authResp.startsWith("235")) {
            throw new Error("SMTP auth failed: " + authResp);
          }

          await tlsWriteAndRead(`MAIL FROM:<${fromEmail}>`);
          await tlsWriteAndRead(`RCPT TO:<${recipient.email}>`);
          await tlsWriteAndRead(`DATA`);

          const boundary = `----=_Part_${crypto.randomUUID().replace(/-/g, "")}`;
          
          let emailContent = [
            `From: Atlas QMS <${fromEmail}>`,
            `To: ${recipient.name ?? recipient.email} <${recipient.email}>`,
            `Subject: ${subject}`,
            `MIME-Version: 1.0`,
          ];

          if (pdf_base64 && pdf_filename) {
            emailContent.push(`Content-Type: multipart/mixed; boundary="${boundary}"`);
            emailContent.push("");
            emailContent.push(`--${boundary}`);
            emailContent.push(`Content-Type: text/html; charset=utf-8`);
            emailContent.push(`Content-Transfer-Encoding: 7bit`);
            emailContent.push("");
            emailContent.push(htmlBody);
            emailContent.push(`--${boundary}`);
            emailContent.push(`Content-Type: application/pdf; name="${pdf_filename}"`);
            emailContent.push(`Content-Transfer-Encoding: base64`);
            emailContent.push(`Content-Disposition: attachment; filename="${pdf_filename}"`);
            emailContent.push("");
            // Split base64 into 76-char lines
            const b64 = pdf_base64;
            for (let i = 0; i < b64.length; i += 76) {
              emailContent.push(b64.substring(i, i + 76));
            }
            emailContent.push(`--${boundary}--`);
          } else {
            emailContent.push(`Content-Type: text/html; charset=utf-8`);
            emailContent.push("");
            emailContent.push(htmlBody);
          }

          emailContent.push(".");

          const fullEmail = emailContent.join("\r\n");
          await tlsWrite(fullEmail);
          const dataResp = await tlsRead();

          if (!dataResp.startsWith("250")) {
            throw new Error("SMTP send failed: " + dataResp);
          }

          await tlsWriteAndRead(`QUIT`);
          try { tlsConn.close(); } catch { /* ignore */ }
          
          sent++;
        } else {
          // No SMTP config — log as failed
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

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
