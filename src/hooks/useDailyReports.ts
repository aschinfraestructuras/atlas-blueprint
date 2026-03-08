import { useCallback, useEffect, useState } from "react";
import { dailyReportService, type DailyReport } from "@/lib/services/dailyReportService";
import { useProject } from "@/contexts/ProjectContext";

export function useDailyReports() {
  const { activeProject } = useProject();
  const [data, setData] = useState<DailyReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!activeProject) { setData([]); setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      const result = await dailyReportService.getByProject(activeProject.id);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar partes diárias");
    } finally {
      setLoading(false);
    }
  }, [activeProject]);

  useEffect(() => { fetch(); }, [fetch]);

  return { data, loading, error, refetch: fetch };
}
