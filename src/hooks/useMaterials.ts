import { useCallback, useEffect, useState } from "react";
import { useProject } from "@/contexts/ProjectContext";
import { materialService, type Material, type MaterialKPI } from "@/lib/services/materialService";

export function useMaterials() {
  const { activeProject } = useProject();
  const [data, setData] = useState<Material[]>([]);
  const [kpis, setKpis] = useState<MaterialKPI | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!activeProject) {
      setData([]);
      setKpis(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [materials, k] = await Promise.all([
        materialService.getByProject(activeProject.id),
        materialService.getKPIs(activeProject.id),
      ]);
      setData(materials);
      setKpis(k);
    } catch (err) {
      console.error("[useMaterials]", err);
      setError(err instanceof Error ? err.message : "Error loading materials");
    } finally {
      setLoading(false);
    }
  }, [activeProject]);

  useEffect(() => { fetch(); }, [fetch]);

  return { data, kpis, loading, error, refetch: fetch };
}
