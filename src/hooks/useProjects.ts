import { useEffect, useState, useCallback } from "react";
import { projectService, type Project } from "@/lib/services/projectService";
import { useAuth } from "@/contexts/AuthContext";

export function useProjects() {
  const { user } = useAuth();
  const [data, setData] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!user) { setData([]); return; }
    setLoading(true);
    setError(null);
    try {
      const result = await projectService.getAll();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error loading projects");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    let cancelled = false;
    fetch().catch(() => {});
    return () => { cancelled = true; };
  }, [fetch]);

  return { data, loading, error, refetch: fetch };
}
