import { useProject } from "@/contexts/ProjectContext";

/**
 * Returns true when the active project is archived (read-only mode).
 */
export function useArchivedProject(): boolean {
  const { activeProject } = useProject();
  return activeProject?.status === "archived";
}
