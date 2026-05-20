import { useEffect, useState, useCallback } from "react";
import { useProject } from "@/contexts/ProjectContext";
import { useRealtimeProject } from "@/hooks/useRealtimeProject";
import { listLayers, type ProjectMapLayer } from "@/lib/services/mapLayerService";

/**
 * Returns active project's map layers with realtime sync.
 */
export function useProjectMapLayers() {
  const { activeProject } = useProject();
  const [layers, setLayers] = useState<ProjectMapLayer[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!activeProject) {
      setLayers([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await listLayers(activeProject.id);
      setLayers(data);
    } catch (err) {
      console.error("[useProjectMapLayers] failed", err);
    } finally {
      setLoading(false);
    }
  }, [activeProject]);

  useEffect(() => { refresh(); }, [refresh]);
  useRealtimeProject("project_map_layers", refresh, !!activeProject);

  return { layers, loading, refresh };
}
