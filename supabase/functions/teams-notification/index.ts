/**
 * teams-notification — Envia mensagem a um canal Teams via Incoming Webhook.
 * Formato: Microsoft Adaptive Card (compatível com Teams + Outlook).
 */
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface RequestBody {
  project_id: string;
  event_type: "hp_created" | "hp_confirmed" | "nc_open" | "nc_overdue" | "test_fail" | "custom";
  title: string;
  summary: string;
  details?: Record<string, string>;
  link?: string;
  urgency?: "normal" | "high" | "critical";
}

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY     = Deno.env.get("SUPABASE_ANON_KEY")!;

// Verifica JWT chamando o endpoint /auth/v1/user (suporta ES256 nativamente)
async function verifyUser(token: string): Promise<boolean> {
  try {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${token}`, apikey: ANON_KEY },
    });
    return r.ok;
  } catch {
    return false;
  }
}

// Busca integração via PostgREST com service-role
async function fetchIntegration(projectId: string): Promise<{ url: string } | null> {
  const r = await fetch(
    `${SUPABASE_URL}/rest/v1/project_integrations?project_id=eq.${projectId}&type=eq.teams_webhook&is_active=eq.true&select=config`,
    { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } },
  );
  if (!r.ok) return null;
  const rows = await r.json();
  const cfg = rows?.[0]?.config;
  if (!cfg?.url) return null;
  return { url: cfg.url as string };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const token = authHeader.replace("Bearer ", "");
    const ok = await verifyUser(token);
    if (!ok) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body: RequestBody = await req.json();
    const { project_id, event_type, title, summary, details, link, urgency = "normal" } = body;

    if (!project_id || !title || !summary) {
      return new Response(JSON.stringify({ error: "project_id, title e summary são obrigatórios" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const integration = await fetchIntegration(project_id);
    if (!integration) {
      return new Response(JSON.stringify({ sent: false, reason: "Teams webhook não configurado ou inactivo" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const COLOR_MAP = { normal: "0078D4", high: "F7630C", critical: "D13438" };
    const color = COLOR_MAP[urgency];

    const EMOJI_MAP: Record<string, string> = {
      hp_created:   "🔔", hp_confirmed: "✅", nc_open:    "⚠️",
      nc_overdue:   "🔴", test_fail:    "❌", custom:     "ℹ️",
    };
    const emoji = EMOJI_MAP[event_type] ?? "ℹ️";

    const facts = details
      ? Object.entries(details).map(([k, v]) => ({ title: k, value: v }))
      : [];

    const cardBody: any[] = [
      {
        type: "TextBlock",
        text: `${emoji} ${title}`,
        weight: "Bolder",
        size: "Medium",
        color: urgency === "critical" ? "Attention" : urgency === "high" ? "Warning" : "Default",
        wrap: true,
      },
      { type: "TextBlock", text: summary, wrap: true, spacing: "Small" },
    ];

    if (facts.length > 0) {
      cardBody.push({ type: "FactSet", facts, spacing: "Medium" });
    }

    // Detectar tipo de URL:
    // - logic.azure.com / powerautomate → Power Automate Workflows (novo método)
    // - webhook.office.com              → Webhook clássico com Adaptive Card
    const isPowerAutomate = integration.url.includes("logic.azure.com") ||
                            integration.url.includes("azure.com");

    let payload: string;
    if (isPowerAutomate) {
      // Power Automate aceita texto simples com Markdown
      const factsText = facts.length > 0
        ? "\n\n" + facts.map((f: any) => `**${f.title}:** ${f.value}`).join("  \n")
        : "";
      const linkText = link ? `\n\n[Abrir no Atlas QMS](${link})` : "";
      payload = JSON.stringify({
        text: `${emoji} **${title}**\n\n${summary}${factsText}${linkText}`,
      });
    } else {
      // Webhook clássico — Adaptive Card
      const card = {
        type: "message",
        attachments: [{
          contentType: "application/vnd.microsoft.card.adaptive",
          content: {
            $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
            type: "AdaptiveCard",
            version: "1.4",
            msteams: { width: "Full" },
            body: cardBody,
            actions: link ? [{ type: "Action.OpenUrl", title: "Abrir no Atlas QMS", url: link }] : [],
          },
        }],
      };
      payload = JSON.stringify(card);
    }

    const teamsResp = await fetch(integration.url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
    });

    if (!teamsResp.ok) {
      const errText = await teamsResp.text();
      console.error("Teams webhook error:", teamsResp.status, errText);
      return new Response(JSON.stringify({ sent: false, error: errText }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ sent: true }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err: any) {
    console.error("teams-notification error:", err);
    return new Response(JSON.stringify({ error: err.message ?? "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
