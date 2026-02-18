import { useCallback, useEffect, useState } from "react";
import {
  attachmentService,
  type Attachment,
  type EntityType,
} from "@/lib/services/attachmentService";

/**
 * Fetches and manages attachments for a given entity.
 * Only fetches when `entityId` is defined (i.e. the record already exists).
 */
export function useAttachments(entityType: EntityType, entityId: string | null | undefined) {
  const [data, setData]     = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!entityId) { setData([]); return; }
    setLoading(true);
    setError(null);
    try {
      const result = await attachmentService.list(entityType, entityId);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar anexos");
    } finally {
      setLoading(false);
    }
  }, [entityType, entityId]);

  useEffect(() => { fetch(); }, [fetch]);

  return { data, loading, error, refetch: fetch };
}
