import { useEffect, useState, useCallback } from "react";
import { useProject } from "@/contexts/ProjectContext";
import { supplierService, type Supplier, type SupplierKPI } from "@/lib/services/supplierService";

export function useSuppliers() {
  const { activeProject } = useProject();
  const [data, setData] = useState<Supplier[]>([]);
  const [kpis, setKpis] = useState<SupplierKPI | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!activeProject) {
      setData([]);
      setKpis(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [result, kpiResult] = await Promise.all([
        supplierService.getByProject(activeProject.id),
        supplierService.getKPIs(activeProject.id),
      ]);
      setData(result);
      setKpis(kpiResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error loading suppliers");
    } finally {
      setLoading(false);
    }
  }, [activeProject]);

  useEffect(() => { fetch(); }, [fetch]);

  return { data, kpis, loading, error, refetch: fetch };
}
