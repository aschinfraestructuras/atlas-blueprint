import { useEffect, useState, useCallback } from "react";
import { useProject } from "@/contexts/ProjectContext";
import { testDueService, type TestDueItem } from "@/lib/services/testDueService";

export function useTestDueItems(filters?: {
  status?: string;
  work_item_id?: string;
  activity_id?: string;
}) {
  const { activeProject } = useProject();
  const [data, setData] = useState<TestDueItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!activeProject) { setData([]); return; }
    setLoading(true);
    setError(null);
    try {
      const result = await testDueService.getByProject(activeProject.id, filters);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error loading due items");
    } finally {
      setLoading(false);
    }
  }, [activeProject, filters?.status, filters?.work_item_id, filters?.activity_id]);

  useEffect(() => {
    let cancelled = false;
    fetch().catch(() => {});
    return () => { cancelled = true; };
  }, [fetch]);

  return { data, loading, error, refetch: fetch };
}
