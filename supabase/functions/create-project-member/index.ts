import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify caller is authenticated using anon client
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller }, error: authError } = await anonClient.auth.getUser();
    if (authError || !caller) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { email, password, role, project_id, action } = body;
    const mode = action ?? "create"; // "create" | "invite"

    // Validate inputs
    if (!email || !role || !project_id) {
      return new Response(JSON.stringify({ error: "Missing required fields: email, role, project_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (mode === "create" && (!password || password.length < 6)) {
      return new Response(JSON.stringify({ error: "Password must be at least 6 characters" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const validRoles = ["admin", "project_manager", "quality_manager", "technician", "viewer"];
    if (!validRoles.includes(role)) {
      return new Response(JSON.stringify({ error: "Invalid role" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify caller is admin of the project using service role
    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: memberCheck } = await adminClient
      .from("project_members")
      .select("role")
      .eq("project_id", project_id)
      .eq("user_id", caller.id)
      .eq("is_active", true)
      .eq("role", "admin")
      .maybeSingle();

    if (!memberCheck) {
      return new Response(JSON.stringify({ error: "Access denied: must be project admin" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // ── INVITE MODE: use Supabase built-in invite email ──────────────
    if (mode === "invite") {
      // Check if user already exists
      const { data: existingUsers } = await adminClient.auth.admin.listUsers();
      const existingUser = existingUsers?.users?.find(
        (u) => u.email?.toLowerCase() === normalizedEmail
      );

      if (existingUser) {
        // Check if already a member
        const { data: existingMember } = await adminClient
          .from("project_members")
          .select("user_id")
          .eq("project_id", project_id)
          .eq("user_id", existingUser.id)
          .eq("is_active", true)
          .maybeSingle();

        if (existingMember) {
          return new Response(
            JSON.stringify({ error: "User is already an active member of this project" }),
            { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Add existing user directly
        await adminClient
          .from("project_members")
          .upsert({ project_id, user_id: existingUser.id, role, is_active: true }, {
            onConflict: "project_id,user_id",
          });

        // Audit log
        await adminClient.from("audit_log").insert({
          project_id,
          user_id: caller.id,
          entity: "project_members",
          entity_id: existingUser.id,
          action: "MEMBER_ADDED",
          module: "settings",
          diff: { email: normalizedEmail, role, method: "invite_existing" },
        });

        return new Response(
          JSON.stringify({ status: "added_existing", user_id: existingUser.id }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // New user — invite via Supabase built-in email
      // Whitelist allowed origins to prevent open redirect attacks
      const allowedOrigins = [
        supabaseUrl,
        "https://atlasquality.lovable.app",
        "https://id-preview--6f0172f0-0e65-408d-8e26-8a8bcb9437cf.lovable.app",
      ];
      const requestOrigin = req.headers.get("origin") || "";
      const safeOrigin = allowedOrigins.includes(requestOrigin) ? requestOrigin : supabaseUrl;

      const { data: inviteData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(
        normalizedEmail,
        {
          data: { role, project_id, invited_by: caller.id },
          redirectTo: `${safeOrigin}/invite/accept`,
        }
      );

      if (inviteError || !inviteData?.user) {
        return new Response(
          JSON.stringify({ error: inviteError?.message || "Failed to send invite" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const invitedUserId = inviteData.user.id;

      // Create profile
      await adminClient.from("profiles").upsert({
        user_id: invitedUserId,
        email: normalizedEmail,
        full_name: normalizedEmail.split("@")[0],
      }, { onConflict: "user_id" });

      // Add to project
      await adminClient
        .from("project_members")
        .insert({ project_id, user_id: invitedUserId, role, is_active: true });

      // Audit log
      await adminClient.from("audit_log").insert({
        project_id,
        user_id: caller.id,
        entity: "project_members",
        entity_id: invitedUserId,
        action: "MEMBER_INVITED",
        module: "settings",
        diff: { email: normalizedEmail, role, method: "invite_email" },
      });

      return new Response(
        JSON.stringify({ status: "invited", user_id: invitedUserId }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── CREATE MODE: direct account creation ─────────────────────────
    // Check if user already exists
    const { data: existingUsers } = await adminClient.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(
      (u) => u.email?.toLowerCase() === normalizedEmail
    );

    let userId: string;

    if (existingUser) {
      userId = existingUser.id;

      // Check if already a member
      const { data: existingMember } = await adminClient
        .from("project_members")
        .select("user_id")
        .eq("project_id", project_id)
        .eq("user_id", userId)
        .eq("is_active", true)
        .maybeSingle();

      if (existingMember) {
        return new Response(
          JSON.stringify({ error: "User is already an active member of this project" }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Add existing user to project
      await adminClient
        .from("project_members")
        .upsert({ project_id, user_id: userId, role, is_active: true }, {
          onConflict: "project_id,user_id",
        });
    } else {
      // Create new user
      const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
        email: normalizedEmail,
        password,
        email_confirm: true,
        user_metadata: { invited_by: caller.id },
      });

      if (createError || !newUser?.user) {
        return new Response(
          JSON.stringify({ error: createError?.message || "Failed to create user" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      userId = newUser.user.id;

      // Create profile
      await adminClient.from("profiles").upsert({
        user_id: userId,
        email: normalizedEmail,
        full_name: normalizedEmail.split("@")[0],
      }, { onConflict: "user_id" });

      // Add to project
      await adminClient
        .from("project_members")
        .insert({ project_id, user_id: userId, role, is_active: true });
    }

    // Audit log
    await adminClient.from("audit_log").insert({
      project_id,
      user_id: caller.id,
      entity: "project_members",
      entity_id: userId,
      action: "MEMBER_CREATED",
      module: "settings",
      diff: { email: normalizedEmail, role, method: existingUser ? "existing_user" : "new_account" },
    });

    return new Response(
      JSON.stringify({
        status: existingUser ? "added_existing" : "created",
        user_id: userId,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("create-project-member error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
