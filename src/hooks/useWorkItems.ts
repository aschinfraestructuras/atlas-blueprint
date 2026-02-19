import { useCallback, useEffect, useState } from "react";
import { workItemService, type WorkItem } from "@/lib/services/workItemService";
import { useProject } from "@/contexts/ProjectContext";

export function useWorkItems() {
  const { activeProject } = useProject();
  const [data, setData]       = useState<WorkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!activeProject) { setData([]); setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      const result = await workItemService.getByProject(activeProject.id);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar work items");
    } finally {
      setLoading(false);
    }
  }, [activeProject]);

  useEffect(() => { fetch(); }, [fetch]);

  return { data, loading, error, refetch: fetch };
}
