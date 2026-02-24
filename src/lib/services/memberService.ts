import { supabase } from "@/integrations/supabase/client";

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

export const memberService = {
  async getMembers(projectId: string): Promise<ProjectMember[]> {
    const { data, error } = await supabase
      .from("project_members")
      .select("project_id, user_id, role, is_active, created_at")
      .eq("project_id", projectId)
      .eq("is_active", true)
      .order("created_at", { ascending: true });
    if (error) throw error;

    // Fetch profiles for these users
    const userIds = (data ?? []).map(m => m.user_id);
    let profiles: Record<string, { full_name: string | null; email: string | null }> = {};
    if (userIds.length > 0) {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("user_id, full_name, email")
        .in("user_id", userIds);
      (profileData ?? []).forEach(p => {
        profiles[p.user_id] = { full_name: p.full_name, email: p.email };
      });
    }

    return (data ?? []).map(m => ({
      ...m,
      profile: profiles[m.user_id] ?? { full_name: null, email: null },
    }));
  },

  async getPendingInvites(projectId: string): Promise<ProjectInvite[]> {
    const { data, error } = await (supabase as any)
      .from("project_invites")
      .select("*")
      .eq("project_id", projectId)
      .is("accepted_at", null)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as ProjectInvite[];
  },

  async invite(projectId: string, email: string, role: string): Promise<{ status: string }> {
    const { data, error } = await supabase.rpc("fn_invite_project_member" as any, {
      p_project_id: projectId,
      p_email: email,
      p_role: role,
    });
    if (error) throw error;
    return data as any;
  },

  async acceptInvite(token: string): Promise<{ status: string; project_id: string }> {
    const { data, error } = await supabase.rpc("fn_accept_project_invite" as any, {
      p_token: token,
    });
    if (error) throw error;
    return data as any;
  },

  async updateRole(projectId: string, userId: string, newRole: string): Promise<void> {
    const { error } = await supabase.rpc("fn_update_member_role" as any, {
      p_project_id: projectId,
      p_user_id: userId,
      p_new_role: newRole,
    });
    if (error) throw error;
  },

  async removeMember(projectId: string, userId: string): Promise<void> {
    const { error } = await supabase.rpc("fn_remove_project_member" as any, {
      p_project_id: projectId,
      p_user_id: userId,
    });
    if (error) throw error;
  },

  async deleteInvite(inviteId: string): Promise<void> {
    const { error } = await (supabase as any)
      .from("project_invites")
      .delete()
      .eq("id", inviteId);
    if (error) throw error;
  },

  async getMyProjects() {
    const { data, error } = await supabase.rpc("fn_list_my_projects" as any);
    if (error) throw error;
    return data as any[];
  },
};
