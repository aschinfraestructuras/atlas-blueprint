import { useCallback, useEffect, useState } from "react";
import { workItemService, type WorkItem } from "@/lib/services/workItemService";
import { useProject } from "@/contexts/ProjectContext";

export function useWorkItems() {
  const { activeProject } = useProject();
  const [data, setData]           = useState<WorkItem[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [truncated, setTruncated] = useState(false);

  const fetch = useCallback(async () => {
    if (!activeProject) { setData([]); setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      const result = await workItemService.getByProject(activeProject.id);
      setData(result.data);
      setTruncated(result.truncated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar elementos de obra");
    } finally {
      setLoading(false);
    }
  }, [activeProject]);

  useEffect(() => {
    fetch().catch(() => {});
  }, [fetch]);

  return { data, loading, error, truncated, refetch: fetch };
}
