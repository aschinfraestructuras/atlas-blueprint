import { useEffect, useState, useCallback } from "react";
import { useProject } from "@/contexts/ProjectContext";
import { planningService, type WbsNode, type Activity } from "@/lib/services/planningService";

export function usePlanning() {
  const { activeProject } = useProject();
  const [wbs, setWbs] = useState<WbsNode[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!activeProject) { setWbs([]); setActivities([]); return; }
    setLoading(true);
    setError(null);
    try {
      const [w, a] = await Promise.all([
        planningService.getWbs(activeProject.id),
        planningService.getActivities(activeProject.id),
      ]);
      setWbs(w);
      setActivities(a);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar planeamento");
    } finally {
      setLoading(false);
    }
  }, [activeProject]);

  useEffect(() => {
    let cancelled = false;
    fetch().catch(() => {});
    return () => { cancelled = true; };
  }, [fetch]);

  return { wbs, activities, loading, error, refetch: fetch };
}
