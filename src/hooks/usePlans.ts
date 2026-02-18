import { useEffect, useState, useCallback } from "react";
import { useProject } from "@/contexts/ProjectContext";
import { planService, type Plan } from "@/lib/services/planService";

export function usePlans() {
  const { activeProject } = useProject();
  const [data, setData] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!activeProject) { setData([]); return; }
    setLoading(true);
    setError(null);
    try {
      const result = await planService.getByProject(activeProject.id);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error loading plans");
    } finally {
      setLoading(false);
    }
  }, [activeProject]);

  useEffect(() => { fetch(); }, [fetch]);

  return { data, loading, error, refetch: fetch };
}
