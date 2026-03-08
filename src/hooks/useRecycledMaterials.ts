import { useCallback, useEffect, useState } from "react";
import { recycledMaterialService, type RecycledMaterial } from "@/lib/services/recycledMaterialService";
import { useProject } from "@/contexts/ProjectContext";

export function useRecycledMaterials() {
  const { activeProject } = useProject();
  const [data, setData] = useState<RecycledMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<{ total: number; approved: number; pending: number; avgPct: number }>({ total: 0, approved: 0, pending: 0, avgPct: 0 });

  const fetch = useCallback(async () => {
    if (!activeProject) { setData([]); setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      const [result, s] = await Promise.all([
        recycledMaterialService.getByProject(activeProject.id),
        recycledMaterialService.getProjectStats(activeProject.id),
      ]);
      setData(result);
      setStats(s);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar materiais reciclados");
    } finally {
      setLoading(false);
    }
  }, [activeProject]);

  useEffect(() => { fetch(); }, [fetch]);

  return { data, loading, error, stats, refetch: fetch };
}
