import { useEffect, useState, useCallback } from "react";
import { useProject } from "@/contexts/ProjectContext";
import { documentService, type Document, type DocumentVersion } from "@/lib/services/documentService";

export function useDocuments() {
  const { activeProject } = useProject();
  const [data, setData] = useState<Document[]>([]);
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
      const result = await documentService.getByProject(activeProject.id);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error loading documents");
    } finally {
      setLoading(false);
    }
  }, [activeProject]);

  useEffect(() => { fetch(); }, [fetch]);

  return { data, loading, error, refetch: fetch };
}

export function useDocumentVersions(documentId: string | null) {
  const [versions, setVersions] = useState<DocumentVersion[]>([]);
  const [loading, setLoading] = useState(false);

  const fetch = useCallback(async () => {
    if (!documentId) { setVersions([]); return; }
    setLoading(true);
    try {
      const result = await documentService.getVersions(documentId);
      setVersions(result);
    } catch {
      setVersions([]);
    } finally {
      setLoading(false);
    }
  }, [documentId]);

  useEffect(() => { fetch(); }, [fetch]);

  return { versions, loading, refetch: fetch };
}
