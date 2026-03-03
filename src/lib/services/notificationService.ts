import { supabase } from "@/integrations/supabase/client";

export interface Notification {
  id: string;
  project_id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  link_entity_type: string | null;
  link_entity_id: string | null;
  is_read: boolean;
  created_at: string;
}

export const notificationService = {
  async getForUser(projectId: string, limit = 50): Promise<Notification[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await (supabase as any)
      .from("notifications")
      .select("*")
      .eq("project_id", projectId)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return (data ?? []) as Notification[];
  },

  async getUnreadCount(projectId: string): Promise<number> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return 0;

    const { count, error } = await (supabase as any)
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("project_id", projectId)
      .eq("user_id", user.id)
      .eq("is_read", false);

    if (error) return 0;
    return count ?? 0;
  },

  async markAsRead(id: string): Promise<void> {
    await (supabase as any)
      .from("notifications")
      .update({ is_read: true })
      .eq("id", id);
  },

  async markAllAsRead(projectId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await (supabase as any)
      .from("notifications")
      .update({ is_read: true })
      .eq("project_id", projectId)
      .eq("user_id", user.id)
      .eq("is_read", false);
  },

  async generateNotifications(projectId: string, daysAhead = 30): Promise<number> {
    const { data, error } = await supabase.rpc("fn_generate_deadline_notifications", {
      p_project_id: projectId,
      p_days_ahead: daysAhead,
    });
    if (error) throw error;
    return (data as number) ?? 0;
  },
};
