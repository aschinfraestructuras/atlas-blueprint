import { supabase } from "@/integrations/supabase/client";

export interface NotificationLog {
  id: string;
  project_id: string;
  entity_type: string;
  entity_id: string | null;
  entity_code: string | null;
  subject: string;
  body: string | null;
  list_id: string | null;
  sent_by: string | null;
  sent_at: string;
  pdf_attached: boolean;
  created_at: string;
}

export interface NotificationRecipient {
  id: string;
  notification_id: string;
  contact_id: string | null;
  email: string;
  name: string | null;
  sent_status: string;
  confirmed_at: string | null;
}

export const notificationLogService = {
  async listByEntity(projectId: string, entityType: string, entityId?: string): Promise<(NotificationLog & { recipients: NotificationRecipient[] })[]> {
    let query = (supabase as any)
      .from("notifications_log")
      .select("*, notification_recipients(*)")
      .eq("project_id", projectId)
      .eq("entity_type", entityType)
      .order("sent_at", { ascending: false })
      .limit(50);

    if (entityId) {
      query = query.eq("entity_id", entityId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []).map((n: any) => ({
      ...n,
      recipients: n.notification_recipients ?? [],
    }));
  },
};
