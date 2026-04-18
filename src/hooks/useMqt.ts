import { useQuery } from "@tanstack/react-query";
import { listMqtItems, getMqtSummary } from "@/lib/services/mqtService";
import { useProject } from "@/contexts/ProjectContext";

export function useMqtItems() {
  const { activeProject } = useProject();
  return useQuery({
    queryKey: ["mqt-items", activeProject?.id],
    queryFn: () => listMqtItems(activeProject!.id),
    enabled: !!activeProject?.id,
    staleTime: 60_000,
  });
}

export function useMqtSummary() {
  const { activeProject } = useProject();
  return useQuery({
    queryKey: ["mqt-summary", activeProject?.id],
    queryFn: () => getMqtSummary(activeProject!.id),
    enabled: !!activeProject?.id,
    staleTime: 60_000,
  });
}
