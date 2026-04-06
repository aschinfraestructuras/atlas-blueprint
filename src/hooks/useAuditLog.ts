import { useEffect, useState, useCallback } from "react";
import { useProject } from "@/contexts/ProjectContext";
import { auditService, type AuditEntry } from "@/lib/services/auditService";

interface AuditFilters {
  module?: string;
  dateFrom?: string;
  dateTo?: string;
}

export function useAuditLog(filters?: AuditFilters) {
  const { activeProject } = useProject();
  const [data, setData] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!activeProject) {
      setData([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await auditService.getByProject(activeProject.id, filters);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error loading audit log");
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeProject, filters?.module, filters?.dateFrom, filters?.dateTo]);

  useEffect(() => {
    let cancelled = false;
    fetch().catch(() => {});
    return () => { cancelled = true; };
  }, [fetch]);

  return { data, loading, error, refetch: fetch };
}
