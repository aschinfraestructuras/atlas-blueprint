/**
 * Edge Function: migrate-storage-paths
 *
 * Copies objects in qms-files whose path starts with "projects/" to the
 * canonical path (without the "projects/" prefix), updates the DB records,
 * then deletes the old objects.
 *
 * Call once via curl or Supabase dashboard. Requires service-role key.
 */
import { createClient } from "jsr:@supabase/supabase-js@2";

const BUCKET = "qms-files";

Deno.serve(async (req) => {
  // Only allow POST (or GET for convenience in dashboard)
  if (req.method !== "POST" && req.method !== "GET") {
    return new Response("Method not allowed", { status: 405 });
  }

  // ── Auth: require service-role key in Authorization header ────────────────
  const authHeader = req.headers.get("Authorization") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  // Accept "Bearer <service_role_key>" format
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token || token !== serviceRoleKey) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    serviceRoleKey,
  );

  const results: Array<{ table: string; id: string; old_path: string; new_path: string; status: string }> = [];
  const errors:  Array<{ table: string; id: string; error: string }> = [];

  // ── 1. Migrate documents.file_path ─────────────────────────────────────────
  const { data: docs, error: docsErr } = await supabase
    .from("documents")
    .select("id, file_path, project_id")
    .like("file_path", "projects/%");

  if (docsErr) {
    return new Response(JSON.stringify({ error: docsErr.message }), { status: 500 });
  }

  for (const doc of docs ?? []) {
    const oldPath = doc.file_path as string;
    // Strip leading "projects/"
    const newPath = oldPath.replace(/^projects\//, "");

    try {
      // Copy object
      const { error: copyErr } = await supabase.storage
        .from(BUCKET)
        .copy(oldPath, newPath);

      if (copyErr) throw new Error(`copy: ${copyErr.message}`);

      // Update DB
      const { error: updErr } = await supabase
        .from("documents")
        .update({ file_path: newPath })
        .eq("id", doc.id);

      if (updErr) throw new Error(`db_update: ${updErr.message}`);

      // Delete old object (best-effort)
      await supabase.storage.from(BUCKET).remove([oldPath]).catch(() => null);

      results.push({ table: "documents", id: doc.id, old_path: oldPath, new_path: newPath, status: "ok" });
    } catch (err) {
      errors.push({ table: "documents", id: doc.id, error: (err as Error).message });
    }
  }

  // ── 2. Migrate attachments.file_path ───────────────────────────────────────
  const { data: atts, error: attsErr } = await supabase
    .from("attachments")
    .select("id, file_path, project_id, entity_type, entity_id")
    .like("file_path", "projects/%");

  if (attsErr) {
    return new Response(JSON.stringify({ error: attsErr.message, partial_results: results }), { status: 500 });
  }

  for (const att of atts ?? []) {
    const oldPath = att.file_path as string;
    const newPath = oldPath.replace(/^projects\//, "");

    try {
      const { error: copyErr } = await supabase.storage
        .from(BUCKET)
        .copy(oldPath, newPath);

      if (copyErr) throw new Error(`copy: ${copyErr.message}`);

      const { error: updErr } = await supabase
        .from("attachments")
        .update({ file_path: newPath })
        .eq("id", att.id);

      if (updErr) throw new Error(`db_update: ${updErr.message}`);

      await supabase.storage.from(BUCKET).remove([oldPath]).catch(() => null);

      results.push({ table: "attachments", id: att.id, old_path: oldPath, new_path: newPath, status: "ok" });
    } catch (err) {
      errors.push({ table: "attachments", id: att.id, error: (err as Error).message });
    }
  }

  // ── 3. Migrate document_files.storage_path ─────────────────────────────────
  const { data: docFiles, error: dfErr } = await supabase
    .from("document_files")
    .select("id, storage_path")
    .like("storage_path", "projects/%");

  if (!dfErr) {
    for (const df of docFiles ?? []) {
      const oldPath = df.storage_path as string;
      const newPath = oldPath.replace(/^projects\//, "");

      try {
        const { error: copyErr } = await supabase.storage.from(BUCKET).copy(oldPath, newPath);
        if (copyErr) throw new Error(`copy: ${copyErr.message}`);

        const { error: updErr } = await supabase
          .from("document_files")
          .update({ storage_path: newPath })
          .eq("id", df.id);

        if (updErr) throw new Error(`db_update: ${updErr.message}`);

        await supabase.storage.from(BUCKET).remove([oldPath]).catch(() => null);
        results.push({ table: "document_files", id: df.id, old_path: oldPath, new_path: newPath, status: "ok" });
      } catch (err) {
        errors.push({ table: "document_files", id: df.id, error: (err as Error).message });
      }
    }
  }

  const summary = {
    migrated: results.length,
    errors:   errors.length,
    results,
    errors_detail: errors,
  };

  return new Response(JSON.stringify(summary, null, 2), {
    headers: { "Content-Type": "application/json" },
    status: errors.length > 0 ? 207 : 200,
  });
});
