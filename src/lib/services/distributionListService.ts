import { supabase } from "@/integrations/supabase/client";
import type { ProjectContact } from "./projectContactService";

export interface DistributionList {
  id: string;
  project_id: string;
  name: string;
  description: string | null;
  entity_type: string;
  is_default: boolean;
  created_at: string;
}

export interface DistributionListWithMembers extends DistributionList {
  members: ProjectContact[];
}

export type DistributionListInput = Omit<DistributionList, "id" | "created_at">;

export const distributionListService = {
  async list(projectId: string): Promise<DistributionList[]> {
    const { data, error } = await (supabase as any)
      .from("distribution_lists")
      .select("*")
      .eq("project_id", projectId)
      .order("name");
    if (error) throw error;
    return (data ?? []) as DistributionList[];
  },

  async getWithMembers(listId: string): Promise<DistributionListWithMembers> {
    const { data: list, error: listErr } = await (supabase as any)
      .from("distribution_lists")
      .select("*")
      .eq("id", listId)
      .single();
    if (listErr) throw listErr;

    const { data: memberLinks, error: memErr } = await (supabase as any)
      .from("distribution_list_members")
      .select("contact_id, project_contacts(*)")
      .eq("list_id", listId);
    if (memErr) throw memErr;

    const members = (memberLinks ?? []).map((m: any) => m.project_contacts).filter(Boolean);
    return { ...list, members } as DistributionListWithMembers;
  },

  async create(input: DistributionListInput): Promise<DistributionList> {
    const { data, error } = await (supabase as any)
      .from("distribution_lists")
      .insert(input)
      .select()
      .single();
    if (error) throw error;
    return data as DistributionList;
  },

  async update(id: string, fields: Partial<DistributionListInput>): Promise<void> {
    const { error } = await (supabase as any)
      .from("distribution_lists")
      .update(fields)
      .eq("id", id);
    if (error) throw error;
  },

  async remove(id: string): Promise<void> {
    // Members cascade
    const { error } = await (supabase as any)
      .from("distribution_lists")
      .delete()
      .eq("id", id);
    if (error) throw error;
  },

  async addMember(listId: string, contactId: string): Promise<void> {
    const { error } = await (supabase as any)
      .from("distribution_list_members")
      .insert({ list_id: listId, contact_id: contactId });
    if (error) throw error;
  },

  async removeMember(listId: string, contactId: string): Promise<void> {
    const { error } = await (supabase as any)
      .from("distribution_list_members")
      .delete()
      .eq("list_id", listId)
      .eq("contact_id", contactId);
    if (error) throw error;
  },

  async getDefaultForType(projectId: string, entityType: string): Promise<DistributionListWithMembers | null> {
    const { data, error } = await (supabase as any)
      .from("distribution_lists")
      .select("*")
      .eq("project_id", projectId)
      .eq("entity_type", entityType)
      .eq("is_default", true)
      .limit(1);
    if (error) throw error;
    if (!data || data.length === 0) return null;
    return this.getWithMembers(data[0].id);
  },

  async getMembersOfList(listId: string): Promise<ProjectContact[]> {
    const { data, error } = await (supabase as any)
      .from("distribution_list_members")
      .select("contact_id, project_contacts(*)")
      .eq("list_id", listId);
    if (error) throw error;
    return (data ?? []).map((m: any) => m.project_contacts).filter(Boolean);
  },
};
