import { useEffect, useState, useCallback } from "react";
import { useProject } from "@/contexts/ProjectContext";
import { surveyService, type SurveyRecord } from "@/lib/services/surveyService";

export function useSurveys() {
  const { activeProject } = useProject();
  const [data, setData] = useState<SurveyRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!activeProject) { setData([]); return; }
    setLoading(true);
    setError(null);
    try {
      const result = await surveyService.getByProject(activeProject.id);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error loading survey records");
    } finally {
      setLoading(false);
    }
  }, [activeProject]);

  useEffect(() => { fetch(); }, [fetch]);

  return { data, loading, error, refetch: fetch };
}
