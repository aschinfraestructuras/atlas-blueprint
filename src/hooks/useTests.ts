import { useEffect, useState, useCallback } from "react";
import { useProject } from "@/contexts/ProjectContext";
import { testService, type TestResult } from "@/lib/services/testService";

export function useTests(filters?: {
  status?: string;
  disciplina?: string;
  work_item_id?: string;
  supplier_id?: string;
  dateFrom?: string;
  dateTo?: string;
}) {
  const { activeProject } = useProject();
  const [data, setData]       = useState<TestResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!activeProject) { setData([]); return; }
    setLoading(true);
    setError(null);
    try {
      const result = await testService.getByProject(activeProject.id, filters);
      setData(result);
    } catch (err) {
      console.error("[useTests] fetch error:", err);
      setError(err instanceof Error ? err.message : "Error loading tests");
    } finally {
      setLoading(false);
    }
  }, [activeProject, filters?.status, filters?.work_item_id, filters?.supplier_id, filters?.dateFrom, filters?.dateTo]);

  useEffect(() => {
    let cancelled = false;
    fetch().catch(() => {});
    return () => { cancelled = true; };
  }, [fetch]);

  return { data, loading, error, refetch: fetch };
}
