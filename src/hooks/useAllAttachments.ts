import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Attachment } from "@/lib/services/attachmentService";

/**
 * Fetches ALL attachments for a given project, ordered by most recent first.
 * Used by the Documents page as a universal file aggregator.
 */
export function useAllAttachments(projectId: string | null | undefined) {
  const [data, setData]       = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!projectId) { setData([]); return; }
    setLoading(true);
    setError(null);
    try {
      const { data: rows, error: err } = await supabase
        .from("attachments")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });

      if (err) throw err;
      setData((rows ?? []) as unknown as Attachment[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar anexos");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    let cancelled = false;
    fetch().catch(() => {});
    return () => { cancelled = true; };
  }, [fetch]);

  return { data, loading, error, refetch: fetch };
}
