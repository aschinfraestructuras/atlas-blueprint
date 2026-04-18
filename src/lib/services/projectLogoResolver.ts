/**
 * Resolves the active project's logo as a base64 data URI on-demand.
 * Used by PDF export services to ensure the logo is always available,
 * even when the React hook (useProjectLogo) hasn't finished loading.
 *
 * Caches per project_id to avoid repeated network calls within a session.
 */
import { supabase } from "@/integrations/supabase/client";

const cache = new Map<string, string | null>();

async function fetchAsBase64(url: string): Promise<string | null> {
  try {
    const resp = await fetch(url, { mode: "cors" });
    if (!resp.ok) return null;
    const blob = await resp.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

/**
 * Resolve the project logo as base64. Returns null if no logo is set
 * or if it cannot be fetched. Results are cached per project_id.
 */
export async function resolveProjectLogoBase64(projectId: string): Promise<string | null> {
  if (cache.has(projectId)) return cache.get(projectId) ?? null;

  try {
    const { data: proj, error } = await supabase
      .from("projects")
      .select("logo_url")
      .eq("id", projectId)
      .maybeSingle();
    if (error || !proj?.logo_url) {
      cache.set(projectId, null);
      return null;
    }
    const raw = proj.logo_url as string;
    if (raw.startsWith("http")) {
      cache.set(projectId, null);
      return null;
    }
    const { data: signed, error: sErr } = await supabase.storage
      .from("qms-files")
      .createSignedUrl(raw, 86400);
    if (sErr || !signed?.signedUrl) {
      cache.set(projectId, null);
      return null;
    }
    const b64 = await fetchAsBase64(signed.signedUrl);
    cache.set(projectId, b64);
    return b64;
  } catch {
    cache.set(projectId, null);
    return null;
  }
}

/** Invalidate cached logo for a project (call after upload/remove). */
export function invalidateProjectLogoCache(projectId?: string): void {
  if (projectId) cache.delete(projectId);
  else cache.clear();
}
