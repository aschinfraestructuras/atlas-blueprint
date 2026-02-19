import { useCallback, useEffect, useState } from "react";
import {
  ppiService,
  type PpiTemplate,
  type PpiInstance,
  type PpiInstanceFilters,
} from "@/lib/services/ppiService";
import { useProject } from "@/contexts/ProjectContext";

// ─── Templates hook ───────────────────────────────────────────────────────────

export function usePPITemplates(includeInactive = false) {
  const { activeProject } = useProject();
  const [data, setData]       = useState<PpiTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!activeProject) { setData([]); setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      const result = await ppiService.listTemplates(activeProject.id, { includeInactive });
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error loading PPI templates");
    } finally {
      setLoading(false);
    }
  }, [activeProject, includeInactive]);

  useEffect(() => { fetch(); }, [fetch]);
  return { data, loading, error, refetch: fetch };
}

// ─── Instances hook ───────────────────────────────────────────────────────────

export function usePPIInstances(filters?: PpiInstanceFilters) {
  const { activeProject } = useProject();
  const [data, setData]       = useState<
    (PpiInstance & { template_disciplina: string | null; template_code: string | null })[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!activeProject) { setData([]); setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      const result = await ppiService.listInstances(activeProject.id, filters);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error loading PPI instances");
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeProject]);

  useEffect(() => { fetch(); }, [fetch]);
  return { data, loading, error, refetch: fetch };
}
