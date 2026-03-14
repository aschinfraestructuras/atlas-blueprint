import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- tables not in generated types
const db = supabase as any;

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- RPCs not in generated types
const dbRpc = (fn: string, params: Record<string, unknown>) => db.rpc(fn, params);

export interface ProjectMember {
  project_id: string;
  user_id: string;
  role: string;
  is_active: boolean;
  created_at: string;
  profile?: {
    full_name: string | null;
    email: string | null;
  };
}

export interface ProjectInvite {
  id: string;
  project_id: string;
  email: string;
  role: string;
  token: string;
  expires_at: string;
  accepted_at: string | null;
  created_by: string | null;
  created_at: string;
}

export interface InviteMemberResult {
  status: string;
  user_id?: string;
  invite_id?: string;
  token?: string;
}

interface ProfileRow {
  user_id: string;
  full_name: string | null;
  email: string | null;
}

export const memberService = {
  async getMembers(projectId: string): Promise<ProjectMember[]> {
    const { data, error } = await db.from("project_members")
      .select("project_id, user_id, role, is_active, created_at")
      .eq("project_id", projectId)
      .eq("is_active", true)
      .order("created_at", { ascending: true });
    if (error) throw error;

    const members = (data ?? []) as unknown as Array<{ project_id: string; user_id: string; role: string; is_active: boolean; created_at: string }>;
    const userIds = members.map(m => m.user_id);
    let profiles: Record<string, { full_name: string | null; email: string | null }> = {};
    if (userIds.length > 0) {
      const { data: profileData } = await db.from("profiles")
        .select("user_id, full_name, email")
        .in("user_id", userIds);
      ((profileData ?? []) as unknown as ProfileRow[]).forEach(p => {
        profiles[p.user_id] = { full_name: p.full_name, email: p.email };
      });
    }

    return members.map(m => ({
      ...m,
      profile: profiles[m.user_id] ?? { full_name: null, email: null },
    }));
  },

  async getPendingInvites(projectId: string): Promise<ProjectInvite[]> {
    const { data, error } = await db.from("project_invites")
      .select("*")
      .eq("project_id", projectId)
      .is("accepted_at", null)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as unknown as ProjectInvite[];
  },

  async invite(projectId: string, email: string, role: string): Promise<InviteMemberResult> {
    const { data, error } = await dbRpc("fn_invite_project_member", {
      p_project_id: projectId, p_email: email, p_role: role,
    });
    if (error) throw error;
    return data as unknown as InviteMemberResult;
  },

  async acceptInvite(token: string): Promise<{ status: string; project_id: string }> {
    const { data, error } = await dbRpc("fn_accept_project_invite", { p_token: token });
    if (error) throw error;
    return data as unknown as { status: string; project_id: string };
  },

  async claimMyPendingInvites(): Promise<{ status: string; claimed: number }> {
    const { data, error } = await dbRpc("fn_claim_my_pending_invites", {});
    if (error) throw error;
    return (data ?? { status: "ok", claimed: 0 }) as unknown as { status: string; claimed: number };
  },

  async updateRole(projectId: string, userId: string, newRole: string): Promise<void> {
    const { error } = await dbRpc("fn_update_member_role", {
      p_project_id: projectId, p_user_id: userId, p_new_role: newRole,
    });
    if (error) throw error;
  },

  async removeMember(projectId: string, userId: string): Promise<void> {
    const { error } = await dbRpc("fn_remove_project_member", {
      p_project_id: projectId, p_user_id: userId,
    });
    if (error) throw error;
  },

  async deleteInvite(inviteId: string): Promise<void> {
    const { error } = await db.from("project_invites").delete().eq("id", inviteId);
    if (error) throw error;
  },

  async getMyProjects() {
    const { data, error } = await dbRpc("fn_list_my_projects", {});
    if (error) throw error;
    return data as unknown as Array<Database["public"]["Tables"]["projects"]["Row"]>;
  },

  async createMember(
    projectId: string,
    email: string,
    password: string,
    role: string
  ): Promise<{ status: string; user_id: string }> {
    const { data, error } = await supabase.functions.invoke("create-project-member", {
      body: { email, password, role, project_id: projectId, action: "create" },
    });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    return data as { status: string; user_id: string };
  },

  async inviteByEmail(
    projectId: string,
    email: string,
    role: string
  ): Promise<{ status: string; user_id: string }> {
    const { data, error } = await supabase.functions.invoke("create-project-member", {
      body: { email, role, project_id: projectId, action: "invite" },
    });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    return data as { status: string; user_id: string };
  },
};
