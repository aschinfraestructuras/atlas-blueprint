import { useEffect, useState, useCallback } from "react";
import { useProject } from "@/contexts/ProjectContext";
import { technicalOfficeService, type TechnicalOfficeItem, type TechOfficeMessage } from "@/lib/services/technicalOfficeService";

export function useTechnicalOffice() {
  const { activeProject } = useProject();
  const [data, setData] = useState<TechnicalOfficeItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!activeProject) { setData([]); return; }
    setLoading(true);
    setError(null);
    try {
      const result = await technicalOfficeService.getByProject(activeProject.id);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error loading technical office items");
    } finally {
      setLoading(false);
    }
  }, [activeProject]);

  useEffect(() => { fetch(); }, [fetch]);

  return { data, loading, error, refetch: fetch };
}

export function useTechOfficeMessages(itemId: string | null) {
  const [messages, setMessages] = useState<TechOfficeMessage[]>([]);
  const [loading, setLoading] = useState(false);

  const fetch = useCallback(async () => {
    if (!itemId) { setMessages([]); return; }
    setLoading(true);
    try {
      const result = await technicalOfficeService.getMessages(itemId);
      setMessages(result);
    } catch {
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, [itemId]);

  useEffect(() => { fetch(); }, [fetch]);

  return { messages, loading, refetch: fetch };
}
