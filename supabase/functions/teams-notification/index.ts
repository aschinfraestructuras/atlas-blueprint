/**
 * teams-notification — Envia mensagem a um canal Teams via Incoming Webhook.
 * Formato: Microsoft Adaptive Card (compatível com Teams + Outlook).
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    // Verificar auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userErr } = await admin.auth.getUser(token);
    if (userErr || !user) {
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

    // Buscar webhook URL da tabela project_integrations
    const { data: integration } = await admin
      .from("project_integrations")
      .select("config, is_active")
      .eq("project_id", project_id)
      .eq("type", "teams_webhook")
      .maybeSingle();

    if (!integration?.is_active || !integration?.config?.url) {
      return new Response(JSON.stringify({ sent: false, reason: "Teams webhook não configurado ou inactivo" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const webhookUrl = integration.config.url as string;

    // Cor por urgência
    const COLOR_MAP = { normal: "0078D4", high: "F7630C", critical: "D13438" };
    const color = COLOR_MAP[urgency];

    // Emoji por tipo de evento
    const EMOJI_MAP: Record<string, string> = {
      hp_created:    "🔔",
      hp_confirmed:  "✅",
      nc_open:       "⚠️",
      nc_overdue:    "🔴",
      test_fail:     "❌",
      custom:        "ℹ️",
    };
    const emoji = EMOJI_MAP[event_type] ?? "ℹ️";

    // Construir Adaptive Card (formato Teams)
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
      {
        type: "TextBlock",
        text: summary,
        wrap: true,
        spacing: "Small",
      },
    ];

    if (facts.length > 0) {
      cardBody.push({
        type: "FactSet",
        facts,
        spacing: "Medium",
      });
    }

    const card: any = {
      type: "message",
      attachments: [
        {
          contentType: "application/vnd.microsoft.card.adaptive",
          content: {
            $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
            type: "AdaptiveCard",
            version: "1.4",
            msteams: { width: "Full" },
            body: cardBody,
            actions: link ? [
              {
                type: "Action.OpenUrl",
                title: "Abrir no Atlas QMS",
                url: link,
              },
            ] : [],
          },
        },
      ],
    };

    // Enviar para Teams
    const teamsResp = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(card),
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
