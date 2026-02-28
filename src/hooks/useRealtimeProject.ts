import { useEffect, useRef, useCallback } from "react";
import { useProject } from "@/contexts/ProjectContext";
import { supabase } from "@/integrations/supabase/client";

/**
 * Subscribe to realtime changes on a table filtered by project_id.
 * Debounces callbacks to avoid flood.
 */
export function useRealtimeProject(
  table: string,
  callback: () => void,
  enabled = true,
) {
  const { activeProject } = useProject();
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  
  const debouncedCb = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(callback, 1000);
  }, [callback]);

  useEffect(() => {
    if (!enabled || !activeProject) return;

    const channel = supabase
      .channel(`realtime-${table}-${activeProject.id}`)
      .on(
        "postgres_changes" as any,
        {
          event: "*",
          schema: "public",
          table,
          filter: `project_id=eq.${activeProject.id}`,
        },
        debouncedCb,
      )
      .subscribe();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      supabase.removeChannel(channel);
    };
  }, [table, activeProject, enabled, debouncedCb]);
}
