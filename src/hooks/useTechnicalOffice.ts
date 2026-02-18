import { useEffect, useState, useCallback } from "react";
import { useProject } from "@/contexts/ProjectContext";
import { technicalOfficeService, type TechnicalOfficeItem } from "@/lib/services/technicalOfficeService";

export function useTechnicalOffice() {
  const { activeProject } = useProject();
  const [data, setData] = useState<TechnicalOfficeItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!activeProject) { setData([]); return; }
    setLoading(true);
    setError(null);
    try {
      const result = await technicalOfficeService.getByProject(activeProject.id);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error loading technical office items");
    } finally {
      setLoading(false);
    }
  }, [activeProject]);

  useEffect(() => { fetch(); }, [fetch]);

  return { data, loading, error, refetch: fetch };
}
