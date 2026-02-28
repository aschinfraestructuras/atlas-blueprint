import { useEffect, useState, useCallback } from "react";
import { useProject } from "@/contexts/ProjectContext";
import { rfiService, type Rfi, type RfiMessage } from "@/lib/services/rfiService";

export function useRfis() {
  const { activeProject } = useProject();
  const [data, setData] = useState<Rfi[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!activeProject) { setData([]); return; }
    setLoading(true);
    setError(null);
    try {
      const result = await rfiService.getByProject(activeProject.id);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error loading RFIs");
    } finally {
      setLoading(false);
    }
  }, [activeProject]);

  useEffect(() => { fetch(); }, [fetch]);

  return { data, loading, error, refetch: fetch };
}

export function useRfiMessages(rfiId: string | null) {
  const [messages, setMessages] = useState<RfiMessage[]>([]);
  const [loading, setLoading] = useState(false);

  const fetch = useCallback(async () => {
    if (!rfiId) { setMessages([]); return; }
    setLoading(true);
    try {
      const result = await rfiService.getMessages(rfiId);
      setMessages(result);
    } catch {
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, [rfiId]);

  useEffect(() => { fetch(); }, [fetch]);

  return { messages, loading, refetch: fetch };
}
