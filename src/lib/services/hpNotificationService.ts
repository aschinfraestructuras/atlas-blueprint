/**
 * HP Notification Service — NOT-HP (Hold Point 48h notification)
 * Manages creation, confirmation, cancellation and expiration of HP notifications.
 */

import { supabase } from "@/integrations/supabase/client";

export interface HpNotification {
  id: string;
  project_id: string;
  instance_id: string;
  item_id: string | null;
  code: string;
  ppi_ref: string;
  point_no: string;
  activity: string;
  location_pk: string | null;
  planned_datetime: string;
  notified_at: string;
  notified_by: string | null;
  confirmed_at: string | null;
  confirmed_by: string | null;
  status: "pending" | "confirmed" | "expired" | "cancelled";
  notes: string | null;
  rfi_ref: string | null;
  created_at: string;
}

export interface HpNotificationInput {
  project_id: string;
  instance_id: string;
  item_id?: string | null;
  ppi_ref: string;
  point_no: string;
  activity: string;
  location_pk?: string | null;
  planned_datetime: string;
  notes?: string | null;
  rfi_ref?: string | null;
}

export const hpNotificationService = {
  async create(input: HpNotificationInput): Promise<HpNotification> {
    // Generate code via DB function
    const { data: codeData, error: codeErr } = await (supabase as any).rpc(
      "fn_next_hp_notification_code",
      { p_project_id: input.project_id }
    );
    if (codeErr) throw codeErr;
    const code = codeData as string;

    const { data: { user } } = await supabase.auth.getUser();

    const { data, error } = await (supabase as any)
      .from("hp_notifications")
      .insert({
        project_id: input.project_id,
        instance_id: input.instance_id,
        item_id: input.item_id ?? null,
        code,
        ppi_ref: input.ppi_ref,
        point_no: input.point_no,
        activity: input.activity,
        location_pk: input.location_pk ?? null,
        planned_datetime: input.planned_datetime,
        notified_by: user?.id ?? null,
        notes: input.notes ?? null,
        rfi_ref: input.rfi_ref ?? null,
        status: "pending",
      })
      .select()
      .single();
    if (error) throw error;

    // Notify relevant project members (project_manager, quality_manager, tenant_admin)
    try {
      const { data: members } = await (supabase as any)
        .from("project_members")
        .select("user_id, role")
        .eq("project_id", input.project_id)
        .in("role", ["project_manager", "quality_manager", "tenant_admin", "admin"]);

      if (members && members.length > 0) {
        const notifications = members
          .filter((m: any) => m.user_id !== user?.id)
          .map((m: any) => ({
            project_id: input.project_id,
            user_id: m.user_id,
            type: "hp_notification",
            title: `HP Notificado: ${input.ppi_ref} — Ponto ${input.point_no}`,
            body: `Actividade: ${input.activity}. Previsto: ${new Date(input.planned_datetime).toLocaleString("pt-PT")}`,
            link_entity_type: "ppi_instance",
            link_entity_id: input.instance_id,
            is_read: false,
          }));
        if (notifications.length > 0) {
          await (supabase as any).from("notifications").insert(notifications);
        }
      }
    } catch {
      // Non-blocking: don't fail HP creation if notification insert fails
    }

    return data as HpNotification;
  },

  async listByInstance(instanceId: string): Promise<HpNotification[]> {
    const { data, error } = await (supabase as any)
      .from("hp_notifications")
      .select("*")
      .eq("instance_id", instanceId)
      .order("planned_datetime", { ascending: true });
    if (error) throw error;
    return (data ?? []) as HpNotification[];
  },

  async listByProject(projectId: string): Promise<HpNotification[]> {
    const { data, error } = await (supabase as any)
      .from("hp_notifications")
      .select("*")
      .eq("project_id", projectId)
      .order("planned_datetime", { ascending: true });
    if (error) throw error;
    return (data ?? []) as HpNotification[];
  },

  async listPendingForDeadlines(
    projectId: string,
    daysAhead = 7
  ): Promise<HpNotification[]> {
    const now = new Date();
    const future = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);

    const { data, error } = await (supabase as any)
      .from("hp_notifications")
      .select("*")
      .eq("project_id", projectId)
      .eq("status", "pending")
      .lte("planned_datetime", future.toISOString())
      .order("planned_datetime", { ascending: true });
    if (error) throw error;
    return (data ?? []) as HpNotification[];
  },

  async confirm(id: string, confirmedBy: string): Promise<HpNotification> {
    const { data, error } = await (supabase as any)
      .from("hp_notifications")
      .update({
        status: "confirmed",
        confirmed_at: new Date().toISOString(),
        confirmed_by: confirmedBy,
      })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;

    const notification = data as HpNotification;

    // Notify the original submitter that HP was confirmed
    try {
      if (notification.notified_by) {
        await (supabase as any).from("notifications").insert({
          project_id: notification.project_id,
          user_id: notification.notified_by,
          type: "hp_confirmed",
          title: `HP Confirmado: ${notification.ppi_ref} — Ponto ${notification.point_no}`,
          body: `Confirmado por: ${confirmedBy}`,
          link_entity_type: "ppi_instance",
          link_entity_id: notification.instance_id,
          is_read: false,
        });
      }
    } catch {
      // Non-blocking
    }

    return notification;
  },

  async cancel(id: string): Promise<HpNotification> {
    const { data, error } = await (supabase as any)
      .from("hp_notifications")
      .update({ status: "cancelled" })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data as HpNotification;
  },

  async checkExpired(projectId: string): Promise<number> {
    const threshold = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    const { data, error } = await (supabase as any)
      .from("hp_notifications")
      .update({ status: "expired" })
      .eq("project_id", projectId)
      .eq("status", "pending")
      .lt("planned_datetime", threshold)
      .select("id");
    if (error) throw error;
    return (data ?? []).length;
  },
};
