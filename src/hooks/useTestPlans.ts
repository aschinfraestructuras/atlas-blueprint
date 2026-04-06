import { useEffect, useState, useCallback } from "react";
import { useProject } from "@/contexts/ProjectContext";
import { testPlanService, type TestPlan } from "@/lib/services/testPlanService";

export function useTestPlans() {
  const { activeProject } = useProject();
  const [data, setData] = useState<TestPlan[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!activeProject) { setData([]); return; }
    setLoading(true);
    setError(null);
    try {
      const result = await testPlanService.getByProject(activeProject.id);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error loading test plans");
    } finally {
      setLoading(false);
    }
  }, [activeProject]);

  useEffect(() => {
    let cancelled = false;
    fetch().catch(() => {});
    return () => { cancelled = true; };
  }, [fetch]);

  return { data, loading, error, refetch: fetch };
}
