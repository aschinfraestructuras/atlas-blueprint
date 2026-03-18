import { supabase } from "@/integrations/supabase/client";
import { auditService } from "./auditService";
import { PF17A_PLAN_SEED, type PlanSeedEntry } from "./planSeedData";

const BATCH_SIZE = 25;

export interface ImportResult {
  total: number;
  inserted: number;
  skipped: number;
  errors: string[];
}

/**
 * Import PF17A project plans into the plans table.
 * Skips entries where the code already exists in the project.
 */
export async function importPF17APlans(
  projectId: string,
  userId: string,
): Promise<ImportResult> {
  const result: ImportResult = { total: PF17A_PLAN_SEED.length, inserted: 0, skipped: 0, errors: [] };

  // 1. Fetch existing plan codes in this project to avoid duplicates
  const { data: existing } = await supabase
    .from("plans")
    .select("code")
    .eq("project_id", projectId);

  const existingCodes = new Set((existing ?? []).map(p => p.code));

  // 2. Filter out already-imported entries
  const toInsert = PF17A_PLAN_SEED.filter(e => !existingCodes.has(e.code));
  result.skipped = result.total - toInsert.length;

  // 3. Batch insert
  for (let i = 0; i < toInsert.length; i += BATCH_SIZE) {
    const batch = toInsert.slice(i, i + BATCH_SIZE);
    const rows = batch.map((e: PlanSeedEntry) => ({
      project_id: projectId,
      created_by: userId,
      code: e.code,
      title: e.title,
      plan_type: e.plan_type,
      discipline: e.discipline,
      doc_reference: e.doc_reference,
      revision: e.revision,
      notes: `[${e.piece_type === "PE" ? "Peça Escrita" : "Peça Desenhada"}] ${e.notes}`,
      status: "draft",
    }));

    const { error } = await supabase.from("plans").insert(rows);

    if (error) {
      result.errors.push(`Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${error.message}`);
    } else {
      result.inserted += batch.length;
    }
  }

  // 4. Audit log
  await auditService.log({
    projectId,
    entity: "plans",
    entityId: null as any,
    action: "IMPORT",
    module: "plans",
    description: `PF17A plans imported: ${result.inserted} inserted, ${result.skipped} skipped`,
    diff: { inserted: result.inserted, skipped: result.skipped, errors: result.errors },
  });

  return result;
}

/**
 * Remove all PF17A-imported plans (identified by code prefix PF17A_PE_)
 */
export async function removePF17APlans(projectId: string): Promise<number> {
  const seedCodes = PF17A_PLAN_SEED.map(e => e.code);

  const { data, error } = await supabase
    .from("plans")
    .delete()
    .eq("project_id", projectId)
    .in("code", seedCodes)
    .select("id");

  if (error) throw error;

  const count = data?.length ?? 0;

  await auditService.log({
    projectId,
    entity: "plans",
    entityId: null as any,
    action: "DELETE",
    module: "plans",
    description: `PF17A plans bulk removed: ${count} entries`,
  });

  return count;
}
